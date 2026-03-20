# M3 Onboarding Wizard — Chunk 3: Extraction APIs

Paste this into a fresh Claude Code session from the `kova-main/` directory.

---

## Prompt

We're building Kova, an AI-powered email design SaaS. I'm continuing M3 — the onboarding wizard. Chunks 1-2 (UI) are complete on branch `m3-onboarding-wizard`. Now I need Chunk 3: the extraction API endpoints and wiring.

### What's done (all committed on `m3-onboarding-wizard`)

Branch has all M3 UI work:
- 7-screen onboarding wizard with split-screen layout
- `useOnboardingState` composable for wizard state
- All step components: Welcome, Name, BrandName, BrandUrl, Extraction, Review
- `ExtractionStep.vue` currently uses **mock data** with delays
- `useOnboardingComplete` composable for the completion flow
- 94 unit tests, all passing (including auth store mock isolation fix)
- `bun run check` — 0 errors

### What needs to happen (Tasks 14-16)

#### Task 14: `api/extract-brand.ts` — Brand Extraction Endpoint

Create a Vercel-style serverless function at `kova-open-pencil-1/api/extract-brand.ts`:

1. **Input:** `POST { url: string }`
2. **Process:**
   - Validate input URL
   - Use Firecrawl API to scrape website (screenshot + HTML)
   - Extract logo URL from HTML meta tags (og:image, apple-touch-icon, favicon)
   - Send screenshot to Claude Vision API (`claude-sonnet-4-6`) for color/font analysis
3. **Output:** `{ logo_url: string | null, colors: { primary, secondary, accent, background }, fonts: { heading, body } }`
4. **Env vars (server-only):** `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`
5. **Error handling:** Validate URL, check for required env vars, return 502 on scrape failure, fallback defaults on parse failure

**This task is independent of Task 15 — implement in parallel.**

#### Task 15: `api/analyze-writing-style.ts` — Writing Style Endpoint

Create a Vercel-style serverless function at `kova-open-pencil-1/api/analyze-writing-style.ts`:

1. **Input:** `POST { url: string }`
2. **Process:**
   - Use Firecrawl API to scrape website text (markdown format)
   - Truncate to 5000 chars to limit token usage
   - Send to Claude API (`claude-sonnet-4-6`) for tone/voice analysis
3. **Output:** `{ writing_style: string | null }`
4. **Env vars (server-only):** `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`
5. **Error handling:** Graceful fallback — return `{ writing_style: null }` on any error (don't block onboarding)

**This task is independent of Task 14 — implement in parallel.**

#### Task 16: Wire APIs into ExtractionStep

Update `src/components/onboarding/ExtractionStep.vue` to call real API endpoints:

1. **Replace mock extraction** with real API calls to `/api/extract-brand` and `/api/analyze-writing-style`
2. **Call both endpoints in parallel** on component mount
3. **Progressive UI updates:** Logo, Colors, Fonts come from `extract-brand` (one response, update each field as processed). Voice comes from `analyze-writing-style`.
4. **Cache the brand response** — logo, colors, and fonts all come from the same API call
5. **Keep mock data as fallback** for local dev without API keys. Use `const USE_MOCK = !import.meta.env.VITE_SUPABASE_URL` or similar env check.
6. **Partial failure:** Individual items show error status, flow continues. User can still proceed with whatever was extracted.

**Key changes in ExtractionStep.vue:**
- Replace `MOCK_RESULTS` + sequential `delay()` calls with real parallel API calls
- `fetchBrandData(url)` → calls `/api/extract-brand`
- `fetchWritingStyle(url)` → calls `/api/analyze-writing-style`
- Update items progressively as each piece arrives
- `allDone` triggers after both calls complete (success or error)
- Emit `complete` after 1.5s delay (auto-advance)

### Current ExtractionStep mock structure (to be replaced)

The current component at `src/components/onboarding/ExtractionStep.vue` uses:
- `MOCK_RESULTS` object with hardcoded logo URL, colors, fonts, voice
- Sequential `delay()` calls to simulate progressive loading
- `updateItem()` helper for immutable item state updates (keep this)
- `allDone` ref triggers auto-advance after 1.5s (keep this)

### Sources of truth

- **Plan:** `kova-open-pencil-1/docs/superpowers/plans/2026-03-20-m3-onboarding-wizard.md` (Tasks 14-16 in "Chunk 3" section — includes full implementation code)
- **Design spec:** `kova-open-pencil-1/docs/superpowers/specs/2026-03-20-m3-onboarding-wizard-design.md` (API endpoints section)
- **CLAUDE.md** — architecture, hard constraints, code conventions

### Verification checklist

After completing Tasks 14-16:
- [ ] Both API endpoints exist: `api/extract-brand.ts`, `api/analyze-writing-style.ts`
- [ ] ExtractionStep calls real APIs when available, falls back to mock
- [ ] Partial failures handled gracefully (individual items show error, flow continues)
- [ ] All existing unit tests still pass: `bun test tests/unit/`
- [ ] `bun run check` — 0 errors, 0 warnings
- [ ] `bun run dev` compiles without errors
- [ ] Navigate through all 7 screens in browser at `/onboarding`
- [ ] Test with mock data (no API keys): extraction shows mock results
- [ ] If API keys configured: test with real URL, verify extraction works

### Skills & subagents

| When | Use |
|------|-----|
| Before implementing | `superpowers:writing-plans` or use existing plan |
| API endpoint implementation | Tasks 14 & 15 can run in parallel subagents |
| After implementation | `superpowers:verification-before-completion` |
| Writing chunk 4 handoff | Reference plan Tasks 17+ |

### What comes next (Chunk 4 preview)

After Chunk 3, the remaining M3 work is integration and polish:
- Task 17: Route guard tests for onboarding
- Task 18+: E2E tests, polish, edge cases
