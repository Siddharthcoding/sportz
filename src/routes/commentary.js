import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/db.js';
import { commentary } from '../db/schema.js';
import {
    createCommentarySchema,
    listCommentaryQuerySchema,
} from '../validation/commentary.js';
import { matchIdParamSchema } from '../validation/matches.js';

export const commentaryRouter = Router({ mergeParams: true });
const MAX_LIMIT = 100;

commentaryRouter.get('/', async (req, res) => {
    const params = matchIdParamSchema.safeParse(req.params);
    const query = listCommentaryQuerySchema.safeParse(req.query);

    if (!params.success || !query.success) {
        return res.status(400).json({
            error: 'Invalid request',
            details: {
                params: params.success ? undefined : params.error.issues,
                query: query.success ? undefined : query.error.issues,
            },
        });
    }

    const limit = Math.min(query.data.limit ?? MAX_LIMIT, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, params.data.id))
            .orderBy(desc(commentary.createdAt))
            .limit(limit);

        return res.status(200).json({ data });
    } catch (error) {
        console.error('Failed to fetch commentary:', error);
        return res.status(500).json({ error: 'Failed to fetch commentary' });
    }
});

commentaryRouter.post('/', async (req, res) => {
    const params = matchIdParamSchema.safeParse(req.params);
    const body = createCommentarySchema.safeParse(req.body);

    if (!params.success || !body.success) {
        return res.status(400).json({
            error: 'Invalid payload',
            details: {
                params: params.success ? undefined : params.error.issues,
                body: body.success ? undefined : body.error.issues,
            },
        });
    }

    try {
        const [result] = await db
            .insert(commentary)
            .values({
                matchId: params.data.id,
                ...body.data,
            })
            .returning();

        // Broadcast the new commentary to all WebSocket clients subscribed to this match
        if (req.app.locals.broadcastCommentary) {
            req.app.locals.broadcastCommentary(result.matchId, result);
        }

        return res.status(201).json({ commentary: result });
    } catch (error) {
        console.error('Failed to create commentary:', error);
        return res.status(500).json({ error: 'Failed to create commentary' });
    }
});
