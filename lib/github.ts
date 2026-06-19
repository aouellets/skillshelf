/**
 * Live GitHub star counts for pack repos. Fetched from the GitHub REST API and
 * cached for an hour (Next fetch revalidate) so pack pages never hit the API on
 * every render or blow the rate limit. Returns null on any error — a missing
 * repo or API hiccup just hides the count rather than breaking the page.
 *
 * Set GITHUB_TOKEN to lift the unauthenticated 60 req/hr limit to 5000; it is
 * optional and read-only (public repo metadata).
 */
const GH_API = 'https://api.github.com'
const STARS_TTL_SECONDS = 3600

/** Parse `owner/repo` from a github.com URL; null if it isn't one. */
export function parseRepo(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(repoUrl)
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null
    const [owner, repo] = u.pathname.replace(/^\/+|\/+$/g, '').split('/')
    if (!owner || !repo) return null
    return { owner, repo: repo.replace(/\.git$/, '') }
  } catch {
    return null
  }
}

/** Current stargazer count for a pack's repo, or null if unavailable. */
export async function getRepoStars(repoUrl: string | null | undefined): Promise<number | null> {
  if (!repoUrl) return null
  const parsed = parseRepo(repoUrl)
  if (!parsed) return null

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'skillme',
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  try {
    const res = await fetch(`${GH_API}/repos/${parsed.owner}/${parsed.repo}`, {
      headers,
      next: { revalidate: STARS_TTL_SECONDS },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null
  } catch {
    return null
  }
}
