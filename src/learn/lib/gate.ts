/** Apps the lesson gate can hand you back to once today's goal is done */
export const GATE_APPS: Record<string, { name: string; url: string }> = {
  instagram: { name: 'Instagram', url: 'instagram://app' },
  tiktok: { name: 'TikTok', url: 'snssdk1233://' },
  youtube: { name: 'YouTube', url: 'youtube://' },
  x: { name: 'X', url: 'twitter://' },
  facebook: { name: 'Facebook', url: 'fb://' },
  reddit: { name: 'Reddit', url: 'reddit://' },
  snapchat: { name: 'Snapchat', url: 'snapchat://' },
}

export const GATE_KEY = 'leap-gate'

export const lessonsLeft = (done: number, goal: number) => Math.max(0, goal - done)
