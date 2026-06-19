'use client'

import { useEffect, useState } from 'react'
import { CATEGORIES, CATEGORY_MAP } from '@/lib/categories'
import type { SkillCategory } from '@/lib/types'

/**
 * A looping, self-running "app store" demo for the hero. Each cycle it browses a
 * random category, types it into a search bar, slides in 1–2 real skills from
 * that category, and installs one with an amber
 * confirmation. Categories rotate in a shuffled order so every pass shows the
 * full breadth of the catalog. Pure state + CSS — no animation library.
 * Respects prefers-reduced-motion by rendering a static, representative state.
 */

interface PoolSkill {
  name: string
}

// 2–3 real catalog skills per category. The component randomly shows 1–2 each
// cycle, so over time visitors see something from every category.
const POOL: Record<SkillCategory, PoolSkill[]> = {
  coding: [
    { name: 'Karpathy Behavioral Rules' },
    { name: 'Code Review Checklist' },
    { name: 'Next.js App Router' },
  ],
  writing: [
    { name: 'LinkedIn Post Writer' },
    { name: 'Cold Email Craft' },
    { name: 'Tweet Thread Builder' },
  ],
  research: [
    { name: 'Deep Research' },
    { name: 'Fact Checker' },
    { name: 'Literature Review' },
  ],
  productivity: [
    { name: 'GTD System' },
    { name: 'Email Triage' },
    { name: 'Weekly Review' },
  ],
  data: [
    { name: 'SQL to Insights' },
    { name: 'Pandas Expert' },
    { name: 'SQL Query Optimizer' },
  ],
  design: [
    { name: 'UI/UX Pro Max' },
    { name: 'Color Accessibility' },
  ],
  business: [
    { name: 'Investor Update Writer' },
    { name: 'Go-to-Market Planner' },
    { name: 'Pricing Strategy' },
  ],
  personal: [
    { name: 'Meal Planner' },
    { name: 'Fitness Program' },
    { name: 'Life Coach' },
  ],
}

interface View {
  cat: SkillCategory
  query: string
  caret: boolean
  cards: PoolSkill[]
  shown: number
  installedIdx: number | null
  cycle: number
  fading: boolean
}

const FIRST: SkillCategory = 'coding'

const INITIAL: View = {
  cat: FIRST,
  query: '',
  caret: false,
  cards: [],
  shown: 0,
  installedIdx: null,
  cycle: 0,
  fading: false,
}

const STATIC: View = {
  cat: FIRST,
  query: 'coding skills',
  caret: false,
  cards: POOL.coding.slice(0, 2),
  shown: 2,
  installedIdx: 0,
  cycle: 0,
  fading: false,
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function HeroDemo() {
  const [v, setV] = useState<View>(INITIAL)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(STATIC)
      return
    }

    const ctrl = { cancelled: false }
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t)
          resolve()
        }, ms)
        timers.add(t)
      })

    const typeQuery = async (text: string, per = 48) => {
      for (let i = 1; i <= text.length; i++) {
        if (ctrl.cancelled) return
        setV((p) => ({ ...p, query: text.slice(0, i) }))
        await wait(per)
      }
    }

    const run = async () => {
      const slugs = CATEGORIES.map((c) => c.slug)
      let order = shuffle(slugs)
      let idx = 0
      let cycle = 0

      while (!ctrl.cancelled) {
        if (idx >= order.length) {
          order = shuffle(slugs)
          idx = 0
        }
        const cat = order[idx++]
        const count = Math.random() < 0.45 ? 1 : 2
        const picks = shuffle(POOL[cat]).slice(0, count)

        setV({
          cat,
          query: '',
          caret: true,
          cards: picks,
          shown: 0,
          installedIdx: null,
          cycle: ++cycle,
          fading: false,
        })
        await wait(450)
        await typeQuery(`${CATEGORY_MAP[cat].label.toLowerCase()} skills`)
        if (ctrl.cancelled) return
        setV((p) => ({ ...p, caret: false }))
        await wait(280)

        for (let i = 0; i < picks.length; i++) {
          if (ctrl.cancelled) return
          setV((p) => ({ ...p, shown: i + 1 }))
          await wait(380)
        }

        await wait(650)
        if (ctrl.cancelled) return
        setV((p) => ({ ...p, installedIdx: 0 }))
        await wait(2100)

        if (ctrl.cancelled) return
        setV((p) => ({ ...p, fading: true }))
        await wait(400)
      }
    }

    run()

    return () => {
      ctrl.cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [])

  const activeColor = CATEGORY_MAP[v.cat].color

  return (
    <div
      aria-hidden
      className="demo-panel glass edge-light relative flex min-h-[340px] flex-col gap-4 overflow-hidden rounded-lg p-5 sm:min-h-[380px] sm:p-6"
    >
      {/* header / window chrome */}
      <div className="flex items-center justify-between border-b border-shelf-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-accent text-[11px] font-bold text-accent-contrast">
            S
          </span>
          <span className="text-sm font-medium text-shelf-text-primary">Skill Me</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-shelf-text-tertiary">
          <span className="demo-live inline-block h-1.5 w-1.5 rounded-full bg-success" />
          Browsing
        </span>
      </div>

      <div
        className={`flex flex-1 flex-col gap-4 transition-opacity duration-300 ${
          v.fading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* search bar */}
        <div className="flex items-center gap-2 rounded-md border border-shelf-border bg-shelf-void px-3 py-2.5">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0 text-shelf-text-tertiary"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-shelf-text-primary">{v.query}</span>
          {v.caret && <span className="demo-caret" />}
        </div>

        {/* category rail */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = c.slug === v.cat
            return (
              <span
                key={c.slug}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors duration-300 ${
                  active
                    ? 'border-accent-border bg-accent-dim text-accent-hover'
                    : 'border-shelf-border text-shelf-text-tertiary'
                }`}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: c.color, opacity: active ? 1 : 0.5 }}
                />
                {c.label}
              </span>
            )
          })}
        </div>

        {/* results */}
        <div className="flex flex-col gap-2">
          {v.cards.slice(0, v.shown).map((skill, i) => {
            const installed = v.installedIdx === i
            return (
              <div
                key={`${v.cycle}-${i}`}
                className={`demo-result flex items-center justify-between gap-3 rounded-md border bg-shelf-elevated px-3 py-2.5 transition-colors duration-300 ${
                  installed ? 'border-accent-border' : 'border-shelf-border'
                }`}
                style={{
                  animationDelay: `${i * 60}ms`,
                  boxShadow: installed ? 'var(--shadow-glow)' : undefined,
                }}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: activeColor }}
                    />
                    <span className="truncate text-sm font-medium text-shelf-text-primary">
                      {skill.name}
                    </span>
                  </div>
                  <div className="pl-4 font-mono text-[11px] text-shelf-text-tertiary">
                    {CATEGORY_MAP[v.cat]?.label ?? v.cat}
                  </div>
                </div>

                {installed ? (
                  <span className="demo-installed flex shrink-0 items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-contrast">
                    <span className="text-[11px] font-bold">✓</span> Installed
                  </span>
                ) : (
                  <span className="shrink-0 rounded-md border border-shelf-muted px-2.5 py-1.5 text-xs font-medium text-shelf-text-secondary">
                    Install
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
