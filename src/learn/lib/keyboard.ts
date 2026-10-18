import { useEffect } from 'react'

/**
 * While a written answer is on screen, size the lesson to the part of the screen the keyboard
 * leaves free, so the progress bar stays at the top and the hint and check buttons sit just
 * above the keyboard instead of being hidden behind it.
 */
export function useKeyboardFit(active: boolean): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) return
    const root = document.documentElement
    const fit = () => {
      root.style.setProperty('--vvh', `${vv.height}px`)
      root.style.setProperty('--vvt', `${vv.offsetTop}px`)
      // iOS scrolls the page to reveal the input; keep it pinned at the top
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
      root.style.removeProperty('--vvh')
      root.style.removeProperty('--vvt')
    }
  }, [active])
}
