# Humi Design & Component Guidelines

Welcome to the centralized Humi Design System reference. This document serves as the **Single Source of Truth (SSOT)** for all user interface implementations and presentation designs in the Central Group HRMS project.

All developers, designers, and AI agents must adhere strictly to these rules to maintain visual consistency, accessibility (A11y), and semantic logic across the application.

---

## 1. Core Philosophy

*   **Warmth & Editorial Character (Cream + Navy)**: We use a cream canvas (`#F6F1E8`) and navy ink (`#0E1B2C`) instead of stark white and pure black. The app should feel like a premium editorial HR publication, not a retail POS dashboard.
*   **The NO-RED Guardrail**: Red colors (e.g., Tailwind `red-*`, Central retail red `#C8102E`, clay `#C8553D`, coral `#E08864`) are strictly forbidden. To convey danger, error, or destructive actions, use **pumpkin orange** (`#FB923C`) and **dark orange ink** (`#9A3412`).
*   **Shadow-Based Elevation**: Cards do not rely on heavy borders. They float on the cream canvas using soft, warm navy-tinted shadows (`--shadow-sm` / `--shadow-md`).
*   **Typography Harmony**: CPN Condensed is used for headlines, CPN for body content, Anuphan for Thai fallback character rendering, and Geist Mono exclusively for numbers and tabular metrics.
*   **Menu RBAC (Role-Based Access Control)**: If a role lacks access to a feature, drop the menu item/group entirely from the UI; **never** render it locked or disabled.

---

## 2. Core Design Tokens

### A. Color Palette
All colors must be referenced using Tailwind utility classes (`bg-accent`, `text-ink-soft`) or CSS variables. **Do not hardcode hex values in component code.**

| Token Variable | Hex | Tailwind Utility | Primary Use Case |
| :--- | :--- | :--- | :--- |
| `--color-canvas` | `#F6F1E8` | `bg-canvas` | Primary body background (Cream) |
| `--color-canvas-soft` | `#FCFAF5` | `bg-canvas-soft` | Inset cards, tab tracks (Cream-2) |
| `--color-surface` | `#FFFFFF` | `bg-surface` | Card body background, input fields |
| `--color-accent` | `#1FA8A0` | `bg-accent` / `text-accent` | Primary brand accent (Teal), active state, focus rings |
| `--color-accent-soft` | `#D6EEEC` | `bg-accent-soft` | Active row highlight, tag background, focus halo |
| `--color-accent-ink` | `#0E1B2C` | `text-accent-ink` | Navy text color for high readability on Teal |
| `--color-accent-alt` | `#5B6CE0` | `bg-accent-alt` | Secondary accent (Indigo), info state |
| `--color-accent-alt-soft` | `#E1E4FB` | `bg-accent-alt-soft` | Info tags, Indigo variant highlights |
| `--color-ink` | `#0E1B2C` | `text-ink` / `bg-ink` | Primary navy text, sidebar background |
| `--color-ink-soft` | `#243447` | `text-ink-soft` | Secondary body text, ghost button text |
| `--color-ink-muted` | `#5A6A7E` | `text-ink-muted` | Helper text, placeholder, secondary labels |
| `--color-hairline` | `#E7DFD1` | `border-hairline` | 1px borders, card outlines |
| `--color-hairline-soft` | `#EFE9DC` | `border-hairline-soft` | Table row dividers, soft dividers |
| `--color-butter` | `#E8C46B` | `bg-butter` | Metric KPIs, special highlights |

#### Semantic Status (NO-RED Rules)
| Token Variable | Hex | Tailwind Utility | Primary Use Case |
| :--- | :--- | :--- | :--- |
| `--color-success` | `#10B981` | `bg-success` / `text-success` | Approved status, green checkmarks |
| `--color-success-soft` | `#D1FAE5` | `bg-success-soft` | Success tag background |
| `--color-warning` | `#F59E0B` | `bg-warning` / `text-warning` | Pending status, attention |
| `--color-warning-soft` | `#FEF3C7` | `bg-warning-soft` | Warning tag background |
| `--color-danger` | `#FB923C` | `bg-danger` / `text-danger` | Destructive action, error (Pumpkin) |
| `--color-danger-soft` | `#FFEDD5` | `bg-danger-soft` | Danger/error tag and input halo |
| `--color-danger-ink` | `#9A3412` | `text-[color:var(--color-danger-ink)]` | Highly readable error message text |

---

### B. Typography & Font Stacks

*   **Main Font Family (`--font-sans`)**: `CPN`, `Anuphan` (Thai fallback), system-ui.
*   **Headline Font Family (`--font-display`)**: `CPN Condensed`, `CPN`, `Anuphan`, system-ui.
*   **Metrics & Numerics (`--font-mono`)**: `Geist Mono`, ui-monospace.

