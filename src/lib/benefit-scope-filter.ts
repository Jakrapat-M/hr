/**
 * benefit-scope-filter — STA-64
 *
 * Pure, render-free scope predicate shared by the HRBP benefit reports and the
 * SPD branch view. Each surface has exactly ONE scope source that produces a
 * `BenefitScope`; these helpers turn that scope into the visible slice.
 *
 * Mockup phase only — no real authz/IAM. Matching is exact, case-sensitive
 * against the seed `dept` / branch-code values (`Finance`/`HR`/`IT`, branch keys).
 * Follows the `scope-filter.ts` precedent (role→mode), but operates on the
 * dept-string / branch-string row shapes the HRBP/SPD seeds carry.
 */

/** The single scope value that decides what a surface may see. */
export type BenefitScope =
  | { kind: 'admin' }
  | { kind: 'dept'; departments: string[] }
  | { kind: 'branch'; branches: string[] };

/**
 * Filter dept-keyed rows by the active scope.
 * - admin → input unchanged (bypass; sees all departments)
 * - dept  → only rows whose `dept` is in `scope.departments` (exact match)
 * - branch→ no dept axis on these rows → empty (defensive; not expected on HRBP)
 */
export function filterByDept<T extends { dept: string }>(
  rows: T[],
  scope: BenefitScope,
): T[] {
  if (scope.kind === 'admin') return rows;
  if (scope.kind === 'dept') {
    const allow = new Set(scope.departments);
    return rows.filter((r) => allow.has(r.dept));
  }
  return [];
}

/**
 * Filter a list of branch codes by the active scope.
 * - admin → input unchanged (bypass; sees all branches)
 * - branch→ only codes in `scope.branches` (exact match)
 * - dept  → no branch axis → empty (defensive; not expected on SPD)
 */
export function filterBranches(branches: string[], scope: BenefitScope): string[] {
  if (scope.kind === 'admin') return branches;
  if (scope.kind === 'branch') {
    const allow = new Set(scope.branches);
    return branches.filter((b) => allow.has(b));
  }
  return [];
}
