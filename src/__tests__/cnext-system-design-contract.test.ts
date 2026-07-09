import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..');

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('Cnext system design contract', () => {
  it('keeps the downloaded system design reference in the repo', () => {
    const reference = read('docs/design-ref/shelfly-bundle/project/Cnext System Design.html');

    expect(reference).toContain('<title>Cnext · System Design</title>');
    expect(reference).toContain('Brand &amp; Tokens');
    expect(reference).toContain('Components');
    expect(reference).toContain('HR · Retail');
  });

  it('keeps global Cnext tokens and namespaced primitives wired', () => {
    const css = read('src/app/globals.css');

    expect(css).toContain('--color-canvas:');
    expect(css).toContain('--color-accent:');
    expect(css).toContain('--font-display:');
    expect(css).toContain('.cnext-app');
    expect(css).toContain('.cnext-sidebar');
    expect(css).toContain('.cnext-topbar');
    expect(css).toContain('.cnext-card');
    expect(css).toContain('.cnext-button');
    expect(css).toContain('.cnext-login-wrap');
  });

  it('keeps shell, home, and login pages on Cnext primitives', () => {
    const shell = read('src/components/cnext/shell/AppShell.tsx');
    const sidebar = read('src/components/cnext/shell/Sidebar.tsx');
    const topbar = read('src/components/cnext/shell/Topbar.tsx');
    const home = read('src/app/[locale]/home/page.tsx');
    const login = read('src/app/[locale]/login/page.tsx');

    // AppShell builds the class via template literal (`cnext-app${...}`) so the
    // literal string `"cnext-app"` won't appear verbatim — check for the token instead.
    expect(shell).toContain('cnext-app');
    expect(shell).toContain('cnext-main');
    // Sidebar was ported to Blueprint rail+panel (bp-* classes) but still carries
    // the cnext-sidebar class on the <aside> root for CSS grid wiring.
    expect(sidebar).toContain('cnext-sidebar');
    // cnext-nav-item was replaced by Blueprint bp-panel-item in the rail port — removed.
    expect(topbar).toContain('cnext-topbar');
    expect(topbar).toContain('cnext-search');
    expect(home).toContain('cnext-card');
    expect(home).toContain('cnext-hero-title');
    expect(login).toContain('cnext-login-wrap');
    expect(login).toContain('cnext-login-art');
  });
});
