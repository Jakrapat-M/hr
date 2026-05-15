#!/usr/bin/env python3
"""Humi design-system contract checker.

Enforces the design rules documented in AGENTS.md > "Humi Design System Contract"
when Claude Code writes or edits files under src/frontend/.

Rules:
  R1  NO_HEX_LITERAL    Raw #rrggbb / #rgb / rgb(...) / rgba(...) in .tsx/.ts/.jsx/.js
                        files. Tokens live in globals.css; component code must use
                        Humi token classes/CSS variables.
  R2  NO_RED_FAMILY     bg-red-*, text-red-*, border-red-*, ring-red-*, from/to/via-red-*,
                        legacy Central retail #C8102E, or color names "clay"/"crimson"/
                        "brick" used as token references. Use Humi `danger` (pumpkin) or
                        `accent` (teal) instead.
  R3  NO_LEGACY_CARD    `className="card"` or `class="card"` or `.card {` in migrated
                        Humi routes. Use the <Card /> primitive or `humi-card` token
                        class.
  R4  NO_ARBITRARY_TEXT_SIZE
                        text-[<n>px] arbitrary Tailwind values. Use the Tailwind text
                        scale (text-xs/sm/base/lg/xl/2xl/...) defined in @theme.

Output: each violation prints one line to stderr in the form:
    HUMI:<rule-id> <file>:<line> <matched> -> <fix-hint>
Exit code 2 → blocks the tool call.
Exit code 0 → allows it.

The checker is callable both as a Claude Code hook (reads JSON from stdin) and as a
standalone CLI for ad-hoc scanning (`python humi_design_check.py <file>...`).
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


# ---------------------------------------------------------------------------
# Scope
# ---------------------------------------------------------------------------
FRONTEND_ROOT = 'src/frontend/'

# Files where raw hex/rgb is *expected* (token definitions, mock data, etc.)
HEX_ALLOWED_SUFFIXES = (
    '/src/app/globals.css',
    '/src/app/_tokens.css',
    'prod-tokens.css',
)
HEX_ALLOWED_DIR_HINTS = (
    '/messages/',
    '/__fixtures__/',
    '/__tests__/fixtures/',
    '/public/',
)

# File types we scan in general
SCAN_SUFFIXES = ('.ts', '.tsx', '.js', '.jsx', '.css', '.scss')


@dataclass(frozen=True)
class Violation:
    rule: str
    file: str
    line: int
    text: str
    hint: str

    def format(self) -> str:
        return f"HUMI:{self.rule} {self.file}:{self.line}  «{self.text.strip()}»  → {self.hint}"


# ---------------------------------------------------------------------------
# Regexes
# ---------------------------------------------------------------------------
RE_HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')
RE_RGB = re.compile(r'\brgba?\s*\(')

# Tailwind red utility classes (any prefix)
RE_RED_TAILWIND = re.compile(
    r'\b(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|outline|caret|accent|placeholder|divide|shadow)-red-\d{2,3}\b'
)
RE_RED_HEX_LEGACY = re.compile(r'#C8102E\b', re.IGNORECASE)
RE_RED_NAME = re.compile(
    r'\b(?:bg|text|border|ring|from|to|via)-(?:clay|crimson|brick|cardinal)\b'
)

# className="... card ..." or class="... card ..."
RE_LEGACY_CARD_JSX = re.compile(r'''class(?:Name)?\s*=\s*['"`]([^'"`]*\bcard\b[^'"`]*)['"`]''')
RE_LEGACY_CARD_CSS = re.compile(r'^\s*\.card\s*[\{,]', re.MULTILINE)

# Tokens that *are* allowed (humi-card / *-card / card-*)
RE_ALLOWED_CARD_TOKEN = re.compile(r'\b(humi-card|card-\w+|\w+-card)\b')

# Arbitrary text-[<n>px] values
RE_ARBITRARY_TEXT_SIZE = re.compile(r'\btext-\[\d+(?:\.\d+)?px\]')


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _line_no(content: str, idx: int) -> int:
    return content.count('\n', 0, idx) + 1


def _allow_hex_in(path: str) -> bool:
    if any(path.endswith(s) for s in HEX_ALLOWED_SUFFIXES):
        return True
    if any(hint in path for hint in HEX_ALLOWED_DIR_HINTS):
        return True
    # .css/.scss files are token sources — hex is fine there
    if path.endswith('.css') or path.endswith('.scss'):
        return True
    return False


def _strip_comments_tsx(content: str) -> str:
    """Remove // line and /* block */ comments so we don't match inside them.

    Cheap and good-enough; doesn't try to parse string boundaries.
    """
    no_block = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    no_line = re.sub(r'//[^\n]*', '', no_block)
    return no_line


# ---------------------------------------------------------------------------
# Rule checks
# ---------------------------------------------------------------------------
def check_r1_hex(path: str, content: str) -> list[Violation]:
    if _allow_hex_in(path):
        return []
    if not path.endswith(('.ts', '.tsx', '.js', '.jsx')):
        return []
    scan = _strip_comments_tsx(content)
    out: list[Violation] = []
    for m in RE_HEX.finditer(scan):
        digits = len(m.group(0)) - 1
        if digits not in (3, 4, 6, 8):
            continue
        out.append(Violation(
            rule='R1-NO-HEX',
            file=path,
            line=_line_no(scan, m.start()),
            text=m.group(0),
            hint='use Humi token class (bg-accent, text-ink, ...) or var(--color-*) — define new tokens in globals.css',
        ))
    for m in RE_RGB.finditer(scan):
        out.append(Violation(
            rule='R1-NO-HEX',
            file=path,
            line=_line_no(scan, m.start()),
            text=m.group(0).rstrip('('),
            hint='avoid raw rgb()/rgba() in components — reference a token via var(--color-*)',
        ))
    return out


def check_r2_red(path: str, content: str) -> list[Violation]:
    out: list[Violation] = []
    for m in RE_RED_TAILWIND.finditer(content):
        out.append(Violation(
            rule='R2-NO-RED',
            file=path,
            line=_line_no(content, m.start()),
            text=m.group(0),
            hint='NO-RED guardrail — use bg-danger / text-danger / bg-danger-soft (pumpkin) or accent (teal)',
        ))
    for m in RE_RED_HEX_LEGACY.finditer(content):
        out.append(Violation(
            rule='R2-NO-RED',
            file=path,
            line=_line_no(content, m.start()),
            text=m.group(0),
            hint='legacy Central retail red — replaced by --color-accent (teal) in the Humi system',
        ))
    for m in RE_RED_NAME.finditer(content):
        out.append(Violation(
            rule='R2-NO-RED',
            file=path,
            line=_line_no(content, m.start()),
            text=m.group(0),
            hint='color name not in Humi palette — use accent/sage/butter/danger token classes',
        ))
    return out


def check_r3_legacy_card(path: str, content: str) -> list[Violation]:
    out: list[Violation] = []
    if path.endswith(('.tsx', '.jsx', '.html')):
        for m in RE_LEGACY_CARD_JSX.finditer(content):
            class_attr = m.group(1)
            tokens = re.findall(r'[\w-]+', class_attr)
            offending = [t for t in tokens if t == 'card']
            if not offending:
                continue
            # If a humi-card / card-*/ *-card token is co-located, the bare
            # `card` token is still legacy — flag it regardless.
            if any(RE_ALLOWED_CARD_TOKEN.search(t) for t in tokens if t != 'card'):
                pass
            out.append(Violation(
                rule='R3-NO-LEGACY-CARD',
                file=path,
                line=_line_no(content, m.start()),
                text=f'className="...{class_attr}..."',
                hint='use the <Card /> primitive from @/components/humi/Card or the humi-card token class',
            ))
    if path.endswith(('.css', '.scss')):
        for m in RE_LEGACY_CARD_CSS.finditer(content):
            out.append(Violation(
                rule='R3-NO-LEGACY-CARD',
                file=path,
                line=_line_no(content, m.start()),
                text=m.group(0),
                hint='route-local .card class — move to a humi-* token class or use the <Card /> primitive',
            ))
    return out


def check_r4_arbitrary_text(path: str, content: str) -> list[Violation]:
    if not path.endswith(('.tsx', '.jsx', '.ts', '.js', '.html')):
        return []
    out: list[Violation] = []
    for m in RE_ARBITRARY_TEXT_SIZE.finditer(content):
        out.append(Violation(
            rule='R4-NO-ARBITRARY-TEXT',
            file=path,
            line=_line_no(content, m.start()),
            text=m.group(0),
            hint='use the Tailwind text scale (text-xs/sm/base/lg/xl/2xl/3xl/4xl) — see open issues #115/#121/#122',
        ))
    return out


CHECKS = (check_r1_hex, check_r2_red, check_r3_legacy_card, check_r4_arbitrary_text)


def check_content(file_path: str, content: str) -> list[Violation]:
    if FRONTEND_ROOT not in file_path.replace('\\', '/'):
        return []
    if not file_path.endswith(SCAN_SUFFIXES):
        return []
    violations: list[Violation] = []
    for check in CHECKS:
        violations.extend(check(file_path, content))
    return violations


# ---------------------------------------------------------------------------
# Hook / CLI plumbing
# ---------------------------------------------------------------------------
def _gather_pairs(tool_name: str, tool_input: dict) -> list[tuple[str, str]]:
    """Return [(file_path, content_about_to_be_written), ...] for the tool call.

    For Edit/MultiEdit we check `new_string` (the post-edit text). For Write we check
    the entire `content`. Other tools return an empty list (we don't enforce there).
    """
    pairs: list[tuple[str, str]] = []
    if tool_name == 'Write':
        fp = tool_input.get('file_path', '')
        content = tool_input.get('content', '')
        if fp and isinstance(content, str):
            pairs.append((fp, content))
        return pairs
    if tool_name == 'Edit':
        fp = tool_input.get('file_path', '')
        new_string = tool_input.get('new_string', '')
        if fp and isinstance(new_string, str):
            pairs.append((fp, new_string))
        return pairs
    if tool_name == 'MultiEdit':
        fp = tool_input.get('file_path', '')
        edits = tool_input.get('edits', []) or []
        if fp:
            for edit in edits:
                ns = edit.get('new_string', '') if isinstance(edit, dict) else ''
                if not isinstance(ns, str):
                    continue
                if not ns:
                    continue
                pairs.append((fp, ns))
    return pairs


def _run_hook() -> int:
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    tool_name = data.get('tool_name', '')
    tool_input = data.get('tool_input', {}) or {}
    pairs = _gather_pairs(tool_name, tool_input)
    if not pairs:
        return 0
    all_violations: list[Violation] = []
    for fp, content in pairs:
        all_violations.extend(check_content(fp, content))
    if not all_violations:
        return 0
    print('Humi design contract violations — tool call BLOCKED:', file=sys.stderr)
    for v in all_violations[:50]:
        print('  ' + v.format(), file=sys.stderr)
    if len(all_violations) > 50:
        print(f'  ... and {len(all_violations) - 50} more', file=sys.stderr)
    print(
        'Reference: AGENTS.md > Humi Design System Contract. Override by editing the file manually, or fix to use tokens. Set HUMI_DESIGN_CHECK=off to disable.',
        file=sys.stderr,
    )
    return 2


def _run_cli(paths: Iterable[str]) -> int:
    total: list[Violation] = []
    for p in paths:
        path = Path(p)
        if not path.exists() or not path.is_file():
            continue
        try:
            text = path.read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        total.extend(check_content(str(path), text))
    if not total:
        print('OK — no Humi design violations.')
        return 0
    print(f'{len(total)} violation(s):')
    for v in total:
        print('  ' + v.format())
    return 1


def main() -> int:
    import os
    if os.environ.get('HUMI_DESIGN_CHECK', '').lower() in ('off', '0', 'false'):
        return 0
    if len(sys.argv) > 1:
        return _run_cli(sys.argv[1:])
    return _run_hook()


if __name__ == '__main__':
    sys.exit(main())
