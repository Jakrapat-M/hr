# บท 05 — State ด้วย Zustand (กระดานโน้ตกลางระบบ)

> เป้าหมาย: เข้าใจว่า "ข้อมูลที่จำได้ระหว่างกดใช้งาน" เก็บที่ไหน และอ่าน/แก้ยังไง
> บทนี้เน้นอ่านออก + แก้ของที่มีอยู่ ยังไม่ต้องสร้าง store ใหม่

---

## 1. ปัญหาที่ Zustand แก้

`useState` (บท 02) เก็บค่าได้แค่ "ใน component เดียว"
แต่บางข้อมูลต้องใช้ "หลายหน้า/หลายชิ้นส่วนพร้อมกัน" เช่น:
- "ใครล็อกอินอยู่" → topbar, sidebar, ทุกหน้าต้องรู้
- "คำขอแก้เวลาที่เพิ่งส่ง" → หน้าฟอร์มสร้าง, หน้าคิวอนุมัติ ต้องเห็นตรงกัน

**Zustand = กระดานโน้ตกลาง** ที่ทุกหน้าอ่าน/เขียนร่วมกันได้

> เทียบ: `useState` = โน้ตติดโต๊ะตัวเอง / Zustand = ไวต์บอร์ดกลางห้องที่ทุกคนเห็น

---

## 2. store หน้าตาเป็นยังไง

แต่ละ store คือไฟล์ใน `src/stores/` ข้างในมี 2 อย่าง:
- **ข้อมูล (state)** — ค่าที่เก็บ
- **แอ็กชัน (actions)** — ฟังก์ชันแก้ค่า

ดูตัวอย่างจริงแบบย่อจาก `auth-store.ts` (ใครล็อกอิน):
```ts
// (รูปแบบโดยย่อเพื่อเข้าใจ)
export const useAuthStore = create((set) => ({
  userId: null,            // ข้อมูล: id คนล็อกอิน
  roles: [],               // ข้อมูล: สิทธิ์
  isAuthenticated: false,  // ข้อมูล: ล็อกอินอยู่ไหม
  login: (user) => set({ ...user, isAuthenticated: true }),  // แอ็กชัน
  logout: () => set({ userId: null, roles: [], isAuthenticated: false }),
}));
```

---

## 3. อ่านค่าจาก store ใน component

ใช้ "hook" ของ store (ชื่อขึ้นต้น `use...`) แล้วเลือกเฉพาะค่าที่ต้องการ:

ตัวอย่างจริงจาก `manager/payroll-summary/page.tsx`:
```tsx
const roles = useAuthStore((s) => s.roles);   // เอาเฉพาะ roles
const email = useAuthStore((s) => s.email);   // เอาเฉพาะ email
```
อ่านว่า: "จากกระดาน auth ขอค่า `roles` มา" — พอค่านี้เปลี่ยน component จะวาดใหม่เอง

> 📌 เลือกเฉพาะค่าที่ใช้ (`(s) => s.roles`) ไม่ใช่เอาทั้งกระดาน
> ช่วยให้จอวาดใหม่เฉพาะตอนค่าที่เราสนใจเปลี่ยน (เร็วกว่า)

---

## 4. แก้ค่าใน store (เรียกแอ็กชัน)

ตัวอย่างจริงจาก `time/corrections/page.tsx` — ส่งคำขอแก้เวลา:
```tsx
const addRequest = useTimeCorrections((s) => s.addRequest);   // หยิบแอ็กชันมา
const myRecent  = useTimeCorrections((s) => s.requests);      // หยิบรายการมาแสดง

function handleSubmit() {
  const id = addRequest({                 // เรียกแอ็กชัน → เพิ่มคำขอลงกระดาน
    employeeId: empId,
    date, kind, correctedTime, reason,
  });
  // พอ addRequest ทำงาน:
  // - myRecent อัปเดตเอง (หน้านี้เห็นทันที)
  // - หน้า /quick-approve ก็เห็นคำขอใหม่นี้ด้วย (กระดานเดียวกัน)
}
```

นี่คือพลังของ Zustand: หน้า A เขียน → หน้า B เห็นทันที เพราะใช้กระดานเดียวกัน

---

## 5. แผนผัง store ในระบบ (รู้ว่าข้อมูลอะไรอยู่ store ไหน)

| กลุ่ม | ไฟล์ store | ดูแล |
|-------|-----------|------|
| ระบบ/ผู้ใช้ | `auth-store.ts` | คนล็อกอิน + roles |
| | `ui-store.ts` | สถานะหน้าตา (sidebar เปิด/ปิด) |
| คิวอนุมัติ | `leave-approvals.ts` | การลา |
| | `pay-rate-approvals.ts` | ปรับเงินเดือน |
| | `probation-approvals.ts` | ทดลองงาน |
| | `promotion-approvals.ts` | เลื่อนตำแหน่ง |
| | `transfer-approvals.ts` | โอนย้าย |
| | `termination-approvals.ts` | พ้นสภาพ |
| | `workflow-approvals.ts` | เวิร์กโฟลว์ทั่วไป |
| | `time-corrections.ts` | แก้เวลาเข้า-ออก |
| สวัสดิการ | `benefit-claims.ts` | เคลมสวัสดิการ |
| | `benefit-referrals.ts` | ส่งตัวรพ. |
| | `benefit-exception-store.ts` | ข้อยกเว้น |
| โดเมน Cnext | `cnext-*-slice.ts` | announcements, goals, profile, timeoff, ฯลฯ |

> 💡 **กฎ:** ก่อนสร้าง store ใหม่ ให้หา slice ที่ดูแลโดเมนนั้นอยู่แล้วก่อนเสมอ
> เกือบทุกโดเมนมี store อยู่แล้ว — เพิ่มเข้าไปในตัวเดิม ดีกว่าสร้างใหม่ทับซ้อน

---

## 6. เรื่องสำคัญเฉพาะระบบนี้: ข้อมูลจำลอง "รีเซ็ตตอนรีเฟรช"

ระบบนี้เป็น mockup → store ถูก "เพาะเมล็ด" (seed) ด้วยข้อมูลจำลองตอนเปิดแอป
จุดเพาะเมล็ดกลางคือ `ensureDemoSeed()` ใน `lib/demo-seed.ts` (เรียกโดย AppShell)

ผลที่ตามมา (ต้องรู้ ไม่งั้นงง):
- **กดไปมาในแอป (ไม่รีเฟรช)** → ข้อมูลที่เราเพิ่ม/อนุมัติ "อยู่" (เห็นข้ามหน้าได้)
- **รีเฟรชหน้า (F5)** → ข้อมูลรีเซ็ตกลับเป็นชุด seed เดิม **โดยตั้งใจ**

> นี่ไม่ใช่ bug — มันคือดีไซน์ของ mockup (ไม่มีหลังบ้านจริงเก็บถาวร)
> ถ้าทดสอบ flow ข้ามหน้า อย่ารีเฟรชกลางทาง

---

## สรุปบทนี้

- Zustand = กระดานกลางที่ทุกหน้าอ่าน/เขียนร่วมกัน (ต่างจาก `useState` ที่อยู่หน้าเดียว)
- อ่านค่า: `useXxxStore((s) => s.ค่าที่ต้องการ)`
- แก้ค่า: เรียก "แอ็กชัน" ของ store (เช่น `addRequest(...)`)
- store แยกตามโดเมน — หาตัวที่มีอยู่ก่อนสร้างใหม่
- mockup รีเซ็ตข้อมูลตอนรีเฟรช (ตั้งใจ)

**ต่อไป →** [บท 06: ระบบสองภาษา](./06-i18n-bilingual.md)
