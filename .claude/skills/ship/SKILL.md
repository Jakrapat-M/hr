---
name: ship
description: Ship one Linear ticket through PR, Vercel preview, merge guard, screenshots, and In Review reporting
argument-hint: "<TICKET> [--confirm-merge] [--yolo] [--dry-run]"
---

# Ship

## Purpose

Run the deterministic tail of one Linear ticket: create or reuse the PR, wait for a live Vercel preview, stop for human review, guard against a stale base, merge **only through the single merge lane** (`pr-merge-gate.sh`), verify the production deploy actually serves the merged commit, require screenshot review from the verified URL, post a BA-friendly Linear report, and move the ticket to **In Review**. Never move a ticket to **Done**.

Runbook (invariants + failure playbook): [docs/two-session-workflow.md](../../../docs/two-session-workflow.md).

## Inputs

- `TICKET`: `$1`, e.g. `STA-181`. If omitted, `ship.mjs preflight` resolves it from `feat/<ticket>-*`.
- `--confirm-merge`: resume after gate 1 when the PR and preview have been reviewed.
- `--yolo`: allow trusted low-risk tickets to pass gate 1 automatically. Gate 2 still requires screenshot review.
- `--dry-run`: print commands and payloads without network writes, merge, or Linear mutations.

## Workflow

1. Confirm `/linear-implement` steps 1-6 are complete: Linear ACs checked, worktree created from `origin/master`, implementation done, build/lint/tests/render verification passed, and an independent review lane approved.
2. Run preflight:
   ```bash
   node .claude/skills/ship/scripts/ship.mjs preflight --ticket <TICKET>
   ```
   This refuses `master`/`main`, refuses dirty worktrees, resolves the ticket, fetches `origin/master`, records `baseSha`, and writes `.claude/skills/ship/.state/<TICKET>.json`.
3. Create or reuse the PR and verify the preview:
   ```bash
   node .claude/skills/ship/scripts/ship.mjs pr --ticket <TICKET>
   ```
   The script owns deterministic `gh`/`git` mechanics and updates `ship-status.json` after each transition.
4. **Human gate 1:** send the PR URL and verified Vercel preview URL for review. Stop unless `--confirm-merge` or `--yolo` is provided.
5. Merge only through the stale-base guard + the single merge lane:
   ```bash
   node .claude/skills/ship/scripts/ship.mjs merge --ticket <TICKET> --confirm-merge
   ```
   The script fetches `origin/master` first: if it differs from recorded `baseSha`, it refuses with `STALE_BASE` until the branch is rebased, rebuilt, force-pushed, and the preview is re-verified. The merge itself is **delegated to `pr-merge-gate.sh --go <PR#>`** (fresh-master rebase → feature-preservation EN+TH → hot-file policy → build → baseline-diffed tests → serialized merge); `gatePassed` is recorded in the state file. The gate is the only merge path — the script never merges directly.
6. **Deploy-verify (postmerge)** — prove production serves the merge before telling anyone it's live:
   ```bash
   node .claude/skills/ship/scripts/ship.mjs postmerge --ticket <TICKET>
   ```
   Reads the merge SHA from the PR, polls `<productionUrl>/api/version` (`.claude/skills/ship/config.json`) until the served `sha` equals it or contains it as an ancestor (a later sibling merge also passes). On timeout it exits non-zero with `DEPLOY_NOT_LIVE` — check the Vercel build logs and do **not** post to Linear. Success records `prodVerified`, `prodSha`, `prodUrl` in the state file.
7. **Human gate 2:** capture screenshots **from the verified production URL** (localhost only as a supplement) into `specs/ship/<TICKET>/`, send the files to the reviewer, and require an eyeball OK. Verify the render, not just green tests.
8. Generate the Linear report payload (blocked on `prodVerified: true`):
   ```bash
   node .claude/skills/ship/scripts/linear-report.mjs --ticket <TICKET> --screenshots specs/ship/<TICKET>/prod-home.png,specs/ship/<TICKET>/prod-feature.png
   ```
   The comment links the **production URL** plus `build <sha7>`. A preview link is included only when it is the immutable per-commit deployment URL — never the `…-git-<branch>…` alias that dies when the branch is deleted.
9. Post the payload with Linear MCP tools:
   - `mcp__linear__save_comment`: use the generated `comment`.
   - `mcp__linear__save_issue`: set state to **In Review**.
   - If GitHub automation moved the issue to Done, pull it back to **In Review**.
   - Hard guard: never set **Done**.
10. Clean up: `bash .claude/skills/git-hygiene-loop/worktree-guard.sh cleanup <TICKET>`.

## Status Contract

`ship.mjs` writes `.claude/skills/ship/.state/<TICKET>.json` with:

```json
{
  "ticket": "STA-181",
  "branch": "feat/sta-181-example",
  "prNumber": 123,
  "prUrl": "https://github.com/org/repo/pull/123",
  "previewUrl": "https://example.vercel.app",
  "previewVerified": true,
  "baseSha": "0000000000000000000000000000000000000000",
  "baseMoved": false,
  "merged": false,
  "gatePassed": false,
  "prodVerified": false,
  "prodSha": null,
  "prodUrl": null,
  "ticketState": "In Review",
  "gate": "preview-review",
  "errors": []
}
```

## Validation

Run the local non-mutating checks before relying on the workflow:

```bash
node --check .claude/skills/ship/scripts/ship.mjs
node --check .claude/skills/ship/scripts/linear-report.mjs
node .claude/skills/ship/scripts/ship.mjs --dry-run --ticket STA-181
node .claude/skills/ship/scripts/ship.mjs preflight --dry-run --ticket STA-181
node .claude/skills/ship/scripts/ship.mjs merge --dry-run --ticket STA-181
node .claude/skills/ship/scripts/ship.mjs postmerge --dry-run --ticket STA-181
node .claude/skills/ship/scripts/linear-report.mjs --dry-run --ticket STA-181
grep -n "In Review\|never.*Done\|confirm-merge" .claude/skills/ship/SKILL.md
```

Run live PR/Vercel/Linear rehearsals only on a low-risk ticket or throwaway PR. The live path intentionally stops at the human gates.

