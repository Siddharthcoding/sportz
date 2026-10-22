import arcject, {shield, detectBot, slidingWindow} from '@arcjet/node';

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey) {
  throw new Error('ARCJET_KEY is not defined in the environment variables.');
}

export const httpArcjet = arcjetKey ?
    arcject({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode}),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}),
            slidingWindow({ mode: arcjetMode, interval: '10s', max: 50})
        ]
    }) : null;

export const wsArcjet = arcjetKey ?
    arcject({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode}),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}),
            slidingWindow({ mode: arcjetMode, interval: '2s', max: 5})
        ]
    }) : null; 

export function securityMiddleware() {
    return async (req, res, next) => {
        if (!httpArcjet) {
            return next();
        }

        try {
            // Protect method will analyze the request locally and return a 
            // decision object indicating whether the request is allowed or blocked.
            const decision = await httpArcjet.protect(req);

            if(decision.isDenied()) {
                if(decision.reason.isRateLimit()) {
                    res.status(429).json({ error: 'Too Many Requests' });
                }

                res.status(403).json({ error: 'Forbidden' });
            }
        } catch (error) {
            console.error('Arcjet middleware error:', error);
            res.status(503).json({ error: 'Service Unavailable' });
        } 

        next();
    }
}