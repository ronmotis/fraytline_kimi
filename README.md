# Fraytline — AI-Native Freight Operating System (functional prototype)

Fraytline is **not** a transportation-management system. It is an AI-native freight
operating system that learns how each operator works, builds a **living model of the
business**, and progressively configures the workflows, intelligence, interfaces, and
automation the operator needs.

One product, one model — a local delivery and a five-country corridor are the same
**Movement** primitive. A regional movement is a local movement with more legs,
jurisdictions, documents, currencies, parties, milestones, and exceptions; the model
carries that complexity from day one and the interface **reveals it progressively**.

Live deployment: **https://fraytline.fraytline.workers.dev**

## What's inside

| Surface | What it demonstrates |
|---|---|
| **Today** (`/today`) | Conductor morning brief citing business memory inline, ranked attention queue, live ops map, role-aware lenses |
| **Movements** (`/movements`) | Universal Movement primitive; flagship Mombasa→Kigali detail with border dossiers, money/FX, parties, exceptions — plus a **"View as: Simple \| Full"** progressive-complexity toggle |
| **Quotes** (`/quotes`) | Natural-language quote composer; price drafted **from memory** with a "Why this price" reasoning trace; one-click convert-to-movement |
| **Dispatch** (`/dispatch`) | Drag-to-assign with a compatibility verdict engine, fleet gantt, driver manifest with press-and-hold checkpoints |
| **Memory** (`/memory`) | The **Operator Model**: entity graph, fact stream with confidence + evidence, Confirm / Correct / Forget learning loop, Teach bar |
| **Autonomy** (`/actions`) | Autonomy dials per workflow, governed approval queue with reasoning traces, guardrail editor, reversible action ledger |
| **Exchange** (`/exchange`) | Load/capacity boards with memory fit scores, governed bidding with live guardrail floor checks, deal room |
| **Network** (`/network`) | Multi-tenant exhibit: *Meridian Freight* (multinational) vs *Savannah Haulage* (4 trucks) — same model, revealed depth. Org, people & roles, fleet, partner trust |
| **Genesis** (`/onboarding`) | Document-ingest → interview → the living model visibly assembles (WebGL Signal Field) |

Multi-tenant switcher and role switcher (Owner / Dispatcher / Finance / Driver /
Customer) live in the top bar. `⌘K` opens the Conductor command bar —
try `quote 12t nairobi to kampala tuesday for bidco`.

## Stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 3.4 · shadcn/ui · zustand ·
framer-motion · GSAP · three.js (R3F) · react-router 7

The "intelligence" is a fully client-side simulated engine
(`src/store/`): business memory, policy/guardrail engine, pricing and fit
recommendation, Conductor intent parsing, and a proactive event loop — all stateful,
so every approval, correction, and taught fact visibly changes the system.

## Run it

```bash
npm install        # also restores the 8 image assets into public/ (see below)
npm run dev        # dev server
npm run build      # production build → dist/
npm run preview    # preview the production build
```

### A note on image assets

The GitHub mirror is pushed through a text-only API, so the 8 binary PNGs
(avatars, textures) are **not** stored in the repo. `npm install` runs
`scripts/restore-assets.mjs`, which downloads them once from the live deployment
(`FRAYTLINE_ASSET_BASE` overrides the source). Everything else is 100% source.

## Deploy

- **Cloudflare Workers (static assets)** — `npm run build && npx wrangler deploy`
  (config in `wrangler.jsonc`; SPA fallback via `not_found_handling`)
- **Vercel** — import the repo; auto-detected Vite (`vercel.json` adds the SPA rewrite)

---

Built as a product-design exploration: what a Magic-Quadrant-leading,
AI-native freight OS should *feel* like.
