/** Pulls readable text out of the three source types, entirely in the browser */

export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let lastY: number | null = null
    let text = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = item.transform[5]
      if (lastY !== null && Math.abs(y - lastY) > 14) text += '\n\n'
      else if (lastY !== null && Math.abs(y - lastY) > 2) text += ' '
      text += item.str
      lastY = y
    }
    pages.push(text)
  }
  return pages.join('\n\n').replace(/-\s+\n?(?=[a-z])/g, '')
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const WIKI_API = 'https://en.wikipedia.org/w/api.php?format=json&origin=*&action=query&prop=extracts&explaintext=1&redirects=1'

async function wikiExtract(params: string): Promise<{ title: string; text: string } | null> {
  const res = await fetch(`${WIKI_API}&${params}`)
  if (!res.ok) return null
  const data = await res.json()
  const pages = Object.values(data?.query?.pages ?? {}) as { title?: string; extract?: string }[]
  const page = pages.find((p) => p.extract && p.extract.length > 200)
  return page ? { title: page.title ?? '', text: page.extract ?? '' } : null
}

/** Best-matching Wikipedia article for a typed topic */
export async function topicToText(topic: string): Promise<{ title: string; text: string }> {
  const hit = await wikiExtract(`generator=search&gsrlimit=1&gsrsearch=${encodeURIComponent(topic)}`)
  if (!hit) throw new Error(`Couldn't find anything on “${topic}”. Try different words, or switch to With Claude.`)
  return hit
}

export function normaliseUrl(input: string): string {
  const s = input.trim()
  const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  if (!/^https?:$/.test(url.protocol)) throw new Error('Links need to start with http or https')
  return url.toString()
}

/** Reads a web page as text: Wikipedia via its API, anything else via a reader proxy */
export async function linkToText(rawUrl: string): Promise<{ title: string; text: string }> {
  const url = new URL(normaliseUrl(rawUrl))

  const wiki = url.hostname.match(/^(?:[\w-]+\.)?(?:m\.)?wikipedia\.org$/) && url.pathname.match(/^\/wiki\/(.+)$/)
  if (wiki) {
    const hit = await wikiExtract(`titles=${wiki[1]}`)
    if (hit) return hit
  }

  // r.jina.ai returns any public page as clean markdown with CORS enabled
  try {
    const res = await fetch(`https://r.jina.ai/${url.toString()}`, { headers: { Accept: 'text/plain' } })
    if (res.ok) {
      const body = await res.text()
      const title = body.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || url.hostname
      const text = body.split(/^Markdown Content:\s*$/m)[1] ?? body
      if (text.trim().length > 300) return { title, text }
    }
  } catch {
    // fall through to a direct fetch
  }

  try {
    const res = await fetch(url.toString())
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('script,style,nav,header,footer,aside,noscript').forEach((n) => n.remove())
    const root = doc.querySelector('article, main') ?? doc.body
    const text = [...root.querySelectorAll('h1,h2,h3,p,li')]
      .map((el) => (/^H[1-3]$/.test(el.tagName) ? `\n## ${el.textContent?.trim()}\n` : el.textContent?.trim() ?? ''))
      .join('\n\n')
    if (text.trim().length > 300) return { title: doc.title || url.hostname, text }
  } catch {
    // most sites block cross-origin reads
  }

  throw new Error("Couldn't read that page. It may be private or block apps from reading it. Try switching to With Claude, which can read most pages.")
}
