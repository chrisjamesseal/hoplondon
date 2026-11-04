const KEY = 'leap-just-done'

/** Remembers the step just finished so the path can celebrate it on return */
export function markJustDone(id: string) {
  try {
    sessionStorage.setItem(KEY, id)
  } catch {
    // No session storage: skip the celebration
  }
}

export function peekJustDone(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearJustDone() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear
  }
}
