#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = resolve(root, ".state");
const repoRoot = resolve(root, "..", "..", "..");
const mergeGateScript = resolve(repoRoot, ".claude/skills/git-hygiene-loop/pr-merge-gate.sh");

const errorCodes = {
  dirtyTree: "DIRTY_TREE",
  featureBranch: "NOT_ON_FEATURE_BRANCH",
  ticket: "TICKET_UNRESOLVED",
  preview: "PREVIEW_TIMEOUT",
  staleBase: "STALE_BASE",
  rebase: "REBASE_CONFLICT",
  mergeGate: "CONFIRM_MERGE_REQUIRED",
  gateFailed: "GATE_FAILED",
  prUnresolved: "PR_UNRESOLVED",
  mergeSha: "MERGE_SHA_UNRESOLVED",
  config: "SHIP_CONFIG_MISSING",
  deployNotLive: "DEPLOY_NOT_LIVE"
};

function loadConfig() {
  const path = resolve(root, "config.json");
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseArgs(argv) {
  const parsed = { stage: "plan", flags: new Map(), positional: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--") && parsed.stage === "plan") {
      parsed.stage = arg;
    } else if (arg.startsWith("--")) {
      const [name, inlineValue] = arg.slice(2).split("=", 2);
      const next = argv[index + 1];
      const value = inlineValue ?? (next && !next.startsWith("--") ? argv[++index] : "true");
      parsed.flags.set(name, value);
    } else {
      parsed.positional.push(arg);
    }
  }
  return parsed;
}

