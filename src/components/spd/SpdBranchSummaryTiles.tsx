'use client';

// STA-27 PR-C — SpdBranchSummaryTiles
// 4 summary tiles at the top of the SPD Branch View page.
// Pattern mirrors team-summary-tiles.tsx (PR-D). Cnext tokens only.

import { useLocale } from 'next-intl';
import { GitBranch, Users, Clock, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/cnext';
import { getBranchPendingEnrolmentCount } from '@/lib/spd-branch-mock';
import { BENEFIT_PLAN_REGISTRY } from '@/data/benefits/plan-registry';

interface SpdBranchSummaryTilesProps {
  assignedBranches: string[];
  totalEmployees: number;
}

interface TileData {
  icon: React.ReactNode;
  valueTh: string;
  valueEn: string;
  labelTh: string;
  labelEn: string;
  highlight?: boolean;
}

export function SpdBranchSummaryTiles({
  assignedBranches,
  totalEmployees,
}: SpdBranchSummaryTilesProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const branchCount = assignedBranches.length;
  const pendingCount = getBranchPendingEnrolmentCount();
  const dvtVariantPlanCount = BENEFIT_PLAN_REGISTRY.filter((p) => p.dvtVariant === true).length;

  const tiles: TileData[] = [
    {
      icon: <GitBranch className="h-5 w-5 text-accent" />,
      valueTh: `${branchCount} สาขา`,
      valueEn: `${branchCount} Branches`,
      labelTh: 'สาขาที่ดูแล',
      labelEn: 'Assigned Branches',
    },
    {
      icon: <Users className="h-5 w-5 text-accent" />,
      valueTh: `${totalEmployees} คน`,
      valueEn: `${totalEmployees} Employees`,
      labelTh: 'พนักงานรวมทุกสาขา',
      labelEn: 'Total Branch Employees',
    },
    {
      icon: <Clock className="h-5 w-5 text-warning" />,
      valueTh: `${pendingCount} รายการ`,
      valueEn: `${pendingCount} Items`,
      labelTh: 'รอลงทะเบียนสวัสดิการ',
      labelEn: 'Pending Enrolments',
      highlight: pendingCount > 0,
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-accent" />,
      valueTh: `${dvtVariantPlanCount} แผน`,
      valueEn: `${dvtVariantPlanCount} Plans`,
      labelTh: 'แผน DVT Variant ที่ใช้งาน',
      labelEn: 'DVT-Variant Plans Active',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile, i) => (
        <div key={i}>
          <Card
            className={[
              'flex flex-col gap-2 p-4',
              tile.highlight ? 'border-l-4 border-l-[var(--color-warning)]' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="flex items-center gap-2">
              {tile.icon}
              <span className="text-xs text-ink-muted">
                {isTh ? tile.labelTh : tile.labelEn}
              </span>
            </div>
            <p className="text-xl font-semibold text-ink">
              {isTh ? tile.valueTh : tile.valueEn}
            </p>
          </Card>
        </div>
      ))}
    </div>
  );
}
