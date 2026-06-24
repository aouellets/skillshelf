import { getSkills, getRelatedSkills } from '../../data'
import { formatInstalls, isCategory } from '../../categories'
import { text, type Tool } from '../types'
import { track } from '../../telemetry/track'
import type { Skill } from '../../types'

interface BrowseArgs {
  query?: string
  category?: string
  limit?: number
  featured?: boolean
}

export const browseSkills: Tool<BrowseArgs> = {
  definition: {
    name: 'browse_skills',
    annotations: { title: 'Browse skills', readOnlyHint: true },
    description:
      'Browse and search the Skill Me catalog. Returns skills matching the query with name, description, category, install count, and skill_id. Use this when the user wants to discover, find, or explore Claude skills.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — what the skill should help with',
        },
        category: {
          type: 'string',
          enum: [
            'coding',
            'writing',
            'research',
            'productivity',
            'data',
            'design',
            'business',
            'personal',
          ],
          description: 'Filter by category (optional)',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (default 5, max 10)',
        },
        featured: {
          type: 'boolean',
          description: 'Return only featured/curated skills',
        },
      },
    },
  },
  async handler(args, ctx) {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 10)
    const category =
      args.category && isCategory(args.category) ? args.category : undefined

    const { skills } = await getSkills({
      query: args.query,
      category,
      featured: args.featured,
      sort: 'trending',
      limit,
    })

    // Auto-retry on a sparse keyword match: top up with the closest embedding
    // matches so a vocabulary-gap or niche query isn't a dead end (mirrors the
    // website /api/skills semantic fallback). Gated to free-text, uncategorised,
    // non-featured searches so the extra embedding call only fires when it helps.
    let related: Skill[] = []
    if (args.query?.trim() && !category && !args.featured && skills.length < limit) {
      related = await getRelatedSkills(args.query, {
        excludeIds: skills.map((s) => s.id),
        limit: limit - skills.length,
      })
    }

    void track(
      {
        name: 'skill_browsed',
        properties: {
          ...(args.query ? { query: args.query } : {}),
          ...(category ? { category } : {}),
          // result_count is what we actually surfaced (keyword + semantic retry)
          // so a true zero means we showed nothing; the breakdown stays visible.
          result_count: skills.length + related.length,
          keyword_count: skills.length,
          ...(related.length ? { related_count: related.length } : {}),
        },
      },
      { source: 'mcp', userToken: ctx.userToken, sessionId: ctx.userToken, context: ctx.context }
    )

    if (skills.length === 0 && related.length === 0) {
      const what = args.query ? ` for "${args.query}"` : ''
      return text(
        `No skills found${what}. Try a broader search, or ask to "browse skills" with no filter to see what's popular.`
      )
    }

    const all = [...skills, ...related]
    const lines = all.map((s, i) => {
      const verified = s.verified ? ' · verified' : ''
      // Tag semantic-retry results so the caller knows they're a looser match.
      const relatedTag = i >= skills.length ? ' · related' : ''
      // Only surface metrics that reflect real engagement (hide-until-real).
      const stats: string[] = []
      if (s.install_count > 0) stats.push(`${formatInstalls(s.install_count)} installs`)
      if (s.rating_count > 0) stats.push(`rating ${s.rating_avg.toFixed(1)}`)
      return [
        `${i + 1}. ${s.name} — ${s.category}${verified}${relatedTag}`,
        `   ${s.description}`,
        ...(stats.length ? [`   ${stats.join(' · ')}`] : []),
        `   skill_id: ${s.id}`,
      ].join('\n')
    })

    const header =
      related.length && skills.length === 0
        ? `No exact matches — here ${related.length === 1 ? 'is' : 'are'} ${related.length} related skill${related.length === 1 ? '' : 's'}:`
        : `Found ${all.length} skill${all.length === 1 ? '' : 's'}${related.length ? ` (${related.length} related)` : ''}:`
    const footer =
      'To install one, call install_skill with its skill_id (or say "install the [name] skill").'

    return text(`${header}\n\n${lines.join('\n\n')}\n\n${footer}`)
  },
}
