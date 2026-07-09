# บท 07 — ข้อมูลจำลอง + ระบบสิทธิ์ (ใครเห็นอะไร)

> เป้าหมาย: รู้ว่าข้อมูลที่เห็นมาจากไหน และระบบ "ใครเห็น/ทำอะไรได้" ทำงานยังไง

---

# ส่วน A: ข้อมูลจำลอง (Mock Data)

## A.1 ทำไมเป็นข้อมูลจำลอง

เฟสนี้ยังไม่ต่อหลังบ้านจริง → ข้อมูลทั้งหมด "เขียนฝังไว้ในโค้ด" (static/registry)
มันคือข้อมูลสมจริงที่ใช้ให้ HR ดูหน้าตา/ตัดสินทิศทาง

## A.2 ไฟล์ข้อมูลจำลองหลัก (อยู่ใน `src/lib/`)

| ไฟล์ | เก็บอะไร |
|------|----------|
| `cnext-mock-data.ts` | ข้อมูลหลัก: พนักงาน โปรไฟล์ ฯลฯ |
| `cnext-mock-data-sf-parity.ts`, `cnext-mock-data-sf-real.ts` | ข้อมูลเสริม (เทียบ SuccessFactors) |
| `all-ported-employees.ts` | รายชื่อพนักงานทั้งหมดที่ใช้ในตาราง/สโคป |
| `demo-seed.ts` | ตัว "เพาะเมล็ด" ข้อมูลลง store ตอนเปิดแอป |
| `demo-users.ts` | บัญชีผู้ใช้สำหรับเดโม (ล็อกอินเป็น persona ต่างๆ) |
| `comp-history-mock.ts`, `*-mock.ts` | ข้อมูลจำลองเฉพาะโดเมน |

## A.3 ระบบ "แกล้งทำเป็น async" (ไฟล์ `*-api.ts` เฉพาะโดเมน)

ไฟล์ `*-api.ts` เฉพาะโดเมน (เช่น `quick-approve-api.ts`, `workflow-api.ts`) ทำเหมือนเรียก API จริง
(มีดีเลย์นิดหน่อย) แต่จริงๆ แค่คืนข้อมูลจาก mock ด้านบน → พอต่อหลังบ้านจริงทีหลังเปลี่ยนง่าย

> ⚠️ จุดที่ต้องไม่สับสน: `lib/api.ts` (ไฟล์เดี่ยวๆ) **ไม่ใช่** ตัวคืน mock — มันเป็น
> "fetch wrapper" จริง (ใส่ auth header + retry) ที่เตรียมไว้ใช้ต่อหลังบ้านจริง เฟสนี้แทบไม่ได้ใช้
> ตัว "แกล้ง async คืน mock" อยู่ในไฟล์ `*-api.ts` เฉพาะโดเมนต่างหาก

## A.4 กฎเรื่องข้อมูลจำลองที่ต้องระวัง

- ✅ **ข้อมูลในตาราง/ลิสต์** ใช้ seed สมจริงได้เต็มที่ (HR ตัดสินดีไซน์จากตรงนี้)
- 🚫 **ฟอร์มกรอกข้อมูล** อย่าโชว์ "ของภายในระบบ" (เช่นรหัสเทมเพลต, schemaVersion)
  ในฟอร์มที่ผู้ใช้กรอก — ยกเว้นหน้าที่สเปกกำหนดชัด (เช่น STA-25 configurator)

> โดยสรุป: ตาราง = ใส่ข้อมูลสวยๆ ได้ / ฟอร์ม input = อย่าหลุดศัพท์เทคนิคภายใน

---

# ส่วน B: ระบบสิทธิ์ (RBAC = Role-Based Access Control)

## B.1 บทบาท (Role) ในระบบ

มี 6 บทบาท เรียงจากสิทธิ์น้อย→มาก (ดู `src/lib/rbac.ts`):
```
employee  <  manager  <  hrbp  <  spd  <  hr_admin  <  hr_manager
(พนักงาน) (หัวหน้า) (HRBP) (SPD)  (แอดมิน HR) (ผู้จัดการ HR)
```

**สำคัญ: สิทธิ์ "สืบทอดลงล่าง"** — ใครสิทธิ์สูงกว่า ทำของคนต่ำกว่าได้หมด
ดูในโค้ด `rbac.ts`:
```ts
const ROLE_HIERARCHY = {
  hr_manager: ['hr_admin','spd','hrbp','manager','employee'],  // ทำได้ทุกอย่าง
  manager:    ['employee'],                                     // ทำของ employee ได้
  // ...
};
```

## B.2 ฟังก์ชันเช็คสิทธิ์ (ใช้บ่อย)

