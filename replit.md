# THUMBLAB — AI Thumbnail Studio

AI-powered YouTube thumbnail creation studio for generating, editing, and exporting high-CTR thumbnails using A/B testing.

## Run & Operate

- `pnpm --filter @workspace/thumblab run dev` — run the THUMBLAB frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS
- Canvas editing: Fabric.js v5
- Local storage: Dexie.js (IndexedDB) for templates, assets, and export queue
- AI: Puter.js (claude-sonnet-4-5 for prompts, flux-1.1-pro / gemini-2.0-flash for image gen)
- Export: JSZip for bulk PNG/ZIP download
- API: Express 5 (base infrastructure, mostly unused by THUMBLAB frontend)

## Where things live

- Frontend app: `artifacts/thumblab/src/`
- Main app shell: `artifacts/thumblab/src/App.tsx`
- Global state: `artifacts/thumblab/src/store/useStore.ts` (React context + useReducer)
- Puter.js AI helpers: `artifacts/thumblab/src/lib/puter.ts`
- Dexie.js DB: `artifacts/thumblab/src/lib/db.ts`
- Type definitions: `artifacts/thumblab/src/types.ts`
- Components: `artifacts/thumblab/src/components/`

## Architecture decisions

- Pure frontend app — no backend needed (Puter.js handles all AI calls, Dexie.js handles all persistence)
- Fabric.js v5 used (not v6) for stability with the canvas editor
- Puter.js loaded via CDN in index.html (not npm) since it's not available on npm
- useReducer + React Context for state management (avoids prop drilling without adding zustand)
- Canvas state (fabric JSON + background image) stored in React state and serialized to IndexedDB for templates

## Product

- **AI Generation**: Paste script/NexLev notes → Claude writes optimized image prompts → Flux or Gemini generates images
- **A/B Testing**: Generate two variants simultaneously, compare side-by-side
- **Canvas Editing**: Fabric.js canvas for adding text (YouTube style), arrows, circles, drawing
- **Recreate**: Upload a reference thumbnail → Claude analyzes → generates a new version
- **Templates**: Save canvas layouts to IndexedDB, organized in folders, reload for daily workflow
- **Assets**: Upload character/prop/background PNGs, use on canvas
- **Bulk Export**: Queue thumbnails → download as ZIP
- **Branding**: Brand colors, visual vibe, logo watermark, font choice persisted in localStorage
- **SEO**: Auto-fill filename slugs, alt text, meta tags — injected on download

## User preferences

- App color scheme: Dark (#0a0e27 bg, #00d4ff cyan accent, #00ff88 green accent)
- Uses Puter.js for all AI — no external API keys needed
- All data stored locally (IndexedDB + localStorage) — no backend database required

## Gotchas

- Puter.js is loaded via CDN `<script>` tag in index.html — it exposes `window.puter` globally
- Fabric.js v5 API differs from v6 — don't upgrade without testing canvas operations
- Canvas size is dynamic based on container width; image export multiplies up to native resolution
- Template saves capture current Fabric.js canvas JSON + low-res thumbnail preview
