/**
 * Builds a prompt the learner pastes into Claude. Claude replies with a
 * course JSON in the chat, which the learner pastes back into Leap.
 */

import type { Course } from '../types'

export type PromptSource =
  | { kind: 'topic'; topic: string }
  | { kind: 'link'; url: string; transcript?: string }
  | { kind: 'pdf'; fileName?: string }

const FORMAT = `{
  "title": "Course title",
  "emoji": "🌋",
  "summary": "One sentence on what the learner will be able to do",
  "units": [
    {
      "title": "Unit 1: The foundations",
      "emoji": "🌱",
      "description": "Short line on what this unit covers",
      "quiz": [
        { "type": "mcq", "prompt": "A real world scenario that applies the unit's ideas?", "options": ["Plausible A", "Plausible B", "Plausible C", "Plausible D"], "answer": 2, "explanation": "Why C is the best answer." },
        { "type": "tf", "statement": "A claim about a real, named example.", "answer": false, "explanation": "Why." }
      ],
      "lessons": [
        {
          "title": "Max 5 words",
          "emoji": "🔭",
          "teach": ["Short teaching card with a **key term** highlighted.", "Another short card."],
          "phrases": [{ "text": "Wie viel kostet das?", "say": "vee FEEL KOS-tet dahs", "meaning": "How much is it?", "words": [{ "w": "Wie viel", "m": "how much" }, { "w": "kostet", "m": "costs" }, { "w": "das", "m": "that" }] }],
          "exercises": [
            { "type": "mcq", "prompt": "Question?", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "Why A is right." },
            { "type": "mcq", "prompt": "Listen. What does it mean?", "audio": "Wie viel kostet das?", "options": ["How much is it?", "Where is the station?", "Can I pay by card?", "What time is it?"], "answer": 0, "explanation": "Why." },
            { "type": "tf", "statement": "A clear statement.", "answer": true, "explanation": "Why." },
            { "type": "cloze", "sentence": "A sentence with one ___ gap.", "answer": "word", "distractors": ["other", "wrong", "words"], "explanation": "Why." },
            { "type": "match", "prompt": "Match the pairs", "pairs": [{ "left": "Term", "right": "Short meaning" }] }
          ]
        }
      ]
    }
  ]
}`

