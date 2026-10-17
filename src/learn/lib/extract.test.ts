import { describe, expect, it } from 'vitest'
import { cleanTranscript, isYouTubeUrl } from './extract'

describe('isYouTubeUrl', () => {
  it.each(['https://www.youtube.com/watch?v=abc', 'youtube.com/watch?v=abc', 'https://youtu.be/abc', 'https://m.youtube.com/watch?v=abc', 'https://music.youtube.com/watch?v=abc'])('%s is YouTube', (u) => {
    expect(isYouTubeUrl(u)).toBe(true)
  })
  it.each(['https://en.wikipedia.org/wiki/Bee', 'https://notyoutube.com/x', 'not a link', ''])('%s is not YouTube', (u) => {
    expect(isYouTubeUrl(u)).toBe(false)
  })
})

describe('cleanTranscript', () => {
  it('drops timestamps and joins the lines', () => {
    const raw = '0:00\nWelcome back to the channel\n0:05\nToday we look at bees\n1:02:10\nand honey'
    expect(cleanTranscript(raw)).toBe('Welcome back to the channel Today we look at bees and honey')
  })
  it('drops sound cues', () => {
    expect(cleanTranscript('[Music]\n0:03\nHello there')).toBe('Hello there')
  })
})
