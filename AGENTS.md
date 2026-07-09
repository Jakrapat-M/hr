# AGENTS.md

Guidance for AI coding agents (Codex, Claude Code, or others) working in this repository.

## What this repo is

**Cnext HRMS** — Central Retail's next-gen HR Management System, currently in a **clickable UI-mockup phase**: a single Next.js app that lets the HR team demo every flow end-to-end before any production backend is built. There is no separate backend service in this repo; `lib/api.ts` and friends simulate async calls against static/registry mock data.

Stack: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Zustand 5, next-intl 4 (TH/EN).

## Layout

```
src/
├── app/[locale]/...     # file-based routes, locale-prefixed (th|en)
│   └── globals.css      # Cnext design tokens (Tailwind @theme) — source of truth
├── components/
│   ├── cnext/            # design system: atoms/, molecules/, organisms/, shell/
│   └── <domain>/        # feature folders (benefits, payroll, leave, time, quick-approve, ...)
├── stores/              # Zustand stores (ui/auth, cnext-*-slice, *-approvals, domain)
├── lib/                 # rbac, persona-tiers, mock data/seeds, api mocks, date/mask helpers
├── i18n/                # config.ts (locales + default), routing.ts, request.ts
└── messages/            # en.json + th.json, next-intl catalogs (kept at key parity)
middleware.ts             # next-intl routing (localeDetection: false)
next.config.ts            # root redirect + legacy route aliases
```

No route registry — add a screen by creating `src/app/[locale]/<route>/page.tsx`. Locales are `['th','en']` with **`en` as `defaultLocale`** (`src/i18n/config.ts`); `next.config.ts` redirects `/` → `/en/home`. `localeDetection` is off, so there's no browser-based auto-redirect — always preserve the active locale segment when linking.

Design docs: `docs/design-system-cnext.md`, `docs/cnext-components.md`, `docs/cnext-shell-port-notes.md`.

## Commands (run from repo root)

```bash
npm install
npm run dev            # → http://localhost:3000
npm run build          # production build; also the TS typecheck gate
npm test                # Vitest unit/integration
npm run test:e2e       # Playwright E2E
npm run lint           # ESLint — scoped to the glob in package.json scripts.lint, not the whole tree
npm run i18n:parity    # asserts en.json/th.json have identical keys
npm run verify         # lint + build + i18n:parity — run before opening a PR
```

Focused runs: `npm test -- --run <pattern>`, `npm run test:e2e -- --project=chromium <spec>`.

## Hard rules

- **Cnext tokens only, NO-RED**: use CSS vars/utilities from `src/app/globals.css` (`bg-canvas`, `text-ink`, `border-hairline`, etc.) — no raw hex, no route-local card markup. Danger/error is **pumpkin** `--color-danger` (`#FB923C`), never red/crimson/coral/clay.
- **RBAC menu = remove, not hide**: if a role lacks access, drop the menu item/group entirely; never render it locked or disabled. Roles: `employee < manager < hrbp < spd < hr_admin < hr_manager` (`src/lib/rbac.ts`), mapped to 4 demo persona tiers in `src/lib/persona-tiers.ts`.
- **Approvals are unified**: every approval surfaces in the `/quick-approve` umbrella (tabs + rows + count) — never as a standalone per-feature entry page. Detail pages under `/workflows/<type>/[id]` are fine.
- **TH/EN parity**: add i18n keys to both `messages/en.json` and `messages/th.json`; `npm run i18n:parity` enforces it.
- **No new dependencies** without an explicit request.
- **Server Components by default** — add `'use client'` only when a component needs interactivity/state.
- **No dev-internal copy in user-facing UI**: no ticket IDs (e.g. STA-123) or "post-backend" roadmap phrasing in product screens; use neutral copy like "Coming soon" instead.
- **Mockup phase**: no real backend wiring (POST/PUT handlers, persistence, auth, payroll integration) — focus on clickable flows over backend correctness.

## Conventions

- Reuse existing Cnext primitives, Zustand stores, lib helpers, and routes before introducing new patterns. Keep diffs small and reversible.
- Match existing local style; don't refactor unrelated code opportunistically.
- For route/UI/behavior changes, add or update a Vitest/Playwright regression test alongside the change.
- Sensitive fields (bank accounts, national IDs, salary) stay masked by default — use the existing masking helpers.

## Specs

- `specs/` — plans and decision records (see `specs/README.md`).
- `.claude/commands/*.md` — reusable slash-command prompts (`/chore`, `/implement`, `/plan`, `/build`, `/prime`, `/test_e2e`, etc.).

## Planned

- Next.js is currently `^16.0.0` (16.1.6 installed). A follow-up upgrade to Next ≥16.2 will adopt the Vercel AI-agents convention (bundled docs at `node_modules/next/dist/docs/` plus a marker-delimited block in this file). Not applicable yet — do not add the marker block until that upgrade lands.
