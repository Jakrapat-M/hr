import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..', '..', '..');

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('Humi system design contract', () => {
  it('keeps the downloaded system design reference in the repo', () => {
    const reference = read('docs/design-ref/shelfly-bundle/project/Humi System Design.html');

    expect(reference).toContain('<title>Humi · System Design</title>');
    expect(reference).toContain('Brand &amp; Tokens');
    expect(reference).toContain('Components');
    expect(reference).toContain('HR · Retail');
  });

  it('keeps global Humi tokens and namespaced primitives wired', () => {
    const css = read('src/frontend/src/app/globals.css');

    expect(css).toContain('--color-canvas:');
    expect(css).toContain('--color-accent:');
    expect(css).toContain('--font-display:');
    expect(css).toContain('.humi-app');
    expect(css).toContain('.humi-sidebar');
    expect(css).toContain('.humi-topbar');
    expect(css).toContain('.humi-card');
    expect(css).toContain('.humi-button');
    expect(css).toContain('.humi-login-wrap');
  });

  it('keeps shell, home, and login pages on Humi primitives', () => {
    const shell = read('src/frontend/src/components/humi/shell/AppShell.tsx');
    const sidebar = read('src/frontend/src/components/humi/shell/Sidebar.tsx');
    const topbar = read('src/frontend/src/components/humi/shell/Topbar.tsx');
    const home = read('src/frontend/src/app/[locale]/home/page.tsx');
    const login = read('src/frontend/src/app/[locale]/login/page.tsx');

    expect(shell).toContain('className="humi-app"');
    expect(shell).toContain('className="humi-main"');
    expect(sidebar).toContain('humi-sidebar');
    expect(sidebar).toContain('humi-nav-item');
    expect(topbar).toContain('humi-topbar');
    expect(topbar).toContain('humi-search');
    expect(home).toContain('humi-card');
    expect(home).toContain('humi-hero-title');
    expect(login).toContain('humi-login-wrap');
    expect(login).toContain('humi-login-art');
  });
});
