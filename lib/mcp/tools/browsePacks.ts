import { getPacks, getRelatedPacks } from '../../packs'
import { formatInstalls } from '../../categories'
import { text, type Tool } from '../types'
import { track } from '../../telemetry/track'
import type { Pack } from '../../types'

interface BrowsePacksArgs {
  query?: string
  category?: string
  limit?: number
}

export const browsePacks: Tool<BrowsePacksArgs> = {
  definition: {
    name: 'browse_packs',
    annotations: { title: 'Browse packs', readOnlyHint: true },
    description:
      'Browse curated skill packs — themed bundles of multiple skills that install together. Use when the user wants a set of related skills for a specific role or workflow (e.g. "marketing skills", "startup pack", "engineering workflow").',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: {
          type: 'string',
          enum: ['coding', 'writing', 'research', 'productivity', 'data', 'design', 'business', 'personal', 'mixed'],
          description: 'Filter by category',
        },
        limit: { type: 'number', description: 'Number of results (default 5, max 10)' },
      },
    },
  },
  async handler(args, ctx) {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 10)
    const { packs } = await getPacks({ query: args.query, category: args.category as never, limit })

    // Auto-retry on a sparse keyword match with the closest embedding matches so
    // a vocabulary-gap query isn't a dead end (mirrors browse_skills). Gated to
    // free-text, uncategorised searches so the embedding call only fires when it
    // can help.
    let related: Pack[] = []
    if (args.query?.trim() && !args.category && packs.length < limit) {
      related = await getRelatedPacks(args.query, {
        excludeIds: packs.map((p) => p.id),
        limit: limit - packs.length,
      })
    }

    void track(
      {
        name: 'pack_browsed',
        properties: {
          ...(args.query ? { query: args.query } : {}),
          ...(args.category ? { category: args.category } : {}),
          result_count: packs.length + related.length,
          keyword_count: packs.length,
          ...(related.length ? { related_count: related.length } : {}),
        },
      },
      { source: 'mcp', userToken: ctx.userToken, sessionId: ctx.userToken, context: ctx.context }
    )

    if (packs.length === 0 && related.length === 0) {
      return text('No packs found. Try browsing individual skills with browse_skills instead.')
    }

    const all = [...packs, ...related]
    const lines = all.map((p, i) => {
      // Skills count and category always; installs only when real (hide-until-real).
      const stats = [`${p.skill_count ?? '?'} skills`]
      if (p.install_count > 0) stats.push(`${formatInstalls(p.install_count)} installs`)
      stats.push(p.category)
      const relatedTag = i >= packs.length ? ' · related' : ''
      return [
        `${i + 1}. ${p.name}${p.verified ? ' · verified' : ''}${relatedTag}`,
        `   ${p.tagline}`,
        `   ${stats.join(' · ')}`,
        `   pack_id: ${p.id}`,
      ].join('\n')
    })

    const header =
      related.length && packs.length === 0
        ? `No exact matches — here ${related.length === 1 ? 'is' : 'are'} ${related.length} related pack${related.length === 1 ? '' : 's'}:`
        : `Found ${all.length} pack${all.length === 1 ? '' : 's'}${related.length ? ` (${related.length} related)` : ''}:`

    return text(
      `${header}\n\n${lines.join('\n\n')}\n\nTo install a pack and all its skills, call install_pack with its pack_id.`
    )
  },
}
