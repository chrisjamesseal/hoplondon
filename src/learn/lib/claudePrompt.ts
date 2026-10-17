/**
 * Builds a prompt the learner pastes into Claude. Claude replies with a
 * course JSON in the chat, which the learner pastes back into Leap.
 */

export type PromptSource =
  | { kind: 'topic'; topic: string }
  | { kind: 'link'; url: string }
  | { kind: 'pdf'; fileName?: string }

const FORMAT = `{
  "title": "Course title",
  "emoji": "🌋",
  "summary": "One sentence on what the learner will be able to do",
  "units": [
    {
      "title": "Unit 1: The basics",
      "emoji": "🌱",
      "description": "Short line on what this unit covers",
      "lessons": [
        {
          "title": "Max 5 words",
          "emoji": "🔭",
          "teach": ["Short teaching card.", "Another short card."],
          "exercises": [
            { "type": "mcq", "prompt": "Question?", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "Why A is right." },
            { "type": "tf", "statement": "A clear statement.", "answer": true, "explanation": "Why." },
            { "type": "cloze", "sentence": "A sentence with one ___ gap.", "answer": "word", "distractors": ["other", "wrong", "words"], "explanation": "Why." },
            { "type": "match", "prompt": "Match the pairs", "pairs": [{ "left": "Term", "right": "Short meaning" }] }
          ]
        }
      ]
    }
  ]
}`

const RULES = `Structure
- 3 to 5 units that build from basics to harder ideas.
- 2 to 4 lessons per unit, each on one small idea.
- Each lesson has 2 or 3 "teach" cards (one or two short sentences each) that teach everything its exercises test, then 6 or 7 exercises.

Exercises (mix all four types in every lesson)
- mcq: 3 or 4 short options; "answer" is the zero-based index of the correct option. Wrong options should be plausible.
- tf: definitely true or definitely false. Make about half false.
- cloze: exactly one "___" gap; "answer" is the missing word or short phrase; 3 plausible "distractors" of the same kind.
- match: 3 or 4 pairs, each side under 8 words.
- Every explanation is one friendly sentence.

Pictures
- Give every unit and every lesson one "emoji" that fits its topic. Use a different emoji for each lesson.

Style
- Plain, warm, encouraging English. Short sentences. Explain jargon before using it.
- Never use em dashes or en dashes.
- Only teach accurate, well-established facts.`

function sourceLine(src: PromptSource): string {
  switch (src.kind) {
    case 'topic':
      return `Make a course that teaches: ${src.topic}`
    case 'link':
      return `Read this page and make a course that teaches what it covers: ${src.url}`
    case 'pdf':
      return `Make a course that teaches the material in the PDF I've attached${src.fileName ? ` (${src.fileName})` : ''}. Stick to what the PDF says.`
  }
}

export function buildPrompt(src: PromptSource): string {
  return `You are building a bite-sized, game-like course for my learning app, Leap (it works like Duolingo).

${sourceLine(src)}

${RULES}

Output
- Reply in this chat with the JSON only, inside a single code block.
- Write no other text before or after it. No greeting, no notes, no explanation.
- Do not create a file.
- Keep the JSON compact: no indentation and no blank lines.
- Use exactly this format:

${FORMAT}`
}

/** Pulls the course JSON out of a file or pasted reply (tolerates code fences and extra text) */
export function parseCourseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^﻿/, '')
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : trimmed
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error("That doesn't look like a Leap course. Paste the whole reply Claude gave you.")
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    throw new Error("That JSON is incomplete or broken. Ask Claude to send the full JSON again.")
  }
}

export const CLAUDE_URL = 'https://claude.ai/new'
