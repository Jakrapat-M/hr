# บท 03 — แผนที่โครงสร้างโปรเจกต์ (ของอยู่ตรงไหน)

> เป้าหมาย: เปิดโปรเจกต์มาแล้วรู้ว่า "ถ้าจะแก้ X ต้องไปไฟล์ไหน"
> นี่คือบทที่จะกลับมาเปิดดูบ่อยที่สุด

---

## 1. ระดับบนสุด (ราก repo: `~/Projects/hr/`)

```
hr/
├── src/
│   ├── frontend/        ← ⭐ โค้ดจริงทั้งหมดอยู่ที่นี่ (ที่เราดูแล)
│   └── services/        ← ของเก่า (microservices) อย่ายุ่ง
├── learning/            ← คอร์สนี้
├── CLAUDE.md            ← กฎโปรเจกต์ตัวเต็ม
└── README.md            ← เอกสารเก่า (อ้างถึงระบบเดิม ไม่ตรงปัจจุบัน)
```

**จำข้อเดียว: ทำงานใน `src/frontend/` เท่านั้น** ต่อไปนี้ทุก path นับจากตรงนี้

---

## 2. ภายใน `src/frontend/`

```
src/frontend/
├── src/
│   ├── app/[locale]/        ← 🗺️ "หน้าเว็บ" ทั้งหมด (1 โฟลเดอร์ = 1 URL)
│   ├── components/          ← ชิ้นส่วน UI
│   │   ├── humi/            ← ⭐ ชิ้นส่วนมาตรฐาน (Button, Card, ...)
│   │   └── <โดเมน>/         ← ชิ้นส่วนเฉพาะงาน (benefits, payroll, ...)
│   ├── stores/             ← 🧠 "กระดานโน้ต" Zustand (ข้อมูล/สถานะ)
│   ├── lib/                ← 🔧 ตัวช่วย (วันที่, สิทธิ์, ข้อมูลจำลอง, ...)
│   ├── i18n/               ← ตั้งค่าระบบสองภาษา
│   └── app/globals.css     ← 🎨 สี/ระยะ/เงา (design tokens)
├── messages/
│   ├── th.json             ← 🇹🇭 ข้อความภาษาไทยทั้งหมด
│   └── en.json             ← 🇬🇧 ข้อความภาษาอังกฤษทั้งหมด
├── e2e/                    ← เทสต์แบบเปิดเบราว์เซอร์จริง (Playwright)
└── package.json            ← รายชื่อไลบรารี + คำสั่ง (npm run ...)
```

---

## 3. โฟลเดอร์ `app/[locale]/` — หน้าเว็บ (สำคัญสุด)

ระบบนี้ใช้ **"ชื่อโฟลเดอร์ = URL"** (เรียกว่า App Router)

| โฟลเดอร์ | URL ที่ได้ |
|----------|-----------|
| `app/[locale]/home/page.tsx` | `/th/home` |
| `app/[locale]/time/corrections/page.tsx` | `/th/time/corrections` |
| `app/[locale]/manager/payroll-summary/page.tsx` | `/th/manager/payroll-summary` |

กฎ:
- **`[locale]`** = ช่องภาษา (`th` หรือ `en`) เปลี่ยนอัตโนมัติ ไม่ต้องสร้างเอง
- **`page.tsx`** = เนื้อหาหน้านั้น (ชื่อไฟล์ต้องเป๊ะ `page.tsx`)
- **`layout.tsx`** = กรอบครอบหน้า (มักใช้คุมสิทธิ์ว่าใครเข้าได้ — ดูบท 07)
- **`[id]`** = ช่องค่าผันแปร เช่น `quick-approve/[id]` → `/quick-approve/123`

> ✅ อยากเพิ่มหน้าใหม่ = สร้างโฟลเดอร์ + ไฟล์ `page.tsx` ข้างใน (ละเอียดในบท 08)
> ไม่มี "ทะเบียนเส้นทาง" ที่ต้องไปลงชื่อ — สร้างโฟลเดอร์แล้ว URL เกิดเอง

มีหน้าทั้งหมด ~46 กลุ่ม เช่น: `home`, `profile`, `benefits-hub`, `payroll`, `quick-approve`,
`time`, `timeoff`, `roster`, `org-chart`, `admin/*`, `hrbp/*`, `manager/*`

---

## 4. โฟลเดอร์ `components/humi/` — ชิ้นส่วนมาตรฐาน

ชิ้นส่วนสำเร็จรูปที่ใช้ซ้ำทั้งระบบ **ต้องหยิบจากที่นี่ก่อนเสมอ** (อย่าสร้างปุ่ม/การ์ดเอง)

วิธีเรียกใช้ (import จากที่เดียว):
```tsx
import { Button, Card, FormField, DataTable, Modal } from '@/components/humi';
```

