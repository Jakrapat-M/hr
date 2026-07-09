// lib/time/holiday-calendar.ts — Time-module holiday calendar (wiki §5 HOLIDAY).
//
// MOCK ONLY. The single source/seam for the Thai 2026 public-holiday calendar the
// Results tab reads to mark HOLIDAY pay-code rows. Authored from the dates in
// `CNEXT_TH_HOLIDAYS` (cnext-mock-data.ts) — their names live only in `//` comments
// there, so this module restates them as structured `{ date, nameTh, nameEn }`
// rows (do NOT parse the comments at runtime). A future backend swap replaces only
// `TIME_HOLIDAYS_2026` / `getHolidaysForPeriod`. Pure + deterministic (no Date.now).

export type HolidayLabel = { nameTh: string; nameEn: string };
export type Holiday = { date: string } & HolidayLabel;

/** Thai public holidays for 2026 (ISO YYYY-MM-DD), bilingual labels. */
export const TIME_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', nameTh: 'วันขึ้นปีใหม่', nameEn: "New Year's Day" },
  { date: '2026-03-03', nameTh: 'วันมาฆบูชา', nameEn: 'Makha Bucha Day' },
  { date: '2026-04-06', nameTh: 'วันจักรี', nameEn: 'Chakri Memorial Day' },
  { date: '2026-04-13', nameTh: 'วันสงกรานต์', nameEn: 'Songkran Festival' },
  { date: '2026-04-14', nameTh: 'วันสงกรานต์', nameEn: 'Songkran Festival' },
  { date: '2026-04-15', nameTh: 'วันสงกรานต์', nameEn: 'Songkran Festival' },
  { date: '2026-05-01', nameTh: 'วันแรงงานแห่งชาติ', nameEn: 'National Labour Day' },
  { date: '2026-05-04', nameTh: 'วันฉัตรมงคล', nameEn: 'Coronation Day' },
  { date: '2026-06-01', nameTh: 'วันวิสาขบูชา', nameEn: 'Visakha Bucha Day' },
  { date: '2026-06-03', nameTh: 'วันเฉลิมพระชนมพรรษา สมเด็จพระราชินี', nameEn: "Queen's Birthday" },
  { date: '2026-07-28', nameTh: 'วันเฉลิมพระชนมพรรษา ร.10', nameEn: "King's Birthday" },
  { date: '2026-07-29', nameTh: 'วันอาสาฬหบูชา', nameEn: 'Asarnha Bucha Day' },
  { date: '2026-07-30', nameTh: 'วันเข้าพรรษา', nameEn: 'Buddhist Lent Day' },
  { date: '2026-08-12', nameTh: 'วันแม่แห่งชาติ', nameEn: "Mother's Day" },
  { date: '2026-10-13', nameTh: 'วันคล้ายวันสวรรคต ร.9', nameEn: 'Passing of King Rama IX' },
  { date: '2026-10-23', nameTh: 'วันปิยมหาราช', nameEn: 'Chulalongkorn Day' },
  { date: '2026-12-05', nameTh: 'วันพ่อแห่งชาติ', nameEn: "Father's Day" },
  { date: '2026-12-10', nameTh: 'วันรัฐธรรมนูญ', nameEn: 'Constitution Day' },
  { date: '2026-12-31', nameTh: 'วันสิ้นปี', nameEn: "New Year's Eve" },
];

/**
 * Holidays falling in `[startISO, endISO]` (inclusive), as a `date → label` map.
 * Pure: filters `TIME_HOLIDAYS_2026` to the window. ISO date strings compare
 * lexicographically, so no Date parsing is needed.
 */
export function getHolidaysForPeriod(
  startISO: string,
  endISO: string,
): Map<string, HolidayLabel> {
  const out = new Map<string, HolidayLabel>();
  for (const h of TIME_HOLIDAYS_2026) {
    if (h.date >= startISO && h.date <= endISO) {
      out.set(h.date, { nameTh: h.nameTh, nameEn: h.nameEn });
    }
  }
  return out;
}
