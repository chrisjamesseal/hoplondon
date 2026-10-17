/** Reads a phrase aloud with the device's own voices. Free, no AI credits. */
export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string, lang?: string): void {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  if (lang) {
    u.lang = lang
    const base = lang.split('-')[0].toLowerCase()
    const voices = synth.getVoices()
    const voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ?? voices.find((v) => v.lang.toLowerCase().startsWith(base))
    if (voice) u.voice = voice
  }
  u.rate = 0.85
  synth.speak(u)
}
