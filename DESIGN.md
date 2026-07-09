---
version: alpha
name: Cnext System Design
description: Curated, presentation-ready Cnext design system for Central Group HR UI, executive decks, and AI-generated product mockups.
colors:
  primary: "#1FA8A0"
  primarySoft: "#D6EEEC"
  primaryHover: "#126E69"
  secondary: "#5B6CE0"
  secondarySoft: "#E1E4FB"
  canvas: "#F6F1E8"
  canvasSoft: "#FCFAF5"
  surface: "#FFFFFF"
  ink: "#0E1B2C"
  inkSoft: "#243447"
  inkMuted: "#5A6A7E"
  hairline: "#E7DFD1"
  butter: "#E8C46B"
  successSoft: "#D1FAE5"
  warningSoft: "#FEF3C7"
  dangerSoft: "#FFEDD5"
  dangerInk: "#9A3412"
typography:
  display-h1:
    fontFamily: CPN Condensed, CPN, Anuphan, ui-sans-serif, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: "-0.01em"
  display-h2:
    fontFamily: CPN Condensed, CPN, Anuphan, ui-sans-serif, system-ui, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: "-0.01em"
  display-h3:
    fontFamily: CPN Condensed, CPN, Anuphan, ui-sans-serif, system-ui, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
  body:
    fontFamily: CPN, Anuphan, ui-sans-serif, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 24px
  small:
    fontFamily: CPN, Anuphan, ui-sans-serif, system-ui, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  eyebrow:
    fontFamily: CPN, Anuphan, ui-sans-serif, system-ui, sans-serif
    fontSize: 11px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: "0.14em"
  mono:
    fontFamily: Geist Mono, ui-monospace, Courier New, monospace
    fontSize: 13px
    fontWeight: 500
    lineHeight: 20px
rounded:
  sm: 10px
  md: 14px
  lg: 20px
  xl: 28px
  full: 9999px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  page-x: 32px
components:
  page:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 32px
  sidebar:
    backgroundColor: "{colors.ink}"
    textColor: "#E7E3D8"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: 18px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-soft:
    backgroundColor: "{colors.canvasSoft}"
    textColor: "{colors.inkSoft}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 20px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primaryHover}"
    textColor: "#FFFFFF"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: 12px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px
  divider:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 8px
  caption:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.inkMuted}"
    typography: "{typography.small}"
    rounded: "{rounded.sm}"
    padding: 8px
  flow-node:
    backgroundColor: "{colors.secondary}"
    textColor: "#FFFFFF"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: 12px
  tag-accent:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: 8px
  tag-info:
    backgroundColor: "{colors.secondarySoft}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: 8px
  tag-success:
    backgroundColor: "{colors.successSoft}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: 8px
  tag-warning:
    backgroundColor: "{colors.warningSoft}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: 8px
  tag-danger:
    backgroundColor: "{colors.dangerSoft}"
    textColor: "{colors.dangerInk}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: 8px
  metric-card:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.lg}"
    padding: 20px
  presentation-cover:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    typography: "{typography.display-h1}"
    rounded: "{rounded.sm}"
    padding: 40px
---

## Overview

Cnext System Design คือ design system แบบคัดเฉพาะ token ที่ใช้ได้จริงสำหรับงาน Cnext HR product, UI mockup, และ presentation. บุคลิกหลักคือ **editorial HR system**: อบอุ่น อ่านง่าย มี depth แบบ modern software product ไม่ใช่ retail POS dashboard และไม่ใช่ white/black admin template.

Core principles:

1. **Cream canvas + navy ink** — baseline เป็น cream `#F6F1E8` และ navy `#0E1B2C` ไม่ใช่ `bg-white text-black`.
2. **Teal-led action system** — teal คือ primary accent สำหรับ CTA, active state, selected state, และ focus ring.
3. **NO-RED guardrail** — ห้ามใช้ Central retail red, Tailwind red, coral, clay, brick-red; danger ใช้ pumpkin soft + brown ink.
4. **Shadow-based elevation** — card ลอยบน cream canvas ด้วย shadow อุ่น ๆ ไม่พึ่ง border หนา.
5. **Thai-safe typography** — CPN ให้ brand character, Anuphan รับ Thai glyph, Geist Mono ใช้เฉพาะตัวเลข/KPI.

Use this file as the agent-readable source for:

- Cnext UI screens and React components
- Figma-style mockups and product storyboards
- executive decks and HR sign-off presentations
- visual QA instructions for AI-generated artifacts

## Colors

### Curated palette

