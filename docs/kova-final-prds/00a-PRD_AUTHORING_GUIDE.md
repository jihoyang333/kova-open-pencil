# Kova PRD Authoring Guide

> **Audience:** Any agent (or human) handed the command **"build the PRDs"** with no prior context.
> **Purpose:** Make PRD authoring deterministic. Read this doc + the scope plan → execute Wave 1 end-to-end without guessing.
> **Status:** Canonical operator manual. Last updated 2026-05-15. Supersedes any ad-hoc PRD direction in chat.

---

## 0. TL;DR — caveman version

1. PRD = blueprint. Not code. Code come later (writing-plans skill → TDD skill).
2. Each PRD merge 4 sources → 1 spec: hi-fi mockups + design system + `03-implied-surfaces-and-backend.md` + Q1–Q25 founder decisions.
3. 12 PRDs total. Author in 6 waves, sequential. Wave 1 = Cluster 01 (Auth) then Cluster 11 (Shared UI). Founder approve each before next.
4. Template fixed at `00-PRD_SCOPE_PLAN.md` §5. Every section must trace back to source.
5. When source contradict: precedence = founder-locked decision > Q&A doc > 03 doc > hi-fi > design system. When ambiguous: ask founder, never guess.
6. Done = §8 checklist of scope plan green + founder sign-off in PRD §0.

---

## 1. Mission

The Kova product spec lives in four artifacts. A PRD is the spec document that **fuses** those four into one implementation-ready feature cluster. Output is a self-contained doc that a backend engineer + frontend engineer + QA engineer can each open and find every signature, schema, route, store, component, test, and acceptance check they need — without re-reading the source artifacts.

PRD authoring is **synthesis**, not design. All design decisions are already locked. The author's job is to find the right pieces in each source and weld them into the template at `00-PRD_SCOPE_PLAN.md` §5.

**Where PRDs sit in the dev pipeline:**

```
Pre-PRD (DONE 2026-05-14)         PRDs (here)                    Implementation
─────────────────────         ─────────────────────         ─────────────────────
Audit → ratify → verify   →   draft → review → approve   →   plan → TDD → ship
                                                              (writing-plans   (test-driven-
                                                               skill consumes   development
                                                               PRD)             skill executes)
```

---

## 2. The four sources (canonical paths)

> **All paths are absolute from the outer repo `/Users/jihoyang/kova-main/`.** Inner-repo paths start with `kova-open-pencil-1/`.

### 2.1 Hi-fi mockups — visual spec

39 HTML files, ~210 scenes. Every surface, state, copy string, interaction lives here.

| Bucket | Path | What's in it |
|---|---|---|
| **batch-a** | `main-main-kova-scope/batch-a/dark/` + `batch-a/light/` | Foundation surfaces: onboarding, dashboard, brand picker, modals, popovers, Command-K, Account page, Auth |
| **batch-a-additions** | `main-main-kova-scope/batch-a-additions/dark/` + `batch-a-additions/light/` | B-series additions: toasts, error pages, brand-kit CRUD, session-expired, Stripe returns, mobile fallback, loading skeletons, upload states, list-empty, B12 Brands page |
| **batch-b** | `main-main-kova-scope/batch-b/` + `batch-b/chunk-b1..b6/` | Canvas surfaces: top-chrome menus, overlays, popovers, find, trash, toasts-canvas, left panel, inspector, color picker, version history. **`Kova Canvas - Final.html` is the canonical canvas-chrome source-of-truth.** |

**Per-cluster file list:** `00-PRD_SCOPE_PLAN.md` §3 "Hi-fi files referenced" subsection for each cluster.

### 2.2 Design system — token + component spec

4 canonical files. Now version-controlled (per pre-PRD verification fix 2026-05-14).

| File | Path | Role in PRD |
|---|---|---|
| `design.md` | `main-main-kova-scope/design-system/design.md` | Spec text — design principles, token vocabulary, component contracts |
| `kova-hifi.css` | `main-main-kova-scope/design-system/kova-hifi.css` | Canonical **dark** CSS: `:root` token block + every component primitive class (`.btn`, `.dlg`, `.toast`, `.menu`, etc.). Engineers translate `:root` → Tailwind `@theme` in `app.css`; translate each class → Vue component rendering same markup contract. |
| `kova-hifi-light.css` | `main-main-kova-scope/design-system/kova-hifi-light.css` | Canonical **light** CSS. Only link if PRD covers a light surface (auth, marketing, mobile fallback). |
| `TOKEN_CANONICAL.md` | `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` | Vocabulary cheat-sheet — short/long/scoped naming, canonical hex values |

