import { getServiceSupabase } from '../../supabase'
import { json, type Tool } from '../types'
import { buildRow, insertEvents } from '../../telemetry/track'
import { buildActivationEvents, type LoadedInstall } from './activations'

type ActiveRow = LoadedInstall

export const getActiveSkills: Tool = {
  definition: {
    name: 'get_active_skills',
    annotations: { title: 'Load installed skills', readOnlyHint: true },
    description:
      'Call this ONCE at the very start of every new conversation, before replying — it is read-only, needs no arguments, and is safe to call proactively. Returns the full content of every skill the user installed so they apply for this whole session; skipping it means their installed skills do nothing. If none are installed it returns empty, so calling it is never wasted.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  async handler(_args, ctx) {
    const supabase = getServiceSupabase()
    if (!supabase || !ctx.userToken) {
      // Anonymous (no user_token) or unconfigured sessions have no installed
      // library to load, so there is nothing to activate — by design they emit
      // no skill_activated. Activation is scoped to signed-in callers with at
      // least one installed catalog skill (see docs/telemetry.md).
      return json({
        installed: [],
        message: 'Skill Me is connected. Say "browse skills" to explore the catalog.',
      })
    }

    const { data, error } = await supabase
      .from('user_installs')
      .select('skills(id, name, category, skill_content)')
      .eq('user_token', ctx.userToken)
      .eq('active', true)

    if (error) {
      // Never fail the start-of-conversation call with a raw DB error — degrade
      // to an empty library so the session can continue.
      console.error('get_active_skills query failed:', error.message)
      return json({
        installed: [],
        message:
          'Skill Me is connected, but your library could not be loaded right now. Say "browse skills" to explore the catalog.',
      })
    }

    const rows = (data ?? []) as unknown as ActiveRow[]
    const loaded = rows.filter((r) => r.skills)
    const installed = loaded.map((r) => ({
      name: r.skills!.name,
      category: r.skills!.category,
      content: r.skills!.skill_content,
    }))

    // Telemetry: skill_activated is the TRUE active-use signal — emitted here,
    // when installed skills are actually loaded into a session (distinct from
    // install). One event per loaded skill. This is the primary retention
    // signal, so the emit is resilient (never breaks the start-of-conversation
    // response) but NOT silent: a dropped batch or a skill with no id is logged
    // rather than swallowed, so under-counting can't regress unnoticed again.
    const { events, skipped } = buildActivationEvents(loaded)
    if (skipped > 0) {
      console.warn(
        `[telemetry] skill_activated: ${skipped} loaded skill(s) had no id; not emitted`
      )
    }
    if (events.length > 0) {
      const opts = {
        source: 'mcp' as const,
        userToken: ctx.userToken,
        sessionId: ctx.userToken,
        context: ctx.context,
      }
      const eventRows = events.map((e) => buildRow(e, opts))
      // Fire-and-forget for the response, but the write is registered with
      // Next's after() inside insertEvents (the serverless waitUntil), so it
      // survives the function suspending right after we return. Log on a full
      // drop instead of failing the call.
      void insertEvents(eventRows)
        .then((written) => {
          if (written < eventRows.length) {
            console.warn(
              `[telemetry] skill_activated: wrote ${written}/${eventRows.length} events`
            )
          }
        })
        .catch((err) => {
          console.error(
            '[telemetry] skill_activated emit failed:',
            err instanceof Error ? err.message : 'unknown error'
          )
        })
    }

    if (installed.length === 0) {
      return json({
        installed: [],
        message:
          'No skills installed yet. Say "browse skills" to explore the Skill Me catalog and install some.',
      })
    }

    return json({
      installed,
      message: `Loaded ${installed.length} installed skill(s). Apply them throughout this conversation.`,
    })
  },
}
