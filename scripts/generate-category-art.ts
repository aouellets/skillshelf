/**
 * Writes the per-category placeholder art to `public/category/<key>.svg` from
 * the shared definitions in `lib/category-art.ts`. These are the same SVGs the
 * thumbnail component renders inline; emitting files lets them be reused as
 * static assets (OG images, `thumbnail_url`, docs, manual sharing).
 *
 * Run with: npx tsx scripts/generate-category-art.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORY_ART, categoryThumbnailSvg } from '../lib/category-art'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'category')

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const keys = Object.keys(CATEGORY_ART)
  for (const key of keys) {
    writeFileSync(join(OUT_DIR, `${key}.svg`), categoryThumbnailSvg(key) + '\n')
  }
  console.log(`Wrote ${keys.length} category SVGs to public/category/: ${keys.join(', ')}`)
}

main()
