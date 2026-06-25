import { SchemaType } from '@google/generative-ai';
import { getGeminiClient } from '../lib/gemini-client';
import { TIMETABLE_PROMPT } from '../lib/prompts';

export interface TimetableSubject {
  day: string;
  subject: string;
  startTime: string;
  endTime: string;
}

export interface TimetableResponse {
  subjects: TimetableSubject[];
}

/**
 * Extracts timetable details from an image buffer using Gemini Vision.
 *
 * @param apiKey - The Gemini API key.
 * @param imageBuffer - The binary buffer of the timetable image.
 * @param mimeType - The mime type of the image (e.g. 'image/png', 'image/jpeg'). Default is 'image/png'.
 * @returns Structured subjects array.
 */
export async function parseTimetable(
  apiKey: string,
  imageBuffer: ArrayBuffer | Buffer,
  mimeType = 'image/png',
): Promise<TimetableResponse> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to initialize Gemini client');
  }

  if (
    !imageBuffer ||
    (imageBuffer instanceof ArrayBuffer ? imageBuffer.byteLength : imageBuffer.length) === 0
  ) {
    throw new Error('Image buffer cannot be empty.');
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
            subjects: {
              type: SchemaType.ARRAY,
              description: 'An array of subjects parsed from the timetable.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  day: {
                    type: SchemaType.STRING,
                    description: 'The day of the week (e.g. Monday, Tuesday).',
                  },
                  subject: {
                    type: SchemaType.STRING,
                    description: 'The course or subject name.',
                  },
                  startTime: {
                    type: SchemaType.STRING,
                    description: 'The starting time of the class (e.g. 09:00 AM, 14:00).',
                  },
                  endTime: {
                    type: SchemaType.STRING,
                    description: 'The ending time of the class (e.g. 10:00 AM, 15:00).',
                  },
                },
                required: ['day', 'subject', 'startTime', 'endTime'],
              },
            },
          },
          required: ['subjects'],
        },
      },
    });

    const nodeBuffer = Buffer.isBuffer(imageBuffer)
      ? imageBuffer
      : Buffer.from(imageBuffer as ArrayBuffer);
    const base64Data = nodeBuffer.toString('base64');
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };

    const promptText = TIMETABLE_PROMPT.trim();

    const result = await model.generateContent([promptText, imagePart]);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error('Received an empty response from Gemini Vision API.');
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      throw new Error(`Failed to parse vision response as JSON. Raw response: ${responseText}`);
    }

    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Parsed JSON response is not an object.');
    }

    const dataObj = parsedData as Record<string, unknown>;

    if (!Array.isArray(dataObj.subjects)) {
      throw new Error("Invalid response format: 'subjects' is not an array.");
    }

    const validatedSubjects: TimetableSubject[] = [];
    const subjectsArray = dataObj.subjects;
    for (let i = 0; i < subjectsArray.length; i++) {
      const sub = subjectsArray[i] as Record<string, unknown>;
      if (
        sub &&
        typeof sub === 'object' &&
        typeof sub.day === 'string' &&
        typeof sub.subject === 'string' &&
        typeof sub.startTime === 'string' &&
        typeof sub.endTime === 'string'
      ) {
        validatedSubjects.push({
          day: sub.day.trim(),
          subject: sub.subject.trim(),
          startTime: sub.startTime.trim(),
          endTime: sub.endTime.trim(),
        });
      } else {
        throw new Error(
          `Invalid timetable subject structure at index ${i}: ${JSON.stringify(sub)}`,
        );
      }
    }

    return {
      subjects: validatedSubjects,
    };
  } catch (error) {
    console.error('Error inside parseTimetable:', error);
    throw new Error(`Timetable parsing failed: ${(error as Error)?.message || error}`);
  }
}
