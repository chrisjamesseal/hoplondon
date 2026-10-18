/**
 * Builds a prompt the learner pastes into Claude. Claude replies with a
 * course JSON in the chat, which the learner pastes back into Leap.
 */

import type { Course } from '../types'

export type PromptSource =
  | { kind: 'topic'; topic: string }
  | { kind: 'link'; url: string; transcript?: string }
  | { kind: 'pdf'; fileName?: string }

const formatFor = (harder: boolean) => FORMAT_BASE.replace('__TYPE__', harder ? TYPE_EXAMPLE : '')

const TYPE_EXAMPLE = `
            { "type": "type", "prompt": "The idea a video promises its viewer, in one word. What is it?", "answer": "premise", "accept": ["the premise"], "hint": "It is what the whole video is built on.", "explanation": "Why." },`

const FORMAT_BASE = `{
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
            { "type": "match", "prompt": "Match the pairs", "pairs": [{ "left": "Term", "right": "Short meaning" }] },__TYPE__
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
- tf: definitely true or definitely false. Make about half false, ideally popular myths. Mix the order unpredictably: never always put the false statement before the true one, never strictly alternate, and do not group the same answer together.
- cloze: exactly one "___" gap; "answer" is the missing word or short phrase (often a key term); 3 plausible "distractors" of the same kind.
- match: 3 or 4 pairs, such as terms and meanings or causes and effects, each side under 8 words.
- Any exercise can carry an optional "hint": a short nudge that helps without giving the answer away. The app shows hints in harder levels.
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
- Do not create a file, a canvas, a download link or a table.
- Keep the JSON compact: no indentation and no blank lines.
- The JSON must be strictly valid and parse with JSON.parse. Check it before you send it.
- Use only straight double quotes (") around keys and strings, never curly quotes. Inside a string use an apostrophe (') or rewrite the sentence instead of a double quote.
- No trailing commas, no comments, no ellipsis, no placeholders and no markdown inside the code block. Each string stays on one line, with no line breaks inside it.
- Write true and false in lowercase with no quotes, and write answer numbers as plain numbers.
- Send the whole JSON in one reply and finish every bracket. If it would be too long, write fewer lessons rather than stopping halfway.
- Use exactly this format:

${formatFor(false)}`
}

const closeOpen = (src: string): string => {
  // Drops a half written tail and closes any brackets a cut off reply left open
  const stack: string[] = []
  let inStr = false
  let esc = false
  let lastSafe = 0
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']')
    else if (ch === '}' || ch === ']') {
      stack.pop()
      lastSafe = i + 1
    }
  }
  if (!stack.length) return src
  // Cut back to the last finished object or array, then close what is still open
  let cut = src.slice(0, lastSafe)
  const open: string[] = []
  let s2 = false
  let e2 = false
  for (const ch of cut) {
    if (s2) {
      if (e2) e2 = false
      else if (ch === '\\') e2 = true
      else if (ch === '"') s2 = false
      continue
    }
    if (ch === '"') s2 = true
    else if (ch === '{') open.push('}')
    else if (ch === '[') open.push(']')
    else if (ch === '}' || ch === ']') open.pop()
  }
  cut = cut.replace(/,\s*$/, '')
  return cut + open.reverse().join('')
}

const tidy = (src: string): string =>
  src
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/,\s*([}\]])/g, '$1')

/** Pulls the course JSON out of a file or pasted reply (tolerates code fences, extra text, curly quotes, trailing commas and cut off replies) */
export function parseCourseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^\uFEFF/, '')
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i)
  const body = fenced && fenced[1].includes('{') ? fenced[1] : trimmed
  const start = body.indexOf('{')
  if (start < 0) throw new Error("That doesn't look like a Leap course. Paste the whole reply Claude gave you.")
  const end = body.lastIndexOf('}')
  const whole = end > start ? body.slice(start, end + 1) : body.slice(start)
  const attempts = [whole, tidy(whole), closeOpen(tidy(body.slice(start))), closeOpen(tidy(whole))]
  // Raw line breaks inside strings are the other common slip
  attempts.push(...attempts.map((a) => a.replace(/"((?:[^"\\\n]|\\.)*)\n/g, '"$1 ')))
  for (const a of attempts) {
    try {
      const v = JSON.parse(a)
      if (v && typeof v === 'object') return v
    } catch {
      /* try the next repair */
    }
  }
  throw new Error('That JSON is incomplete or broken. Ask Claude to send the full JSON again.')
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
- Written answers: make "type" exercises the backbone of this level. At least half of every lesson's exercises and most of each unit's "quiz" must be "type", where the learner writes the answer. The learner sees only the first letter and has a hint button, so the answer must be one word or a short phrase of up to three words with one clear correct form, and the prompt must give enough context to recall it. List other wordings that should count in "accept".
- Use "mcq" only for new scenario judgement at this level. Any question that checks a fact, term, name or number from the earlier levels must be a "type", never an mcq, tf or cloze.
- Keep some "tf" and "match" for variety, but fewer than at the earlier level.
- Give every "type" exercise a "hint": a short nudge that helps recall without revealing the answer.

Output
- Reply in this chat with the JSON only, inside a single code block.
- Write no other text before or after it. No greeting, no notes, no explanation.
- Do not create a file, a canvas, a download link or a table.
- Keep the JSON compact: no indentation and no blank lines.
- The JSON must be strictly valid and parse with JSON.parse. Check it before you send it.
- Use only straight double quotes (") around keys and strings, never curly quotes. Inside a string use an apostrophe (') or rewrite the sentence instead of a double quote.
- No trailing commas, no comments, no ellipsis, no placeholders and no markdown inside the code block. Each string stays on one line, with no line breaks inside it.
- Write true and false in lowercase with no quotes, and write answer numbers as plain numbers.
- Send the whole JSON in one reply and finish every bracket. If it would be too long, write fewer lessons rather than stopping halfway.
- Use exactly this format, but with only the new units:

${formatFor(true)}`
}

export const CLAUDE_URL = 'https://claude.ai/new'
