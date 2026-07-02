# Figma Capture (code→design 1:1)

Capture the **live** Humi HR app into editable Figma frames 1:1 via the official Figma MCP server. This is the chosen path over Stitch (generative) and html.to.design (manual extension).

## Setup (once)

- Plugin: `claude plugin install figma@claude-plugins-official` (remote MCP `https://mcp.figma.com/mcp`, OAuth).
- Account kenstudio.io@gmail.com, plan key `team::1303988049666046084`. **Needs a paid plan** — Starter free hits an MCP tool-call limit after ~12 calls.
- Target file "Humi HR — Live Capture": fileKey `S3lmjnZpoIawSEz2Ov3nkB`. Manifest: `specs/figma-capture-manifest.json` (nodeId per captureUrl; null = todo). Route map: `specs/figma-live-capture.md`.

## Inputs

- `routes`: `$1` — comma-separated routes to capture (e.g. `home,profile,timeoff`). Default: the next `null`-nodeId batch from the manifest.

## Working recipe (the only reliable one — others hang)

1. **Instrument at parse time** — add to `src/frontend/src/app/layout.tsx` `<head>`:
   `<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />`
   Dynamic injection does NOT auto-fire — capture.js must be present when the page parses. Remove after.
2. **Auth** — seed localStorage `humi-auth` = `{state:{userId:'ADM001',username:'admin',email:'admin@humi.test',roles:[...all...],isAuthenticated:true},version:0}` (no password; shared per Chrome profile).
3. **Gated lifecycle forms** — add `?ed=YYYY-MM-DD` to the URL and read it via `useSearchParams()` into the page's effective-date state so `EffectiveDateGate` skips to the child (proven on pay-rate-change/transfer). Caveat: an `actionAvailability` guard can still supersede (pick an `in_probation` employee for the probation-assessment form).
4. **Per page**
   - `generate_figma_design(fileKey)` → mints a captureId.
   - Launch in a **REAL browser** (capture.js needs the Figma plugin handshake the CDP/claude-in-chrome tab lacks — it hangs silently there):
     `open "http://localhost:3000/en/<route>#figmacapture=<id>&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2F<id>%2Fsubmit&figmadelay=1500"`
   - Poll `generate_figma_design(fileKey, captureId)` ~every 8-12s until "added to your existing file"; write the nodeId to the manifest.
5. **Batch at scale** — mint 4 captureIds → `open -a "Google Chrome"` each **staggered 5s apart** (background-tab JS throttling stalls capture.js; the 5s gap lets each fire while focused) → poll → single sequential writer. Laggards stuck `pending`: re-`open` that one focused (same captureId, unconsumed while pending) to unstick.

## De-instrument (must ship nothing)

- `git restore src/frontend/src/app/layout.tsx` + revert any `?ed=` page edits.
- Assert `git diff --quiet` — no instrumentation ships.

## Componentized / wall-map (optional, advanced)

Raw captures are pixel-faithful frames, not components. For a real design system + wall-map layout (variable collections from `globals.css`, token-bound components, per-lane rows), see `specs/figma-live-capture.md`. Binding gotchas: `getVariableByIdAsync` needs the FULL id incl. `VariableID:` prefix; bind paint inline (`boundVariables.color` via `VARIABLE_ALIAS`) rather than `setBoundVariableForPaint`; reset `counterAxisSizingMode` to `'AUTO'` after switching auto-layout direction. Fonts: Anuphan (display+body, TH/EN) + Geist Mono (numerics).

## Related memory

`reference_figma_mcp_code_to_design`, `reference_stitch_mcp_generation_behavior`, `reference_lifecycle_effectivedategate_e2e`.
