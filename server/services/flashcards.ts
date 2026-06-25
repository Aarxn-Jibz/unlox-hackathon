import { SchemaType } from '@google/generative-ai';
import { getGeminiClient } from '../lib/gemini-client';
import { FLASHCARD_PROMPT } from '../lib/prompts';

export interface Flashcard {
  question: string;
  answer: string;
}

export interface FlashcardResponse {
  flashcards: Flashcard[];
}

/**
 * Generates exactly 10 flashcards from the provided notes text using Gemini Flash.
 *
 * @param apiKey - The Gemini API key.
 * @param notesText - The raw notes text to extract questions/answers from.
 * @returns An object containing exactly 10 flashcards.
 */
export async function generateFlashcards(
  apiKey: string,
  notesText: string,
): Promise<FlashcardResponse> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to initialize Gemini client');
  }

  if (!notesText || !notesText.trim()) {
    throw new Error('Input notes text cannot be empty.');
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
            flashcards: {
              type: SchemaType.ARRAY,
              description: 'An array containing exactly 10 generated flashcards.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  question: {
                    type: SchemaType.STRING,
                    description: 'The question or concept on the front of the flashcard.',
                  },
                  answer: {
                    type: SchemaType.STRING,
                    description:
                      'The answer, definition, or explanation on the back of the flashcard.',
                  },
                },
                required: ['question', 'answer'],
              },
            },
          },
          required: ['flashcards'],
        },
      },
    });

    const promptText = `${FLASHCARD_PROMPT.trim()}\n\nSource Notes Text:\n${notesText.trim()}`;

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

    if (!Array.isArray(dataObj.flashcards)) {
      throw new Error("Invalid response format: 'flashcards' is not an array.");
    }

    const validatedFlashcards: Flashcard[] = [];
    const flashcardsArray = dataObj.flashcards;
    for (let i = 0; i < flashcardsArray.length; i++) {
      const card = flashcardsArray[i] as Record<string, unknown>;
      if (
        card &&
        typeof card === 'object' &&
        typeof card.question === 'string' &&
        typeof card.answer === 'string'
      ) {
        validatedFlashcards.push({
          question: card.question.trim(),
          answer: card.answer.trim(),
        });
      } else {
        throw new Error(`Invalid flashcard structure at index ${i}: ${JSON.stringify(card)}`);
      }
    }

    if (validatedFlashcards.length !== 10) {
      console.warn(`Expected exactly 10 flashcards, but received ${validatedFlashcards.length}`);
    }

    return {
      flashcards: validatedFlashcards,
    };
  } catch (error) {
    console.error('Error inside generateFlashcards:', error);
    throw new Error(`Flashcard generation failed: ${(error as Error)?.message || error}`);
  }
}
