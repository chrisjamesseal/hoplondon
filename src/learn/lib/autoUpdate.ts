/**
 * GitHub Pages lets phones keep the old page for up to 10 minutes.
 * Check for a newer build when the app opens or comes back on screen,
 * and reload once if there is one. Progress is kept: it lives in storage.
 */
function currentBuild(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/learn-"]')
  return s ? new URL(s.src, location.href).pathname.split('/').pop() ?? null : null
}

async function check() {
  const mine = currentBuild()
  if (!mine) return
  try {
    const res = await fetch(`./?check=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const html = await res.text()
    const latest = html.match(/assets\/(learn-[^"']+\.js)/)?.[1]
    if (latest && latest !== mine) location.reload()
  } catch {
    // Offline: keep using what we have
  }
}

export function startAutoUpdate() {
  if (import.meta.env.DEV) return
  check()
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
}
