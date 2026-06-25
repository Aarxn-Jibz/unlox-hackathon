import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { matchResumeVsJD } from '../services/placement';
import type { Env } from '../../types';

const placementRoutes = new Hono<{ Bindings: Env }>();

placementRoutes.use('/*', authMiddleware);

placementRoutes.post('/analyze', async (c) => {
  try {
    const { resumeText, jobDescription } = await c.req.json().catch(() => ({}));
    if (!resumeText || !jobDescription) {
      return c.json({ success: false, error: 'resumeText and jobDescription are required' }, 400);
    }

    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'GEMINI_API_KEY environment variable is missing' }, 500);
    }

    const result = await matchResumeVsJD(apiKey, resumeText, jobDescription);

    return c.json(
      {
        success: true,
        analysis: {
          score: result.matchPercentage,
          matchPercentage: result.matchPercentage,
          missingKeywords: result.missingKeywords,
          improvementTips: result.improvementTips,
          feedback:
            result.improvementTips.join('\n') ||
            (result.matchPercentage > 70
              ? 'Strong resume match! Keep polishing formatting.'
              : 'Consider adding more keywords matching the job description to improve selection chance.'),
        },
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default placementRoutes;
