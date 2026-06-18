# Skill Me — authored skills

This directory holds every **Skill Me–authored** skill as a standalone, portable
`SKILL.md` file, one folder per skill (`skills/<slug>/SKILL.md`).

## Why this exists

The catalog is served to Claude through the MCP (`get_active_skills` returns
`skill_content` directly), so installing a skill needs **no repo and no ZIP**.
But publishing the authored skills as real files buys two things the MCP path
alone does not:

1. **Provenance.** Every authored skill carries a real `source_url`
   (`…/skills/<slug>`) instead of an unverifiable `author: "community"`. The
   safety story depends on skills being inspectable; now they are.
2. **Ecosystem distribution.** These `SKILL.md` files are valid for the standard
   Claude skills tooling (`npx skills add`, Claude Code plugins, manual copy into
   `.claude/skills/`), so the catalog reaches users who never connect the MCP.

## Source of truth — do not hand-edit

These files are **generated**. The source of truth is
`scripts/expansion-data/*.json`. To change a skill, edit the JSON and rerun:

```bash
npx tsx scripts/build-expansion.ts
```

That regenerates both these files and `lib/seed-data-expansion.ts` (which
`lib/seed-data.ts` concatenates into `SEED_SKILLS`). Generating from one source
keeps the website catalog, the MCP, and these files from drifting.

> One monorepo of skills (this directory), not one repo per skill. The Claude
> skills ecosystem supports multi-skill repos (e.g. `anthropics/skills`), so a
> repo-per-skill would add overhead with no distribution benefit.
