# Distribution listings — canonical copy + per-target submission plan

One honest entry per list. Never ask for upvotes or stars. Always include the
open-source line and the "independent, not affiliated with Anthropic" line.

## Canonical copy (reused everywhere)

**One-liner (≤ ~25 words):**
> Open-source catalog of Claude Agent Skills and skill packs with semantic search and one-command install over MCP. Live at skillme.dev. Independent project, not affiliated with Anthropic.

**PR / submission body (one paragraph):**
> SkillMe (https://skillme.dev) is an open-source (MIT) catalog for Claude Agent Skills and skill packs. Browse and search a curated, provenance-tracked catalog, get semantic recommendations for a task, and install individual skills or whole packs straight into a session via its MCP server (`https://skillme.dev/api/mcp`). This is an independent project and is **not affiliated with Anthropic**. Source: https://github.com/aouellets/skillme (MIT).

**Facts for forms:** Name `SkillMe` · Site `https://skillme.dev` · Repo `https://github.com/aouellets/skillme` · Author `Alexander Ouellet` (`https://github.com/aouellets`) · License `MIT` · MCP endpoint `https://skillme.dev/api/mcp` (streamable-http).
**Required disclosure (some lists ask for it):** the MCP server makes network calls to `skillme.dev` (not only to Anthropic), and skillme.dev records first-party usage telemetry. No install of shell scripts; no bypass-permissions required.

---

## 1. travisvn/awesome-claude-skills — ✅ PR

- **Method:** fork → edit `README.md` → PR.
- **Section:** `## 🌟 Community Skills` → `### Collections & Libraries`.
- **Entry (append as a new top-level bullet):**
  ```markdown
  - **[SkillMe](https://github.com/aouellets/skillme)** - Open-source catalog of Claude Agent Skills and skill packs with semantic search and one-command install via its MCP server (live at [skillme.dev](https://skillme.dev)). Independent project, not affiliated with Anthropic.
  ```

## 2. hesreallyhim/awesome-claude-code — ⚠️ NOT a PR (founder-manual)

- **The brief says "open a PR" — this repo bans that.** Per its `docs/CONTRIBUTING.md`:
  recommendations **must** go through the web UI issue form, **by a human**, and
  "it is **not** possible to submit a resource recommendation using the `gh` CLI"
  — bypassing the form "risks being banned." So I cannot and will not open a PR
  or automate this. It needs the founder to fill the form once:
  - **Form:** https://github.com/hesreallyhim/awesome-claude-code/issues/new?template=recommend-resource.yml
  - **Category:** Tooling
  - **Display Name:** SkillMe
  - **Primary Link:** https://github.com/aouellets/skillme · **Secondary Link:** https://skillme.dev
  - **Author:** Alexander Ouellet / https://github.com/aouellets · **License:** MIT
  - **Description:** use the one-liner **plus** the required disclosure line above
    (network calls to skillme.dev + first-party telemetry) — this repo rejects
    undisclosed network/telemetry and unverifiable claims.

## 3. punkpeye/awesome-mcp-servers — ✅ PR

- **Method:** fork → edit `README.md` → PR. Must keep **alphabetical order within the category**.
- **Category:** `### 💻 Developer Tools` (insert at the alphabetical position for `aouellets/skillme`).
- **Legend used:** 📇 TypeScript codebase · ☁️ Cloud Service (hosted at skillme.dev).
- **Entry:**
  ```markdown
  - [aouellets/skillme](https://github.com/aouellets/skillme) 📇 ☁️ - Open-source catalog of Claude Agent Skills and skill packs with semantic search and one-command install over MCP. Live at skillme.dev. Independent project, not affiliated with Anthropic.
  ```

## 4. Chat2AnyLLM catalogs — ✅ PR (to the config repo, not the README)

- The `awesome-claude-skills` catalog is **auto-generated** from
  `Chat2AnyLLM/awesome-repo-configs`. Per its CONTRIBUTING, additions go to the
  **JSON config**, not the rendered README. `aouellets/skillme` qualifies — it
  contains `SKILL.md` skills under `skills/`.
- **Method:** fork `Chat2AnyLLM/awesome-repo-configs` → edit `skill_repos.json` → PR.
- **Entry (add to the object in `skill_repos.json`):**
  ```json
  "aouellets/skillme": {
    "owner": "aouellets",
    "name": "skillme",
    "branch": "main",
    "skillsPath": "skills",
    "enabled": true
  }
  ```
- **Optional second entry** (`mcp_server_repos.json`, feeds the MCP index) — only if
  we want SkillMe in the MCP catalog too; ask the founder before adding a 2nd.

## 5. claudemarketplaces.com — listing submission (not a PR), founder-manual

- A website listing, submitted via the site's own submit flow (account/form), using
  the canonical copy + facts above. Not a code change.

---

## Account claims (separate, founder-manual — "claim, don't spam")

Claim and clean the existing auto-crawled listings with the canonical metadata:
**Smithery, Glama, PulseMCP, mcp.so, Agensi.** These are account claims, not code/PRs.
