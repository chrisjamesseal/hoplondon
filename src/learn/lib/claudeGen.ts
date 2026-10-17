import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-opus-5-5'

export type ClaudeSource =
  | { kind: 'topic'; topic: string }
  | { kind: 'text'; label: string; text: string }
  | { kind: 'pdf'; label: string; base64: string }
  | { kind: 'url'; url: string }

const s = { type: 'string' } as const
const strArr = { type: 'array', items: s } as const

const EXERCISE = {
  anyOf: [
    {
      type: 'object',
      properties: { type: { type: 'string', enum: ['mcq'] }, prompt: s, options: strArr, answer: { type: 'integer' }, explanation: s },
      required: ['type', 'prompt', 'options', 'answer', 'explanation'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: { type: { type: 'string', enum: ['tf'] }, statement: s, answer: { type: 'boolean' }, explanation: s },
      required: ['type', 'statement', 'answer', 'explanation'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: { type: { type: 'string', enum: ['cloze'] }, sentence: s, answer: s, distractors: strArr, explanation: s },
      required: ['type', 'sentence', 'answer', 'distractors', 'explanation'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['match'] },
        prompt: s,
        pairs: {
          type: 'array',
          items: { type: 'object', properties: { left: s, right: s }, required: ['left', 'right'], additionalProperties: false },
        },
      },
      required: ['type', 'prompt', 'pairs'],
      additionalProperties: false,
    },
  ],
}

const COURSE_SCHEMA = {
  type: 'object',
  properties: {
    title: s,
    emoji: s,
    summary: s,
    units: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: s,
          description: s,
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: s, teach: strArr, exercises: { type: 'array', items: EXERCISE } },
              required: ['title', 'teach', 'exercises'],
              additionalProperties: false,
            },
          },
        },
        required: ['title', 'description', 'lessons'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'emoji', 'summary', 'units'],
  additionalProperties: false,
}

const SYSTEM = `You turn source material into a bite-sized, game-like course in the style of Duolingo.

Structure
- 3 to 5 units that build from basics to harder ideas. Unit titles look like "Unit 1: The basics".
- 2 to 4 lessons per unit, each on one small idea, with a short title (max 5 words).
- Each lesson has 2 or 3 "teach" cards (one or two short sentences each) that teach everything its exercises test, then 6 to 8 exercises.

Exercises (mix all four types in every lesson)
- mcq: a question, 3 or 4 short options, "answer" is the zero-based index of the correct option. Wrong options should be plausible.
- tf: a clear statement that is definitely true or definitely false. Make about half false.
- cloze: a sentence containing exactly one "___" gap; "answer" is the missing word or short phrase; 3 plausible "distractors" of the same kind.
- match: 3 or 4 pairs of a term and a short meaning (each side under 8 words).
- Every explanation is one friendly sentence saying why the answer is right.

Style
- Plain, warm, encouraging English. Short sentences. No jargon without explaining it first.
- Never use em dashes or en dashes; use commas, colons or full stops instead.
- Stick to what the source says. If the source is a topic name, teach accurate, well-established facts only.
- "emoji" is a single emoji that represents the subject. "summary" is one sentence on what the learner will be able to do.`

function userContent(src: ClaudeSource): Anthropic.Beta.BetaContentBlockParam[] {
  const ask = 'Build the course as JSON matching the schema.'
  switch (src.kind) {
    case 'topic':
      return [{ type: 'text', text: `Topic to learn: ${src.topic}\n\n${ask}` }]
    case 'text':
      return [{ type: 'text', text: `<source title="${src.label.replace(/"/g, "'")}">\n${src.text}\n</source>\n\nTeach the material in this source. ${ask}` }]
    case 'pdf':
      return [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: src.base64 }, title: src.label },
        { type: 'text', text: `Teach the material in this PDF. ${ask}` },
      ]
    case 'url':
      return [{ type: 'text', text: `Read this page with the web_fetch tool, then teach what it covers: ${src.url}\n\n${ask}` }]
  }
}

export class GenerationError extends Error {}

/**
 * Asks Claude for a full course. Streams so long courses don't time out, and
 * reports characters received so the UI can show a progress bar.
 */
export async function generateWithClaude(apiKey: string, src: ClaudeSource, onProgress: (chars: number) => void): Promise<unknown> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: userContent(src) }]
  let chars = 0

  try {
    // Server tools can pause a long turn; resume a few times before giving up
    for (let turn = 0; turn < 4; turn++) {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 64000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: COURSE_SCHEMA } },
        system: SYSTEM,
        messages,
        ...(src.kind === 'url' ? { tools: [{ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 3 }] } : {}),
      })
      stream.on('text', (delta) => {
        chars += delta.length
        onProgress(chars)
      })
      const msg = await stream.finalMessage()

      if (msg.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: msg.content })
        continue
      }
      if (msg.stop_reason === 'refusal') throw new GenerationError("Claude couldn't make a course from this source. Try a different one.")
      if (msg.stop_reason === 'max_tokens') throw new GenerationError('That source is too big to turn into one course. Try a shorter document or a narrower topic.')

      const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
      try {
        return JSON.parse(text)
      } catch {
        throw new GenerationError('Claude sent back something unexpected. Please try again.')
      }
    }
    throw new GenerationError('Reading that page took too long. Try again or use a different link.')
  } catch (err) {
    if (err instanceof GenerationError) throw err
    if (err instanceof Anthropic.AuthenticationError) throw new GenerationError('Your Claude API key was rejected. Check it in Settings.')
    if (err instanceof Anthropic.PermissionDeniedError) throw new GenerationError("Your API key doesn't have access to this model.")
    if (err instanceof Anthropic.RateLimitError) throw new GenerationError('Claude is busy right now (rate limited). Wait a minute and try again.')
    if (err instanceof Anthropic.BadRequestError) throw new GenerationError(`Claude couldn't use that source: ${err.message}`)
    if (err instanceof Anthropic.APIConnectionError) throw new GenerationError("Couldn't reach Claude. Check your internet connection.")
    if (err instanceof Anthropic.APIError) throw new GenerationError(`Claude error ${err.status ?? ''}: ${err.message}`)
    throw err
  }
}
