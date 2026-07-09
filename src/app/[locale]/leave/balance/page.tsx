import type { LeaveBalance } from '@/hooks/use-leave';

const MOCK_BALANCES: LeaveBalance[] = [
  { type:'annual', nameEn:'Annual Leave', nameTh:'ลาพักร้อน', entitled: 15, used: 5, pending: 1, remaining: 9 },
  { type:'sick', nameEn:'Sick Leave', nameTh:'ลาป่วย', entitled: 30, used: 3, pending: 0, remaining: 27 },
  { type:'personal', nameEn:'Personal Leave', nameTh:'ลากิจ', entitled: 6, used: 2, pending: 0, remaining: 4 },
  { type:'maternity', nameEn:'Maternity Leave', nameTh:'ลาคลอด', entitled: 98, used: 0, pending: 0, remaining: 98 },
  { type:'paternity', nameEn:'Paternity Leave', nameTh:'ลาเพื่อดูแลภรรยาคลอด', entitled: 15, used: 0, pending: 0, remaining: 15 },
  { type:'ordination', nameEn:'Ordination Leave', nameTh:'ลาอุปสมบท', entitled: 15, used: 0, pending: 0, remaining: 15 },
  { type:'military', nameEn:'Military Leave', nameTh:'ลาเพื่อรับราชการทหาร', entitled: 60, used: 0, pending: 0, remaining: 60 },
  { type:'unpaid', nameEn:'Unpaid Leave', nameTh:'ลาไม่รับค่าจ้าง', entitled: 0, used: 0, pending: 0, remaining: 0 },
];

export default function LeaveBalancePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold text-ink mb-6">ยอดวันลา</h1>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-surface-raised text-ink-muted uppercase text-xs">
            <tr>
              <th className="px-4 py-3">ประเภทการลา</th>
              <th className="px-4 py-3">สิทธิ์</th>
              <th className="px-4 py-3">ใช้ไป</th>
              <th className="px-4 py-3">รออนุมัติ</th>
              <th className="px-4 py-3">ยอดคงเหลือ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {MOCK_BALANCES.map((b) => (
              <tr key={b.type} className="bg-surface hover:bg-surface-raised/50">
                <td className="px-4 py-3 font-medium text-ink">{b.nameTh}</td>
                <td className="px-4 py-3">{b.entitled}</td>
                <td className="px-4 py-3">{b.used}</td>
                <td className="px-4 py-3">{b.pending}</td>
                <td className="px-4 py-3 font-semibold">{b.remaining}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
