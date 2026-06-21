/**
 * Ingest the 5 NEW repos from the expanded research pass (the 161 skills not
 * already in the catalog). Driven by the research set's curated path list so
 * the safety exclusions (scrapers, account automations, etc.) are respected.
 *
 * Same grounding policy as scripts/ingest-packs.ts: real upstream frontmatter
 * name+description + original framing body + source link, no body copying.
 *
 * Run:  npx tsx scripts/ingest-expanded.ts   (then npm run build:catalog)
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEED_SKILLS } from '../lib/seed-data'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, 'expansion-data')
const JSONL = '/Users/alexanderouellet/Downloads/claude-skills-catalog-expanded-download/claude-skills-catalog-expanded.jsonl'

type Cat = 'coding'|'writing'|'research'|'productivity'|'data'|'design'|'business'|'personal'
const CAT: Record<string, Cat> = {
  'Software engineering':'coding','API development':'coding','Backend development':'coding','Frontend development':'coding',
  'Code review':'coding','DevOps':'coding','Cloud infrastructure':'coding','Kubernetes and containers':'coding',
  'MCP development':'coding','AI agent development':'coding','Testing and QA':'coding','Browser and web automation':'coding',
  'Cybersecurity':'coding','Robotics':'coding',
  'Data science':'data','Data analysis':'data','Machine learning':'data','Spreadsheet workflows':'data',
  'UI and visual design':'design','Image workflows':'design','Creative ideation':'design','Presentation creation':'design','Video and media workflows':'design',
  'Writing and editing':'writing','PDF and document processing':'productivity','Healthcare documentation':'writing',
  'Research':'research','Academic work':'research',
  'Personal productivity':'productivity','Project management':'productivity','Knowledge management':'productivity',
  'Business operations':'business','Marketing':'business','Sales':'business','SEO':'business','Finance and investing':'business',
  'Legal and compliance':'business','Human resources':'business','Customer success':'business','Education':'personal',
}

interface PackMeta { key:string; repo:string; author:string; name:string; tagline:string; description:string; category:Cat; tags:string[] }
const PACKS: Record<string, PackMeta> = {
  'mohitagw15856/pm-claude-skills': { key:'pmpro', repo:'mohitagw15856/pm-claude-skills', author:'mohitagw15856', name:'PM Pro Skills', tagline:'120+ product, marketing, ops, finance, HR, and CS workflows for professionals.', description:'A large professional-skills library curated across 18 professions — product management, marketing, business operations, finance, HR, sales, customer success, and more.', category:'business', tags:['product-management','business','marketing','operations'] },
  'TerminalSkills/skills': { key:'terminal', repo:'TerminalSkills/skills', author:'TerminalSkills', name:'Terminal Skills Library', tagline:'Cross-tool standalone skills spanning engineering, content, and ops.', description:'A cross-tool library of standalone SKILL.md capabilities with Claude Code installation, curated to exclude external-account automations.', category:'coding', tags:['toolkit','engineering','content','productivity'] },
  'arpitg1304/robotics-agent-skills': { key:'robotics', repo:'arpitg1304/robotics-agent-skills', author:'arpitg1304', name:'Robotics & ROS Skills', tagline:'ROS 1/2 development, perception, testing, and robot system bringup.', description:'A robotics skill suite covering ROS 1 and ROS 2 development, perception, design patterns, testing, security, Docker, and system bringup. Apache-2.0.', category:'coding', tags:['robotics','ros','perception','automation'] },
  'fivetaku/claude-office-skills': { key:'office', repo:'fivetaku/claude-office-skills', author:'fivetaku', name:'Office Skills (Excel & PowerPoint)', tagline:'Excel and PowerPoint workflow skills for spreadsheets and decks.', description:'Excel and PowerPoint workflow skills. Note: the author describes this as an unofficial reconstruction, so skill-content licensing is uncertain — this catalog entry only summarizes and links.', category:'productivity', tags:['excel','powerpoint','office','spreadsheets'] },
  'Qovery/qovery-skills': { key:'qovery', repo:'Qovery/qovery-skills', author:'Qovery', name:'Qovery Kubernetes Skills', tagline:"Qovery's official skills for Kubernetes deployment and operations.", description:"Qovery's official skill collection for deploying and operating on Kubernetes — deployment, preview environments, Terraform export, cost optimization, and troubleshooting. Can modify live infrastructure (medium risk).", category:'coding', tags:['qovery','kubernetes','devops','cloud'] },
}

const existing = new Set(SEED_SKILLS.map(s => s.slug))
const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const titleize = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
function raw(url: string): string { return execSync(`curl -sL "${url}"`, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }) }
function fmName(md: string): string | undefined {
  if (!md.startsWith('---')) return undefined
  const end = md.indexOf('\n---', 3); if (end < 0) return undefined
  const m = md.slice(3, end).match(/^name:\s*(.+)$/m)
  return m ? m[1].replace(/^["']|["']$/g, '').trim() : undefined
}

const recs = readFileSync(JSONL, 'utf8').trim().split('\n').map(l => JSON.parse(l))
const manifest: any[] = []
let total = 0
for (const [full, p] of Object.entries(PACKS)) {
  const entries = recs.filter((r: any) => r.repository.full_name === full)
  const seen = new Set<string>(); const skills: any[] = []; const slugs: string[] = []
  for (const e of entries) {
    const gp = e.github_paths
    const dir = (gp.skill_file_path || '').replace(/\/SKILL\.md$/, '')
    const leaf = dir.split('/').pop() || e.slug
    let slug = `${p.key}-${kebab(leaf)}`
    if (existing.has(slug) || seen.has(slug)) { let i = 2; while (existing.has(`${slug}-${i}`) || seen.has(`${slug}-${i}`)) i++; slug = `${slug}-${i}` }
    seen.add(slug)
    let md = ''
    try { md = raw(gp.raw_skill_file_url) } catch { continue }
    const name = (() => { const n = fmName(md); return n && n.length < 80 ? titleize(n) : titleize(leaf) })()
    let desc = (e.summary || '').replace(/\s+/g, ' ').trim()
    if (desc.length < 20) desc = `${name} — part of the ${p.name} pack. ${p.tagline}`
    if (desc.length > 300) desc = desc.slice(0, 297).replace(/\s+\S*$/, '') + '…'
    const cat = CAT[e.primary_category] || p.category
    const dirUrl = gp.skill_directory_url || `https://github.com/${full}/tree/main/${dir}`
    const tags = ((e.tags && e.tags.length >= 2 ? e.tags : p.tags) as string[]).slice(0, 4)
    const content = `---\nname: ${name}\ndescription: ${desc.replace(/\n/g, ' ')}\n---\n\n# ${name}\n\nPart of the **${p.name}** pack by ${p.author} (\`${full}\`).\n\n${desc}\n\nThis catalog entry summarizes the skill for discovery. Get the full skill — including any bundled scripts and resources — from the source:\n\nFull skill & source: ${dirUrl}\n`
    skills.push({ slug, name, category: cat, description: desc.length > 220 ? desc.slice(0, 217) + '…' : desc, author: p.author, source_url: dirUrl, tags, skill_content: content })
    slugs.push(slug)
  }
  writeFileSync(join(DATA, `pack-${p.key}.json`), JSON.stringify(skills, null, 2) + '\n')
  manifest.push({ key: p.key, repo: p.repo, author: p.author, name: p.name, tagline: p.tagline, description: p.description, category: p.category, tags: p.tags, skill_slugs: slugs })
  total += skills.length
  console.log(`${p.key.padEnd(9)} ${String(skills.length).padStart(3)} skills  (${full})`)
}
writeFileSync(join(__dirname, '_expanded-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`\nTOTAL: ${total} skills across ${Object.keys(PACKS).length} new packs.`)
