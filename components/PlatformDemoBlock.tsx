import { DemoVideo } from './DemoVideo'
import type { MediaAsset } from '@/lib/types'

/**
 * The platform film, surfaced responsively: the recomposed landscape cut on
 * desktop, the portrait cut on phones. Falls back to whichever orientation
 * exists, and renders nothing when neither is published.
 */
export function PlatformDemoBlock({
  landscape,
  portrait,
}: {
  landscape: MediaAsset | null
  portrait: MediaAsset | null
}) {
  if (!landscape && !portrait) return null
  const desktop = landscape ?? portrait
  const mobile = portrait ?? landscape

  return (
    <div className="overflow-hidden rounded-xl border border-shelf-border bg-shelf-surface shadow-glow">
      {desktop && (
        <div className="hidden sm:block">
          <DemoVideo
            url={desktop.url}
            posterUrl={desktop.poster_url}
            width={desktop.width}
            height={desktop.height}
            rounded={false}
          />
        </div>
      )}
      {mobile && (
        <div className="mx-auto block max-w-[440px] sm:hidden">
          <DemoVideo
            url={mobile.url}
            posterUrl={mobile.poster_url}
            width={mobile.width}
            height={mobile.height}
            rounded={false}
          />
        </div>
      )}
    </div>
  )
}
