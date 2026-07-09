import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..');

const visualReadinessFiles = [
  'src/app/[locale]/profile/me/page.tsx',
  'src/components/time/time-page.tsx',
  'src/app/[locale]/hrbp/dashboard/page.tsx',
];

const forbiddenVisualPatterns = [
  new RegExp(`${'#'}[0-9A-Fa-f]{6}`),
  new RegExp(`\\b(?:${['red', 'rose', 'pink'].join('|')})-`),
  new RegExp(`\\bfrom-${'gray'}-`),
  new RegExp(`\\bvia-${'white'}\\b`),
  new RegExp(`\\bto-${'gray'}-`),
  new RegExp(`\\bbg-${'white'}\\b`),
  new RegExp(`\\btext-${'black'}\\b`),
  new RegExp(`\\bshadow-${'red'}-`),
  new RegExp(`\\b(?:color|tag|blob|avatar)--${'coral'}\\b`),
  new RegExp(`\\bbg-danger-${'tint0'}\\b`),
];

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('STA-48 executive visual readiness cleanup', () => {
  it.each(visualReadinessFiles)('keeps %s on tokenized Humi visual language', (file) => {
    const source = read(file);

    for (const pattern of forbiddenVisualPatterns) {
      expect(source, `${file} still matches ${pattern}`).not.toMatch(pattern);
    }
  });

  it('removes the STA-44 time attendance red blocker from the detailed Time component', () => {
    const source = read('src/components/time/time-page.tsx');

    expect(source).toContain('var(--color-accent)');
    expect(source).toContain('bg-ink text-canvas');
    expect(source).toContain('bg-accent text-canvas');
    expect(source).not.toContain(['to', 'red', '700'].join('-'));
    expect(source).not.toContain(['#', 'C8102E'].join(''));
  });
});
