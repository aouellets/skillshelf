'use client'

import { useState, useRef } from 'react'
import type { Skill } from '@/lib/types'

interface Props {
  skill: Pick<Skill, 'name' | 'thumbnail_url' | 'thumbnail_gif' | 'thumbnail_video' | 'media_alt'>
  size?: 'card' | 'detail'
}

const ASPECT: Record<'card' | 'detail', string> = {
  card: 'aspect-[16/9]',
  detail: 'aspect-[2/1]',
}

/**
 * Renders a skill (or pack) thumbnail with animation on hover.
 * Priority: video loop > animated GIF > static image > generated placeholder.
 * Falls back gracefully at every level — no broken image states.
 */
export function SkillThumbnail({ skill, size = 'card' }: Props) {
  const [hovering, setHovering] = useState(false)
  const [gifError, setGifError] = useState(false)
  const [staticError, setStaticError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const alt = skill.media_alt ?? `${skill.name} skill preview`

  const hasStatic = Boolean(skill.thumbnail_url) && !staticError
  const hasGif = Boolean(skill.thumbnail_gif) && !gifError
  const hasVideo = Boolean(skill.thumbnail_video)
  const hasAnyMedia = hasStatic || hasGif || hasVideo

  function handleMouseEnter() {
    setHovering(true)
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }

  function handleMouseLeave() {
    setHovering(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  if (!hasAnyMedia) {
    return <SkillPlaceholder name={skill.name} size={size} />
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-shelf-void ${ASPECT[size]}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Static image — always rendered as base layer */}
      {hasStatic && (
        <img
          src={skill.thumbnail_url!}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            hovering && (hasGif || hasVideo) ? 'opacity-0' : 'opacity-100'
          }`}
          onError={() => setStaticError(true)}
          loading="lazy"
        />
      )}

      {/* Animated GIF — shown on hover, hidden at rest */}
      {hasGif && (
        <img
          src={skill.thumbnail_gif!}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            hovering ? 'opacity-100' : 'opacity-0'
          }`}
          onError={() => setGifError(true)}
          loading="lazy"
        />
      )}

      {/* Video loop — shown on hover, muted autoplay */}
      {hasVideo && !hasGif && (
        <video
          ref={videoRef}
          src={skill.thumbnail_video!}
          aria-label={alt}
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            hovering ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Play hint overlay — appears briefly on hover when animation exists */}
      {(hasGif || hasVideo) && hovering && (
        <div className="pointer-events-none absolute bottom-2 right-2">
          <span className="rounded border border-shelf-border bg-shelf-void/80 px-1.5 py-0.5 font-mono text-xs text-shelf-text-tertiary">
            preview
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Generated placeholder — shown when no media is provided.
 * Uses the skill name to pick a stable color and renders the first letter.
 */
function SkillPlaceholder({ name, size }: { name: string; size: 'card' | 'detail' }) {
  // Stable color from first char code — cycles through 8 category colors
  const colors = [
    ['#2D2417', '#E8A832'], // amber
    ['#1A1F2E', '#4FC4CF'], // teal
    ['#1A2620', '#6EC97A'], // green
    ['#1E1B2E', '#9B8FFF'], // purple
    ['#1C2435', '#4A90D9'], // blue
    ['#2A1C17', '#E87C52'], // coral
    ['#271A27', '#CF7FC9'], // pink
    ['#1C1E1A', '#A0A89A'], // gray-green
  ]
  const idx = (name.charCodeAt(0) || 0) % colors.length
  const [bg, fg] = colors[idx]

  return (
    <div
      className={`flex w-full items-center justify-center ${ASPECT[size]}`}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      <span
        className="select-none font-display text-5xl font-normal opacity-40"
        style={{ color: fg }}
      >
        {(name.trim().charAt(0) || '?').toUpperCase()}
      </span>
    </div>
  )
}
