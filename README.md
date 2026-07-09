# Cnext HRMS

Central Retail's next-gen HR Management System — currently in a **clickable UI-mockup phase**, built to let the HR Team demo every flow end-to-end and approve the visual + interaction direction before any production backend work begins.

## Tech Stack

| Layer     | Technology                                        |
|-----------|----------------------------------------------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5    |
| Styling   | Tailwind CSS 4 (`@theme` tokens in `globals.css`)  |
| State     | Zustand 5                                          |
| i18n      | next-intl 4 — Thai/English, default **`en`**       |
| Auth      | mocked (persona switcher, no real login)           |
| Testing   | Vitest (unit), Playwright (E2E)                   |

Backend (real API, persistence, auth wiring, payroll integration) is **out of scope** during the mockup phase. `lib/api.ts` and the `*-api.ts` helpers simulate async calls against static/registry seed data.

## Getting Started

```bash
npm install
npm run dev      # → http://localhost:3000 (redirects to /en/home)
```

Thai is available at `/th`. There's no browser-based locale auto-detection — `/` always redirects to the English default.

```bash
npm run build    # production build — also the TS typecheck gate
npm run start    # serve the production build
```

## Testing

```bash
npm test                 # Vitest unit/integration
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright E2E (e2e/*.spec.ts)
npm run test:e2e:headed  # Playwright headed
npm run lint             # ESLint — scoped to the glob in package.json scripts.lint
npm run i18n:parity      # asserts en.json/th.json have identical keys
npm run verify           # lint + build + i18n:parity — the pre-PR gate
```

Focused runs: `npm test -- --run <pattern>`, `npm run test:e2e -- --project=chromium <spec>`.

## Demo & Personas

Auth is mocked. Switch roles live from the shell **Persona Switcher** (top bar) or the **Login-As ribbon** — no real login needed. Roles map onto 4 demo tiers (`src/lib/persona-tiers.ts`):

| Tier | Persona          | Roles                    | Sees                                 |
|------|------------------|---------------------------|---------------------------------------|
| A    | System / HR Admin | `hr_admin`, `hr_manager` | top-tier config + all records         |
| B    | People Partners  | `hrbp`, `spd`             | BU partners, dev/privilege approvers  |
| C    | Manager          | `manager`                 | team views + quick approvals          |
| D    | Employee         | `employee`                 | ESS baseline (own profile/requests)   |

**Menu RBAC removes inaccessible items entirely** — it never renders them locked/disabled.

## Architecture

```
src/
├── app/[locale]/...      # file-based routes, locale-prefixed
│   └── globals.css       # Cnext design tokens (Tailwind @theme) — source of truth
├── components/
│   ├── cnext/             # design system: atoms/, molecules/, organisms/, shell/
│   └── <domain>/         # feature folders (benefits, payroll, leave, time, quick-approve, ...)
├── stores/               # Zustand stores (ui/auth, cnext-*-slice, *-approvals, domain)
├── lib/                  # rbac, persona-tiers, mock data/seeds, api mocks, date/mask helpers
├── i18n/                 # config.ts (locales, default), routing.ts, request.ts
└── messages/             # en.json + th.json, kept at key parity
middleware.ts              # next-intl locale routing
next.config.ts             # root redirect + legacy route aliases
```

Routing is file-based with no registry — add a screen by creating `src/app/[locale]/<route>/page.tsx`. `next.config.ts` redirects `/` → `/en/home` and normalizes several legacy route aliases (e.g. `/leave` → `/timeoff`, `/ess` → `/profile/me`).

## Design System

Cnext is the canonical design system — start every UI task from its primitives and tokens, not route-local card markup or raw hex.

- **Tokens**: `src/app/globals.css` (Tailwind `@theme`). Docs: `docs/design-system-cnext.md`, `docs/cnext-components.md`, `docs/cnext-shell-port-notes.md`.
- **Primitives**: `src/components/cnext/{atoms,molecules,organisms}` — `Button`, `Card`, `FormField`, `DataTable`, `Modal`, `Nav`, `Avatar`, `Toggle`, `Textarea`, `EmptyState`, `FileUploadField`, etc. — plus `shell/` (`AppShell`, `Sidebar`, `Topbar`, `CommandPalette`, `PersonaSwitcher`, `LoginAsRibbon`).
- **Palette**: cream canvas `#F6F1E8` + navy ink `#0E1B2C`; primary/active = **teal** `#1FA8A0`; info/alt = indigo `#5B6CE0`.
- **NO-RED guardrail**: danger/error uses **pumpkin** `#FB923C`, never red/crimson/coral/clay.

## License

Proprietary — Central Group (Central Retail Corporation).
