import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(__dirname, '..', '..');

type MigrationBatch = {
  name: string;
  status: 'pending' | 'migrated';
  files: string[];
};

const migrationInventory: MigrationBatch[] = [
  {
    name: 'admin-self-service',
    status: 'migrated',
    files: [
      'src/app/[locale]/admin/self-service/layout.tsx',
      'src/app/[locale]/admin/self-service/page.tsx',
      'src/app/[locale]/admin/self-service/field-config/page.tsx',
      'src/app/[locale]/admin/self-service/mandatory/page.tsx',
      'src/app/[locale]/admin/self-service/quick-actions/page.tsx',
      'src/app/[locale]/admin/self-service/readonly/page.tsx',
      'src/app/[locale]/admin/self-service/tiles/page.tsx',
      'src/app/[locale]/admin/self-service/visibility/page.tsx',
    ],
  },
  {
    name: 'admin-users',
    status: 'migrated',
    files: [
      'src/app/[locale]/admin/users/page.tsx',
      'src/app/[locale]/admin/users/layout.tsx',
      'src/app/[locale]/admin/users/audit-report/page.tsx',
      'src/app/[locale]/admin/users/data-permissions/page.tsx',
      'src/app/[locale]/admin/users/foundation-audit/page.tsx',
      'src/app/[locale]/admin/users/proxy/page.tsx',
      'src/app/[locale]/admin/users/role-groups/page.tsx',
      'src/app/[locale]/admin/users/user-assignment/page.tsx',
    ],
  },
  {
    name: 'legacy-page-layout-routes',
    status: 'migrated',
    files: [
      'src/app/[locale]/benefits/page.tsx',
      'src/app/[locale]/idp/page.tsx',
      'src/app/[locale]/learning/page.tsx',
      'src/app/[locale]/locations/page.tsx',
      'src/app/[locale]/overtime/page.tsx',
      'src/app/[locale]/performance/page.tsx',
      'src/app/[locale]/quick-approve/page.tsx',
      'src/app/[locale]/resignation/page.tsx',
      'src/app/[locale]/screening/page.tsx',
      'src/app/[locale]/spd-management/page.tsx',
      'src/app/[locale]/talent-management/page.tsx',
      'src/app/[locale]/time/page.tsx',
      'src/app/[locale]/training-records/page.tsx',
    ],
  },
];

const legacyCardPatterns = [
  /PageLayout/,
  /rounded-xl/,
  /bg-white\s+rounded-(?:lg|xl)/,
  /rounded-(?:lg|xl)\s+border\s+border-gray-200\s+bg-white/,
  /bg-white\s+rounded-(?:lg|xl)\s+shadow-xl/,
  /bg-gray-50\s+border(?:-[bt])?\s+border-gray-200/,
  /divide-y\s+divide-gray-100\s+bg-white/,
  /hover:bg-gray-50/,
  /border-gray-300\s+hover:border-gray-400/,
];

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('Humi migration inventory', () => {
  it('tracks migrated and pending route batches explicitly', () => {
    expect(migrationInventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'admin-self-service',
          status: 'migrated',
        }),
        expect.objectContaining({
          name: 'admin-users',
          status: 'migrated',
        }),
        expect.objectContaining({
          name: 'legacy-page-layout-routes',
          status: 'migrated',
        }),
      ]),
    );
  });

  it.each(
    migrationInventory
      .filter((batch) => batch.status === 'migrated')
      .flatMap((batch) => batch.files.map((file) => [batch.name, file])),
  )(
    'keeps %s route %s free of legacy card/table surface classes',
    (_batchName, file) => {
      const source = read(file);

      for (const pattern of legacyCardPatterns) {
        expect(source, `${file} still matches ${pattern}`).not.toMatch(pattern);
      }
    },
  );
});
