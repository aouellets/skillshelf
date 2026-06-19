import type { Metadata } from 'next'
import Link from 'next/link'
import { PackSubmitForm } from '@/components/PackSubmitForm'

export const metadata: Metadata = {
  title: 'Submit a Pack',
  description:
    'Curate a pack of Claude skills and submit it to the Skill Me catalog. Reviewed, then available to every user.',
  twitter: { card: 'summary_large_image' },
}

export default function SubmitPackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-shelf-text-tertiary">
        Contribute
      </p>
      <h1 className="mt-3 font-display text-5xl text-shelf-text-primary">Submit a pack</h1>
      <p className="mt-4 text-lg text-shelf-text-secondary">
        A pack is a curated bundle of existing skills around a theme or workflow.
        Pick the skills, describe the pack, and it enters the review queue.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-medium text-shelf-text-primary">Submit directly</h2>
        <p className="mt-2 text-sm text-shelf-text-secondary">
          Packs reference skills already in the catalog, so there&apos;s no safety
          review — a human just checks the curation before publishing.
        </p>
        <div className="mt-5">
          <PackSubmitForm />
        </div>
      </section>

      <section className="mt-10 card p-5">
        <h2 className="text-base font-medium text-shelf-text-primary">
          Submitting a skill instead?
        </h2>
        <p className="mt-2 text-sm text-shelf-text-secondary">
          Individual skills go through{' '}
          <Link href="/submit" className="text-accent hover:text-accent-hover">
            Submit a skill
          </Link>
          . If a skill you want isn&apos;t in the catalog yet, submit it first, then
          add it to a pack.
        </p>
      </section>
    </div>
  )
}
