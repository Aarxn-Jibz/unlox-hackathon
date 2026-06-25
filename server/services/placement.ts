import { SchemaType } from '@google/generative-ai';
import { getGeminiClient } from '../lib/gemini-client';
import { RESUME_PROMPT } from '../lib/prompts';

export interface MatchResult {
  matchPercentage: number;
  missingKeywords: string[];
  improvementTips: string[];
}

/**
 * Compares a resume against a job description using Gemini Flash and returns structured analysis.
 *
 * @param apiKey - The Gemini API key.
 * @param resumeText - The candidate's resume content.
 * @param jdText - The target job description text.
 * @returns Structured match analysis.
 */
export async function matchResumeVsJD(
  apiKey: string,
  resumeText: string,
  jdText: string,
): Promise<MatchResult> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to initialize Gemini client');
  }

  if (!resumeText || !resumeText.trim()) {
    throw new Error('Resume text cannot be empty.');
  }

  if (!jdText || !jdText.trim()) {
    throw new Error('Job description text cannot be empty.');
  }

  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            matchPercentage: {
              type: SchemaType.INTEGER,
              description:
                'The overall percentage match between resume and job description, from 0 to 100.',
            },
            missingKeywords: {
              type: SchemaType.ARRAY,
              description:
                'Keywords, tools, or concepts present in the JD but missing or weak in the resume.',
              items: { type: SchemaType.STRING },
            },
            improvementTips: {
              type: SchemaType.ARRAY,
              description: 'Actionable tips and modifications to improve the resume match.',
              items: { type: SchemaType.STRING },
            },
          },
          required: ['matchPercentage', 'missingKeywords', 'improvementTips'],
        },
      },
    });

    const promptText = `${RESUME_PROMPT.trim()}\n\nCandidate Resume:\n${resumeText.trim()}\n\nJob Description:\n${jdText.trim()}`;

    const result = await model.generateContent(promptText);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error('Received an empty response from Gemini API.');
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      throw new Error(`Failed to parse response text as JSON. Raw response: ${responseText}`);
    }

    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Parsed JSON response is not an object.');
    }

    const dataObj = parsedData as Record<string, unknown>;

    if (
      typeof dataObj.matchPercentage !== 'number' ||
      !Array.isArray(dataObj.missingKeywords) ||
      !Array.isArray(dataObj.improvementTips)
    ) {
      throw new Error('Response JSON structure is missing required placement analysis fields.');
    }

    return {
      matchPercentage: Math.max(0, Math.min(100, Math.round(dataObj.matchPercentage))),
      missingKeywords: dataObj.missingKeywords.map((item) => String(item).trim()),
      improvementTips: dataObj.improvementTips.map((item) => String(item).trim()),
    };
  } catch (error) {
    console.error('Error inside matchResumeVsJD:', error);
    throw new Error(`Placement match analysis failed: ${(error as Error)?.message || error}`);
  }
}