#### Type Scale
Use the rem-based type scale so sizes adapt to the global configuration knob (`html { font-size: 18px }`).

| Role | Token CSS Var | Size / Line-Height | Weight / Font Stack |
| :--- | :--- | :--- | :--- |
| **H1 (Page Hero)** | `text-display-h1` | `2rem` (32px) / `2.5rem` (40px) | `font-display font-bold` |
| **H2 (Section Heading)** | `text-display-h2` | `1.5rem` (24px) / `2rem` (32px) | `font-display font-semibold` |
| **H3 (Card Title)** | `text-display-h3` | `1.25rem` (20px) / `1.75rem` (28px) | `font-display font-semibold` |
| **Body (Default)** | `text-body` | `0.9375rem` (15px) / `1.5rem` (24px) | `font-sans font-normal` |
| **Small (Helper/Tags)** | `text-small` | `0.8125rem` (13px) / `1.25rem` (20px) | `font-sans font-normal` |
| **Eyebrow (Overhead)** | `text-eyebrow` | `0.6875rem` (11px) / `1rem` (16px) | `font-sans font-semibold uppercase tracking-[0.14em]` |

---

### C. Spacing & Radius
*   **Spacing Units**:
    *   Small (`sm`): `8px`
    *   Medium (`md`): `16px`
    *   Large (`lg`): `24px`
    *   Extra Large (`xl`): `32px`
    *   Page Margin (`page-x`): `32px`
*   **Corner Radii**:
    *   `--radius-sm` (`10px`): Tags, inner button corners, badges.
    *   `--radius-md` (`14px`): Buttons, inputs, select fields, small card items.
    *   `--radius-lg` (`20px`): Standard cards, content sections, soft cards.
    *   `--radius-xl` (`28px`): Hero panels, navigation sheets, drawers, presentation art.
    *   `--radius-full` (`9999px`): Status tags, pills.

---

### D. Shadows & Motion
*   `--shadow-sm` / `--shadow-card`: Base elevation shadow. Warm navy-tinted shadow (`rgba(14,27,44,0.04)`) to blend on cream canvas.
*   `--shadow-md`: Dropdown panels, flyouts, sticky topbar on page scroll.
*   `--shadow-lg`: Modals, primary overlay sheets.
*   `--ease-spring`: Default transition easing: `cubic-bezier(0.16, 1, 0.3, 1)`. Snappy yet smooth.
*   `--dur-fast` (`120ms`): Hover transitions.
*   `--dur-base` (`220ms`): Collapse/expand sidebar drawers.

---

## 3. UI Component Rules

### 1. Data Tables
Always use the primitive `<DataTable>` component imported from `@/components/humi`. **Do not build raw tables with HTML elements (`<table>`) in page scripts.**

*   **A11y Captions**: Every table must have a descriptive `caption` prop. If the caption is redundant visually, set `captionVisuallyHidden={true}` (retains it in DOM for screen readers).
*   **Padding Density**: Use default 48px height (`dense={false}`) for page records and directory pages. Use 36px height (`dense={true}`) for sidebar previews, log summaries, or catalog lookups.
*   **Keyboard Navigation**: Active/Clickable rows (`onRowClick`) must have keyboard accessibility. The primitive `<DataTable>` handles this by automatically adding `tabIndex={0}`, `role="button"`, and Enter/Space keyboard listeners.
*   **Client Sorting**: Columns that are sortable must have a `sortAccessor` prop returning a primitive value.
*   **Freeze Panes**: Use the `stickyLeft` column parameter (expressed in px) to pin action or key identifier columns when horizontal scrolling triggers.

### 2. Forms & Inputs
Forms must follow the Humi field anatomy: label/helper text tied to the control with proper focus rings and spacing.

*   **FormField Wrapper**: Wrap all input controls in `<FormField>`.
*   **Render Prop Requirement**: You must use the render-prop pattern inside `<FormField>`:
    ```tsx
    <FormField label="Email" help="Please enter your company email" required>
      {(ctrlProps) => <FormInput {...ctrlProps} type="email" />}
    </FormField>
    ```
    This automatically wires `id`, `aria-describedby`, `aria-invalid`, and `aria-required` to the underlying inputs.
*   **FormInput Styles**: Avoid writing raw Tailwind borders. Use the `<FormInput>` component, which implements the correct Humi styling: `border-hairline bg-surface text-body rounded-md transition-colors focus:ring-accent focus:border-accent`.

