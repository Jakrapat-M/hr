# บท 04 — ระบบดีไซน์ Humi

> เป้าหมาย: ทำหน้าจอให้ "หน้าตาเหมือนกันทั้งระบบ" โดยใช้ชิ้นส่วน + สีมาตรฐาน
> ห้ามประดิษฐ์ปุ่ม/การ์ด/สีเองเด็ดขาด — หยิบของที่มีให้

---

## 1. ทำไมต้องมี "ระบบดีไซน์"

ถ้าแต่ละหน้าทำปุ่มเอง สีเอง ขนาดเอง → ระบบจะดูมั่ว ไม่เป็นอันหนึ่งอันเดียว
Humi = ชุดชิ้นส่วน + สีกลาง ที่ทำไว้แล้ว ทุกหน้าหยิบไปใช้ → หน้าตาเนียนเหมือนกันหมด

**แหล่งความจริง (source of truth) 2 ที่:**
1. ชิ้นส่วน: `src/components/humi/`
2. สี/ระยะ/เงา: `src/app/globals.css` (เรียกว่า "design tokens")

เอกสารเสริม: `docs/design-system-humi.md`, `docs/humi-components.md`

---

## 2. โทเคนสี (design tokens) — ห้ามใส่สีดิบ

**กฎเหล็ก:** ห้ามเขียนสีตรงๆ แบบ `#FF0000` หรือ `red` ในโค้ด
ให้ใช้ "ชื่อโทเคน" แทน เพราะถ้าวันหลังเปลี่ยนสีหลัก แก้ที่เดียวจบทั้งระบบ

### โทนหลักของระบบ
| ใช้ตอน | โทเคน | สี |
|--------|-------|-----|
| พื้นหลังหน้า | `--color-canvas` | ครีม `#F6F1E8` |
| ตัวอักษรหลัก | `--color-ink` | กรมท่า `#0E1B2C` |
| ปุ่มหลัก / สถานะ active | `--color-accent` | เขียวมรกต (teal) `#1FA8A0` |
| ข้อมูล/ทางเลือก | `--color-info` | คราม (indigo) |
| **อันตราย/ผิดพลาด** | `--color-danger` | **ส้มฟักทอง (pumpkin) `#FB923C`** |

> 🚫🔴 **กฎห้ามแดง (NO-RED)** — "อันตราย/ผิดพลาด/ลบ" ทั้งหมดใช้ **ส้มฟักทอง** ไม่ใช่แดง
> ห้ามใช้ red, crimson, coral, สีแดงห้างเซ็นทรัล ทุกเฉด (เหตุผลเต็มในบท 11)

### วิธีใช้โทเคนในโค้ด (ผ่าน Tailwind utility)
```tsx
<div className="bg-canvas text-ink">             {/* พื้นครีม อักษรกรมท่า */}
<p className="text-ink-muted">ข้อความรอง</p>      {/* อักษรจางลง */}
<div className="border-hairline">                {/* เส้นขอบบางมาตรฐาน */}
<div className="rounded-[var(--radius-md)]">     {/* มุมโค้งมาตรฐาน */}
<div className="shadow-[var(--shadow-card)]">    {/* เงาการ์ดมาตรฐาน */}
```

โทเคนที่ใช้บ่อย: `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`, `text-ink-faint`,
`border-hairline`, `text-accent`, `bg-accent-soft`, `--radius-xs/sm/md/lg/xl`, `--shadow-card`

> มีตัวกันพลาด: ถ้าเผลอใส่สีดิบ/สีแดง ระบบจะ "เตือน/บล็อก" ตอนแก้ไฟล์ (hook)
> ถือเป็นเรื่องดี — มันกันเราพลาดเอง

---

## 3. ชิ้นส่วนที่ใช้บ่อย (พร้อมตัวอย่างจริง)

import ทั้งหมดจากที่เดียว:
```tsx
import { Card, Button, FormField, FormInput, DataTable, EmptyState } from '@/components/humi';
```

### 3.1 Card — กล่องเนื้อหา
```tsx
<Card variant="raised" size="lg">
  <CardEyebrow>หัวเรื่องเล็ก</CardEyebrow>
  <CardTitle>หัวข้อการ์ด</CardTitle>
  <p>เนื้อหา...</p>
</Card>
```

### 3.2 Button — ปุ่ม
```tsx
<Button variant="primary" size="md" onClick={handleSubmit}>ส่งคำขอ</Button>
<Button variant="ghost" size="sm">ยกเลิก</Button>
```
`variant`: `primary` (ปุ่มหลักสีเขียว) / `ghost` (โปร่ง) / ...
`size`: `sm` / `md` / `lg`

