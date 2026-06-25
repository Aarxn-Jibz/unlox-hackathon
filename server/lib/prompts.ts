export const FLASHCARD_PROMPT = `
Generate 10-15 flashcards from the provided text. Each flashcard should test understanding of key concepts, definitions, or important facts.

Text:
{text}

Return ONLY valid JSON matching this schema (no markdown, no explanation):
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
You are a timetable extraction assistant. Carefully analyze the timetable image and extract all scheduled subjects/classes.

For each entry, extract:
- **day**: Full day name (e.g., "Monday", "Tuesday")
- **subject**: Full subject/course name as written in the image
- **startTime**: In 24-hour format (e.g., "09:00")
- **endTime**: In 24-hour format (e.g., "10:00")

Rules:
- If a time is in 12-hour format, convert it to 24-hour format
- If a subject spans multiple days, create a separate entry for each day
- If end time is not visible, infer it from the next subject's start time or leave it as ""
- Ignore empty/free periods, breaks, and lunch slots
- Use exact subject names as shown — do not abbreviate or expand
- If the day is not explicitly mentioned per row, infer it from the column/row headers
- If a teacher/faculty/instructor name is mentioned alongside the subject, exclude it — extract only the subject name

Return ONLY valid JSON, no explanation or markdown:

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
