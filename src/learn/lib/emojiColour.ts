import type { Course } from '../types'
import { pickEmoji } from './emoji'

/**
 * Keeps emoji from clashing with the coloured cards and buttons they sit on.
 *
 * Two things look wrong: an emoji whose colour is too close to its background
 * (a green sprout on a green banner just vanishes) and one that sits right
 * opposite it (a green puzzle piece on purple vibrates). The sweet spot is in
 * between. Each emoji's colours are measured once from a canvas, every unit
 * gets the palette colour that suits its emoji best, and any emoji that still
 * clashes is shown on a soft neutral plate instead.
 */

export interface Tone {
  /** Share of the emoji's coloured pixels in each 30 degree slice of the colour wheel (sums to 1, or all 0) */
  bins: number[]
  /** 0 for black, white and grey emoji, up to 1 for vivid, fully coloured ones */
  strength: number
}

export const PALETTE = [
  { name: 'green', hue: 96 },
  { name: 'blue', hue: 200 },
  { name: 'purple', hue: 276 },
  { name: 'orange', hue: 35 },
  { name: 'pink', hue: 322 },
  { name: 'teal', hue: 168 },
] as const

export type ColourName = (typeof PALETTE)[number]['name']

/** Hue gaps (degrees) that look good: far enough to stand out, not so far they vibrate */
const GOOD_MIN = 70
const GOOD_MAX = 130
/** Above this penalty an emoji gets a neutral plate behind it */
export const PLATE_THRESHOLD = 0.2

const BINS = 12

export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** 0 when the emoji and background colours sit comfortably apart, up to 1 when they clash badly */
export function clashPenalty(tone: Tone | null, backgroundHue: number): number {
  if (!tone || tone.strength <= 0) return 0
  let sum = 0
  tone.bins.forEach((share, b) => {
    if (!share) return
    const d = hueDistance(b * (360 / BINS) + 180 / BINS, backgroundHue)
    const gap = d < GOOD_MIN ? GOOD_MIN - d : d > GOOD_MAX ? d - GOOD_MAX : 0
    sum += share * Math.min(1, gap / GOOD_MIN)
  })
  return Math.min(1, sum * tone.strength)
}

export function needsPlate(tone: Tone | null, backgroundHue: number): boolean {
  return clashPenalty(tone, backgroundHue) > PLATE_THRESHOLD
}

/**
 * Picks a palette colour for each unit. Every emoji in the unit counts, the
 * unit's own emoji double. Neighbouring units avoid sharing a colour, and when
 * nothing clashes the colours rotate in the usual order.
 */
export function pickUnitColours(units: { tones: (Tone | null)[]; main: Tone | null }[]): ColourName[] {
  const out: ColourName[] = []
  units.forEach((u, i) => {
    let best: ColourName = PALETTE[i % PALETTE.length].name
    let bestScore = Infinity
    PALETTE.forEach((c, ci) => {
      const clash = u.tones.reduce((s, t) => s + clashPenalty(t, c.hue), 0) + 2 * clashPenalty(u.main, c.hue)
      const repeat = out[i - 1] === c.name ? 0.4 : 0
      // A tiny nudge toward the normal rotation so unaffected units keep their usual colours
      const rotation = (((ci - i) % PALETTE.length) + PALETTE.length) % PALETTE.length * 0.001
      const score = clash + repeat + rotation
      if (score < bestScore) {
        bestScore = score
        best = c.name
      }
    })
    out.push(best)
  })
  return out
}

/* ---------- measuring an emoji ---------- */

const cache = new Map<string, Tone | null>()

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

/** Draws the emoji on a small canvas and reads back which colours it is made of */
export function measureEmoji(emoji: string): Tone | null {
  if (cache.has(emoji)) return cache.get(emoji) ?? null
  let tone: Tone | null = null
  try {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) {
      ctx.font = `${size * 0.75}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, size / 2, size / 2 + 3)
      const { data } = ctx.getImageData(0, 0, size, size)
      const bins = new Array<number>(BINS).fill(0)
      let opaque = 0
      let coloured = 0
      let satSum = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue
        opaque++
        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
        // Greys, near white and near black carry no colour
        if (s < 0.25 || l < 0.12 || l > 0.9) continue
        coloured++
        satSum += s
        bins[Math.min(BINS - 1, Math.floor(h / (360 / BINS)))] += s
      }
      if (opaque > 20) {
        const total = bins.reduce((a, b) => a + b, 0)
        tone =
          coloured && total
            ? { bins: bins.map((b) => b / total), strength: Math.min(1, (coloured / opaque) * (satSum / coloured) * 1.4) }
            : { bins, strength: 0 }
      }
    }
  } catch {
    // No canvas (or it is locked down): fall back to the normal colours
  }
  cache.set(emoji, tone)
  return tone
}

/** The colour for each unit of a course, and for every emoji whether it needs a plate */
export function courseColours(course: Course) {
  const emojiOf = (u: Course['units'][number], ui: number) => pickEmoji(u.emoji, `${u.title} ${u.description}`, ui)
  const lessonEmoji = (title: string, own: string | undefined, i: number) => pickEmoji(own, title, i)

  let lessonIndex = 0
  const units = course.units.map((u, ui) => {
    const main = measureEmoji(emojiOf(u, ui))
    const tones = u.lessons.map((l) => measureEmoji(lessonEmoji(l.title, l.emoji, lessonIndex++)))
    return { tones, main }
  })
  const names = pickUnitColours(units)
  const hueOf = (n: ColourName) => PALETTE.find((c) => c.name === n)!.hue
  return units.map((u, ui) => ({
    colour: names[ui],
    plateUnit: needsPlate(u.main, hueOf(names[ui])),
    plateLessons: u.tones.map((t) => needsPlate(t, hueOf(names[ui]))),
  }))
}
