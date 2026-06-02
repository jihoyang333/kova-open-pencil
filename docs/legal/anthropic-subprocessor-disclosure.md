# Anthropic Sub-processor Disclosure — Source Fragment

> **Audience:** Cluster 01 PRD author. Lift verbatim into `docs/legal/privacy-policy.md` and `docs/legal/ropa.md`.

## Purpose

When users interact with Kova's AI Chat (canvas right-panel AI tab), the following data is sent to Anthropic, a sub-processor, to generate AI design suggestions:

- The user's chat message text (per turn)
- Image URLs attached to the user's message (Supabase Storage public URLs)
- The active brand's kit (colors, fonts, voice, tone snippets, saved blocks)
- The active brand's saved memories (`brand_memories` table — auto-extracted + user-added)
- The active brand's available media library images (filename + dimensions + Supabase Storage URL)
- The active chat conversation's product-reference summaries (composer chips — product IDs, titles, image URLs, prices, handles, sourced from the user's connected Shopify store)
- Tool-call results (e.g. Shopify product / collection / variant rows the AI retrieves on demand)

## Data flow

Browser → `POST /api/ai-proxy/v1/messages` (Kova server) → forwards to `https://api.anthropic.com/v1/messages`. The `ANTHROPIC_API_KEY` lives only on the Kova server. Anthropic streams back the AI response, which is then persisted by Kova in `chat_messages`.

## Anthropic terms

Anthropic processes this data per its [Privacy Policy](https://www.anthropic.com/legal/privacy) and [Trust Center](https://trust.anthropic.com/).

## Training-data status

Anthropic does NOT use API-channel data to train models by default. Zero-data-retention (ZDR) is being negotiated for production. Until ZDR is in place, the operator-batch deletion runbook documented in Cluster 01 §5.1.4.3 is the enforcement mechanism for user-deletion (Q15 GDPR cascade).

## Mandatory in:

- Privacy policy page (`/privacy`) — include this as a sub-processor section
- Record of Processing Activities (RoPA) markdown — list Anthropic as a sub-processor with purpose "AI design generation" + data categories above
