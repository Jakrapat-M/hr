# Time Module — Source Material (Central Group WFS reference)

Handed over 2026-06-06 to inform implementing the HR app's **Time module** (mockup phase).
These are the originals copied into the repo so they survive (Teams download links / signed URLs expire).

The full **parsed summary + business-flow write-up** lives in the OMC wiki:
`.omc/wiki/time-module-source-data-business-flows-central-group-wfs-referen.md`

## Files

| File | What it is |
|------|-----------|
| `TIME-for-Ken.drawio` | To-be business-flow spec, 5 pages: Working Hour · Shift Schedule · Leave Request · OT Request · Time Correction. The design we build toward. Open in draw.io. |
| `Time-Daily-Work-Schedule_20210505.xlsm` | The real **DWS (Daily Work Schedule)** Excel tool SPD/Payroll use today. Contains the master **shift-code catalog (425 codes)**, break-type rules (A/A1-A3/B/C), and the W/F day-coding + red/green/yellow validation model. Sheets: คำอธิบาย, CONFIG, Schedule, Name List, Planning, Summary Shift Plan, T1. |
| `list-of-value.xlsx` | Picklists: Leave types (25, TH/EN), OT types (2), Time-Correction reasons (15) + pay codes. |
| `wfs-screenshots/wfs-timesheet-schedule.png` | WFS "Manager Time Entry" → Time Entry + Schedule tabs (Scheduled Times / Break, EC Plan Hours). |
| `wfs-screenshots/wfs-time-off-balances.png` | WFS "Time Off" tab → leave balance buckets (Initial/Credits/Debits/Ending in Days). |
| `wfs-screenshots/wfs-results-after-leave.png` | WFS "Results" tab → computed pay codes / wage types per work date after a leave is taken. |

## Reference system
The screenshots are the **production** system Central Group uses today:
**SAP SuccessFactors EC** (system of record for the work Pattern) + **WorkForce Software (WFS)** cloud (`central.wta-eu3.wfs.cloud`, v20.2.0) for time entry/attendance. Our Next.js app re-creates this domain for the mockup.
