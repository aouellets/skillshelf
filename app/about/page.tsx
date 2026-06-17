import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description:
    'SkillShelf is the App Store for Claude skills — browse a curated catalog and install skills from inside Claude with one MCP connection.',
}

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'What is a Claude skill?',
    a: 'A skill is a reusable instruction set, written in the open SKILL.md format, that teaches Claude how to do a specific job — write a LinkedIn post, debug SQL, run a market-research pass. Once installed, a skill loads automatically at the start of every conversation.',
  },
  {
    q: 'How do I install a skill?',
    a: (
      <>
        Connect the SkillShelf MCP to claude.ai once (
        <Link href="/connect" className="text-accent hover:text-accent-hover">
          30-second guide
        </Link>
        ), then just ask: &ldquo;show me writing skills&rdquo; and &ldquo;install it&rdquo;.
        No ZIP files, no terminal, no copy-pasting.
      </>
    ),
  },
  {
    q: 'Is it free?',
    a: 'Yes. SkillShelf is free to use and the full MCP server and web catalog are open source under the MIT license. You can self-host your own private instance.',
  },
  {
    q: 'Are the skills safe?',
    a: 'Every skill in the catalog is reviewed for prompt injection and hidden instructions before publishing. No catalog skill can exfiltrate your data or override Claude’s behavior.',
  },
  {
    q: 'Do skills work outside claude.ai?',
    a: 'Skills use the open SKILL.md format, which is compatible with Claude Code, Cursor, Gemini CLI, and OpenAI Codex. Skills you discover here work across those tools too.',
  },
  {
    q: 'Can I submit my own skill?',
    a: (
      <>
        Yes — see the{' '}
        <Link href="/submit" className="text-accent hover:text-accent-hover">
          submission guide
        </Link>
        . Authors are credited and linked back to their GitHub.
      </>
    ),
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
        About
      </p>
      <h1 className="mt-3 font-display text-5xl text-shelf-text-primary">
        The App Store for Claude Skills
      </h1>
      <p className="mt-4 text-lg text-shelf-text-secondary">
        The Claude skills ecosystem exploded in 2026 — thousands of community skills live on
        GitHub. But getting them still means finding a repo, downloading a file, and uploading
        a ZIP, over and over. That&rsquo;s the developer path. SkillShelf is the consumer path:
        one MCP connection, then browse and install from inside Claude in plain English.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ['Open source', 'MIT licensed and self-hostable. The full MCP server and web catalog are on GitHub.'],
          ['Safety reviewed', 'Every skill is reviewed for prompt injection and hidden instructions before publishing.'],
          ['Open standard', 'Skills use the SKILL.md format — compatible with Claude Code, Cursor, Gemini CLI, and Codex.'],
        ].map(([title, body]) => (
          <div key={title} className="card p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
              {title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-shelf-text-secondary">{body}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-3xl text-shelf-text-primary">FAQ</h2>
      <dl className="mt-6 space-y-4">
        {FAQ.map(({ q, a }) => (
          <div key={q} className="card p-5">
            <dt className="text-base font-medium text-shelf-text-primary">{q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-shelf-text-secondary">{a}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/connect" className="btn btn-primary">
          Connect to Claude
        </Link>
        <Link href="/browse" className="btn btn-secondary">
          Browse Skills →
        </Link>
      </div>
    </div>
  )
}
