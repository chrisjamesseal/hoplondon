import { useEffect, useState, type ReactNode } from 'react'

export function ProgressBar({ value, color = 'green', height = 16, label }: { value: number; color?: 'green' | 'gold' | 'blue' | 'red' | 'amber'; height?: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className="pbar" style={{ height }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`pbar-fill ${color}`} style={{ width: `${pct}%` }}>
        {pct > 6 && <span className="pbar-shine" />}
      </div>
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function Confetti() {
  const colours = ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff', '#ff9600']
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 60 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colours[i % colours.length],
            animationDelay: `${(i % 12) * 0.08}s`,
            animationDuration: `${2.2 + (i % 5) * 0.3}s`,
            transform: `rotate(${i * 29}deg)`,
          }}
        />
      ))}
    </div>
  )
}

/** A number that ticks up to its value, instantly when motion is reduced */
export function CountUp({ value, from = 0, ms = 700 }: { value: number; from?: number; ms?: number }) {
  const [shown, setShown] = useState(from)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || from === value) return setShown(value)
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, from, ms])
  return <b className="count-up">{shown}</b>
}
