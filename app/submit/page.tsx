import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Submit a skill',
  description:
    'Submit your Claude skill to SkillShelf. Open a pull request on GitHub or request a skill you wish existed.',
}

const GITHUB_NEW_ISSUE =
  'https://github.com/aouellets/skillshelf/issues/new?title=Skill%20submission'
const GITHUB_REPO = 'https://github.com/aouellets/skillshelf'

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
        Contribute
      </p>
      <h1 className="mt-3 font-display text-5xl text-shelf-text-primary">Submit a skill</h1>
      <p className="mt-4 text-lg text-shelf-text-secondary">
        Built something useful? Add it to the catalog. Authors are credited and linked back to
        their GitHub. We review every submission for safety and publish within a few days.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Path 1 — Pull request */}
        <div className="card flex flex-col p-6">
          <span className="font-mono text-sm text-accent">01</span>
          <h2 className="mt-3 text-lg font-medium text-shelf-text-primary">
            Open a pull request
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-shelf-text-secondary">
            Add your <code className="font-mono text-accent">SKILL.md</code> to the catalog
            repository and open a PR. This is the fastest path if you already have the skill
            written and want full control over the listing.
          </p>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-4 self-start"
          >
            Open the repo →
          </a>
        </div>

        {/* Path 2 — Request / submit via issue */}
        <div className="card flex flex-col p-6">
          <span className="font-mono text-sm text-accent">02</span>
          <h2 className="mt-3 text-lg font-medium text-shelf-text-primary">
            Submit or request via GitHub
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-shelf-text-secondary">
            Not ready to write the file yourself? Open an issue describing the skill — paste a
            link to an existing repo, or tell us what skill you wish existed and we&rsquo;ll
            build it.
          </p>
          <a
            href={GITHUB_NEW_ISSUE}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-4 self-start"
          >
            Open an issue →
          </a>
        </div>
      </div>

      <div className="card mt-8 border-accent-border bg-accent-dim p-5">
        <p className="text-sm text-accent-hover">
          New to the SKILL.md format? Read the{' '}
          <Link href="/skill-media-guide" className="underline">
            media &amp; authoring guide
          </Link>{' '}
          — skills with animated previews get noticeably more installs.
        </p>
      </div>

      <div className="mt-10">
        <Link href="/browse" className="btn btn-secondary">
          Browse the catalog →
        </Link>
      </div>
    </div>
  )
}
