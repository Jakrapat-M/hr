'use client';

// ClockLogTab — GPS punch log for My Timesheet (STA-195). One in/out row per punch
// from the deterministic clock-log seed, grouped by day. Out-of-radius punches are
// tinted pumpkin (warning), and a coordinate opens the synthetic map modal. Never
// red.

import { useMemo, useState } from 'react';
import { MapPin, CircleCheck, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/humi';
import { cn } from '@/lib/utils';
import type { ClockLogEntry } from '@/lib/time/clock-log-seed';
import { DEMO_TODAY } from '@/lib/time/period';
import { fmtDayShort } from './format';
import { ClockLogMapModal } from './ClockLogMapModal';

export function ClockLogTab({ entries, isTh }: { entries: ClockLogEntry[]; isTh: boolean }) {
  const [selected, setSelected] = useState<ClockLogEntry | null>(null);

  // Group by date (entries already ordered in/out per day) + per-day warn flag.
  const groups = useMemo(() => {
    const byDate = new Map<string, ClockLogEntry[]>();
    for (const e of entries) {
      const arr = byDate.get(e.date) ?? [];
      arr.push(e);
      byDate.set(e.date, arr);
    }
    return Array.from(byDate.entries()).map(([date, list]) => ({ date, list, hasWarn: list.some((e) => !e.withinRadius) }));
  }, [entries]);

  return (
    <div className="space-y-3">
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-muted">
                <th className="px-3 py-2.5 font-semibold">{isTh ? 'วันที่' : 'Date'}</th>
                <th className="px-3 py-2.5 font-semibold">{isTh ? 'ประเภท' : 'Type'}</th>
                <th className="px-3 py-2.5 font-semibold">{isTh ? 'เวลา' : 'Time'}</th>
                <th className="px-3 py-2.5 font-semibold">Location (GPS)</th>
                <th className="px-3 py-2.5 font-semibold">{isTh ? 'ระยะห่าง' : 'Distance'}</th>
                <th className="px-3 py-2.5 font-semibold">{isTh ? 'สถานะ' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) =>
                g.list.map((e, i) => (
                  <tr
                    key={`${e.date}-${e.type}`}
                    className={cn(
                      'border-b border-hairline last:border-0',
                      i === 0 && 'border-t border-hairline',
                      !e.withinRadius && 'bg-warning-soft/30',
                    )}
                  >
                    <td className="px-3 py-2.5 align-top">
                      {i === 0 && (
                        <div className={cn('font-semibold', g.hasWarn ? 'text-warning' : 'text-ink')}>
                          {fmtDayShort(e.date, isTh)}
                          {g.hasWarn && <div className="text-xs font-normal">⚠ {isTh ? 'มี Warning' : 'Has warning'}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {e.type === 'in' ? (
                        <span className="rounded-full border border-[var(--color-info)] bg-info-soft px-2 py-0.5 text-xs font-medium text-[var(--color-info)]">Clock In</span>
                      ) : (
                        <span className="rounded-full border border-hairline bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink-muted">Clock Out</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-ink">{e.time}</td>
                    <td className="px-3 py-2.5">
                      {e.placeName ? <div className="text-ink">{e.placeName}</div> : <div className="font-medium text-warning">{e.lat.toFixed(4)}° N, {e.lng.toFixed(4)}° E</div>}
                      <button
                        type="button"
                        onClick={() => setSelected(e)}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-info)] hover:underline"
                      >
                        <MapPin size={12} aria-hidden />
                        {e.placeName ? `${e.lat.toFixed(4)}° N, ${e.lng.toFixed(4)}° E · ${isTh ? 'ดูแผนที่' : 'View map'}` : (isTh ? 'ดูแผนที่เทียบ Work Location' : 'Compare vs work location')}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('text-xs font-medium tabular-nums', e.withinRadius ? 'text-accent' : 'text-warning')}>{e.distanceM} {isTh ? 'ม.' : 'm'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {e.withinRadius ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"><CircleCheck size={12} aria-hidden />{isTh ? 'ในรัศมี' : 'In radius'}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"><TriangleAlert size={12} aria-hidden />{isTh ? 'นอกรัศมี' : 'Out of radius'}</span>
                      )}
                    </td>
                  </tr>
                )),
              )}
              {/* Today — not yet clocked */}
              <tr className="border-t border-hairline">
                <td className="px-3 py-2.5 font-semibold text-[var(--color-accent-alt)]">{fmtDayShort(DEMO_TODAY, isTh)} ◀</td>
                <td colSpan={5} className="px-3 py-2.5 text-sm italic text-ink-faint">{isTh ? 'ยังไม่มีข้อมูล Clock In/Out วันนี้' : 'No clock in/out yet today'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <ClockLogMapModal entry={selected} isTh={isTh} onClose={() => setSelected(null)} />
    </div>
  );
}