function command(name, args, options = {}) {
  if (options.dryRun) {
    return "";
  }
  return execFileSync(name, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function tryCommand(name, args) {
  try {
    return command(name, args);
  } catch {
    return null;
  }
}

function currentBranch() {
  return command("git", ["branch", "--show-current"]);
}

function ticketFromBranch(branch) {
  const match = branch.match(/(?:^|\/)([a-z]+-[0-9]+)(?:-|$)/i);
  return match ? match[1].toUpperCase() : null;
}

function statePath(ticket) {
  return resolve(stateDir, `${ticket}.json`);
}

function defaultStatus(ticket, branch) {
  return {
    ticket,
    branch,
    prNumber: null,
    prUrl: null,
    previewUrl: null,
    previewVerified: false,
    baseSha: null,
    baseMoved: false,
    merged: false,
    gatePassed: false,
    prodVerified: false,
    prodSha: null,
    prodUrl: null,
    ticketState: null,
    gate: "idle",
    errors: []
  };
}

function loadStatus(ticket, branch) {
  const path = statePath(ticket);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf8"));
  }
  return defaultStatus(ticket, branch);
}

function saveStatus(status, dryRun) {
  if (dryRun) {
    return;
  }
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(statePath(status.ticket), `${JSON.stringify(status, null, 2)}\n`);
}

function fail(status, code, message) {
  status.gate = "failed";
  status.errors = [...status.errors, { code, message }];
  throw new ShipError(code, message, status);
}

class ShipError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function assertFeatureBranch(status) {
  if (status.branch === "master" || status.branch === "main" || !status.branch.startsWith("feat/")) {
    fail(status, errorCodes.featureBranch, `Expected feat/<ticket>-* branch, got ${status.branch || "(none)"}.`);
  }
}

function assertCleanTree(status) {
  const dirty = command("git", ["status", "--porcelain"]);
  if (dirty) {
    fail(status, errorCodes.dirtyTree, "Worktree has uncommitted changes.");
  }
}

function resolveTicket(flags, branch) {
  const provided = flags.get("ticket");
  return provided ? provided.toUpperCase() : ticketFromBranch(branch);
}

function preflight(flags) {
  const dryRun = flags.get("dry-run") === "true";
  const branch = currentBranch();
  const ticket = resolveTicket(flags, branch);
  const status = loadStatus(ticket ?? "UNKNOWN", branch);
  status.gate = "preflight";
  status.branch = branch;
  status.ticket = ticket;
  assertFeatureBranch(status);
  assertCleanTree(status);
  if (!ticket) {
    fail(status, errorCodes.ticket, "Could not resolve a ticket from the branch or --ticket.");
  }
  command("git", ["fetch", "origin"], { dryRun });
  status.baseSha = dryRun ? "0000000000000000000000000000000000000000" : command("git", ["rev-parse", "origin/master"]);
  saveStatus(status, dryRun);
  return status;
}

function printDryRunPlan(ticket) {
  const steps = [
    `Resolve ticket ${ticket} and assert feat/<ticket>-* clean worktree`,
    "git fetch origin and record origin/master as baseSha",
    "gh pr view --json number,url or gh pr create --base master",
    "poll gh pr checks until Vercel succeeds",
    "extract and HTTP-verify the preview URL",
    "stop at gate 1 unless --confirm-merge or --yolo is provided",
    "before merge, fetch origin and block if origin/master moved",
    "if --rebase is provided, rebase, build, push, and re-verify preview",
    "delegate the merge to pr-merge-gate.sh --go <PR#> (the single merge lane — never gh pr merge directly)",
    "run postmerge: poll <productionUrl>/api/version until it serves the merge SHA",
    "hand off to linear-report.mjs after screenshot review (screenshots from the verified prod URL)"
  ];
  console.log(steps.map((step, index) => `${index + 1}. ${step}`).join("\n"));
}

function readPr() {
  const json = tryCommand("gh", ["pr", "view", "--json", "number,url"]);
  return json ? JSON.parse(json) : null;
}

function createPr(ticket) {
  const title = `chore(ship): ${ticket} - ready for review`;
  command("gh", ["pr", "create", "--base", "master", "--title", title, "--body", `Linear ticket: ${ticket}`]);
  return readPr();
}

function prStage(flags) {
  const dryRun = flags.get("dry-run") === "true";
  const ticket = flags.get("ticket")?.toUpperCase();
  if (dryRun) {
    console.log(`gh pr view --json number,url || gh pr create --base master --title "<type>(<scope>): ${ticket ?? "TICKET"} - <summary>"`);
    console.log("gh pr checks <pr> --watch");
    console.log("gh pr view --json statusCheckRollup");
    return defaultStatus(ticket ?? null, null);
  }
  const status = preflight(flags);
  const pr = readPr() ?? createPr(status.ticket);
  if (!pr) {
    fail(status, "PR_UNRESOLVED", "Could not create or read the GitHub pull request.");
  }
  status.prNumber = pr.number;
  status.prUrl = pr.url;
  status.gate = "preview-review";
  saveStatus(status, false);
  console.log(`PR: ${status.prUrl}`);
  console.log("Wait for Vercel, verify the preview URL, then resume with merge --confirm-merge.");
  return status;
}

async function verifyPreview(url) {
  const response = await fetch(url);
  const text = await response.text();
  return response.ok && text.trim().length > 0;
}

async function mergeStage(flags) {
  const dryRun = flags.get("dry-run") === "true";
  const ticket = flags.get("ticket")?.toUpperCase() ?? ticketFromBranch(currentBranch());
  if (dryRun) {
    console.log("git fetch origin");
    console.log("compare current origin/master to saved baseSha (fast STALE_BASE pre-check)");
    console.log("bash .claude/skills/git-hygiene-loop/pr-merge-gate.sh --go <PR#>  # single merge lane — never gh pr merge directly");
    return defaultStatus(ticket ?? null, null);
  }
  const status = loadStatus(ticket, currentBranch());
  command("git", ["fetch", "origin"]);
  const latestBase = command("git", ["rev-parse", "origin/master"]);
  status.baseMoved = Boolean(status.baseSha && status.baseSha !== latestBase);
  if (status.baseMoved && flags.get("rebase") !== "true") {
    fail(status, errorCodes.staleBase, "origin/master moved after preflight; rebase and re-verify before merge.");
  }
  if (flags.get("confirm-merge") !== "true" && flags.get("yolo") !== "true") {
    status.gate = "confirm-merge";
    saveStatus(status, false);
    fail(status, errorCodes.mergeGate, "Preview gate reached. Re-run with --confirm-merge after review.");
  }
  if (status.baseMoved) {
    try {
      command("git", ["rebase", "origin/master"]);
    } catch {
      fail(status, errorCodes.rebase, "Rebase conflict. Resolve manually, rebuild, and resume.");
    }
    command("npm", ["run", "build"]);
    command("git", ["push", "--force-with-lease"]);
  }
  if (status.previewUrl && !(await verifyPreview(status.previewUrl))) {
    fail(status, errorCodes.preview, `Preview did not return non-empty HTML: ${status.previewUrl}`);
  }
  const prNumber = status.prNumber ?? readPr()?.number ?? null;
  if (!prNumber) {
    fail(status, errorCodes.prUnresolved, "No PR number in ship state and none resolvable from the branch.");
  }
  console.log(`MERGE-LANE: delegating to pr-merge-gate.sh --go ${prNumber}`);
  try {
    execFileSync("bash", [mergeGateScript, "--go", String(prNumber)], { stdio: ["ignore", "inherit", "inherit"] });
    status.gatePassed = true;
  } catch {
    status.gatePassed = false;
    fail(status, errorCodes.gateFailed, `pr-merge-gate refused PR #${prNumber} — fix the gate failure (see output above) and re-run.`);
  }
  const prState = tryCommand("gh", ["pr", "view", String(prNumber), "--json", "state", "--jq", ".state"]);
  if (prState !== "MERGED") {
    fail(status, errorCodes.gateFailed, `Gate passed but PR #${prNumber} state is ${prState ?? "unknown"} — inspect manually.`);
  }
  status.merged = true;
  status.gate = "screenshot-review";
  saveStatus(status, false);
  console.log("Merged via the gate. Run `ship.mjs postmerge` to verify production before screenshots + Linear.");
  return status;
}

async function fetchVersion(url) {
  const headers = {};
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  try {
    const response = await fetch(url, { headers, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      return { protected: true };
    }
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

async function postmergeStage(flags) {
  const dryRun = flags.get("dry-run") === "true";
  const branch = tryCommand("git", ["branch", "--show-current"]) ?? null;
  const ticket = flags.get("ticket")?.toUpperCase() ?? (branch ? ticketFromBranch(branch) : null);
  const status = loadStatus(ticket ?? "UNKNOWN", branch);
  const config = loadConfig();
  if (!config?.productionUrl) {
    fail(status, errorCodes.config, "Missing .claude/skills/ship/config.json with productionUrl.");
  }
  const timeoutMs = Number(config.postmergeTimeoutMs ?? 900000);
  const intervalMs = Number(config.pollIntervalMs ?? 20000);
  let target = flags.get("sha") ?? null;
  if (dryRun) {
    console.log(`poll ${config.productionUrl}/api/version every ${intervalMs / 1000}s (timeout ${timeoutMs / 1000}s)`);
    console.log(`target sha: ${target ?? "(resolved from `gh pr view --json mergeCommit` at run time)"}`);
    console.log("pass when served sha == target OR target is an ancestor of the served sha (later sibling merge)");
    console.log("on timeout: exit non-zero with DEPLOY_NOT_LIVE — do NOT post to Linear");
    return status;
  }
  if (!target) {
    const pr = status.prNumber
      ? tryCommand("gh", ["pr", "view", String(status.prNumber), "--json", "mergeCommit", "--jq", ".mergeCommit.oid"])
      : null;
    target = pr || null;
  }
  if (!target) {
    fail(status, errorCodes.mergeSha, "Could not resolve the merge commit SHA (pass --sha or ensure prNumber is in ship state).");
  }
  tryCommand("git", ["fetch", "origin"]);
  const versionUrl = `${config.productionUrl.replace(/\/$/, "")}/api/version`;
  const deadline = Date.now() + timeoutMs;
  let observed = null;
  for (;;) {
    const payload = await fetchVersion(versionUrl);
    if (payload?.protected) {
      fail(
        status,
        errorCodes.deployNotLive,
        `${versionUrl} is behind Vercel deployment protection — set VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Project → Deployment Protection → Protection Bypass for Automation) and re-run.`
      );
    }
    observed = payload?.sha ?? null;
    if (observed) {
      const isAncestor = observed === target || tryCommand("git", ["merge-base", "--is-ancestor", target, observed]) !== null;
      if (isAncestor) {
        status.prodVerified = true;
        status.prodSha = observed;
        status.prodUrl = config.productionUrl;
        saveStatus(status, false);
        console.log(`Production verified: ${config.productionUrl} serves ${observed.slice(0, 7)} (contains merge ${target.slice(0, 7)}).`);
        return status;
      }
    }
    if (Date.now() >= deadline) {
      break;
    }
    console.log(`waiting for deploy… production serves ${observed ? observed.slice(0, 7) : "(unreadable)"}, want ${target.slice(0, 7)}`);
    await new Promise((resolveSleep) => setTimeout(resolveSleep, intervalMs));
  }
  status.prodVerified = false;
  saveStatus(status, false);
  fail(
    status,
    errorCodes.deployNotLive,
    `Production still serves ${observed ?? "(unreadable)"} after ${timeoutMs / 1000}s; wanted ${target}. Check the Vercel build logs — do NOT comment on Linear or move the ticket.`
  );
}

async function main() {
  const { stage, flags } = parseArgs(process.argv.slice(2));
  if (flags.get("dry-run") === "true" && stage === "plan") {
    printDryRunPlan(flags.get("ticket")?.toUpperCase() ?? "TICKET");
    return;
  }
  if (stage === "preflight") {
    console.log(JSON.stringify(preflight(flags), null, 2));
    return;
  }
  if (stage === "pr") {
    console.log(JSON.stringify(prStage(flags), null, 2));
    return;
  }
  if (stage === "merge") {
    console.log(JSON.stringify(await mergeStage(flags), null, 2));
    return;
  }
  if (stage === "postmerge") {
    console.log(JSON.stringify(await postmergeStage(flags), null, 2));
    return;
  }
  throw new Error(`Unknown stage: ${stage}`);
}

main().catch((error) => {
  if (error instanceof ShipError) {
    saveStatus(error.status, false);
    console.error(`${error.code}: ${error.message}`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});
