---
name: ship
description: Ship one Linear ticket through PR, Vercel preview, merge guard, screenshots, and In Review reporting
argument-hint: "<TICKET> [--confirm-merge] [--yolo] [--dry-run]"
---

# Ship

## Purpose

Run the deterministic tail of one Linear ticket: create or reuse the PR, wait for a live Vercel preview, stop for human review, guard against a stale base, merge only when safe, require screenshot review, post a BA-friendly Linear report, and move the ticket to **In Review**. Never move a ticket to **Done**.

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
5. Merge only through the stale-base guard:
   ```bash
   node .claude/skills/ship/scripts/ship.mjs merge --ticket <TICKET> --confirm-merge
   ```
   Before `gh pr merge`, the script fetches `origin/master`. If it differs from recorded `baseSha`, it refuses with `STALE_BASE` until the branch is rebased, rebuilt, force-pushed, and the preview is re-verified.
6. **Human gate 2:** capture screenshots using the existing deck-capture harness into `specs/ship/<TICKET>/`, send the files to the reviewer, and require an eyeball OK. Verify the render, not just green tests.
7. Generate the Linear report payload:
   ```bash
   node .claude/skills/ship/scripts/linear-report.mjs --ticket <TICKET> --screenshots specs/ship/<TICKET>/localhost.png,specs/ship/<TICKET>/vercel.png
   ```
8. Post the payload with Linear MCP tools:
   - `mcp__linear__save_comment`: use the generated `comment`.
   - `mcp__linear__save_issue`: set state to **In Review**.
   - If GitHub automation moved the issue to Done, pull it back to **In Review**.
   - Hard guard: never set **Done**.
9. Remove the ticket worktree after the report is complete.

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
node .claude/skills/ship/scripts/linear-report.mjs --dry-run --ticket STA-181
grep -n "In Review\|never.*Done\|confirm-merge" .claude/skills/ship/SKILL.md
```

Run live PR/Vercel/Linear rehearsals only on a low-risk ticket or throwaway PR. The live path intentionally stops at the human gates.

