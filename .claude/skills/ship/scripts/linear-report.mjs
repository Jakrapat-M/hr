#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const flags = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const [name, inlineValue] = arg.slice(2).split("=", 2);
    const next = argv[index + 1];
    const value = inlineValue ?? (next && !next.startsWith("--") ? argv[++index] : "true");
    flags.set(name, value);
  }
  return flags;
}

function readStatus(ticket, explicitPath) {
  const path = explicitPath ?? resolve(".claude/skills/ship/.state", `${ticket}.json`);
  if (!existsSync(path)) {
    return { ticket, prUrl: null, previewUrl: null, ticketState: null, merged: false };
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

function targetState() {
  return "In Review";
}

function isImmutablePreview(url) {
  // branch-alias URLs (…-git-<branch>-….vercel.app) die when the branch is deleted;
  // only the per-commit deployment URL is safe to hand to the BA.
  return typeof url === "string" && url.includes(".vercel.app") && !url.includes("-git-");
}

function buildComment(status, screenshots) {
  const lines = [
    `Shipped ${status.ticket} for review.`,
    "",
    "What changed:",
    "- The approved implementation has been merged and is ready for BA review.",
    ""
  ];
  lines.push("Review links:");
  if (status.merged) {
    if (status.prodVerified && status.prodUrl) {
      lines.push(`- Live app: ${status.prodUrl} (build ${String(status.prodSha ?? "").slice(0, 7) || "unknown"})`);
    } else {
      lines.push("- Live app: (production not yet verified — run `ship.mjs postmerge` before posting this comment)");
    }
  }
  lines.push(`- Pull request: ${status.prUrl ?? "(not recorded)"}`);
  if (isImmutablePreview(status.previewUrl)) {
    lines.push(`- Preview (per-commit, immutable): ${status.previewUrl}`);
  }
  lines.push("");
  if (screenshots.length > 0) {
    lines.push("Screenshots:", ...screenshots.map((path) => `- ${path}`), "");
  }
  lines.push("Ticket state: In Review");
  return lines.join("\n");
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const ticket = flags.get("ticket")?.toUpperCase();
  if (!ticket) {
    throw new Error("Missing --ticket STA-123.");
  }
  const status = readStatus(ticket, flags.get("status"));
  const screenshots = flags.get("screenshots")?.split(",").filter(Boolean) ?? [];
  const payload = {
    ticket,
    dryRun: flags.get("dry-run") === "true",
    targetState: targetState(status.ticketState),
    neverSetDone: true,
    comment: buildComment(status, screenshots)
  };
  console.log(JSON.stringify(payload, null, 2));
}

main();

