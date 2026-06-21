'use client'

import { useEffect } from 'react'
import { track } from '@/lib/telemetry/client'

/**
 * Fires a `skill_viewed` telemetry event once when a skill detail page mounts.
 * Renders nothing. Best-effort — the client tracker buffers and never throws.
 */
export function SkillViewTracker({ skillId }: { skillId: string }) {
  useEffect(() => {
    track('skill_viewed', { skill_id: skillId })
  }, [skillId])
  return null
}
