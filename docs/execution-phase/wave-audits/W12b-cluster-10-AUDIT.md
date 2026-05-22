# W12b — Cluster 10 (AI Chat + Memory) AUDIT Prompt

**Wave:** W12b
**Cluster:** 10 — AI chat as right-panel tab, layered system prompt, Shopify product chips, 5 Shopify AI tools, 2 wrappers around 07a APIs, brand memory, independent chats per canvas, tone snippets
**Audit type:** AI security (ANTHROPIC_API_KEY isolation), tool-layer schema discipline (valibot ONLY, no Zod), founder-lock caps (10 snippets / 50 memories / 20 chips / 20 chat tabs), AI SDK pattern compliance (@ai-sdk/anthropic + ToolLoopAgent, NO custom adapters)
**Status:** ready after W12b DONE (after Cluster 06 + 07a merged)
**Prerequisites:** Branch `app/cluster-10-ai-chat`. DONE at `cluster-reports/W12b-cluster-10-DONE.md`. Cluster 06 + 07a merged.

---

## Founder pre-flight

1. W12b printed DONE
2. Cluster 06 + 07a merged (07a's createSlice + addMeasurement APIs available)
3. ANTHROPIC_API_KEY in server-only env (verify no VITE_ prefix anywhere)

---

## Launch

Fresh session. Opus 4.7. Paste verbatim.

---

## PROMPT (paste verbatim)

```
You are the W12b AUDIT agent for Kova. Independent reviewer for
Cluster 10 — AI chat + memory.

Critical paranoia targets:
1. ANTHROPIC_API_KEY in browser bundle = full Anthropic credit
   exfiltration. CRITICAL on detection.
2. Zod in tool layer = hard ban per CLAUDE.md (valibot only). Any
   zod import in src/ai/tools.ts or dependencies = CRITICAL.
3. Custom Anthropic adapter = forbidden (use @ai-sdk/anthropic).
   Custom agentic loop = forbidden (use ToolLoopAgent).
4. SYSTEM_PROMPT constant in use-chat.ts is READ-ONLY — must not
   be modified.
5. Caps: 10 tone snippets / 50 brand memories / 20 chips per
   session / 20 chat tabs. Each enforced UI + server.

READ-ONLY. Surface CRITICAL via AskUserQuestion mid-audit.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
4. docs/execution-phase/execution-prompts/W12b-cluster-10-ai-chat.md
   (ORIGINAL execution prompt — scope boundary)
5. docs/kova-final-prds/10-ai-chat-and-memory.md
6. docs/kova-final-impl-plans/10-ai-chat-and-memory-plan.md
7. docs/execution-phase/cluster-reports/W12b-cluster-10-DONE.md
8. CLAUDE.md root + outer (Hard Constraints §"Never do" —
   valibot/AI-SDK/ToolLoopAgent locks)
9. ~/.claude/rules/common/security.md
10. project_prd10_decisions.md memory (15 founder locks 2026-05-15)

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion
3. security-review

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep
2. security-auditor — Anthropic API key isolation, Shopify token
   handling, brand-memory tenant isolation (RLS)
3. database-reviewer — brand_memories, chats, chat_tabs,
   product_references tables + RLS
4. typescript-pro — AI tool schemas (valibot), ToolLoopAgent
   integration types
5. context7 MCP — verify @ai-sdk/anthropic + ai SDK current API
   (W12b execution agent may have been on a prior SDK version)

## Conditional subagents

- vue-expert — chat panel reactivity, chip composer
- e2e-runner — chat round-trip (mock Anthropic) + Shopify chip
  add + tone snippet apply

## Cluster 10 expected scope

ALLOWED:
- supabase/migrations/*.sql — brand_memories, chats, chat_tabs,
  product_references tables + RLS
- src/components/canvas/chat/* — AIChat panel (right-panel tab),
  ChipRow, MessageList, Composer
- src/components/canvas/chat/memory/* — memory list, snippet list
- src/services/ai/* — system-prompt builder
- src/ai/tools.ts — 5 Shopify tools + 2 engine wrappers (valibot
  schemas)
- src/composables/use-chat.ts (NOTE: SYSTEM_PROMPT constant
  READ-ONLY)
- src/stores/* — useBrandMemoriesStore, useShopifyProductsStore,
  useChatStore
- supabase/functions/ai/* — server-side Anthropic proxy if needed
  (key never on client)
- tests/*

FORBIDDEN:
- packages/core/** — CRITICAL
- ANY modification to SYSTEM_PROMPT constant in use-chat.ts
- Custom Anthropic adapter (CLAUDE.md root §"Never do")
- Custom agentic loop (use ToolLoopAgent)
- Zod imports in src/ai/ or anywhere in src/

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline feat/m9-shopify..app/cluster-10-ai-chat
  git diff --stat feat/m9-shopify...app/cluster-10-ai-chat

One-per-task. Conventional commits.

### B. ANTHROPIC_API_KEY isolation (CRITICAL)

  # Browser-exposed key = CRITICAL
  git diff feat/m9-shopify...app/cluster-10-ai-chat | grep -nE \
    'VITE_ANTHROPIC|VITE_AI_KEY|VITE_CLAUDE'

  # Key referenced in client code (src/, not Edge Fns)
  git grep -nE 'ANTHROPIC_API_KEY|ANTHROPIC_AUTH|sk-ant-' src/ 2>/dev/null

Any hit = CRITICAL. Stop audit. AskUserQuestion immediately.

Verify the AI call architecture:
- Client component calls a SERVER endpoint (Edge Fn or Vercel API
  route) which holds ANTHROPIC_API_KEY
- Browser bundle has zero reference to the key

### C. valibot ONLY (no Zod) — CRITICAL per CLAUDE.md hard rule

  git grep -nE "from 'zod'|require\('zod'\)" src/ 2>/dev/null

Any hit = CRITICAL. Tool schemas in src/ai/tools.ts (and
dependencies) MUST use valibot.

Verify each of the 5 Shopify tools + 2 engine wrappers has a
valibot schema:

  git grep -nE 'import \* as v from .valibot.|v\.object\(|v\.string\(' \
    src/ai/tools.ts src/ai/*.ts 2>/dev/null

7 tools = 7 valibot schemas. Missing = HIGH.

### D. @ai-sdk/anthropic + ToolLoopAgent (no custom adapters)

  git grep -nE "@ai-sdk/anthropic|@ai-sdk/provider|ToolLoopAgent" src/ 2>/dev/null

Verify:
- @ai-sdk/anthropic imported (NOT custom anthropic adapter)
- ToolLoopAgent imported for agentic loop (NOT custom loop)

Check for forbidden custom patterns:

  git grep -nE 'class.*AnthropicAdapter|anthropic.messages.create' src/ 2>/dev/null

Custom adapter = CRITICAL.

### E. SYSTEM_PROMPT constant READ-ONLY

  git diff feat/m9-shopify...app/cluster-10-ai-chat -- \
    src/composables/use-chat.ts | grep -nE 'SYSTEM_PROMPT'

The constant declaration line should NOT appear in the diff (no
modification). If diff shows changes to SYSTEM_PROMPT = CRITICAL.

### F. Founder-locked caps (4 caps per project_prd10_decisions)

Verify cap values + enforcement:
- Tone snippets: max 10 per brand. UI prevents 11th add. Server
  rejects with descriptive error.
- Brand memories: max 50 per brand. UI prevents 51st. Server caps.
- Composer chips: max 20 per session. UI prevents 21st chip.
- Chat tabs: max 20 per canvas. UI prevents 21st tab.

Grep:

  git grep -nE 'MAX_TONE_SNIPPETS|MAX_BRAND_MEMORIES|MAX_CHIPS|MAX_CHAT_TABS|max.*10|max.*20|max.*50' \
    src/ supabase/migrations/ 2>/dev/null

Each cap should be a named constant (CLAUDE.md root §"Code
Conventions: No magic strings/numbers"). Inline literal = MEDIUM.

Verify cap enforcement with unit tests (add until cap, then
verify rejection).

### G. AI default tab (CT-005) + useRightPanelStore canonical
(CT-002 + W4 C-HIGH10)

- AI chat is RIGHT-PANEL TAB (not floating popup)
- Default tab on first canvas open = AI (CT-005)
- useRightPanelStore is the canonical store name (NOT
  useRightPanelTabStore — CT-002)

Open the right-panel scaffolding from Cluster 06 + verify this
cluster's AI tab plugs into it without duplicating the store.

### H. 5 Shopify AI tools

Each tool (searchProducts / getProduct / getProductImages /
listCollections / getCollection — or per PRD 10 §6 exact list):
- valibot schema
- hasShopifyConnection guard at entry
- NO_CONNECTION early-return when guard fails (per PRD 10 §6
  refactor)
- searchProducts: 'bestsellers' sort DROPPED (per PRD 10 §6
  refactor)
- Calls Shopify Admin API server-side (token never on client)
- Mock-friendly: tests use mocked Shopify responses

### I. 2 engine-wrapper AI tools

- createSliceFromSelection: wraps Cluster 07a's
  figma.createSlice() (uses the SLICE NodeType from 07a)
- addMeasurement: page-level signature per W4 CT-004 + uses
  figma.currentPage.addMeasurement (NOT a NodeType per founder
  lock)
- engine_unavailable response when
  figma.currentPage.addMeasurement missing (W4 C-LOW10.5)

### J. Layered system-prompt builder

Per PRD 10 + founder locks:
- Brand kit context (colors / fonts / logo) injected
- Tone snippets exemplars auto-injected (Q8 founder lock)
- Active product references (chips) injected
- Canvas state (currentPage, selection) injected

Each layer composable + testable.

### K. Independent chats per canvas + chat tabs

- chats table: one row per chat session, scoped to canvas_id
- chat_tabs table: tab metadata, scoped to canvas_id (or chats via
  FK)
- Switching canvas → loads chats scoped to that canvas (no
  cross-canvas leak)
- RLS: row visibility limited to owner via auth.uid()

### L. Single mutation entry contract for product_references
(W4 C-MED27)

- ONE function mutates chat product_references (not 5 scattered)
- Helper used by all callers
- Idempotent on duplicate add

### M. buildEmail() + parallel ensureChat + buildMessagePayload
(W4 B-MED5)

In handleSubmit:
- buildEmail() compose runs (if email flow)
- ensureChat + buildMessagePayload run in parallel (Promise.all)
- No sequential await pattern that would block UX

### N. Brand memory store (auto-populated, flat)

Per [project_m5_chat_memory_decisions]:
- Auto-populated by AI on relevant exchanges
- Flat structure (no nested categories)
- Stored in brand_memories Supabase table
- Max 50 per brand (cap above)

### O. Design-system compliance

  git diff feat/m9-shopify...app/cluster-10-ai-chat -- 'src/**' \
    | grep -E 'Math\.random|: any|!\.[a-zA-Z]|<style|style scoped|<svg|<icon-lucide-'

Any hit = CRITICAL.

Verify:
- Chat panel = .panel.ai
- AI-only accent = var(--accent-ink) #a9c4ff (NOT --accent)
- Chip row BELOW attachments (W4 C-MED28 + §3.2 + §12.12 founder
  lock)
- Send button = .btn.primary.icon with <KovaIcon name="send">
- Loading = <KovaSkeleton>

### P. Visual fidelity

- KOVA_AUDIT.md + tokens-used.md at cluster-audits/cluster-10-*
- 3-screenshot artifact for AI panel + chip composer + memory tab
- Visual-diff thresholds enforced

### Q. Cross-cluster contracts

- Cluster 01: Anthropic sub-processor disclosure copy contribution
  to privacy policy / RoPA — documented in DONE report (NOT
  shipped here per execution prompt; just documented for Cluster
  01 follow-up)
- Cluster 03: brand kit data consumed (read-only; Cluster 03 owns
  CRUD)
- Cluster 06: AI tab plugs into right-panel scaffold; default-tab
  CT-005 honored
- Cluster 07a: createSlice + addMeasurement consumed
- Cluster 11: KovaIcon, KovaSkeleton, KovaToast, KovaPopover

### R. Quality gates (re-run) + CI grep gates

  bun install
  bun run build / check / test:unit / test:dupes
  supabase migration up --local

CI grep gate (re-run):
- zero `import { z } from 'zod'`
- zero `VITE_ANTHROPIC_API_KEY` or any client-side Anthropic key
- zero <icon-lucide-*>

### S. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit feat/m9-shopify...app/cluster-10-ai-chat. CRITICAL focus:
  ANTHROPIC_API_KEY server-only (no VITE_, no src/ reference),
  valibot ONLY (no Zod), @ai-sdk/anthropic + ToolLoopAgent (no
  custom adapters), SYSTEM_PROMPT untouched, 4 founder-locked
  caps (10/50/20/20), 5 Shopify tools refactored per PRD 10 §6,
  2 engine wrappers with engine_unavailable handling, AI default
  tab + canonical store name, design-system compliance.
  CRITICAL/HIGH/MEDIUM/LOW."

### T. Plan task completion + Done-report accuracy

Walk Plan 10 §6 task-by-task. Verify 15 founder locks each
honored. Spot-check 5 DONE claims.

## Output

  docs/execution-phase/wave-audits/reports/W12b-cluster-10-AUDIT-REPORT.md

Format per W7 template. Include separate sections:
- "Secret isolation audit" (ANTHROPIC_API_KEY)
- "Tool-layer schema audit" (valibot only)
- "AI SDK pattern audit" (@ai-sdk/anthropic + ToolLoopAgent)
- "SYSTEM_PROMPT integrity"
- "15 Founder-lock compliance" (per-lock table)
- "Cap enforcement audit" (10/50/20/20)

Print:
  "W12b AUDIT COMPLETE. Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W12b-cluster-10-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

**Estimated wall-clock: 75-120 min. Token spend: $100-180.**
