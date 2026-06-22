import { NextRequest } from 'next/server'
import { getPacks } from '@/lib/packs'
import { isPackCategory } from '@/lib/categories'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams

  const query = params.get('q') ?? undefined
  const categoryParam = params.get('category') ?? undefined
  const limit = Number(params.get('limit') ?? 24)
  const offset = Number(params.get('offset') ?? 0)

  const category =
    categoryParam && isPackCategory(categoryParam) ? categoryParam : undefined

  try {
    const { packs, total } = await getPacks({
      query,
      category,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 96) : 24,
      offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
    })

    return Response.json({ packs, total })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message, packs: [], total: 0 }, { status: 500 })
  }
}
