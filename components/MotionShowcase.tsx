'use client'

import { useState, type CSSProperties } from 'react'
import { Reveal } from '@/components/Reveal'

/** Easing set — each curve mapped to the job it does. */
const EASINGS = [
  { token: '--ease-entrance', label: 'entrance', curve: 'cubic-bezier(0.16, 1, 0.3, 1)', role: 'Things appearing, lifting, revealing. The signature curve.' },
  { token: '--ease-exit', label: 'exit', curve: 'cubic-bezier(0.4, 0, 1, 1)', role: 'Things leaving — accelerate away. ~0.75× the entrance.' },
  { token: '--ease-move', label: 'move', curve: 'cubic-bezier(0.4, 0, 0.2, 1)', role: 'Already on screen, going A→B. Both ends anchored.' },
  { token: '--ease-overshoot', label: 'overshoot', curve: 'cubic-bezier(0.34, 1.56, 0.64, 1)', role: 'Pops and confirmations — a touch past target, alive.' },
] as const

/** Duration scale — pick by element size and travel, never taste. */
const DURATIONS = [
  { token: '--dur-fast', label: 'fast', ms: 120, use: 'hovers, color, toggles, chips, nav' },
  { token: '--dur-base', label: 'base', ms: 200, use: 'card lift, most transitions (default)' },
  { token: '--dur-slow', label: 'slow', ms: 320, use: 'modals, sheets, route transition' },
  { token: '--dur-deliberate', label: 'deliberate', ms: 560, use: 'scroll reveals, first-run hero' },
] as const

const STAGGER_TILES = Array.from({ length: 8 })

export function MotionShowcase() {
  // Bumping the key remounts the animated demos so they replay from frame zero.
  const [run, setRun] = useState(0)

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* EASING CURVES */}
      <Reveal as="section">
        <SectionHead
          eyebrow="Easing"
          title="Four curves, one job each"
          body="The curve carries almost all of the perceived quality. Match it to what the element is doing — entrances decelerate, exits accelerate, on-screen moves ease both ends, lively pops overshoot."
        />
        <div key={`ease-${run}`} className="mt-8 grid gap-4 sm:grid-cols-2">
          {EASINGS.map((e) => (
            <div key={e.token} className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-sm text-accent">{e.label}</span>
                <code className="font-mono text-xs text-shelf-text-tertiary">{e.curve}</code>
              </div>
              <div className="motion-track relative mt-4 h-3.5 rounded-full bg-shelf-elevated">
                <span
                  className="motion-dot absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-accent shadow-glow"
                  style={{ ['--demo-ease' as string]: `var(${e.token})` } as CSSProperties}
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-shelf-text-secondary">{e.role}</p>
              <code className="mt-2 block font-mono text-xs text-shelf-text-tertiary">
                var({e.token})
              </code>
            </div>
          ))}
        </div>
      </Reveal>

      {/* DURATION SCALE */}
      <Reveal as="section">
        <SectionHead
          eyebrow="Duration"
          title="A scale, not magic numbers"
          body="Small and near moves fast; large and far moves slower. Nothing interactive exceeds ~560ms. Watch the bars fill at each token's speed."
        />
        <div key={`dur-${run}`} className="mt-8 space-y-3">
          {DURATIONS.map((d) => (
            <div key={d.token} className="card flex items-center gap-4 p-4">
              <div className="w-28 shrink-0">
                <div className="font-mono text-sm text-shelf-text-primary">{d.label}</div>
                <div className="font-mono text-xs text-shelf-text-tertiary">{d.ms}ms</div>
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-shelf-elevated">
                <div
                  className="motion-bar h-full w-full rounded-full bg-accent"
                  style={{ ['--demo-dur' as string]: `var(${d.token})` } as CSSProperties}
                />
              </div>
              <div className="hidden w-56 shrink-0 text-sm text-shelf-text-secondary sm:block">
                {d.use}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* STAGGER */}
      <Reveal as="section">
        <SectionHead
          eyebrow="Choreography"
          title="Stagger — arrive in sequence, not a flash"
          body="Lists and grids cascade their items by one stagger step (32ms), capped so a large grid never feels sluggish. This is how the catalog reveals on scroll."
        />
        <div key={`stagger-${run}`} className="mt-8 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {STAGGER_TILES.map((_, i) => (
            <div
              key={i}
              className="motion-stagger-item card flex aspect-square items-center justify-center font-mono text-xs text-shelf-text-tertiary"
              style={{ ['--stagger-index' as string]: i } as CSSProperties}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </Reveal>

      {/* INTERACTION GALLERY */}
      <Reveal as="section">
        <SectionHead
          eyebrow="Micro-interactions"
          title="The live gallery"
          body="Every control below runs the real production motion. Hover, press, and focus them."
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="card space-y-4 p-6">
            <p className="font-mono text-xs uppercase tracking-wide text-shelf-text-tertiary">
              Buttons — press for the sprung settle
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary">Connect to Claude</button>
              <button className="btn btn-secondary">Browse skills</button>
              <button className="btn btn-ghost">Ghost</button>
            </div>
            <p className="font-mono text-xs uppercase tracking-wide text-shelf-text-tertiary">
              Chips
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="chip chip-active">Active</span>
              <span className="chip">Coding</span>
              <span className="chip">Writing</span>
            </div>
            <p className="font-mono text-xs uppercase tracking-wide text-shelf-text-tertiary">
              Input — focus for the accent ring
            </p>
            <input className="input" placeholder="Search skills…" aria-label="Demo input" />
          </div>

          <div className="card card-interactive flex flex-col justify-center gap-2 p-6">
            <p className="font-mono text-xs uppercase tracking-wide text-shelf-text-tertiary">
              Card — hover to lift
            </p>
            <h3 className="font-display text-lg font-semibold text-shelf-text-primary">
              The whole tile rises 4px
            </h3>
            <p className="text-sm leading-relaxed text-shelf-text-secondary">
              The lit top edge warms to a vermilion hairline as it lifts — a secondary action
              reinforcing the rise. 200ms on the entrance curve.
            </p>
          </div>
        </div>
      </Reveal>

      {/* REPLAY + REDUCED MOTION */}
      <Reveal as="section">
        <div className="glass flex flex-col items-start justify-between gap-5 rounded-lg p-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-lg font-semibold text-shelf-text-primary">
              Replay the looping demos
            </h3>
            <p className="mt-1 text-sm text-shelf-text-secondary">
              Curves, bars, and the stagger above restart from frame zero.
            </p>
          </div>
          <button className="btn btn-primary shrink-0" onClick={() => setRun((r) => r + 1)}>
            Replay motion
          </button>
        </div>
        <div className="mt-4 rounded-lg border border-shelf-border bg-shelf-surface p-5">
          <p className="text-sm leading-relaxed text-shelf-text-secondary">
            <span className="font-semibold text-shelf-text-primary">Reduced motion is respected.</span>{' '}
            With your OS &ldquo;Reduce Motion&rdquo; setting on, a global safety net collapses every
            animation and transition on this page to an instant cut — content still appears, nothing
            is withheld, and the looping demos hold still. Try toggling it and reloading.
          </p>
        </div>
      </Reveal>
    </div>
  )
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-shelf-text-primary sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-base leading-relaxed text-shelf-text-secondary">{body}</p>
    </div>
  )
}