**Theme rule** (`feedback_app_dark_website_light` memory): dark inside authenticated app (onboarding, dashboard, settings, canvas — everything). Light only on marketing + auth + mobile fallback. Vue Router meta theme detection (Cluster 11 cross-cut).

### 2.3 Implied surfaces + backend inventory — infrastructure spec

`kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/03-implied-surfaces-and-backend.md` (580 lines, 182 rows).

For every canvas-side surface: schema, RPCs, Edge Functions, Pinia stores, scene-graph extensions, drag-drop receivers, cross-cuts. Also §3C "Net-new server-side backend pieces" (9 items including Q8 brands JSONB).

**Per-cluster row coverage:** `00-PRD_SCOPE_PLAN.md` §3 "03-doc coverage" subsection per cluster.

### 2.4 Q&A founder decisions — decision ledger

Two companion docs, Q1–Q25, all resolved.

| File | Path | Covers |
|---|---|---|
| Q1–Q5 | `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q1-5-answers-03-implied-surfaces-and-backend.md` | Slice, mask, inspector engine readiness, canvas-extension hooks, user preferences |
| Q6–Q25 | `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q6-25-answers-03-implied-surfaces-and-backend.md` | Brand fonts, snapshots, tone+saved blocks, media table, AI integration, measurement, account/Stripe/GDPR, IA, trash, eyedropper, image fills, JPG export, copy/paste props, drag-drop semantics, keyboard shortcuts |

**Per-cluster Q-decisions:** `00-PRD_SCOPE_PLAN.md` §3 "Q-decisions baked in" subsection per cluster.

### 2.5 Audit + verification — pre-PRD outcome (read-only inputs)

| File | Path | What to use it for |
|---|---|---|
| `00-PRD_SCOPE_PLAN.md` | `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` | **Master plan.** Cluster definitions, waves, template, cross-cuts, ratification log. ALWAYS open first. |
| `00c-COMPREHENSIVE_AUDIT_REPORT.md` | `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md` | 2585 lines. **§2.A per-cluster production-ready specs** (lines 921–2128) = auditor's recommended cluster specs. **Read the §2.A entry for the cluster you're authoring — it's the closest thing to a pre-baked PRD draft.** |
| `00d-EXTERNAL_VERIFICATION_HANDOFF.md` | `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md` | Decision ledger: Top-10 + 5 open Part-2 + 29 batch-ratified. Use when scope plan §3 cluster summary is ambiguous. |
| `00e-EXTERNAL_VERIFICATION_VERDICT.md` | `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md` | External verifier's verdict + 4 resolved concerns + non-blocking PRD-hygiene notes (§6) that downstream PRDs must respect. |

### 2.6 Source-of-truth precedence (when sources contradict)

```
1. Founder-locked decision in scope plan §5.6 or 00d  ← highest
2. Q1–Q25 answer doc
3. 03-implied-surfaces-and-backend.md
4. Hi-fi mockup
5. Design system CSS (token / class behavior)
6. M9 existing code (only reuse, never re-spec; see scope plan §5.5)
```

**If hi-fi shows X but Q-answer says Y:** Q-answer wins. Flag in PRD §12 ("hi-fi divergence — decided via Qn").

**If 03-doc lists infra A but Q-answer says B:** Q-answer wins. Update 03-doc reference inline.

**If two sources both authoritative and silent on a detail:** ask founder via AskUserQuestion. Never guess.

---

## 3. Required reading order (per PRD)

For each cluster's PRD, the author MUST open these in order:

