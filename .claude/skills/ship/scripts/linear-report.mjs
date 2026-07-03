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

function buildComment(status, screenshots) {
  const lines = [
    `Shipped ${status.ticket} for review.`,
    "",
    "What changed:",
    "- The approved implementation has been merged and is ready for BA review.",
    "- The preview was checked before merge.",
    "",
    "Review links:",
    `- Pull request: ${status.prUrl ?? "(not recorded)"}`,
    `- Vercel preview: ${status.previewUrl ?? "(not recorded)"}`,
    ""
  ];
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

