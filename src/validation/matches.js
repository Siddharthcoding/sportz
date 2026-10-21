import { z } from 'zod';

export const MATCH_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
});

const isoDateString = z.string().refine(
  (value) => z.iso.datetime({ offset: true }).safeParse(value).success,
  { message: 'Must be a valid ISO 8601 date-time string' },
);

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMatchSchema = z
  .object({
    sport: z.string().trim().min(1),
    homeTeam: z.string().trim().min(1),
    awayTeam: z.string().trim().min(1),
    startTime: isoDateString,
    endTime: isoDateString,
    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine(({ startTime, endTime }, context) => {
    if (new Date(endTime) <= new Date(startTime)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be after startTime',
      });
    }
  });

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