ชิ้นส่วนที่มีให้ (ดูตัวจริงที่ `components/humi/index.ts`):
`Button`, `Card` (+ `CardTitle`, `CardEyebrow`), `FormField` (+ `FormInput`),
`DataTable`, `Modal`, `Avatar`, `Toggle`, `Textarea`, `EmptyState`,
`NotificationBell`, `QuickActionsTile`, `Capability`, `DemoValuesDisclaimer`, `Nav`

> `@/` = ทางลัดที่แปลว่า "`src/` ของ frontend" — `@/components/humi` = `src/components/humi`

รายละเอียดการใช้แต่ละตัว → [บท 04](./04-humi-design-system.md)

---

## 5. โฟลเดอร์ `stores/` — กระดานโน้ต (Zustand)

ที่เก็บ "ข้อมูล/สถานะที่จำได้ระหว่างกดใช้งาน" แต่ละไฟล์ดูแลโดเมนของมัน เช่น:

| ไฟล์ | ดูแลเรื่อง |
|------|-----------|
| `auth-store.ts` | ใครล็อกอินอยู่ มี role อะไร |
| `time-corrections.ts` | คำขอแก้เวลาเข้า-ออกงาน |
| `leave-approvals.ts` | คิวอนุมัติการลา |
| `humi-benefits-slice.ts` | ข้อมูลสวัสดิการ |
| `ui-store.ts` | สถานะหน้าตา (เปิด/ปิด sidebar ฯลฯ) |

รายละเอียด → [บท 05](./05-state-zustand.md)

---

## 6. โฟลเดอร์ `lib/` — ตัวช่วย

ฟังก์ชัน/ข้อมูลที่ใช้ร่วมกัน ที่ควรรู้จัก:

| ไฟล์ | ทำอะไร |
|------|--------|
| `date.ts` | จัดรูปแบบวันที่ (พ.ศ.) + `maskValue` (ปิดบังข้อมูล) + `formatCurrency` |
| `rbac.ts` | ระบบสิทธิ์ — มี role อะไรบ้าง ใครเข้าโมดูลไหนได้ |
| `scope-filter.ts` | กรองพนักงานตาม persona (หัวหน้าเห็นแค่ลูกทีม ฯลฯ) |
| `claim-permissions.ts` | ใครกดอนุมัติคำขอได้ |
| `humi-mock-data.ts` | ข้อมูลจำลองหลัก (พนักงาน ฯลฯ) |
| `all-ported-employees.ts` | รายชื่อพนักงานทั้งหมด (+ `maskNationalId`) |
| `approval-registry.ts` | ศูนย์รวมคิวอนุมัติทุกประเภท |

รายละเอียดข้อมูลจำลอง + สิทธิ์ → [บท 07](./07-mock-data-and-rbac.md)

---

## 7. ไฟล์ข้อความสองภาษา `messages/`

- `messages/th.json` — ข้อความไทย (~4,600 ข้อความ)
- `messages/en.json` — ข้อความอังกฤษ (ต้องมีจำนวน "เท่ากัน" เป๊ะ)

โครงสร้างเป็นกล่องซ้อนกล่อง เช่น:
```json
{
  "managerPayrollSummary": {
    "title": "สรุปค่าตอบแทนทีม",
    "colName": "ชื่อ"
  }
}
```
เรียกใช้ในโค้ดด้วย `t('managerPayrollSummary.title')` → [บท 06](./06-i18n-bilingual.md)

---

## 8. เกมฝึก: "ถ้าจะแก้ X ไปไหน?"

ลองตอบในใจ (เฉลยถัดลงไป):
1. อยากเปลี่ยนข้อความปุ่มบนหน้าหนึ่ง → ?
2. อยากเปลี่ยนสีปุ่มหลักทั้งระบบ → ?
3. อยากเพิ่มหน้าใหม่ → ?
4. อยากแก้ว่าหัวหน้าเห็นเมนูอะไรบ้าง → ?

<details>
<summary>เฉลย</summary>

1. `messages/th.json` + `messages/en.json` (ข้อความอยู่ที่นี่ ไม่ได้ฮาร์ดโค้ดในหน้า)
2. `src/app/globals.css` ที่ตัวแปร `--color-accent` (โทเคนสี — บท 04)
3. สร้างโฟลเดอร์ + `page.tsx` ใน `app/[locale]/...` (บท 08)
4. `components/humi/shell/Sidebar.tsx` (เมนู) + `rbac.ts` (สิทธิ์) — บท 07

</details>

---

## สรุปบทนี้

- โค้ดจริง = `src/frontend/` เท่านั้น
- หน้าเว็บ = โฟลเดอร์ใน `app/[locale]/` ที่มี `page.tsx`
- ชิ้นส่วนมาตรฐาน = `components/humi/`
- ข้อมูล/สถานะ = `stores/`
- ตัวช่วย/ข้อมูลจำลอง = `lib/`
- ข้อความ 2 ภาษา = `messages/th.json` + `en.json`
- สี/ระยะ = `app/globals.css`

**ต่อไป →** [บท 04: ระบบดีไซน์ Humi](./04-humi-design-system.md)
