import type { Metadata } from 'next'
import Link from 'next/link'
import { MotionShowcase } from '@/components/MotionShowcase'

export const metadata: Metadata = {
  title: 'Motion System',
  description:
    'The Skill Me motion language — the duration scale, easing curves, choreography, and micro-interactions that make the product feel alive, premium, and intentional.',
  openGraph: {
    title: 'Motion System · Skill Me',
    description: 'The duration scale, easing curves, and choreography behind the Skill Me feel.',
  },
}

export default function MotionPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
      {/* HERO */}
      <header className="fade-up max-w-3xl">
        <span className="eyebrow">Design system · Motion</span>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.02] tracking-tight text-shelf-text-primary sm:text-6xl">
          Motion with a job.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-shelf-text-secondary">
          Every animation here does work — it directs attention, shows cause and effect,
          expresses hierarchy, or softens a change. One token system drives all of it, so the
          whole product moves with a single, confident voice. This page is the living reference.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href="/browse" className="btn btn-primary">
            See it in the catalog
          </Link>
          <a
            href="https://github.com/aouellets/skillme/blob/main/docs/motion.md"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Read the spec
          </a>
        </div>
      </header>

      <div className="glow-line my-12 sm:my-16" />

      <MotionShowcase />
    </div>
  )
}
