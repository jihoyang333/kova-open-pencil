# M5 Image Transport Decision — Research Brief

## What is Kova?

Kova is an AI-powered email design SaaS built on top of OpenPencil (an open-source Figma-compatible design editor). Users describe what email they want in a chat interface, and Claude generates the design directly on the canvas using OpenPencil's scene graph and tool system.

## What we're building (M5: AI Email Generation Engine)

We're building the core AI pipeline for Kova. The key piece relevant to this decision:

**An AI chat popup** where users can:
1. Type a prompt describing the email they want
2. **Attach images** (brand photos, product shots, reference designs) to give Claude visual context
3. Claude generates or modifies the email design on the canvas

The images users attach are **reference material** — "here's our product photo, use it in the hero section" or "make something like this design."

## The technical setup

```
User types prompt + attaches images
    → Frontend (Vue 3 app in browser)
    → POST /api/ai-proxy (our Vercel serverless function)
    → Anthropic Messages API (Claude with vision)
    → Claude generates design via tool calls
    → Canvas renders the result
```

- **Frontend framework:** Vue 3 + Vite
- **AI SDK:** Vercel AI SDK (`@ai-sdk/anthropic`, `ToolLoopAgent`, `DirectChatTransport`)
- **Hosting:** Vercel (serverless functions)
- **Storage:** Supabase Storage (private buckets with signed URLs)
- **Existing media library:** Users already upload images to Supabase Storage per brand (built in M4). Images are stored as `MediaAsset` objects with metadata (filename, dimensions, file_size, mime_type, storage_path).

## The predicament

When a user attaches an image to a chat message, we need to get that image to Claude's vision API. There are several ways to do this, and our constraints create tension between them.

### Constraint 1: Vercel body size limit

Vercel serverless functions have a **4.5MB request body limit** per request. This is not configurable — it's a hard platform limit.

### Constraint 2: Users will attach large images

Kova users upload high-resolution brand photography and product shots. These are often:
- 5MB+ per image
- PNG format (lossless, larger file sizes)
- High resolution (3000px+ wide)
- Multiple images per message is plausible ("here are 3 product photos, make a grid")

A single high-res PNG can easily exceed the 4.5MB Vercel limit, making inline base64 encoding impossible for these cases.

### Constraint 3: Multi-turn conversations resend images

When using base64-encoded images in the Anthropic API, the image data is embedded in the message content. On every subsequent turn of conversation, the **entire message history** (including all images from previous turns) gets resent. A conversation with 3 image attachments across different turns would resend all 3 images on every new message, compounding payload size.

### Constraint 4: Anthropic API has its own limits

- Max image size: 5MB per image
- Max request size: 32MB total
- Max 600 images per request
- Supported formats: JPEG, PNG, GIF, WebP

### Constraint 5: Images already exist in Supabase Storage

Users' brand images are already uploaded to Supabase Storage via the media library (M4). We can generate signed URLs for these images. However, users can also **paste images from clipboard** in the chat — these are NOT in Supabase Storage.

## The options we've identified

### Option A: Base64 inline (SDK default)

How it works: The Vercel AI SDK converts attached files to base64 data URLs (`data:image/png;base64,...`) and embeds them in the message content. The proxy forwards the request body as-is to Anthropic.

- **Pro:** Zero custom code — the SDK handles everything automatically
- **Pro:** Works for clipboard-pasted images too
- **Con:** Breaks on images > ~3.3MB (4.5MB limit minus overhead = ~3.3MB of actual image data after base64 inflation of ~33%)
- **Con:** Multi-turn payload growth — images resent every turn
- **Con:** Doesn't work for Kova's use case (users attach 5MB+ images)

### Option B: Client-side compression + base64

How it works: Before attaching, resize/compress images client-side (e.g., cap at 2000px wide, convert PNG to JPEG at 80% quality). Then use base64 as in Option A.

- **Pro:** Keeps things simple — still uses SDK defaults
- **Pro:** Works for clipboard paste images too
- **Con:** Lossy — users lose image quality (may matter for brand photography)
- **Con:** Still has multi-turn resending problem
- **Con:** 2000px wide JPEG at 80% quality could still be 1-2MB, limiting how many images per message
- **Question:** Does Claude actually need full resolution? For reference images in email design, probably not. But for detailed product photography, maybe.

### Option C: Upload to Supabase Storage, pass URL to Anthropic

How it works: All attached images get uploaded to Supabase Storage first. The proxy generates a signed URL and sends it to Anthropic using their URL source type (`{ "type": "url", "url": "https://..." }`).

- **Pro:** No size limit on the message body (URLs are tiny)
- **Pro:** No multi-turn resending problem — URL is small
- **Pro:** Images from the media library already have storage paths
- **Con:** Requires upload step for clipboard-pasted images (latency)
- **Con:** Signed URLs have expiration — need to be valid long enough for Anthropic to fetch
- **Con:** More moving parts (upload → get URL → sign → pass to API → Anthropic fetches)
- **Con:** Anthropic's servers need to be able to reach the Supabase Storage URL (public accessibility)

### Option D: Anthropic Files API

How it works: Upload images to Anthropic's own file storage, get a `file_id`, reference by ID in messages.

- **Pro:** Anthropic recommends this for multi-turn conversations
- **Pro:** Upload once, reference forever — most efficient for repeated use
- **Pro:** No payload inflation, no resending
- **Con:** Requires managing Anthropic file lifecycle (upload, delete, track IDs)
- **Con:** Server-side only — the proxy would need to handle file uploads separately
- **Con:** Adds a separate API call per image before the chat message can be sent
- **Con:** File IDs are tied to the API key — if key rotates, files become inaccessible

### Option E: Hybrid — compress + Supabase URL fallback

How it works: Client-side compression for all images (cap resolution, convert to JPEG). Small images (< 1MB after compression) go inline as base64. Larger images or media library images go via Supabase signed URL.

- **Pro:** Best of both worlds — fast for small images, reliable for large ones
- **Pro:** Clipboard paste works without upload latency for small images
- **Con:** Most complex to implement — two code paths
- **Con:** Still has multi-turn resending for the base64 images

## What we know about how others handle this

- **Figma Make:** Allows image attachment in AI chat. Internal mechanism is not publicly documented. Given Figma runs cloud infrastructure (not serverless), they likely don't face the same body size constraints.
- **Pencil.dev:** Supports reference image attachment per conversation. Uses the same Vercel AI SDK. Likely uses the SDK's default base64 approach, but image size constraints for their users are unknown.
- **ChatGPT / Claude.ai:** Both accept image uploads. ChatGPT uploads to OpenAI's servers first. Claude.ai likely uses the Files API or base64 depending on size.

## Questions for research

1. What do production AI-powered design tools (Figma Make, Canva Magic Design, Adobe Firefly in Express) actually do when users attach large images for AI processing?
2. Is client-side compression acceptable for email design workflows? What resolution does Claude actually need to understand image content for design reference?
3. Are there other approaches we haven't considered?
4. What's the simplest option that handles 5MB+ PNGs reliably without overengineering?
5. Does Anthropic's URL source type work with Supabase Storage signed URLs? Any CORS or accessibility issues?
6. For multi-turn conversations in a design tool (10-20 turns with image references), what's the most cost-effective approach for token usage?
