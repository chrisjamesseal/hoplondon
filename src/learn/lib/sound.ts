let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur)
}

export const sounds = {
  correct: () => {
    tone(660, 0, 0.12, 'triangle')
    tone(990, 0.09, 0.2, 'triangle')
  },
  wrong: () => {
    tone(220, 0, 0.18, 'sawtooth', 0.06)
    tone(160, 0.12, 0.25, 'sawtooth', 0.06)
  },
  tap: () => tone(500, 0, 0.05, 'sine', 0.05),
  complete: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle')),
}

/** Rising run of notes: the longer the combo, the higher it climbs */
export function playCombo(enabled: boolean, n: number) {
  if (!enabled) return
  try {
    const base = [523, 587, 659, 784, 880, 1047, 1175]
    const top = Math.min(base.length, Math.max(2, n - 1))
    base.slice(Math.max(0, top - 3), top).forEach((f, i) => tone(f, i * 0.07, 0.16, 'triangle', 0.1))
  } catch {
    // audio can be blocked until the first user gesture
  }
}

export function play(enabled: boolean, name: keyof typeof sounds) {
  if (!enabled) return
  try {
    sounds[name]()
  } catch {
    // audio can be blocked until the first user gesture
  }
}

const SILENT_WAV = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='
let keeper: HTMLAudioElement | null = null
let wanted = false
let armed = false

const session = () => (navigator as unknown as { audioSession?: { type: string } }).audioSession

/** Starts the silent clip once the phone allows it (it needs a tap), and again if it ever stops */
function startKeeper() {
  if (!wanted) return
  if (!keeper) {
    keeper = Object.assign(new Audio(SILENT_WAV), { loop: true, preload: 'auto' })
    keeper.setAttribute('playsinline', '')
    keeper.setAttribute('aria-hidden', 'true')
    keeper.style.display = 'none'
    document.body.appendChild(keeper)
    keeper.addEventListener('pause', () => {
      // Phone calls and other apps pause it: wait for the next tap
      armed = false
      arm()
    })
  }
  if (!keeper.paused) return
  void keeper.play().then(
    () => ctx?.state === 'suspended' && void ctx.resume(),
    () => arm(),
  )
}

/** Tries again on each tap and when the app comes back to the front, until the clip is playing */
function arm() {
  if (armed || !wanted) return
  armed = true
  const go = () => {
    if (keeper && !keeper.paused) return done()
    startKeeper()
    // Stay armed until it is really playing
    setTimeout(() => keeper && !keeper.paused && done(), 300)
  }
  const done = () => {
    armed = false
    for (const t of ['pointerdown', 'touchend', 'click']) document.removeEventListener(t, go, true)
    document.removeEventListener('visibilitychange', go)
  }
  for (const t of ['pointerdown', 'touchend', 'click']) document.addEventListener(t, go, true)
  document.addEventListener('visibilitychange', go)
}

/**
 * The iPhone silent switch mutes web sound, and spoken phrases too. Two things
 * lift that: asking Safari for the "playback" audio category (16.4 and later),
 * and keeping a silent clip playing, which older versions and the home screen
 * app need. Both are used together so sounds and phrases are heard on silent.
 * (The catch: it can pause music playing in another app.)
 */
export function setPlayInSilent(on: boolean) {
  wanted = on
  try {
    const s = session()
    // 'ambient' lets our sounds mix with music from other apps instead of pausing it
    if (s) s.type = on ? 'playback' : 'ambient'
    if (on) {
      startKeeper()
      arm()
    } else {
      keeper?.pause()
    }
  } catch {
    // Not supported here: sounds follow the silent switch as usual
  }
}
