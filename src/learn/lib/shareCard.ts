export interface CardData {
  streak: number
  level: number
  xp: number
  lessons: number
}

/** Draws a square streak card to share with friends */
export async function makeStreakCard(d: CardData): Promise<Blob> {
  try {
    await document.fonts.load('800 80px Quicksand')
  } catch {
    // Fall back to the system font
  }
  const size = 1080
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = '#131f24'
  g.fillRect(0, 0, size, size)
  const glow = g.createRadialGradient(size / 2, 470, 40, size / 2, 470, 560)
  glow.addColorStop(0, 'rgba(255,150,0,0.35)')
  glow.addColorStop(1, 'rgba(255,150,0,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, size, size)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const font = (w: number, px: number) => `${w} ${px}px Quicksand, system-ui, sans-serif`
  g.font = '150px "Apple Color Emoji","Noto Color Emoji",sans-serif'
  g.fillText('🔥', size / 2, 230)
  g.fillStyle = '#ffc800'
  g.font = font(800, 300)
  g.fillText(String(d.streak), size / 2, 470)
  g.fillStyle = '#ffffff'
  g.font = font(700, 74)
  g.fillText(d.streak === 1 ? 'day streak' : 'day streak', size / 2, 650)
  g.fillStyle = '#9db0a5'
  g.font = font(700, 48)
  g.fillText(`Level ${d.level}  ·  ${d.xp.toLocaleString('en-GB')} XP  ·  ${d.lessons} lessons`, size / 2, 770)
  g.font = '120px "Apple Color Emoji","Noto Color Emoji",sans-serif'
  g.fillText('🐸', size / 2 - 150, 930)
  g.fillStyle = '#58cc02'
  g.font = font(800, 110)
  g.textAlign = 'left'
  g.fillText('leap', size / 2 - 60, 935)
  const w = g.measureText('leap').width
  g.fillStyle = '#ffc800'
  g.fillText('.', size / 2 - 60 + w, 935)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'))
}

/** Opens the share sheet where there is one, otherwise saves the picture */
export async function shareCard(blob: Blob, text: string): Promise<'shared' | 'saved'> {
  const file = new File([blob], 'leap-streak.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch {
      // Cancelled or refused: fall through to saving
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'leap-streak.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'saved'
}
