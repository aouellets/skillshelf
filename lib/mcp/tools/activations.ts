import type { Skill } from '../../types'
import type { TelemetryEvent } from '../../telemetry/events'

/**
 * The minimal shape `get_active_skills` loads per install: the embedded catalog
 * skill (or null when the row's skill was deleted). Kept structural so the tool
 * can pass its own `ActiveRow[]` straight in.
 */
export type LoadedInstall = {
  skills: Pick<Skill, 'id' | 'name' | 'category' | 'skill_content'> | null
}

/** A `skill_activated` event, narrowed from the canonical telemetry union. */
export type SkillActivatedEvent = Extract<TelemetryEvent, { name: 'skill_activated' }>

/**
 * Build one `skill_activated` event per loaded installed skill — the per-skill
 * fan-out that IS the active-use signal. Pure and side-effect-free so the
 * activation count is unit-testable: N installed skills (each with a catalog id)
 * => N events, with the exact `{ skill_id }` property shape the schema requires.
 *
 * Returns `skipped`, the number of loaded skills that carried no id (so none
 * could be emitted). The previous emit filtered those away SILENTLY, which let
 * the activation metric under-count with no trace; surfacing the count lets the
 * caller log it instead of dropping it on the floor.
 */
export function buildActivationEvents(loaded: LoadedInstall[]): {
  events: SkillActivatedEvent[]
  skipped: number
} {
  const events: SkillActivatedEvent[] = []
  let skipped = 0
  for (const row of loaded) {
    const id = row.skills?.id
    if (id) {
      events.push({ name: 'skill_activated', properties: { skill_id: id } })
    } else {
      skipped++
    }
  }
  return { events, skipped }
}