```ts
import { hasAnyRole, canAccessModule } from '@/lib/rbac';

hasAnyRole(userRoles, ['hrbp', 'spd']);     // ผู้ใช้นี้เป็น hrbp หรือ spd ไหม?
canAccessModule(userRoles, 'payslip');      // เข้าโมดูล payslip ได้ไหม?
```

## B.3 Persona Tiers (4 กลุ่มสำหรับเดโม)

`src/lib/persona-tiers.ts` จับ 6 role มาเป็น 4 กลุ่มที่ HR เข้าใจง่าย:
| Tier | ใคร | role |
|------|-----|------|
| **A** | System / HR Admin | hr_admin, hr_manager |
| **B** | People Partners | hrbp, spd |
| **C** | Manager | manager |
| **D** | Employee | employee |

ในเดโมมีปุ่มสลับ persona (`PersonaSwitcher`) ให้ลองมองระบบจากมุมแต่ละคน

## B.4 ⭐ กฎเหล็ก: "ไม่มีสิทธิ์ = เอาออก ไม่ใช่ซ่อน/ล็อก"

ถ้าบทบาทหนึ่งไม่มีสิทธิ์เข้าเมนูไหน → **ตัดเมนูนั้นทิ้งไปเลย**
อย่าแสดงเป็นปุ่มเทาๆ กดไม่ได้ (กันผู้ใช้สับสน/เข้าใจผิด)

- เมนูคุมที่ `components/cnext/shell/Sidebar.tsx` (แต่ละ leaf มี `show: [...]`)
  > 📌 ชื่อใน `show:` เป็น "persona id" ของ Sidebar เอง เช่น `hradmin`, `hris`, `sysadmin`, `hrbp`, `spd`, `manager`
  > **ไม่ใช่ชื่อ Role เป๊ะๆ จาก `rbac.ts`** (เช่น `hr_admin` มี `_`) — มันถูกแปลงผ่าน `PERSONA_ROLE` (`lib/persona-tiers.ts`)
  > เวลาเพิ่ม leaf ให้ลอกชื่อ persona จาก leaf ข้างเคียง อย่าเดาเอง
- หน้าที่ต้องกันสิทธิ์ใช้ `layout.tsx` เช็ค role ถ้าไม่ผ่านแสดง `<AccessDenied>` ในที่เดิม
  (ข้อความ: "ไม่มีสิทธิ์เข้าถึง · Access Denied")

## B.5 ⭐ กฎเหล็ก: อนุมัติทุกอย่างรวมที่ `/quick-approve`

คำขออนุมัติทุกชนิด (ลา, ปรับเงิน, ทดลองงาน, แก้เวลา, ...) **ต้องโผล่ในร่ม `/quick-approve`**
(เป็นแท็บ + แถว + ตัวนับรวม) **ห้าม** ทำหน้า "กล่องอนุมัติ" แยกของแต่ละฟีเจอร์
- หน้ารายละเอียดรายตัวอยู่ที่ `/workflows/<ประเภท>/[id]` ได้ (อันนั้นโอเค)
- ศูนย์รวมคิวอยู่ที่ `lib/approval-registry.ts` (เพิ่มประเภทใหม่ที่นี่)

## B.6 การกรองตาม persona (scope)

หัวหน้าเห็นแค่ลูกทีม / HRBP เห็นแค่หน่วยงานตัวเอง — ทำผ่าน:
- `lib/scope-filter.ts` → `filterEmployeesByPersona(พนักงานทั้งหมด, roles, currentEmpId)`
- ดูตัวอย่างจริงใน `manager/payroll-summary/page.tsx`:
```tsx
const scope = filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId);
// manager → ได้เฉพาะลูกทีมตัวเอง / hr → ได้ทั้งหมด
```

---

## สรุปบทนี้

**ข้อมูลจำลอง:**
- อยู่ใน `src/lib/*-mock-data.ts` เพาะลง store ผ่าน `demo-seed.ts`
- ตาราง = ใส่ข้อมูลสวยได้ / ฟอร์ม input = อย่าหลุดศัพท์ภายใน

**สิทธิ์ (RBAC):**
- 6 role สืบทอดลงล่าง; เช็คด้วย `hasAnyRole`, `canAccessModule` (`lib/rbac.ts`)
- 4 persona tier (A/B/C/D) สำหรับเดโม
- ไม่มีสิทธิ์ = **เอาเมนูออก** ไม่ใช่ล็อก
- อนุมัติทุกอย่างรวมที่ `/quick-approve`
- กรองตามคน = `scope-filter.ts`

**ต่อไป →** [บท 08: สูตรงานบำรุงรักษาที่เจอบ่อย](./08-maintenance-recipes.md) ← บทลงมือจริง!
