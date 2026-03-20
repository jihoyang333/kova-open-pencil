# M3: Onboarding Wizard — Execution Prompt

Paste this into a fresh Claude Code session from the `kova-main/` directory.

---

## Prompt

We're building Kova, an AI-powered email design SaaS on top of OpenPencil. M1 (auth/branding) and M2 (dashboard/brand management) are complete and merged to `prdv4execution` branch in `kova-open-pencil-1/`.

Your job is to implement **Milestone 3: Onboarding Wizard** from our PRD.

### Source of truth

- **PRD:** `KOVA_MVP_PRD_v4.md` — read the "Milestone 3: Onboarding Wizard" section (Phases 3.1 and 3.2). This is the spec.
- **CLAUDE.md** — read it for architecture, constraints, code conventions, and commands.
- **Existing code:** Branch `prdv4execution` in `kova-open-pencil-1/` has all M1/M2 work.

### Critical: PRD ↔ codebase divergences

The PRD was written before M2 implementation. During M2 brainstorming we made these changes — the **codebase is correct**, not the PRD:

1. **`brands` table replaces `clients` + `brand_profiles`**. The PRD references `src/stores/clients.ts` and `src/stores/brand-profiles.ts` — these don't exist. We have a single `src/stores/brands.ts` and a single `brands` table. Wherever the PRD says "create client record" + "create brand profile record", you create a single `brands` row instead.

2. **Schema for `brands`** (from `supabase/migrations/20260317_m2_dashboard.sql`):
   ```sql
   CREATE TABLE public.brands (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     colors JSONB,
     fonts JSONB,
     logo_url TEXT,
     voice TEXT,
     industry TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );
   ```
   Map the PRD's onboarding fields to this schema:
   - Brand name → `name`
   - Colors (primary, secondary, accent, background) → `colors` JSONB
   - Fonts (heading, body) → `fonts` JSONB
   - Logo → upload to Supabase Storage, store URL in `logo_url`
   - Writing style → `voice`

3. **"Brands" not "Clients"** in all UI copy (sidebar says "Brands", not "Clients").

4. **Light theme for onboarding** — consistent with auth/dashboard. Only the editor is dark.

5. **`onboarded` flag** already exists on the `users` table and route guards already check `auth.isOnboarded`. See `src/stores/auth.ts` and `src/router.ts`.

### Workflow — use Superpowers skills in order

Follow this exact sequence:

1. **Brainstorm first** — invoke the `superpowers:brainstorming` skill. This explores intent, requirements, and design decisions before any code. Feed it the M3 PRD section. Resolve any ambiguities. Get the spec approved before moving on.

2. **Write the plan** — invoke the `superpowers:writing-plans` skill. This produces a phased implementation plan with task breakdown, file lists, and dependency ordering. The PRD already has good task granularity — your plan should align with it but adapt for the `brands` table divergence.

3. **Execute the plan** — invoke the `superpowers:executing-plans` skill. This runs the plan with review checkpoints. Use `superpowers:test-driven-development` for each task (RED → GREEN → REFACTOR). Use `superpowers:dispatching-parallel-agents` for tasks marked `parallel: yes` in the PRD.

### MCP servers to enable for M3

Per PRD "MCP Activation by Milestone" table:
- **Enable:** supabase, context7, playwright, firecrawl, shadcn-vue
- **Disable:** tauri, pencil, vercel, figma

### Skills & subagents to use during M3

| When | Use |
|------|-----|
| Onboarding UI wizard patterns | `ui-ux-pro-max` skill |
| Step components (color picker, file upload, forms) | shadcn-vue MCP (`@jpisnice/shadcn-ui-mcp-server --framework vue`) |
| Progressive loading animation UX | `ui-ux-pro-max` skill |
| Brand extraction API endpoint | Firecrawl MCP for scraping |
| Claude vision API call in extraction | `claude-api` or `example-skills:claude-api` skill |
| Writing style analysis endpoint | Firecrawl MCP + `claude-api` skill |
| Vue 3 patterns | `vue-expert` subagent |
| Database/migration questions | `database-migrations` skill, `postgres-pro` subagent |
| After writing code | `superpowers:requesting-code-review` skill |
| Before claiming done | `superpowers:verification-before-completion` skill |

### Key implementation notes

- **Phase 3.1 (UI)** can largely be built with mock data first. The extraction step (screen 4) accepts data via props — no real API calls yet.
- **Phase 3.2 (Extraction API)** builds the serverless endpoints (`api/extract-brand.ts`, `api/analyze-writing-style.ts`). These are Vercel serverless functions.
- **Task 3.2.3** wires the real API into the onboarding flow, replacing mock data.
- **Task 3.1.7** (complete onboarding) must: create a `brands` row, upload logo to storage, set `onboarded = true` on the `users` table, then redirect to `/dashboard`.
- **TDD is mandatory.** Write failing tests first for stores, composables, and API endpoints. Component tests for form validation logic.
- The PRD's "Screen 5 — Review & Confirm" has a `writing_style` textarea — map this to the `voice` column.
- All Vue components: `<script setup lang="ts">`, Tailwind CSS 4, no `<style>` blocks.
- All commands run from `kova-open-pencil-1/`.

### Definition of done

- All 6 onboarding screens render and navigate correctly
- Brand extraction endpoint scrapes a URL and returns structured brand data
- Writing style endpoint analyzes copy and returns a style description
- Extraction results pre-fill the review screen
- "Enter manually" path skips extraction entirely
- Completing onboarding creates a `brands` row, sets `onboarded = true`, redirects to dashboard
- Route guards prevent onboarded users from seeing onboarding again
- All tests pass (`bun run test:unit`)
- Build succeeds (`bun run build`)
- Lint clean (`bun run check`)
