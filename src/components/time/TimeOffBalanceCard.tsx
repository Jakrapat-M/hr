'use client';

// TimeOffBalanceCard — the Time-Off balance ledger (wiki §6), extracted from the
// My Timesheet "Time Off" tab (STA-195) so it can live on the /time hub instead.
// Per leave bucket, in days: Total quota · Pending · Debits · Ending. Live from
// the leave-balances store via useTimeOffLedger. Mockup: no backend.

import { Card, CardTitle } from '@/components/cnext';
import { useTimeOffLedger } from '@/hooks/use-time-off-ledger';
import { endingBalance } from '@/lib/time/time-off-ledger';

export function TimeOffBalanceCard({ empId, isTh }: { empId: string; isTh: boolean }) {
  const timeOffLedger = useTimeOffLedger(empId);
  return (
    <Card>
      <CardTitle className="text-base">{isTh ? 'รายละเอียดยอดวันลา' : 'Balance detail'}</CardTitle>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th className="py-3 px-3 font-semibold">{isTh ? 'ประเภทการลา' : 'Leave type'}</th>
              <th className="py-3 px-3 font-semibold text-right">{isTh ? 'โควต้ารวม' : 'Total quota'}</th>
              <th className="py-3 px-3 font-semibold text-right">{isTh ? 'รออนุมัติ' : 'Pending'}</th>
              <th className="py-3 px-3 font-semibold text-right">{isTh ? 'ใช้ไป' : 'Debits'}</th>
              <th className="py-3 px-3 font-semibold text-right">{isTh ? 'คงเหลือ' : 'Ending'}</th>
            </tr>
          </thead>
          <tbody>
            {timeOffLedger.map((r) => (
              <tr key={r.kind} className="border-b border-hairline last:border-0">
                <td className="py-2 px-3 text-ink">{isTh ? r.nameTh : r.nameEn}</td>
                <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{r.initial}</td>
                <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{r.pending}</td>
                <td className="py-2 px-3 text-right tabular-nums text-ink-muted">{r.debits}</td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold text-ink">{endingBalance(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-small text-ink-muted">{isTh ? 'หน่วย: วัน · คงเหลือ = โควต้ารวม − (รออนุมัติ + ใช้ไป)' : 'In days · Ending = Total quota − (Pending + Debits)'}</p>
    </Card>
  );
}