- **Primary / Teal (`#1FA8A0`)** — main brand accent, CTA, active nav, focus ring.
- **Primary Soft (`#D6EEEC`)** — focus halo, accent tags, subtle highlight.
- **Secondary / Indigo (`#5B6CE0`)** — info state, secondary flow, chart second series.
- **Canvas (`#F6F1E8`)** — full app/page/presentation background.
- **Canvas Soft (`#FCFAF5`)** — inset panels and tab tracks.
- **Surface (`#FFFFFF`)** — card, input, modal, table body.
- **Ink (`#0E1B2C`)** — primary text and dark cover/sidebar.
- **Ink Soft / Muted** — secondary copy, helper text, captions.
- **Hairline (`#E7DFD1`)** — thin divider only.
- **Butter (`#E8C46B`)** — KPI highlight and warm executive accent.
- **Success Soft / Warning Soft / Danger Soft** — status backgrounds that preserve the Cnext warm identity.
- **Danger Ink (`#9A3412`)** — readable text on danger-soft.

Presentation color rhythm: **ink cover → cream content → white cards → teal decisions → butter KPIs → indigo flows**.

## Typography

Use **CPN Condensed** for display/headline roles, **CPN** for body, **Anuphan** as Thai fallback, and **Geist Mono** only for numerics.

- H1 / hero: 32px / 40px, 700, display font.
- H2 / section: 24px / 32px, 600.
- H3 / card title: 20px / 28px, 600.
- Body: 15px / 24px, 400.
- Small: 13px / 20px.
- Eyebrow: 11px / 16px, uppercase, 0.14em tracking.
- Mono: IDs, payroll numbers, timesheet totals, KPI digits.

For presentation, scale proportionally: cover titles 36–44pt, section titles 28–34pt, body 13–16pt, KPI numbers 32–54pt.

## Layout

UI layout:

- Page background is cream canvas, not full white.
- App shell uses dark navy sidebar + cream content canvas.
- Cards are white surfaces with soft radius and shadow.
- Use 16–24px spacing between cards; 32px page padding on desktop.
- Forms follow label → helper → control → validation message.
- Tables use subtle row dividers, muted helper text, and mono numeric columns.

Presentation layout:

- Default executive deck: 5–7 slides.
- Cover/final slides may use dark ink background.
- Content slides use cream canvas with white cards.
- Each slide needs a visual element: metric cards, process flow, screenshot frame, or component mock.
- Keep text short. Move detail into notes/workbooks/specs.

## Elevation & Depth

Use warm navy-tinted shadows on cream canvas:

- **Small:** cards and dashboard tiles — `0 1px 0 rgba(14,27,44,0.04), 0 2px 6px rgba(14,27,44,0.04)`.
- **Medium:** dropdown/popover/sticky topbar — `0 1px 0 rgba(14,27,44,0.05), 0 6px 20px rgba(14,27,44,0.06)`.
- **Large:** modal/drawer/floating panels — `0 2px 0 rgba(14,27,44,0.06), 0 20px 40px rgba(14,27,44,0.10)`.

Do not simulate depth with thick gray borders.

## Shapes

- **sm 10px** — tags, compact controls.
- **md 14px** — buttons, inputs, icon wrappers.
- **lg 20px** — cards, tiles, dashboard panels.
- **xl 28px** — hero panels, modal, login/presentation art block.
- **full 9999px** — pills and status badges.

Shapes should feel soft, precise, and product-grade.

## Components

- **page:** cream canvas + navy ink.
- **sidebar:** dark navy rail with warm light labels.
- **card:** white surface, rounded-lg, 24px padding, soft shadow.
- **card-soft:** cream-soft inset panel for secondary grouping.
- **button-primary:** teal background with navy text; hover uses darker teal + white text.
- **button-secondary:** primary-soft background with navy text.
- **input:** white surface, md radius, navy text, accent-soft focus halo.
- **divider:** hairline only; do not use heavy borders.
- **tags:** accent/info/success/warning/danger variants use soft backgrounds.
- **metric-card:** butter background + ink text for executive KPI emphasis.
- **presentation-cover:** ink background + white title + teal/butter accents.

## Do's and Don'ts

### Do

- Use `bg-canvas text-ink` as baseline.
- Use `bg-surface`, `border-hairline`, `shadow-[var(--shadow-card)]`, and Cnext primitives first.
- Use `ring-4 ring-accent-soft` for focus state.
- Use teal for decisions/actions, indigo for flow/info, butter for KPI highlights.
- Use CPN/Anuphan for all Thai/English UI text.
- Use fewer, larger, executive-grade slides for presentations.

### Don't

- Do not use `bg-white text-black` as the default app look.
- Do not hardcode hex values in React components; use Tailwind token utilities or CSS variables.
- Do not use red family colors: `#C8102E`, `#DC2626`, `#EF4444`, coral, clay, brick, crimson.
- Do not add global `* { margin: 0; padding: 0 }`.
- Do not import CPN via CDN; use `next/font/local`.
- Do not mix legacy cards with Cnext primitives on migrated routes.
- Do not create dense presentation slides with tiny screenshots or long paragraphs.

Source of truth:

- `src/frontend/src/app/globals.css` — Tailwind v4 `@theme` tokens.
- `docs/design-system-cnext.md` — human token reference.
- `docs/cnext-components.md` — Cnext component primitives.
- `docs/cnext-shell-port-notes.md` — shell implementation notes.