### 3. Cards & Specialties
*   Cards should use the `<Card>` primitive.
*   **Raised Card**: White surface (`#FFFFFF`), rounded-lg, soft shadow. Use for main dashboard elements.
*   **Flat Card**: Hairline border outline (`border-hairline`), no shadow. Use for list nesting or nested tables.
*   **Soft Card (`card-soft`)**: Cream-soft background (`--color-canvas-soft` / `#FCFAF5`) with soft text (`text-ink-soft`), lg radius, and md padding. Use for secondary inset groupings.
*   **Metric Card (`metric-card`)**: Butter background (`--color-butter` / `#E8C46B`) + navy ink text + mono font digits (`font-mono`). Used exclusively to emphasize key executive KPIs.

### 4. Buttons
*   **Primary Button**: Teal background (`bg-accent`) + white text (`text-white`) in Next.js code for high contrast. Hover uses darker teal (`#126E69`) + white text.
*   **Secondary Button**: Soft teal (`bg-accent-soft`) + navy ink text.
*   **Danger Button**: Pumpkin orange background (`bg-danger`) + white text.
*   **Ghost Button**: Transparent background + teal text.

---

## 4. Executive Decks & Presentation Design

When generating executive-grade slides or storyboards representing the Humi ecosystem, follow these strict presentation layout rules:

### A. Presentation Color Rhythm
To maintain executive interest and flow, design with the following visual rhythm:
$$\text{Ink Cover} \longrightarrow \text{Cream Content} \longrightarrow \text{White Cards} \longrightarrow \text{Teal Decisions} \longrightarrow \text{Butter KPIs} \longrightarrow \text{Indigo Flows}$$

*   **Cover & Final Slides**: Dark navy ink background (`#0E1B2C`) + white title + teal/butter accents.
*   **Content Slides**: Cream canvas background (`#F6F1E8`) with white card containers (`#FFFFFF`) to group information.
*   **Decisions / Highlights**: Use Teal (`#1FA8A0`) for core highlights and Butter (`#E8C46B`) for KPI metric tiles.
*   **Process Diagrams**: Use Indigo (`#5B6CE0`) for flow arrows, nodes, and secondary series.

### B. Slide Layout & Content Rules
*   **Deck Length**: Target 5–7 slides for standard reviews.
*   **Typography Scaling for Presentation Decks**:
    *   Cover Titles: `36–44pt`
    *   Section Titles: `28–34pt`
    *   Body Copy: `13–16pt`
    *   KPI Number Callouts: `32–54pt`
*   **Visual Dominance**: Every slide **must** contain a visual element—such as metric card matrices, process flow diagram panels, screenshot frames, or interactive mockup layouts.
*   **Breathing Room**: Do not write long paragraphs. Keep text bullets short, concise, and executive-ready. Move background detail into developer notes, workbooks, or technical specifications.

---

## 5. Code Templates (Single Source of Truth)

### Template A: Standard Page Layout
Use this template for all new pages to establish header styling, subtitles, and grid layouts.

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button, Card, CardEyebrow, CardTitle } from '@/components/humi';

