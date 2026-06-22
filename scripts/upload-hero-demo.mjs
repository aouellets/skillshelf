/**
 * One-shot: publish the new consumer hero film as the landing-page platform
 * demo. Uploads the MP4 + poster to the `demos` storage bucket under a
 * date-versioned path (cache-busts the CDN), then repoints the existing
 * media_assets landscape row (subject platform/skillme) at the new files.
 *
 *   node scripts/upload-hero-demo.mjs
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')

const sb = createClient(url, key, { auth: { persistSession: false } })

const BUCKET = 'demos'
const stamp = '2026-06-21-hero'
const VIDEO_KEY = `platform/skillme/landscape-${stamp}.mp4`
const POSTER_KEY = `platform/skillme/landscape-${stamp}.jpg`
const BASE = 'remotion-skillme-ai-engineer/out'

async function up(localPath, key, contentType) {
  const body = readFileSync(localPath)
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(key, body, { contentType, upsert: true, cacheControl: '31536000' })
  if (error) throw new Error(`upload ${key}: ${error.message}`)
  const { data } = sb.storage.from(BUCKET).getPublicUrl(key)
  console.log(`✓ uploaded ${key}`)
  return data.publicUrl
}

const videoUrl = await up(`${BASE}/skillme-hero.mp4`, VIDEO_KEY, 'video/mp4')
const posterUrl = await up(`${BASE}/skillme-hero-poster.jpg`, POSTER_KEY, 'image/jpeg')

const { data, error } = await sb
  .from('media_assets')
  .update({ url: videoUrl, poster_url: posterUrl, width: 1920, height: 1080 })
  .eq('subject_type', 'platform')
  .eq('subject_slug', 'skillme')
  .eq('orientation', 'landscape')
  .select('id, url, poster_url')

if (error) throw new Error(`update row: ${error.message}`)
console.log('✓ media_assets landscape row repointed:', JSON.stringify(data, null, 2))
