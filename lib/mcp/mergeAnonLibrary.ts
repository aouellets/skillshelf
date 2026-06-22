import 'server-only'
import { getServiceSupabase } from '../supabase'

/**
 * Fold an anonymous connector library (`mcp_<uuid>` subject) into a signed-in
 * account library (`auth:<id>`).
 *
 * WHY: identity is fixed once, at the OAuth authorize step. A user who connects
 * the MCP before signing in to Skill Me is bound to a throwaway anonymous
 * subject, and any skills they install land under it — disjoint from the
 * `auth:<id>` library their website installs use. When that same browser later
 * authorizes while signed in (we recognise it by the `skillme_anon_sub` cookie),
 * this reclaims those stranded rows instead of leaving them orphaned.
 *
 * Delegates to the `merge_user_library` RPC (migration 0014), which re-keys
 * EVERY user-owned table (installs, pack installs, favorites, collections,
 * reviews) conflict-safely in one place — the account row always wins, and a
 * re-run is a no-op. Best-effort and never throws: a failed merge must not break
 * the sign-in/connect flow.
 *
 * Returns the total number of rows migrated across all tables (0 when there is
 * nothing to do, the identities are the wrong shape, or anything fails).
 */
export async function mergeAnonLibrary(
  anonSub: string,
  accountToken: string
): Promise<number> {
  // Guard the shapes: only ever move FROM an anonymous subject INTO an account.
  if (!anonSub.startsWith('mcp_') || !accountToken.startsWith('auth:')) return 0

  const supabase = getServiceSupabase()
  if (!supabase) return 0

  try {
    const { data, error } = await supabase.rpc('merge_user_library', {
      p_from: anonSub,
      p_to: accountToken,
    })
    if (error) {
      console.error('mergeAnonLibrary rpc failed:', error.message)
      return 0
    }
    // The RPC returns per-table moved counts as jsonb, e.g.
    // { user_installs: 2, user_favorites: 0, ... }. Sum them for the caller.
    const counts = (data ?? {}) as Record<string, unknown>
    return Object.values(counts).reduce<number>(
      (sum, v) => sum + (typeof v === 'number' ? v : 0),
      0
    )
  } catch (err) {
    console.error(
      'mergeAnonLibrary failed:',
      err instanceof Error ? err.message : 'unknown error'
    )
    return 0
  }
}
