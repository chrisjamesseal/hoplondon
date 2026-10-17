let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  ctx ??= new AudioContext()
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

export function play(enabled: boolean, name: keyof typeof sounds) {
  if (!enabled) return
  try {
    sounds[name]()
  } catch {
    // audio can be blocked until the first user gesture
  }
}
