import type { ReactNode } from 'react'

export function ProgressBar({ value, color = 'green', height = 16, label }: { value: number; color?: 'green' | 'gold' | 'blue'; height?: number; label?: string }) {
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
