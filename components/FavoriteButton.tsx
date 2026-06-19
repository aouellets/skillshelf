'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useFavorites } from './FavoritesProvider'

/**
 * Heart toggle backed by the FavoritesProvider. Two shapes:
 *   - 'icon'   : compact heart, for skill cards (overlaid top-right)
 *   - 'button' : full-width labelled button, for the skill detail sidebar
 * Signed-out users are routed to /login (with a next param) on click.
 */
export function FavoriteButton({
  skillId,
  variant = 'icon',
}: {
  skillId: string
  variant?: 'icon' | 'button'
}) {
  const { signedIn, isFavorited, toggle } = useFavorites()
  const router = useRouter()
  const pathname = usePathname()
  const favorited = isFavorited(skillId)

  async function onClick(e: React.MouseEvent) {
    // On cards the button sits inside a Link — don't navigate to the skill.
    e.preventDefault()
    e.stopPropagation()
    if (signedIn === false) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    await toggle(skillId)
  }

  const label = favorited ? 'Remove from favorites' : 'Save to favorites'

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-shelf-border bg-shelf-void/70 text-base backdrop-blur transition-colors hover:border-accent/60 ${
          favorited ? 'text-accent' : 'text-shelf-text-tertiary hover:text-accent'
        }`}
      >
        {favorited ? '♥' : '♡'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorited}
      className={`btn w-full ${favorited ? 'btn-secondary' : 'btn-ghost'}`}
    >
      <span className={favorited ? 'text-accent' : ''}>{favorited ? '♥' : '♡'}</span>
      <span className="ml-2">{favorited ? 'Saved to favorites' : 'Save to favorites'}</span>
    </button>
  )
}
