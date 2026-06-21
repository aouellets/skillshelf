/**
 * One-off bulk ingester for third-party PACKS (full ingestion).
 *
 * For each pack repo it enumerates every SKILL.md (scoped to the pack subtree),
 * fetches the real file, and emits a catalog entry grounded in the upstream
 * frontmatter (real name + description — the fields that power search and the
 * recommender) with an ORIGINAL framing body + source link. We do not copy
 * upstream bodies, so MIT / Apache / AGPL / unknown-license repos are all fine.
 *
 * Outputs:
 *   scripts/expansion-data/pack-<key>.json   — skills for each pack
 *   scripts/_pack-manifest.json              — pack metadata + resolved slugs
 *
 * Run:  npx tsx scripts/ingest-packs.ts   (then npm run build:catalog)
 */
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEED_SKILLS } from '../lib/seed-data'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, 'expansion-data')

type Cat = 'coding'|'writing'|'research'|'productivity'|'data'|'design'|'business'|'personal'
interface Pack {
  key: string; repo: string; branch: string; scope: string
  author: string; name: string; tagline: string; description: string
  category: Cat; tags: string[]
}
const PACKS: Pack[] = [
  { key:'science', repo:'K-Dense-AI/scientific-agent-skills', branch:'main', scope:'skills/', author:'K-Dense AI', name:'AI Scientist Toolkit', tagline:'Turn your agent into a research scientist across biology, chemistry, and medicine.', description:'A large library covering bioinformatics, computational biology, drug discovery, and scientific data tooling, plus 100+ scientific databases — the most-starred science skill collection.', category:'research', tags:['science','bioinformatics','ml','research'] },
  { key:'vercel', repo:'vercel-labs/agent-skills', branch:'main', scope:'skills/', author:'Vercel', name:'Vercel Agent Skills', tagline:"Vercel's official agent skills for building and shipping on the web.", description:"Vercel's official collection: deploy-to-Vercel, React best practices, view transitions, web design and writing guidelines, and CLI workflows.", category:'coding', tags:['vercel','react','frontend','deployment'] },
  { key:'addy', repo:'addyosmani/agent-skills', branch:'main', scope:'skills/', author:'Addy Osmani', name:'Production Engineering Skills', tagline:'Production-grade engineering practices for AI coding agents.', description:"Addy Osmani's suite for senior-level engineering: API design, code review, debugging, observability, performance, security hardening, planning, and shipping.", category:'coding', tags:['engineering','code-review','performance','best-practices'] },
  { key:'pm', repo:'phuryn/pm-skills', branch:'main', scope:'', author:'phuryn', name:'Product Manager Marketplace', tagline:'100+ PM skills from discovery to strategy, launch, and growth.', description:'A PM skills marketplace organized into plugins for product discovery, strategy, execution, market research, go-to-market, marketing/growth, and analytics.', category:'business', tags:['product-management','strategy','go-to-market','discovery'] },
  { key:'orchestra', repo:'Orchestra-Research/AI-Research-SKILLs', branch:'main', scope:'', author:'Orchestra Research', name:'AI/ML Research Engineering', tagline:'End-to-end skills for LLM and ML research engineering.', description:'A library organized by ML pipeline stage: model architecture, tokenization, fine-tuning, mechanistic interpretability, data processing, and post-training (RL).', category:'data', tags:['ml','llm','research','fine-tuning'] },
  { key:'genmedia', repo:'SamurAIGPT/Generative-Media-Skills', branch:'main', scope:'', author:'SamurAIGPT', name:'Generative Media Studio', tagline:'Multi-modal image, video, and motion generation skills.', description:'A media generation toolkit across visual, motion, and social libraries, plus skills for ad creatives, UGC video, thumbnails, and logos.', category:'design', tags:['video','image-gen','media','social'] },
  { key:'gws', repo:'googleworkspace/cli', branch:'main', scope:'skills/', author:'Google', name:'Google Workspace Skills', tagline:'Official agent skills for Drive, Gmail, Calendar, Docs, Sheets, and Chat.', description:"Google's official Workspace CLI ships agent skills covering Gmail, Calendar, Drive, Docs, Sheets, Chat, Classroom, Forms, and Admin.", category:'productivity', tags:['google-workspace','gmail','calendar','productivity'] },
  { key:'azure', repo:'microsoft/skills', branch:'main', scope:'.github/plugins/azure-sdk-python/', author:'Microsoft', name:'Azure SDK Skills (Python)', tagline:"Microsoft's official Azure SDK skills for grounding coding agents.", description:"Microsoft's official Azure SDK skills for Python — Azure AI, storage, identity, messaging, and management SDKs.", category:'coding', tags:['azure','microsoft','cloud','sdk'] },
  { key:'wshobson', repo:'wshobson/agents', branch:'main', scope:'plugins/', author:'wshobson', name:'Full-Stack Agent Plugins', tagline:'Engineering skills across 30+ themed plugins.', description:'A large multi-plugin marketplace spanning backend, cloud infrastructure, LLM application dev, security scanning, data engineering, and Kubernetes operations.', category:'coding', tags:['full-stack','backend','cloud','devops'] },
  { key:'baoyu', repo:'JimLiu/baoyu-skills', branch:'main', scope:'skills/', author:'Baoyu', name:'Baoyu Content Creator', tagline:'Image, diagram, and publishing skills for content creators.', description:"Baoyu's content toolkit: article illustrators, comics, infographics, diagrams, image gen/compression, markdown-to-HTML, and one-click publishing to X, WeChat, and Weibo.", category:'writing', tags:['content','publishing','image-gen','infographic'] },
  { key:'books', repo:'wondelai/skills', branch:'main', scope:'', author:'wondelai', name:'Product & Design Playbooks', tagline:'Skills distilled from canonical product, design, and engineering books.', description:'Skills encoding methodologies from well-known books: Jobs-to-be-Done, Lean Startup, Crossing the Chasm, Good Strategy/Bad Strategy, Clean Code, DDD, and Refactoring UI.', category:'business', tags:['product','strategy','design','methodology'] },
  { key:'browseract', repo:'browser-act/skills', branch:'main', scope:'', author:'browser-act', name:'Browser Automation Solutions', tagline:'Browser-automation skills for e-commerce and data extraction.', description:'A browser-automation CLI library heavy on e-commerce: Amazon product/review/competitor APIs, marketplace scraping, and generic listing/review extractors.', category:'productivity', tags:['browser-automation','scraping','ecommerce','data-extraction'] },
  { key:'notfair', repo:'nowork-studio/NotFair', branch:'main', scope:'', author:'NotFair', name:'SEO & Paid Ads Toolkit', tagline:'Open-source SEO, GEO, Google Ads, and Meta Ads skills.', description:'Marketing skills spanning SEO (keyword research, content writing, GEO, schema markup), Google Ads (audit/copy/landing/manage), and Meta Ads (audit/manage).', category:'business', tags:['seo','google-ads','meta-ads','marketing'] },
  { key:'ctf', repo:'ljagiello/ctf-skills', branch:'main', scope:'', author:'ljagiello', name:'CTF Solver Toolkit', tagline:'Capture-the-flag skills across web, pwn, crypto, and forensics.', description:'Skills for solving authorized CTF challenges: web exploitation, binary pwn, crypto, reverse engineering, forensics, OSINT, and malware analysis, plus a writeup generator.', category:'coding', tags:['security','ctf','reverse-engineering','pwn'] },
  { key:'clawsec', repo:'prompt-security/clawsec', branch:'main', scope:'skills/', author:'Prompt Security', name:'ClawSec Security Suite', tagline:'A defensive security skill suite for agentic runtimes.', description:'Defensive-security skills: traffic guardians, attestation, vulnerability scanning, audit watchdogs, and self-pen-testing. Upstream is AGPL-3.0.', category:'coding', tags:['security','defensive','audit','scanning'] },
  { key:'devops', repo:'socake/cc-skillkit', branch:'main', scope:'', author:'socake', name:'DevOps & SRE Skillkit', tagline:'Cloud, ops, and workflow skills for DevOps and SRE.', description:'Skills across cloud (AWS cost scan, IAM audit), ops (k8s/eks triage, Dockerfile audit, incident RCA), and workflow (PR describe, HTML report, drawio arch).', category:'coding', tags:['devops','sre','kubernetes','cloud'] },
  { key:'java', repo:'decebals/claude-code-java', branch:'main', scope:'', author:'decebals', name:'Java Engineering Skills', tagline:'Code review, JPA, and migration skills for Java projects.', description:'Java-focused skills: code review, architecture review, design patterns, JPA patterns, concurrency review, Java migration, Maven dependency audit, and logging patterns.', category:'coding', tags:['java','code-review','jpa','performance'] },
  { key:'elixir', repo:'oliver-kriska/claude-elixir-phoenix', branch:'main', scope:'', author:'oliver-kriska', name:'Elixir & Phoenix Skills', tagline:'Specialist skills for Elixir, Phoenix, and LiveView.', description:'Skills for Elixir, Phoenix, and LiveView including the Ash framework, assigns audits, session analysis, and plugin-dev workflows.', category:'coding', tags:['elixir','phoenix','liveview','ash'] },
]

