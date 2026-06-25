export const FLASHCARD_PROMPT = `
Generate 10 flashcards from the provided text.

Return JSON:

{
  "flashcards": [
    {
      "question": "",
      "answer": ""
    }
  ]
}
`;

export const RESUME_PROMPT = `
Compare the resume with the job description.

Return:

{
  "matchPercentage": 0,
  "missingKeywords": [],
  "improvementTips": []
}
`;

export const TIMETABLE_PROMPT = `
Extract timetable details from the image.

Return:

{
  "subjects": [
    {
      "day": "",
      "subject": "",
      "startTime": "",
      "endTime": ""
    }
  ]
}
`;
