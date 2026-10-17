/**
 * Builds a prompt the learner pastes into Claude. Claude replies with a
 * course JSON in the chat, which the learner pastes back into Leap.
 */

export type PromptSource =
  | { kind: 'topic'; topic: string }
  | { kind: 'link'; url: string }
  | { kind: 'pdf'; fileName?: string }
  | { kind: 'language'; language: string }

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

const LANG_FORMAT = `{"title":"Spanish for travellers","emoji":"🇪🇸","lang":"es-ES","summary":"One sentence on what the learner will be able to say","units":[{"title":"Unit 1: Greetings and manners","emoji":"👋","description":"Short line","lessons":[{"title":"Hello and goodbye","emoji":"👋","teach":["One short tip about using these phrases."],"phrases":[{"text":"Hola","say":"OH-lah","meaning":"Hello"},{"text":"Adiós","say":"ah-dee-OHS","meaning":"Goodbye"}],"exercises":[{"type":"mcq","prompt":"How do you say \"Goodbye\"?","options":["Adiós","Hola","Gracias","Perdón"],"answer":0,"explanation":"Why."},{"type":"mcq","prompt":"Listen. What does it mean?","audio":"Hola","options":["Hello","Goodbye","Thank you","Sorry"],"answer":0,"explanation":"Why."},{"type":"tf","statement":"A clear statement.","answer":true,"explanation":"Why."},{"type":"cloze","sentence":"In Spanish, \"hello\" is ___.","answer":"Hola","distractors":["Adiós","Gracias","Perdón"],"explanation":"Why."},{"type":"match","prompt":"Match the pairs","pairs":[{"left":"Hello","right":"Hola"},{"left":"Goodbye","right":"Adiós"}]}]}]}]}`

const LANG_RULES = `Structure
- This is a travel crash course: only the most important phrases for being there, not grammar.
- 4 units, 2 or 3 lessons each, each lesson on one small group of 4 to 6 phrases.
- Unit 1: Greetings and manners (hello, goodbye, good morning, please, thank you, sorry, excuse me, yes, no).
- Unit 2: Getting by (I do not understand, do you speak English, please repeat, help, my name is).
- Unit 3: Eating and shopping (water, the menu, the bill, how much is it, numbers 1 to 10).
- Unit 4: Getting around (where is, toilet, station, left, right, straight on, emergency phrases).

Phrases
- "phrases" lists each phrase with "text" (written the way locals write it, in the native script), "say" (a simple English style pronunciation, like OH-lah) and "meaning" (short English).
- Use polite, standard phrases a visitor can safely use. Only well established translations.
- "lang" is the speech language code for the language, for example es-ES, fr-FR, ja-JP, de-DE, it-IT.
- Each lesson has 1 or 2 short "teach" tips, such as when to use a phrase or a tone tip.

Exercises (6 per lesson, mix all four types)
- mcq: 4 short options; "answer" is the zero based index. Do phrase to meaning and meaning to phrase. Include at least one mcq with an "audio" field holding the foreign phrase to play, with English meanings as the options.
- tf: definitely true or definitely false. Make about half false.
- cloze: exactly one "___" gap in an English sentence, such as In French, "thank you" is ___. The answer is the foreign phrase or word, with 3 plausible distractors from the same lesson. For languages not written in the Latin alphabet, use the "say" spelling for cloze answers.
- match: 3 or 4 pairs, English on the left and the foreign phrase on the right. For non Latin scripts, put the "say" spelling in brackets after the phrase.
- Every explanation is one friendly sentence.

Pictures
- Give every unit and lesson one "emoji". Use a flag emoji for the course.

Style
- Plain, warm, encouraging English. Short sentences.
- Never use em dashes or en dashes.`

function sourceLine(src: PromptSource): string {
  switch (src.kind) {
    case 'topic':
      return `Make a course that teaches: ${src.topic}`
    case 'link':
      return `Read this page and make a course that teaches what it covers: ${src.url}`
    case 'language':
      return `Make a travel phrases crash course for visitors to a place where ${src.language} is spoken. Teach the important phrases for being there.`
    case 'pdf':
      return `Make a course that teaches the material in the PDF I've attached${src.fileName ? ` (${src.fileName})` : ''}. Stick to what the PDF says.`
  }
}

export function buildPrompt(src: PromptSource): string {
  const lang = src.kind === 'language'
  return `You are building a bite-sized, game-like course for my learning app, Leap (it works like Duolingo).

${sourceLine(src)}

${lang ? LANG_RULES : RULES}

Output
- Reply in this chat with the JSON only, inside a single code block.
- Write no other text before or after it. No greeting, no notes, no explanation.
- Do not create a file.
- Keep the JSON compact: no indentation and no blank lines.
- Use exactly this format:

${lang ? LANG_FORMAT : FORMAT}`
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