const existing = new Set(SEED_SKILLS.map(s => s.slug))
const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const titleize = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

function tree(repo: string, branch: string): string[] {
  const out = execSync(`gh api "repos/${repo}/git/trees/${branch}?recursive=1" --jq '.tree[].path'`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return out.split('\n').filter(Boolean)
}
function raw(repo: string, branch: string, path: string): string {
  return execSync(`curl -sL "https://raw.githubusercontent.com/${repo}/${branch}/${encodeURI(path)}"`, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
}
function parseFrontmatter(md: string): { name?: string; description?: string } {
  if (!md.startsWith('---')) return {}
  const end = md.indexOf('\n---', 3)
  if (end < 0) return {}
  const fm = md.slice(3, end)
  const grab = (k: string) => {
    const m = fm.match(new RegExp(`^${k}:\\s*([\\s\\S]*?)(?=\\n[a-zA-Z_]+:|$)`, 'm'))
    if (!m) return undefined
    return m[1].replace(/^["'|>-]+/, '').replace(/["']+\s*$/, '').replace(/\s+/g, ' ').trim()
  }
  return { name: grab('name'), description: grab('description') }
}

const manifest: any[] = []
let total = 0
for (const p of PACKS) {
  const paths = tree(p.repo, p.branch).filter(x => x.endsWith('SKILL.md') && (p.scope === '' || x.startsWith(p.scope)))
  const seenSlug = new Set<string>()
  const skills: any[] = []
  const slugs: string[] = []
  for (const path of paths) {
    const dir = path.replace(/\/SKILL\.md$/, '')
    const leaf = dir.split('/').pop() || dir
    let slug = `${p.key}-${kebab(leaf)}`
    if (existing.has(slug) || seenSlug.has(slug)) { let i = 2; while (existing.has(`${slug}-${i}`) || seenSlug.has(`${slug}-${i}`)) i++; slug = `${slug}-${i}` }
    seenSlug.add(slug)
    let md = ''
    try { md = raw(p.repo, p.branch, path) } catch { continue }
    const fm = parseFrontmatter(md)
    const name = fm.name && fm.name.length < 80 ? titleize(fm.name) : titleize(leaf)
    let desc = (fm.description || '').trim()
    if (desc.length < 20) desc = `${name} — part of the ${p.name} pack. ${p.tagline}`
    if (desc.length > 300) desc = desc.slice(0, 297).replace(/\s+\S*$/, '') + '…'
    const dirUrl = `https://github.com/${p.repo}/tree/${p.branch}/${dir}`
    const content = `---\nname: ${name}\ndescription: ${desc.replace(/\n/g, ' ')}\n---\n\n# ${name}\n\nPart of the **${p.name}** pack by ${p.author} (\`${p.repo}\`).\n\n${desc}\n\nThis catalog entry summarizes the skill for discovery. Get the full skill — including any bundled scripts and resources — from the source:\n\nFull skill & source: ${dirUrl}\n`
    skills.push({ slug, name, category: p.category, description: desc.length > 220 ? desc.slice(0, 217) + '…' : desc, author: p.author, source_url: dirUrl, tags: p.tags.slice(0, 4), skill_content: content })
    slugs.push(slug)
  }
  writeFileSync(join(DATA, `pack-${p.key}.json`), JSON.stringify(skills, null, 2) + '\n')
  manifest.push({ key: p.key, repo: p.repo, author: p.author, name: p.name, tagline: p.tagline, description: p.description, category: p.category, tags: p.tags, skill_slugs: slugs })
  total += skills.length
  console.log(`${p.key.padEnd(11)} ${String(skills.length).padStart(3)} skills  (${p.repo})`)
}
writeFileSync(join(__dirname, '_pack-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`\nTOTAL ingested: ${total} skills across ${PACKS.length} packs.`)