1. `00-PRD_SCOPE_PLAN.md` — full doc. Re-read every PRD; scope plan evolves.
2. `00-PRD_SCOPE_PLAN.md §3 Cluster NN` — your specific cluster's scope, hi-fi list, Q-decisions, infra scope, dependencies.
3. `00c-COMPREHENSIVE_AUDIT_REPORT.md §2.A Cluster NN` — auditor's pre-baked spec for this cluster. Lift structure + content liberally.
4. **Every hi-fi file listed in §3** for this cluster. Open each. Read every scene. Note copy strings, modal triggers, error states, empty states, loading states.
5. **Every Q-answer cited in §3** for this cluster — full Q section in q1-5 or q6-25 doc, not just the cluster-plan summary.
6. **Every 03-doc row cited in §3** — find them by section number (§2.1, §2.5, etc.) + by the surface name.
7. `main-main-kova-scope/design-system/design.md` — relevant component classes.
8. `main-main-kova-scope/design-system/kova-hifi.css` (and `kova-hifi-light.css` if light surfaces) — find the actual class implementations for every component the PRD references.
9. **Memory pointers** (under `memory/` index in `MEMORY.md`) — load only ones flagged in scope plan or relevant to cluster:
   - `feedback_app_dark_website_light` (theme rule)
   - `feedback_figma_ui_theme` (visual reference)
   - `feedback_browser_smoke_test_before_done` (PRD §9.4 manual QA)
   - `feedback_verify_with_docs` (PRD §13 references — verify Figma claims against developers.figma.com/help.figma.com)
   - `project_kova_avatar` (user-level scope rationale)
   - `project_design_system_master` (canonical paths)
   - `project_m9_shopify_tools_schema_bug` (only for Shopify-touching clusters 02, 04, 05, 06, 10)

10. **M9 source code** (only for Shopify-touching clusters per scope plan §5.5):
    - `kova-open-pencil-1/src/ai/kova-tools.ts`, `src/ai/tools.ts`
    - `kova-open-pencil-1/src/components/editor/sidebar/ShopPanelProducts.vue`
    - `kova-open-pencil-1/src/stores/shopify-products.ts`
    - `kova-open-pencil-1/api/shopify/brand-kit-extract.ts`
    - `kova-open-pencil-1/api/_shared/shopify-brand-kit.ts`

---

## 4. Authoring procedure (step-by-step, per PRD)

### Step 1 — Open the master + cluster-specific sources