export default function StandardDashboardPage() {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6">
      {/* 1. Page Header Section */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardEyebrow>{t('eyebrow')}</CardEyebrow>
          <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
          <p className="mt-1 text-small text-ink-muted">{t('subtitle')}</p>
        </div>
        
        {/* Header Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">{t('export')}</Button>
          <Button variant="primary" leadingIcon={<Plus size={16} />}>
            {t('actionCreate')}
          </Button>
        </div>
      </header>

      {/* 2. KPI / Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Metric KPI Card using Butter Background */}
        <div className="rounded-[var(--radius-lg)] bg-butter p-5 shadow-[var(--shadow-card)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">
            {t('totalEmployees')}
          </span>
          <p className="mt-2 font-mono text-3xl font-bold text-ink tabular-nums">1,248</p>
        </div>
        <Card variant="raised" size="md">
          <CardEyebrow>{t('pendingApprovals')}</CardEyebrow>
          <p className="mt-1 font-display text-2xl font-semibold text-accent tabular-nums">12</p>
        </Card>
        <Card variant="raised" size="md">
          <CardEyebrow>{t('activeIncidents')}</CardEyebrow>
          <p className="mt-1 font-display text-2xl font-semibold text-[color:var(--color-danger-ink)] tabular-nums">2</p>
        </Card>
      </div>

      {/* 3. Primary Content Body */}
      <Card variant="raised" size="lg">
        <CardTitle className="mb-4">{t('mainContentTitle')}</CardTitle>
        <p className="text-body text-ink-soft">{t('mainContentDescription')}</p>
      </Card>
    </div>
  );
}
```

---

### Template B: Data Table Implementation
How to define typed data tables with client sorting, layout configurations, and a visually hidden caption.

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable, type DataTableColumn } from '@/components/humi';

interface EmployeeRow {
  id: string;
  name: string;
  department: string;
  role: string;
  status: 'active' | 'inactive';
}

export function EmployeeDirectoryTable() {
  const t = useTranslations('directory');
  const [data] = useState<EmployeeRow[]>([
    { id: 'EMP-01', name: 'Somchai Jaidee', department: 'HR', role: 'Director', status: 'active' },
    { id: 'EMP-02', name: 'Somying Rakdee', department: 'Finance', role: 'Accountant', status: 'active' },
  ]);

  const columns: DataTableColumn<EmployeeRow>[] = useMemo(() => [
    {
      id: 'id',
      header: t('colId'),
      sortAccessor: (row) => row.id,
      cell: (row) => <span className="font-mono text-xs font-semibold text-ink">{row.id}</span>,
      className: 'w-32',
    },
    {
      id: 'name',
      header: t('colName'),
      sortAccessor: (row) => row.name,
      cell: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      id: 'department',
      header: t('colDepartment'),
      sortAccessor: (row) => row.department,
      cell: (row) => <span className="text-ink-soft">{row.department}</span>,
      className: 'w-40',
    },
    {
      id: 'status',
      header: t('colStatus'),
      sortAccessor: (row) => row.status,
      cell: (row) => {
        const isActive = row.status === 'active';
        return (
          <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
            isActive ? 'bg-success-soft text-success' : 'bg-canvas-soft text-ink-muted'
          }`}>
            {isActive ? t('statusActive') : t('statusInactive')}
          </span>
        );
      },
      className: 'w-28',
    },
  ], [t]);

  return (
    <DataTable<EmployeeRow>
      caption={t('tableCaption')}
      captionVisuallyHidden
      columns={columns}
      rows={data}
      rowKey={(row) => row.id}
      dense={false}
    />
  );
}
```

---

### Template C: Form Implementation
How to implement a form conforming to the Humi Design system, utilizing the proper `FormField` render-prop pattern and action buttons.

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, FormField, FormInput } from '@/components/humi';

export function EditProfileForm() {
  const t = useTranslations('profileForm');
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Submit logic here...
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 2-Column Responsive Form Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t('firstName')} required>
          {(ctrlProps) => (
            <FormInput
              {...ctrlProps}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('firstNamePlaceholder')}
            />
          )}
        </FormField>

        <FormField label={t('lastName')} required>
          {(ctrlProps) => (
            <FormInput
              {...ctrlProps}
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('lastNamePlaceholder')}
            />
          )}
        </FormField>
      </div>

      <FormField 
        label={t('email')} 
        help={t('emailHelpText')} 
        error={emailError} 
        required
      >
        {(ctrlProps) => (
          <FormInput
            {...ctrlProps}
            type="email"
            placeholder="example@company.com"
            invalid={!!emailError}
          />
        )}
      </FormField>

      {/* Form Action Section */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" disabled={loading}>
          {t('cancel')}
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
```

---

## 6. Anti-Patterns (What to Avoid)

❌ **DO NOT hardcode raw HTML inputs, selects, or fieldsets with local styles**  
*Audit Finding:* In `StepBiographical.tsx`, elements like `<select className="humi-select">` and raw labels were written directly instead of using `<FormField>` and `<FormInput>`. This bypasses our centralized design logic and breaks screen-reader accessibility mapping.

❌ **DO NOT use red color classes, hex values, or status states**  
*Rule:* The `red` family is banned. Do not write colors like `text-red-600`, `bg-red-500`, `#DC2626`, `#EF4444`, `#C8102E`, `#C8553D`, or `#E08864`.  
*Correction:* Always swap red status tones with pumpkin orange (`--color-danger`: `#FB923C`) and readable pumpkin ink (`--color-danger-ink`: `#9A3412`).

❌ **DO NOT mix old/legacy cards and container layouts with Humi primitives**  
*Rule:* Avoid writing raw divs with legacy card selectors like `className="humi-card"`. Prefer `<Card>` primitive blocks unless maintaining unmigrated paths.

❌ **DO NOT bypass the FormField render-prop pattern**  
*Rule:* Do not hardcode `<label>` and `<input>` tags without connecting them via the render-prop wiring. Bypassing this fails accessibility criteria (leaving form controls without linked labels or validation state announcements).

❌ **DO NOT write global resets in stylesheet overrides**  
*Rule:* Do not write styles like `* { margin: 0; padding: 0 }` inside CSS files. Tailwind's built-in Preflight system automatically handles browser resets cleanly.
