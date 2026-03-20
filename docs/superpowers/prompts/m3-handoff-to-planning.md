# M3 Onboarding Wizard — Handoff Prompt

Paste this into a fresh Claude Code session from the `kova-main/` directory.

---

## Prompt

We're building Kova, an AI-powered email design SaaS on top of OpenPencil. M1 (auth/branding) and M2 (dashboard/brand management) are complete and merged to `prdv4execution` branch in `kova-open-pencil-1/`.

Your job is to **write the implementation plan and then execute** Milestone 3: Onboarding Wizard.

### What's already done

Brainstorming is complete. The approved design spec is at:
**`kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md`**

Read that file first — it is the source of truth for all design decisions. It overrides the PRD where they conflict (documented in the "PRD Divergences" table in the spec).

### Additional sources of truth

- **PRD:** `KOVA_MVP_PRD_v4.md` — read the "Milestone 3: Onboarding Wizard" section (Phases 3.1 and 3.2) for task breakdown and API details
- **CLAUDE.md** — architecture, constraints, code conventions, commands
- **Design spec** — `kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md` — all visual/UX decisions, screen flow, data model, file structure

### Critical divergences from PRD (design spec is correct)

1. **7 screens, not 6** — added "Your Name" screen after Welcome (Screen 2)
2. **`brands` table replaces `clients` + `brand_profiles`** — single table, codebase is correct
3. **Post-onboarding → editor, not dashboard** — auto-create canvas `"{brandName} - Canvas 1"`, redirect to `/editor/:canvasId`
4. **Subsequent logins → dashboard** (already onboarded users go to dashboard as normal)
5. **Split-screen layout (38/62)** — light left panel (questions) / dark right panel (email wireframe on Screens 1-4, brand card on Screens 5-6)
6. **Review screen uses grouped visual sections with click-to-edit** — not a traditional form
7. **New `name` column on `users` table** — migration needed, pre-fill from Google OAuth metadata
8. **"Brands" not "Clients"** in all UI copy

### Workflow — use Superpowers skills in order

1. **Read the design spec** — `kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md`
2. **Create branch** — `git checkout -b m3-onboarding-wizard` off `prdv4execution` in `kova-open-pencil-1/`
3. **Write the plan** — invoke `superpowers:writing-plans` skill. Use the design spec + PRD task breakdown to produce a phased implementation plan. Break into chunks that fit in a single context window session (see chunking strategy below).
4. **Execute the plan** — invoke `superpowers:executing-plans` skill. Use `superpowers:test-driven-development` for each task. Use `superpowers:dispatching-parallel-agents` for independent tasks.

### Chunking strategy (context window management)

M3 is too large for a single session. Break execution into these chunks:

| Chunk | Scope | Deliverable |
|-------|-------|-------------|
| **Chunk 1** | Write plan | Plan document on disk |
| **Chunk 2** | Phase 3.1 — Onboarding UI (shell, 7 screens, composable, routing, tests) | Working wizard with mock data |
| **Chunk 3** | Phase 3.2 — Extraction APIs (extract-brand, analyze-writing-style endpoints + tests) | Serverless endpoints working |
| **Chunk 4** | Integration + polish (wire APIs → UI, completion flow, all tests pass, build passes) | All DoD criteria met |

At the end of each chunk: commit, verify tests pass, write a handoff summary for the next session. The user will either say "continue" or paste the handoff into a new session.

### MCP servers enabled for M3

- **supabase** — database operations, storage
- **context7** — library documentation lookup
- **playwright** — E2E testing
- **firecrawl** — web scraping for brand extraction
- **shadcn-vue** — component search and examples

### Skills & subagents to use

| When | Use |
|------|-----|
| Wizard UI patterns | `ui-ux-pro-max` skill |
| Step components (color picker, file upload, forms) | shadcn-vue MCP |
| Brand extraction API | Firecrawl MCP + `claude-api` skill |
| Vue 3 patterns | `vue-expert` subagent |
| Database/migration questions | `database-migrations` skill, `postgres-pro` subagent |
| After writing code | `superpowers:requesting-code-review` skill |
| Before claiming done | `superpowers:verification-before-completion` skill |

### Definition of done

- All 7 onboarding screens render and navigate correctly
- Split-screen layout: light left / dark right with email wireframe (1-4) and brand card (5-6)
- Brand extraction endpoint scrapes a URL and returns structured brand data
- Writing style endpoint analyzes copy and returns a style description
- Extraction results pre-fill the review screen progressively
- "Enter manually" path skips extraction entirely
- Click-to-edit on review screen for all fields
- Completing onboarding: saves user name, creates brand row, uploads logo, creates canvas, sets onboarded=true, redirects to `/editor/:canvasId`
- Route guards prevent onboarded users from seeing onboarding again
- All tests pass (`bun run test:unit`)
- Build succeeds (`bun run build`)
- Lint clean (`bun run check`)