### 3.3 FormField + FormInput — ช่องกรอกในฟอร์ม
ดูของจริงใน `time/corrections/page.tsx`:
```tsx
<FormField label="วันที่" required>
  {(controlProps) => (
    <FormInput {...controlProps} type="date" value={date}
               onChange={(e) => setDate(e.target.value)} />
  )}
</FormField>
```
> รูปแบบนี้ (ส่งฟังก์ชันที่รับ `controlProps`) คือมาตรฐานของ FormField
> มันจะผูก label กับช่องกรอก + จัดเส้นขอบ/โฟกัสให้อัตโนมัติ คัดลอกแพตเทิร์นนี้ไปใช้ได้เลย

### 3.4 DataTable — ตาราง
ดูของจริงใน `manager/payroll-summary/page.tsx`:
```tsx
const columns = [
  { id: 'name', header: 'ชื่อ', cell: (r) => <span>{r.emp.name}</span> },
  { id: 'base', header: 'เงินเดือน', align: 'right', cell: (r) => <span>{r.base}</span> },
];
<DataTable columns={columns} rows={rows} rowKey={(r) => r.emp.id} />
```
> `rowKey` = ตัวบอกว่าแต่ละแถวใช้อะไรเป็น key ที่ไม่ซ้ำ (สำคัญ — ดูบท 02 §2.6)

### 3.5 EmptyState — ตอนไม่มีข้อมูล
```tsx
<EmptyState icon={Wallet}
  titleTh="ไม่มีผู้ใต้บังคับบัญชาโดยตรง" titleEn="No direct reports"
  descTh="เมื่อมีสมาชิกในทีม..."        descEn="When team members..." />
```
> สังเกต EmptyState รับทั้ง Th และ En ในตัว (สองภาษาในชิ้นเดียว)

---

## 4. ไอคอน (lucide-react)

ไอคอนมาจากไลบรารี `lucide-react`:
```tsx
import { Wallet, Eye, EyeOff, Clock3 } from 'lucide-react';
<Eye className="h-4 w-4" aria-hidden />     {/* ขนาด 4 = 1rem, ซ่อนจาก screen reader */}
```
หาไอคอนได้ที่ https://lucide.dev (พิมพ์คำค้น คัดลอกชื่อมา import)

---

## 5. เลย์เอาต์ด้วย Tailwind (ระยะห่าง/จัดเรียง)

คลาส Tailwind ที่เจอบ่อย:
```tsx
className="flex items-center gap-3"      // เรียงแนวนอน จัดกลาง เว้นช่อง 3
className="space-y-6"                    // เว้นแนวตั้งระหว่างลูกแต่ละตัว 6
className="grid grid-cols-2 gap-4"       // ตาราง 2 คอลัมน์
className="text-sm font-medium"          // ตัวอักษรเล็ก หนาปานกลาง
className="mt-4 px-3 py-2"               // ระยะ: margin-top 4, padding ซ้ายขวา 3 บนล่าง 2
```
ตัวเลข = หน่วย Tailwind (1 ≈ 4px) ยิ่งมากยิ่งห่าง

> 📏 **เรื่องขนาดตัวอักษร:** HR บ่นว่าตัวเล็ก เราเลยตั้ง base ใหญ่กว่าปกติ
> ใช้คลาสมาตรฐาน (`text-sm`, `text-base`, `text-lg`) ไปเลย มันจะใหญ่ตามที่ตั้งไว้
> **อย่าใส่ขนาดดิบแบบ `text-[11px]`** (ระบบจะเตือน) — ดูบท 11

---

## 6. หลักคิดเวลาทำหน้าใหม่

1. เริ่มจากชิ้นส่วน Humi เสมอ (`Card`, `Button`, ...) — อย่าเขียน div เปล่าทำเอง
2. ใช้โทเคนสี ไม่ใส่สีดิบ
3. อันตราย = ส้ม ไม่ใช่แดง
4. ข้อความไปไว้ใน `messages/` (บท 06) ไม่ฮาร์ดโค้ด (ยกเว้นต้นแบบเล็กๆ)
5. มีลิสต์ → `.map()` + `key` ไม่ซ้ำ

---

## สรุปบทนี้

- Humi = ชิ้นส่วน (`components/humi/`) + โทเคนสี (`globals.css`)
- หยิบชิ้นส่วนมาใช้ ห้ามประดิษฐ์เอง
- ใช้โทเคนสี ห้ามสีดิบ ห้ามแดง (ใช้ส้มฟักทอง)
- ตัวอักษร/ระยะ ใช้คลาส Tailwind มาตรฐาน

**ต่อไป →** [บท 05: State ด้วย Zustand](./05-state-zustand.md)