const RULES = `Audience
- Curious adults aged 25 and over, many of them working professionals. Treat them as smart people who are new to this subject, never as children.
- Tone: warm, clear and conversational, like a knowledgeable friend or a good podcast host. Friendly but grown up: no baby talk, no cartoonish examples, no gushing praise, no "fun facts" for their own sake.
- Keep it easy to follow: short sentences, one idea at a time, and plain English. Explain any jargon the first time it appears, then use the proper term so the learner can hold their own in real conversations.
- Use examples from adult life: work, money, health, home, travel, relationships and current affairs.
- Prefer real world examples: named companies, products, events, people and real figures, as long as you are certain they are accurate. Never invent a statistic or a case study.

Depth
- Go beyond trivia. Cover the why and the how: causes and effects, trade-offs, common misconceptions and practical takeaways the learner could actually use.
- Build from foundations to genuinely useful, more nuanced ideas by the final unit.

Structure
- 3 to 6 units that build on each other (language courses need more, see below). Unit titles look like "Unit 1: The foundations".
- 2 to 4 lessons per unit, each on one clear idea, with a short title (max 5 words).
- Each unit also has a "quiz": 5 or 6 fresh questions for the end of unit quiz. They must test the same ideas as the unit's lessons but through different scenarios and different real world examples. Never reword or reuse a lesson question. Make them a notch harder than the lesson exercises, mostly mcq with a few tf or cloze.
- Each lesson has 2 or 3 "teach" cards (one to three short sentences each) that teach everything its exercises test, then 6 to 8 exercises.
- In every teach card, wrap the one or two most important terms in **double asterisks** so the app can highlight them. Do the same for the key term in explanations.
- The app adds a quiz after each unit automatically, so later lessons can assume earlier ones were learned.

Exercises (mix all four types in every lesson)
- Test understanding and application, not just recall. Include short real-world scenarios ("A colleague says X. What is the best response?").
- mcq: 4 options; "answer" is the zero-based index of the correct option. Make them genuinely hard:
  - Every option must be believable to someone who only half knows the topic. No joke options, no obviously silly ones and no absolutes like "always" or "never" that give the answer away.
  - Wrong options should be real misconceptions, near misses or answers that are right in a different situation.
  - Keep all four options the same length, tone and level of detail. The correct one must not be the longest, the most specific or the most hedged.
  - Spread the correct answer across positions 0 to 3 evenly.
  - At least half of the mcqs should be "which is the best action or explanation in this situation" scenarios where two options are tempting and one is clearly better for a stated reason.
- tf: definitely true or definitely false. Make about half false, ideally popular myths.
- cloze: exactly one "___" gap; "answer" is the missing word or short phrase (often a key term); 3 plausible "distractors" of the same kind.
- match: 3 or 4 pairs, such as terms and meanings or causes and effects, each side under 8 words.
- Every explanation is one or two clear sentences on why the answer is right, adding a useful detail where it helps.

If the course teaches a language
- Add "lang" at the top level: the speech code for the language, such as "de-DE" or "es-ES".
- 8 to 12 units, each with 3 or 4 lessons. Start with survival phrases and build to simple conversations.
- Every lesson introduces 2 to 4 new phrases in "phrases". Each has "text", "say" (easy pronunciation for an English speaker), "meaning", and "words": the meaning of each word or short chunk, in order, so learners see how the phrase is built.
- Repeat earlier phrases often in later lessons, in new combinations and new question types, so each phrase comes back many times. Some lessons can be pure review.
- Wrong options must look like the right answer: same language, similar length and word count, same kind of phrase. Never put a one word answer next to a full sentence, or a question next to a greeting.
- Include listening questions: an mcq whose "audio" is the foreign phrase to read aloud, with "prompt": "Listen. What does it mean?".
- Use teach cards to explain grammar briefly where it helps, such as word order or formal and informal "you".
- "phrases" and "audio" are only for language courses; leave them out otherwise.

Style
- Never use em dashes or en dashes.
- Only teach accurate, well-established facts. Where experts disagree, say so briefly.
- Keep emoji out of lesson text (one emoji for the course icon is fine).`

function sourceLine(src: PromptSource): string {
  switch (src.kind) {
    case 'topic':
      return `Make a course that teaches: ${src.topic}`
    case 'link':
      return src.transcript
        ? `Make a course that teaches the video at ${src.url}. You can't watch it, so here is its transcript. Stick to what is said in it and don't add facts from the video's title or from memory.\n\n<transcript>\n${src.transcript}\n</transcript>`
        : `Read this page and make a course that teaches what it covers: ${src.url}`
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

/** Prompt for a harder follow on that adds new units to a course the learner has finished */
export function buildFollowOnPrompt(course: Course): string {
  const level = (course.level ?? 1) + 1
  const nextUnit = course.units.length + 1
  const outline = course.units.map((u) => `- ${u.title}: ${u.lessons.map((l) => l.title).join(', ')}`).join('\n')
  return `You are extending a course in my learning app, Leap (it works like Duolingo). I have finished "${course.title}" and want a harder follow on that carries on from the same progress line.

What the course already covers. Do not repeat any of it:
${outline}

${RULES}

Follow on rules
- This is level ${level}. Assume the learner knows everything above and is comfortable with the basics.
- Make it clearly harder: deeper ideas, nuance, edge cases, trade offs, real case studies and multi step scenarios. Questions should need judgement, not recall.
- Write 3 to 5 NEW units only, numbered from "Unit ${nextUnit}: ..." onwards. This replaces any rule above about how many units to make or how to number them.
- Keep the same top level "title", "emoji" and "summary" as the original course${course.lang ? ` and "lang": "${course.lang}"` : ''}.
- Every unit still needs its "quiz" of fresh questions.

Output
- Reply in this chat with the JSON only, inside a single code block.
- Write no other text before or after it. No greeting, no notes, no explanation.
- Do not create a file.
- Keep the JSON compact: no indentation and no blank lines.
- Use exactly this format, but with only the new units:

${FORMAT}`
}

export const CLAUDE_URL = 'https://claude.ai/new'
