import Link from 'next/link'
import { DemoVideo } from './DemoVideo'
import type { MediaAsset } from '@/lib/types'

/** A subject's main Demo section. Renders nothing when there's no video. */
export function DemoSection({
  demo,
  title = 'Demo',
}: {
  demo: MediaAsset | null
  title?: string
}) {
  if (!demo) return null
  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium text-shelf-text-primary">{title}</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-shelf-border">
        <DemoVideo
          url={demo.url}
          posterUrl={demo.poster_url}
          width={demo.width}
          height={demo.height}
        />
      </div>
      <p className="mt-2 text-xs text-shelf-text-tertiary">Click to play with sound.</p>
    </section>
  )
}

/** A pack's member-skill demo gallery. Shows only members that have a video. */
export function DemoGallery({
  items,
}: {
  items: { slug: string; name: string; demo: MediaAsset }[]
}) {
  if (items.length === 0) return null
  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium text-shelf-text-primary">
        Skill demos ({items.length})
      </h2>
      <p className="mt-1 text-sm text-shelf-text-tertiary">
        See each skill in this pack in action.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/skill/${it.slug}`}
            className="group block overflow-hidden rounded-lg border border-shelf-border transition-colors hover:border-shelf-border-strong"
          >
            <DemoVideo
              url={it.demo.url}
              posterUrl={it.demo.poster_url}
              width={it.demo.width}
              height={it.demo.height}
              playMode="hover"
              interactive={false}
              rounded={false}
            />
            <div className="px-3 py-2 text-sm text-shelf-text-secondary group-hover:text-shelf-text-primary">
              {it.name}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
