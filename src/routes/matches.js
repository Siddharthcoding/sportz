import {Router} from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { db } from '../db/db.js';
import {matches} from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit);

        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch matches", details: JSON.stringify(error) });
    }
});

matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    }

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(parsed.data.startTime),
            endTime: new Date(parsed.data.endTime),
            homeScore: parsed.data.homeScore ?? 0,
            awayScore: parsed.data.awayScore ?? 0, 
            status: getMatchStatus(parsed.data.startTime, parsed.data.endTime),
        }).returning();

        if(res.app.locals.broadcastMatchCreated) {
            // Broadcast the newly created match to all connected WebSocket clients
            res.app.locals.broadcastMatchCreated(event); 
        }

        res.status(201).json({ message: 'Match created', match: event });
    } catch (error) {
        res.status(500).json({ error: "Failed to create match", details: JSON.stringify(error) });
    }
});