'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, Button, Card } from '@/components/humi';

// ════════════════════════════════════════════════════════════
// TalentResultCard — one employee in the talent search result grid.
// Shows: bilingual name, avatar, position, department, branch,
// effective date, and a "View Profile" link.
// ════════════════════════════════════════════════════════════

export interface TalentEmployee {
  id: string;
  employeeCode: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn?: string;
  lastNameEn?: string;
  initials: string;
  position: string;
  department: string;
  branch?: string;
  hireDate?: string;
  jobTitle?: string;
  /** Raw avatarTone from HumiEmployee — includes 'indigo' which maps to 'teal' for Avatar. */
  avatarTone?: 'teal' | 'sage' | 'butter' | 'ink' | 'indigo';
  performanceRating?: number;
  isHiPo?: boolean;
  yearsOfService?: number;
}

function formatEffectiveDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function TalentResultCard({ employee }: { employee: TalentEmployee }) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'th';

  const fullNameTh = `${employee.firstNameTh} ${employee.lastNameTh}`;
  const fullNameEn =
    employee.firstNameEn && employee.lastNameEn
      ? `${employee.firstNameEn} ${employee.lastNameEn}`
      : null;

  const profileHref = `/${locale}/admin/employees/${employee.id}`;

  // Avatar only accepts teal | sage | butter | ink — map 'indigo' to 'teal'
  const avatarTone = (
    (['teal', 'sage', 'butter', 'ink'] as const).includes(
      employee.avatarTone as 'teal' | 'sage' | 'butter' | 'ink',
    )
      ? employee.avatarTone
      : 'teal'
  ) as 'teal' | 'sage' | 'butter' | 'ink';

  return (
    <Card className="flex flex-col gap-3 p-4">
      {/* Header: avatar + name block */}
      <div className="flex items-start gap-3">
        <Avatar
          name={employee.initials || fullNameTh}
          size="md"
          tone={avatarTone}
          aria-label={fullNameTh}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink leading-snug">{fullNameTh}</p>
          {fullNameEn && (
            <p className="truncate text-small text-ink-muted leading-snug">{fullNameEn}</p>
          )}
          <p className="mt-0.5 text-small text-ink-muted font-mono">{employee.employeeCode}</p>
        </div>
        {employee.isHiPo && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">
            HiPo
          </span>
        )}
      </div>

      {/* Detail rows */}
      <dl className="grid grid-cols-1 gap-1 text-small">
        <div className="flex gap-1.5">
          <dt className="w-20 shrink-0 text-ink-muted">ตำแหน่ง</dt>
          <dd className="text-ink line-clamp-2">{employee.position}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="w-20 shrink-0 text-ink-muted">แผนก</dt>
          <dd className="truncate text-ink">{employee.department}</dd>
        </div>
        {employee.branch && (
          <div className="flex gap-1.5">
            <dt className="w-20 shrink-0 text-ink-muted">สาขา</dt>
            <dd className="truncate text-ink">{employee.branch}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt className="w-20 shrink-0 text-ink-muted">วันที่เริ่มงาน</dt>
          <dd className="text-ink">{formatEffectiveDate(employee.hireDate)}</dd>
        </div>
        {employee.yearsOfService !== undefined && (
          <div className="flex gap-1.5">
            <dt className="w-20 shrink-0 text-ink-muted">อายุงาน</dt>
            <dd className="text-ink">{employee.yearsOfService} ปี</dd>
          </div>
        )}
        {employee.performanceRating !== undefined && (
          <div className="flex gap-1.5">
            <dt className="w-20 shrink-0 text-ink-muted">Performance</dt>
            <dd className="text-ink">{employee.performanceRating}/5</dd>
          </div>
        )}
      </dl>

      {/* Action */}
      <div className="mt-auto pt-1">
        <Link href={profileHref}>
          <Button variant="secondary" size="sm" className="w-full">
            ดูโปรไฟล์ / View Profile
          </Button>
        </Link>
      </div>
    </Card>
  );
}