Read everything in §3 above. Take rough notes (don't draft yet) on:

- Every surface + scene (Section 3 of PRD will table these)
- Every schema migration (Section 4)
- Every Edge Function / RPC / cron (Section 5)
- Every route / store / composable / component (Section 6)
- Every engine touch (Section 7) — only relevant for Clusters 06, 07a, 07b, 08
- Cross-cuts to other clusters (Section 11)

### Step 2 — Lift the auditor's §2.A draft

`00c §2.A` has a per-cluster production-ready spec. Copy its structure as your starting point. Verify every claim against the four primary sources. Where §2.A and a primary source disagree, primary source wins (§2.A was written before some ratifications).

### Step 3 — Fill the template, section by section

Template lives at `00-PRD_SCOPE_PLAN.md §5`. Authoritative. Reproduce structure exactly.

**Per section, ask these questions:**

- **§0 Status:** start `DRAFT`. List depends/blocks per scope plan §3 dependency line.
- **§1 Problem & outcome:** plain-language paragraph + caveman 1-paragraph. Both required (CLAUDE.md communication style).
- **§2 Scope:** in / out / deferred. Out-of-scope items must name the cluster that owns them.
- **§3 Visual spec:** one table row per surface. Columns: Surface | Hi-fi file | Scenes | Notes. Cite exact filenames.
- **§4 Data model:** §4.1 schema with full SQL (CREATE/ALTER ready to run). §4.2 RLS policy text per table. §4.3 storage buckets with access rules.
- **§5 Backend:** §5.1 Edge Functions (name, trigger, args, return, deps). §5.2 RPCs (name, args, return, transaction boundary). §5.3 cron (schedule, function, retention). §5.4 external integrations (SDK, webhook handlers, error handling).
- **§6 Frontend:** §6.1 routes. §6.2 Pinia stores (state + getters + actions). §6.3 composables (signature + usage). §6.4 components (props/slots/emits — leaf components only; sub-tree shown in mockup). §6.5 DnD MIME types + payload shape + receiver behavior.
- **§7 Tool layer / canvas-engine touches:** only Clusters 06–10. Otherwise: "N/A — no engine touches."
- **§8 Acceptance criteria:** testable checkboxes. No "should feel intuitive." Every line must be verifiable in a test or browser smoke check.
- **§9 Test plan:** §9.1 unit (per-function targets). §9.2 integration (API/DB scenarios). §9.3 E2E (Playwright/Vercel Agent Browser flows). §9.4 manual QA (browser smoke per `feedback_browser_smoke_test_before_done` memory).
- **§10 Rollout phasing:** Phase A = first deploy. Phase B = follow-up (if needed). Feature gates + defaults.
- **§11 Cross-cuts:** table — Other PRD | What we depend on | What they depend on us for. Verify against scope plan §6 cross-cuts table.
- **§12 Risks + open questions:** every founder question raised during authoring → here. Severity + mitigation OR "escalated to founder, awaiting".
- **§13 References:** every source path. 03-doc row IDs. Q-decisions. Hi-fi paths. Design system 4 files.

### Step 4 — Self-review pass

Before handing to founder:

- [ ] Every §3 surface has a hi-fi file reference + scene ID
- [ ] Every §4 SQL block is runnable (no `TBD`)
- [ ] Every §5 function has signature + transaction boundary
- [ ] Every §6.4 component lists props/slots/emits
- [ ] Every §8 acceptance criterion is testable (no "feels right")
- [ ] §9 covers unit + integration + E2E + manual
- [ ] §11 cross-cuts match scope plan §6
- [ ] §12 has zero unresolved questions OR every unresolved one tagged "ESCALATE: founder"
- [ ] §13 references every cited source path
- [ ] No invented infra (every Edge Function / store / route exists in 03-doc OR has §12 entry explaining net-new)
- [ ] No theme drift (dark for app surfaces, light only where memory permits)
- [ ] No hard-to-reverse decisions made unilaterally (see `00d §3.A` Top-10 reversibility table — anything HARD must already be ratified)

### Step 5 — Founder review

Set §0 status to `REVIEW`. Hand the file path to founder. Wait. Address every comment. Bump status to `APPROVED` only when founder explicitly says "approved" or equivalent.

### Step 6 — Handoff to implementation

After APPROVED:

1. Commit PRD on `feat/m9-shopify` (or whatever the active feature branch is at the time).
2. Invoke `superpowers:writing-plans` skill with the PRD as input. Skill produces step-by-step implementation plan.
3. Founder reviews plan, approves.
4. Invoke `superpowers:test-driven-development` skill to execute plan.
5. After feature ships + browser-verified + tests green: bump §0 status to `IN-IMPLEMENTATION` then `SHIPPED`.

---

## 5. Founder-question protocol (when to ask vs decide)

**Use `AskUserQuestion` tool when:**

- Hi-fi shows two interaction patterns for the same surface and Q-answers don't disambiguate
- 03-doc row is missing a column needed for §4 or §5 (e.g., no FK named, no index named)
- Acceptance criterion depends on a behavior not in any source (e.g., debounce timing, retry count)
- Scope-plan §3 cluster scope leaves something ambiguous (in this cluster vs cross-cut?)
- Audit §1.E "hard-to-reverse" watchlist item is touched

**Decide unilaterally (record decision in §12) when:**

- Pure naming (variable, function, file) where convention dictates
- Internal implementation that doesn't affect contract (private functions, helper logic)
- Test-case enumeration (you choose what to cover; founder reviews coverage in §9)
- Code organization within already-approved files

**Default:** when in doubt, ask. Founder explicit preference (CLAUDE.md): "Use AskUserQuestion liberally."

---

## 6. Anti-patterns (do not)

| Anti-pattern | Why bad |
|---|---|
| Inventing schema not in 03-doc | Out of source-of-truth. Either cite 03-doc row or escalate as net-new in §12. |
| Citing hi-fi by partial filename | Engineers can't grep. Always full path including subfolder + `.html` extension. |
| Glossing engine touches | Cluster 06/07/08/10 PRDs MUST have §7 with explicit `packages/core/` mod list. Lifts the core-lock per CLAUDE.md amendment. |
| Skipping caveman summary | `feedback_explain_for_nontechnical_founder` memory: PRDs serve a non-technical founder reviewer. §1 needs both technical + plain-language. |
| Marking ambiguous criteria "should" or "feels right" | Acceptance criteria must be testable. "User can click Logout and is redirected to /login within 500ms" — not "logout works smoothly." |
| Re-specing M9 from scratch | M9 partial-build already merged. Scope plan §5.5 + 00c §1.E.1 + §5.6 dictate REUSE/REFACTOR/RE-SPEC dispositions per cluster. Follow them. |
| Promising live multi-device canvas sync | 00e §6 caveat: Trystero/awareness dormant per Q6. MVP is last-snapshot-wins on the server. Do not promise live sync. |
| Drafting Cluster 06 before Cluster 06's auth deps land | Wave order is mandatory. Cluster 01 + 11 ship first; downstream PRDs reference primitives from them. |
| Building HTML export | `feedback_image_export_locked` memory: Kova exports image slices, not HTML. Never raise as tradeoff. |
| Touching `SYSTEM_PROMPT` in `use-chat.ts` | CLAUDE.md hard constraint. Never modify. |
| Adding Nuxt / SSR / Next.js anywhere | D-5C reversed 2026-05-14 (00e §3.B). Single Vite SPA for the whole app. Marketing site = separate Astro project built later, blocking nothing. |
| Adding `access_token` to URL in onboarding flow | Launch-blocking security item (Cluster 02 PRD). Use httpOnly cookie or session storage. |
| Authoring PRD without first reading scope plan + 00c §2.A entry | Required per §3 of this guide. Skipping these = re-deriving work that's already done. |

---

## 7. The 12 PRDs — wave-by-wave tracker

| Wave | # | Cluster | Filename | Status | Author | Last update |
|---|---|---|---|---|---|---|
| **1** | 01 | Auth & Identity | `01-auth-and-identity.md` | APPROVED | Claude (Opus 4.7) | 2026-05-15 |
| **1** | 11 | Shared UI Infrastructure | `11-shared-ui-infrastructure.md` | IN-REVIEW | Claude (Opus 4.7) | 2026-05-15 |
| **2** | 02 | Onboarding & Dashboard | `02-onboarding-and-dashboard.md` | DRAFT | Claude (Opus 4.7) | 2026-05-17 |
| **2** | 03 | Brand Management | `03-brand-management.md` | DRAFT | Claude (Opus 4.7) | 2026-05-15 |
| **3** | 04 | Account + Stripe Billing | `04-account-and-stripe-billing.md` | IN-DRAFT | Claude (Opus 4.7) | 2026-05-15 |
| **3** | 12 | Settings + User Prefs | `12-settings-and-user-preferences.md` | APPROVED | Claude (Opus 4.7) | 2026-05-23 |
| **4** | 05 | Brand Kit + Drag-Drop | `05-brand-kit-and-drag-drop.md` | REVIEW | Claude (Opus 4.7) | 2026-05-17 |
| **4** | 06 | Canvas Editor Core Chrome | `06-canvas-editor-core-chrome.md` | DRAFT | Claude (Opus 4.7) | 2026-05-15 |
| **5** | 07a | Canvas Engine Core + Renderer | `07a-canvas-engine-core-renderer.md` | IN-DRAFT | Claude (Opus 4.7) | 2026-05-15 |
| **5** | 07b | Canvas Engine Inspector + Overlays | `07b-canvas-engine-inspector-overlays.md` | IN-DRAFT | Claude (Opus 4.7) | 2026-05-15 |
| **5** | 08 | Menus + Popovers + Shortcuts | `08-canvas-menus-popovers-shortcuts.md` | IN-DRAFT | Claude (Opus 4.7) | 2026-05-15 |
| **6** | 09 | Version History + Trash | `09-version-history-and-trash.md` | DRAFT | Claude (Opus 4.7) | 2026-05-17 |
| **6** | 10 | AI Chat + Memory + Tools | `10-ai-chat-and-memory.md` | IN-DRAFT | Claude (Opus 4.7) | 2026-05-15 |

**Status states:** `PENDING` → `IN-DRAFT` → `IN-REVIEW` → `APPROVED` → `IN-IMPLEMENTATION` → `SHIPPED`.

When you finish drafting a PRD: update this table's row to reflect status + author + date. Commit alongside the PRD itself.

---

## 8. Definition of "PRD ready for implementation"

Authoritative checklist lives at `00-PRD_SCOPE_PLAN.md §8`. Reproduced here for convenience — do not diverge:

- [ ] Every §3 surface has a hi-fi file reference + scene ID
- [ ] §4 data model has migration SQL ready to run
- [ ] §5 backend has Edge Function signatures + RPC specs
- [ ] §6 frontend has route paths + Pinia store shapes + composable signatures
- [ ] §8 acceptance criteria all testable (not aspirational)
- [ ] §9 test plan has unit + integration + E2E + manual coverage
- [ ] §11 cross-cuts list complete + every dependency has a fulfilling PRD or explicit owner
- [ ] §12 risks listed with mitigation OR escalated to founder + resolved
- [ ] Founder sign-off recorded in §0 status field

After APPROVED → PRD enters implementation queue. Skills: `superpowers:writing-plans` → `superpowers:test-driven-development`.

---

## 9. PRD-hygiene rules from external verification (00e §6)

These do NOT gate Wave 1 but every cluster PRD must respect them when authoring its sections:

1. **No marketing-site spec in any PRD.** Marketing site is out of MVP, built later as separate Astro project. If a PRD's §11 references "/marketing", that's wrong.
2. **No live multi-device canvas sync promises** (00e §6 / 2.C.7). MVP = last-snapshot-wins on server. Trystero/awareness dormant per Q6. Phrase canvas-state propagation accordingly.
3. **D-5E persistent staging Supabase project** must carry a firm pre-launch trigger, not vague "closer to launch." If a PRD references staging env, name the trigger.
4. **D-3 RoPA / privacy disclosure** must name "storefront content analyzed for brand-voice inference" as an Anthropic sub-processor data flow. Cluster 01 (privacy policy) + Cluster 05 (brand-kit extract) own this.
5. **D-3 brand-voice guardrail:** AI-scraped voice/tone is an editable draft the user reviews and confirms — never a silent write. Cluster 05 PRD owns the confirm step.

6. **§8 acceptance bullet ↔ test annotation (W0-12 — 2026-05-20):** every PRD §8 bullet must map to at least one named test in the paired Plan. CI gate `bun run check:acceptance-mapping` (Plan 11 Task 11.9) enforces. Default mode is **fuzzy-match** — a bullet and test name sharing ≥4 ≥3-letter words pass. For NON-OBVIOUS mappings, annotate both sides with an HTML comment:

   ```markdown
   <!-- PRD §8 -->
   - [ ] User sees a magic-link email within 30 seconds <!-- ACC: 01-signup-magic-link-sent -->

   <!-- Plan Step 1 RED block -->
   it('sends magic-link on /signup', async () => { ... }) <!-- ACC: 01-signup-magic-link-sent -->
   ```

   `--strict` mode (post-launch target) requires every bullet to carry an explicit ACC id. During W0-12 rollout, annotate non-obvious bullets only; fuzzy-match handles the rest.

---

## 10. Plain-English summary (for founder)

What a PRD is: a single doc that says, for one feature cluster — here's how it looks (with mockup file links), here's the database tables it needs, here's the backend functions, here's the frontend code structure, here's how we test it, here's what we ship first vs later, here's what could go wrong. Engineers open the doc, build from it, done. No guesswork.

What this guide does: tells any agent (or human) how to write those PRDs in a way that doesn't lose anything. Where the source files live. What order to read them. What to do when sources disagree. What to ask vs decide. When to stop drafting and hand it to you.

Why a guide is needed: the four sources (mockups, design system, the 03 infra doc, the Q&A decisions) are scattered across two repos and ~10+ folders. Without a guide, every fresh agent re-derives the process and risks missing pieces. With it, "build the PRDs" is one command and the next agent picks up Wave 2 without context loss.

---

## 11. References

- Master plan: `kova-open-pencil-1/docs/kova-final-prds/00-PRD_SCOPE_PLAN.md`
- Audit: `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md`
- Verification handoff: `kova-open-pencil-1/docs/kova-final-prds/00d-EXTERNAL_VERIFICATION_HANDOFF.md`
- Verification verdict: `kova-open-pencil-1/docs/kova-final-prds/00e-EXTERNAL_VERIFICATION_VERDICT.md`
- 03 doc: `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/03-implied-surfaces-and-backend.md`
- Q1–Q5: `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q1-5-answers-03-implied-surfaces-and-backend.md`
- Q6–Q25: `kova-open-pencil-1/docs/superpowers/handoffs/design-overhaul/q6-25-answers-03-implied-surfaces-and-backend.md`
- Design system: `main-main-kova-scope/design-system/{design.md, kova-hifi.css, kova-hifi-light.css, TOKEN_CANONICAL.md}`
- Hi-fi index: `main-main-kova-scope/batch-a/`, `main-main-kova-scope/batch-a-additions/`, `main-main-kova-scope/batch-b/`
- Project CLAUDE.md: `/Users/jihoyang/kova-main/CLAUDE.md`
- Memory index: `/Users/jihoyang/.claude/projects/-Users-jihoyang-kova-main/memory/MEMORY.md`
