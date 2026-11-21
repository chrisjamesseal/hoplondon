/**
 * Optional automatic course writing. The learner's own Anthropic API key lives only in this
 * browser (its own storage slot, never in the progress backup) and is sent only to Anthropic.
 */
export const KEY_SLOT = 'leap-api-key'
export const MODEL = 'claude-sonnet-5-5'
/** Dollars per million tokens for MODEL. Update these if Anthropic changes its prices. */
export const PRICE = { input: 2, output: 10 }
/** Estimated cost in dollars of a request that used these tokens */
export const costOf = (u: { input: number; output: number }): number => (u.input * PRICE.input + u.output * PRICE.output) / 1e6
/** Pounds per dollar, for showing costs in £. Update this if the exchange rate moves a lot. */
export const GBP_PER_USD = 0.76
/** What writing a course cost, in pounds, or nothing if Claude didn't write it */
export const costText = (usd?: number): string => {
  if (!usd) return ''
  const gbp = usd * GBP_PER_USD
  return gbp < 0.01 ? 'Under 1p' : '£' + gbp.toFixed(2)
}

const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MAX_PDF_BYTES = 30 * 1024 * 1024

export const getApiKey = (): string => {
  try {
    return localStorage.getItem(KEY_SLOT) ?? ''
  } catch {
    return ''
  }
}
export const setApiKey = (key: string): void => {
  try {
    if (key) localStorage.setItem(KEY_SLOT, key.trim())
    else localStorage.removeItem(KEY_SLOT)
  } catch {
    /* storage blocked: the key just won't be remembered */
  }
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error("Couldn't read that PDF."))
    r.readAsDataURL(file)
  })

/** Pulls the streamed text out of Anthropic's server sent events */
export function textFromSse(chunk: string): { text: string; error?: string; input?: number; output?: number } {
  let text = ''
  let error: string | undefined
  let input: number | undefined
  let output: number | undefined
  for (const line of chunk.split('\n')) {
    if (!line.startsWith('data:')) continue
    try {
      const ev = JSON.parse(line.slice(5).trim())
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') text += ev.delta.text
      else if (ev.type === 'error') error = ev.error?.message ?? 'Claude had a problem.'
      // Token counts arrive at the start and grow in later message_delta events
      const u = ev.type === 'message_start' ? ev.message?.usage : ev.type === 'message_delta' ? ev.usage : undefined
      if (u) {
        if (typeof u.input_tokens === 'number') input = u.input_tokens
        if (typeof u.output_tokens === 'number') output = u.output_tokens
      }
    } catch {
      /* partial line, ignore */
    }
  }
  return { text, error, input, output }
}

export interface GenerateOptions {
  key: string
  prompt: string
  pdf?: File | null
  /** Let Claude open the web address in the prompt */
  readWeb?: boolean
  onProgress?: (chars: number, text: string) => void
  signal?: AbortSignal
  /** Cap on what Claude writes; short steps finish faster */
  maxTokens?: number
  /** Told the estimated cost in dollars once the request ends, even if it failed part way */
  onCost?: (usd: number) => void
}

const friendly = (status: number, message: string): string => {
  if (status === 401) return 'Anthropic rejected that API key. Check it and try again.'
  if (status === 403) return 'That API key is not allowed to do this.'
  if (status === 429) return 'Too many requests right now. Wait a minute and try again.'
  if (status === 402 || /credit|billing/i.test(message)) return 'Your Anthropic account is out of credit.'
  if (status >= 500 || status === 529) return 'Claude is busy right now. Try again in a moment.'
  return message || 'Something went wrong talking to Claude.'
}

/** The connection died part way, usually because the phone locked or the app was in the background */
export class ConnectionDropped extends Error {
  constructor(message = 'The connection dropped while Claude was writing. Keep Leap open and try again.') {
    super(message)
  }
}

/** Claude sends a ping every few seconds while writing, so this long with nothing means the connection is dead */
export const IDLE_MS = 60_000
/** No single request should take longer than this */
export const MAX_MS = 4 * 60_000

/** Sends the prompt to Claude and returns the full reply text */
export async function generateText(o: GenerateOptions): Promise<string> {
  const content: unknown[] = []
  if (o.pdf) {
    if (o.pdf.size > MAX_PDF_BYTES) throw new Error('That PDF is too big to send. Try one under 30 MB.')
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: await toBase64(o.pdf) } })
  }
  content.push({ type: 'text', text: o.prompt })

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': o.key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
  const body: Record<string, unknown> = { model: MODEL, max_tokens: o.maxTokens ?? 32000, stream: true, messages: [{ role: 'user', content }] }
  if (o.readWeb) {
    headers['anthropic-beta'] = 'web-fetch-2025-09-10'
    body.tools = [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 3 }]
  }

  // Give up on a request that goes quiet or runs too long, so it can be tried again instead of hanging for ever
  const ctl = new AbortController()
  let stalled = false
  let idle: ReturnType<typeof setTimeout> | undefined
  const bump = () => {
    clearTimeout(idle)
    idle = setTimeout(() => ((stalled = true), ctl.abort()), IDLE_MS)
  }
  const hard = setTimeout(() => ((stalled = true), ctl.abort()), MAX_MS)
  const onAbort = () => ctl.abort()
  o.signal?.addEventListener('abort', onAbort)
  if (o.signal?.aborted) ctl.abort()
  const dropped = (e: unknown): never => {
    if (e instanceof DOMException && e.name === 'AbortError') {
      if (stalled) throw new ConnectionDropped('Claude stopped answering. Try again.')
      throw e
    }
    throw new ConnectionDropped()
  }
  const used = { input: 0, output: 0 }
  try {
    bump()
    let res: Response
    try {
      res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal })
    } catch (e) {
      return dropped(e)
    }
    if (!res.ok) {
      let message = ''
      try {
        message = (await res.json())?.error?.message ?? ''
      } catch {
        /* no body */
      }
      throw new Error(friendly(res.status, message))
    }
    if (!res.body) throw new Error('Claude sent an empty reply.')

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    let all = ''
    const take = (r: { input?: number; output?: number }) => {
      if (r.input !== undefined) used.input = Math.max(used.input, r.input)
      if (r.output !== undefined) used.output = Math.max(used.output, r.output)
    }
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>
      try {
        chunk = await reader.read()
      } catch (e) {
        return dropped(e)
      }
      bump()
      const { done, value } = chunk
      if (done) break
      buf += dec.decode(value, { stream: true })
      const cut = buf.lastIndexOf('\n')
      if (cut < 0) continue
      const r = textFromSse(buf.slice(0, cut))
      const { text, error } = r
      take(r)
      buf = buf.slice(cut + 1)
      if (error) throw new Error(friendly(0, error))
      if (text) {
        all += text
        o.onProgress?.(all.length, all)
      }
    }
    const last = textFromSse(buf)
    take(last)
    all += last.text
    if (!all.trim()) throw new Error('Claude sent an empty reply. Try again.')
    return all
  } finally {
    if (used.input || used.output) o.onCost?.(costOf(used))
    clearTimeout(idle)
    clearTimeout(hard)
    o.signal?.removeEventListener('abort', onAbort)
  }
}
