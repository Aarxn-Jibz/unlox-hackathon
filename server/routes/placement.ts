import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const placementRoutes = new Hono();

placementRoutes.use('/*', authMiddleware);

placementRoutes.post('/analyze', async (c) => {
  try {
    const { resumeText, jobDescription } = await c.req.json().catch(() => ({}));
    if (!resumeText || !jobDescription) {
      return c.json({ success: false, error: 'resumeText and jobDescription are required' }, 400);
    }

    const jdKeywords = jobDescription.toLowerCase().match(/\b\w{3,15}\b/g) || [];
    const resumeWords = new Set(resumeText.toLowerCase().match(/\b\w{3,15}\b/g) || []);

    const uniqueJDKeywords = Array.from(new Set<string>(jdKeywords)).filter(
      (word: string) =>
        !['and', 'the', 'for', 'with', 'you', 'are', 'this', 'that', 'our', 'their'].includes(word),
    );

    const matched = uniqueJDKeywords.filter((word) => resumeWords.has(word));
    const score =
      uniqueJDKeywords.length > 0
        ? Math.round((matched.length / uniqueJDKeywords.length) * 100)
        : 0;

    return c.json(
      {
        success: true,
        analysis: {
          score,
          matchedKeywords: matched.slice(0, 10),
          missingKeywords: uniqueJDKeywords.filter((word) => !resumeWords.has(word)).slice(0, 10),
          feedback:
            score > 70
              ? 'Strong resume match! Keep polishing formatting.'
              : 'Consider adding more keywords matching the job description to improve selection chance.',
        },
      },
      200,
    );
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message }, 500);
  }
});

export default placementRoutes;
