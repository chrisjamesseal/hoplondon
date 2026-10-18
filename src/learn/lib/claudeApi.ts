/**
 * Optional automatic course writing. The learner's own Anthropic API key lives only in this
 * browser (its own storage slot, never in the progress backup) and is sent only to Anthropic.
 */
export const KEY_SLOT = 'leap-api-key'
export const MODELS = [
  { id: 'claude-haiku-5-5', label: 'Haiku', hint: 'Fastest and cheapest' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet', hint: 'Balanced' },
  { id: 'claude-opus-5-5', label: 'Opus', hint: 'Best quality, costs most' },
] as const
export const DEFAULT_MODEL = 'claude-sonnet-5-5'
const MODEL_SLOT = 'leap-api-model'
export const getModel = (): string => {
  try {
    const m = localStorage.getItem(MODEL_SLOT)
    return MODELS.some((x) => x.id === m) ? (m as string) : DEFAULT_MODEL
  } catch {
    return DEFAULT_MODEL
  }
}
export const setModel = (id: string): void => {
  try {
    localStorage.setItem(MODEL_SLOT, id)
  } catch {
    /* not remembered */
  }
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
export function textFromSse(chunk: string): { text: string; error?: string } {
  let text = ''
  let error: string | undefined
  for (const line of chunk.split('\n')) {
    if (!line.startsWith('data:')) continue
    try {
      const ev = JSON.parse(line.slice(5).trim())
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') text += ev.delta.text
      else if (ev.type === 'error') error = ev.error?.message ?? 'Claude had a problem.'
    } catch {
      /* partial line, ignore */
    }
  }
  return { text, error }
}

export interface GenerateOptions {
  key: string
  prompt: string
  pdf?: File | null
  /** Let Claude open the web address in the prompt */
  readWeb?: boolean
  onProgress?: (chars: number) => void
  signal?: AbortSignal
}

const friendly = (status: number, message: string): string => {
  if (status === 401) return 'Anthropic rejected that API key. Check it and try again.'
  if (status === 403) return 'That API key is not allowed to do this.'
  if (status === 429) return 'Too many requests right now. Wait a minute and try again.'
  if (status === 402 || /credit|billing/i.test(message)) return 'Your Anthropic account is out of credit.'
  if (status >= 500 || status === 529) return 'Claude is busy right now. Try again in a moment.'
  return message || 'Something went wrong talking to Claude.'
}

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
  const body: Record<string, unknown> = { model: getModel(), max_tokens: 32000, stream: true, messages: [{ role: 'user', content }] }
  if (o.readWeb) {
    headers['anthropic-beta'] = 'web-fetch-2025-09-10'
    body.tools = [{ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 3 }]
  }

  let res: Response
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify(body), signal: o.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new Error("Couldn't reach Claude. Check your connection and try again.")
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
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const cut = buf.lastIndexOf('\n')
    if (cut < 0) continue
    const { text, error } = textFromSse(buf.slice(0, cut))
    buf = buf.slice(cut + 1)
    if (error) throw new Error(friendly(0, error))
    if (text) {
      all += text
      o.onProgress?.(all.length)
    }
  }
  all += textFromSse(buf).text
  if (!all.trim()) throw new Error('Claude sent an empty reply. Try again.')
  return all
}
