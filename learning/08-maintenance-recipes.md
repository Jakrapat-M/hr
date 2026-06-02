# บท 08 — สูตรงานบำรุงรักษาที่เจอบ่อย (ลงมือจริง)

> เป้าหมาย: เปิดบทนี้ตอนมีงานเข้า แล้วทำตามทีละขั้นได้เลย
> ทุกสูตรจบด้วย "วิธีพิสูจน์ว่าทำถูก" — อย่าข้าม

> 🛟 ก่อนเริ่มทุกสูตร: แตกกิ่งใหม่ก่อน (บท 10) จะได้ย้อนกลับง่ายถ้าพลาด

---

## สูตร 1 — เปลี่ยนข้อความบนหน้าจอ

**งาน:** HR อยากเปลี่ยนคำว่า "ส่งคำขอ" เป็น "ยืนยันการส่ง"

1. หาว่าข้อความมาจากไฟล์ข้อความหรือเขียนในหน้า:
   ```bash
   cd ~/Projects/hr/src/frontend
   grep -rn "ส่งคำขอ" messages/ src/app/
   ```
2. **ถ้าอยู่ใน `messages/`** → แก้ทั้ง `th.json` และ `en.json` (บท 06)
3. **ถ้าอยู่ในหน้า** (`isTh ? 'ส่งคำขอ' : 'Submit'`) → แก้ในไฟล์นั้น ทั้งฝั่งไทยและอังกฤษ
4. **พิสูจน์:** เปิด `/th/...` และ `/en/...` ดูว่าถูกทั้งคู่

---

## สูตร 2 — เปลี่ยนสี/รูปแบบ

**งาน:** อยากเปลี่ยนสีปุ่มหลักทั้งระบบ

1. เปิด `src/app/globals.css` หา `--color-accent`
2. แก้ค่าสี (ใช้ค่าจากดีไซน์ ไม่ใช่สีแดง — ดูบท 11)
3. **พิสูจน์:** ดูเบราว์เซอร์ ปุ่มหลักทุกหน้าเปลี่ยนพร้อมกัน
   (ถ้าไม่เปลี่ยน → แคช CSS ค้าง: เซฟ `globals.css` ซ้ำ 1 ครั้ง — ดูบท 11)

> เปลี่ยนเฉพาะปุ่มเดียว ไม่ใช่ทั้งระบบ? ใช้ `variant` คนละแบบ หรือคลาส Tailwind เฉพาะที่นั้น

---

## สูตร 3 — เพิ่มหน้าใหม่

**งาน:** เพิ่มหน้า `/th/team/notes`

1. สร้างโฟลเดอร์ + ไฟล์: `src/app/[locale]/team/notes/page.tsx`
2. วางโครงเริ่มต้น (คัดลอกแพตเทิร์นจากหน้าที่มีอยู่ เช่น `time/corrections/page.tsx`):
   ```tsx
   'use client';
   import { useLocale } from 'next-intl';
   import { Card } from '@/components/humi';

   export default function TeamNotesPage() {
     const locale = useLocale();
     const isTh = locale !== 'en';
     return (
       <div className="space-y-6">
         <h1 className="text-2xl font-semibold text-ink">
           {isTh ? 'บันทึกทีม' : 'Team Notes'}
         </h1>
         <Card><p>เนื้อหา...</p></Card>
       </div>
     );
   }
   ```
3. เปิด `http://localhost:3000/th/team/notes` → เห็นหน้าแล้ว (URL เกิดเองจากโฟลเดอร์)
4. **ถ้าต้องให้เข้าถึงจากเมนู** → เพิ่ม leaf ใน `components/humi/shell/Sidebar.tsx`
   **และ** เพิ่มชื่อหน้าใน `TITLE_MAP` (ใน `AppShell.tsx`) ทั้ง `/th/...` และ `/en/...`
   > ⚠️ ลืม `TITLE_MAP` = เทสต์ `humi-functional` แดง (กฎนี้เคยทำพลาดมาแล้ว)
5. **ถ้าต้องกันสิทธิ์** → เพิ่ม `layout.tsx` ในโฟลเดอร์นั้น (ดูตัวอย่าง `hrbp/employees/layout.tsx`)
6. **พิสูจน์:** กดจากเมนูเข้าได้ + `npm run build` ผ่าน

---

## สูตร 4 — เพิ่มฟิลด์ในฟอร์ม

**งาน:** เพิ่มช่อง "เบอร์โทร" ในฟอร์มหนึ่ง

1. เพิ่ม state เก็บค่า (บท 02 §2.4):
   ```tsx
   const [phone, setPhone] = useState('');
   ```
2. เพิ่มช่องกรอกด้วย FormField (บท 04 §3.3):
   ```tsx
   <FormField label={isTh ? 'เบอร์โทร' : 'Phone'}>
     {(controlProps) => (
       <FormInput {...controlProps} type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
     )}
   </FormField>
   ```
3. หา "จุดที่ส่งข้อมูล" — มองในไฟล์เดียวกันหาฟังก์ชัน `handleSubmit` (หรือชื่อคล้ายกัน)
   ที่รวบค่าจาก state แล้วส่งต่อ เช่นในรูปแบบของ `time/corrections/page.tsx`:
   ```tsx
   function handleSubmit() {
     const id = addRequest({
       date, kind, correctedTime, reason,   // ← ค่าเดิมที่ส่งอยู่
       phone,                                // ← เพิ่มของเราตรงนี้ (ชื่อ state ที่สร้างขั้น 1)
     });
   }
   ```
   > ถ้ายังไม่มี submit (ฟอร์มแค่โชว์เฉยๆ) ขั้นนี้ข้ามได้ — แค่เพิ่มช่องกรอกก็พอสำหรับ mockup
4. **พิสูจน์:** กรอกแล้วกดส่ง ดูว่าค่าถูกเก็บ — ใส่ `console.log(phone)` ใน `handleSubmit` ชั่วคราว
   แล้วเปิด Console (F12) ดูค่าที่พิมพ์ (เสร็จแล้วลบ `console.log` ออก)

---

## สูตร 5 — แก้ bug (ตัวอย่างจริงจากระบบนี้)

นี่คือ bug ที่เพิ่งแก้จริงในระบบ — ใช้เป็นแบบฝึกการดีบักครบวงจร

> ℹ️ **bug นี้แก้ไปแล้ว** — โค้ดปัจจุบันใน `profile/me/page.tsx` ใช้ `key={i}` เรียบร้อย
> อ่านเป็น "กรณีศึกษา" วิธีคิด ไม่ต้องไปหา `key={l}` ในโค้ดจริง (หาไม่เจอแล้ว)

**อาการ:** หน้าโปรไฟล์ (แท็บ Employment) มี warning ใน console:
`Encountered two children with the same key`

**ขั้น 1 — ดูของจริง** เปิดเบราว์เซอร์หน้านั้น กด `F12` → แท็บ Console เห็น warning
**ขั้น 2 — เข้าใจสาเหตุ** warning นี้แปลว่า ลิสต์มี `key` ซ้ำ (บท 02 §2.6)
**ขั้น 3 — หาจุด** ในไฟล์ `app/[locale]/profile/me/page.tsx` มี component `FieldCard`
ที่วาดแถวด้วย:
```tsx
{rows.map(([l, v]) => (
  <div key={l}>...</div>      // ❌ key = label; แต่ label ซ้ำข้าม section ("Start Date" โผล่หลายที่)
))}
```
**ขั้น 4 — แก้** เปลี่ยนไปใช้ index (ตำแหน่งในลิสต์) ที่ไม่ซ้ำแน่นอน:
```tsx
{rows.map(([l, v], i) => (
  <div key={i}>...</div>      // ✅ index ไม่ซ้ำ (rows เป็น static ไม่สลับลำดับ จึงปลอดภัย)
))}
```
**ขั้น 5 — พิสูจน์** รีเฟรชหน้า เปิด Console → warning หายหมด + ดูว่าหน้ายังแสดงครบเหมือนเดิม
**ขั้น 6 — เช็คไม่พังที่อื่น** `npm run build` ต้องผ่าน (exit 0)

> 📌 บทเรียน: ดู Console (F12) เป็นนิสัย — warning หลายอย่างบอก bug ที่ตายังไม่เห็น

---

## สูตร 6 — หา "ของที่เกี่ยวข้อง" เวลาไม่รู้จะเริ่มตรงไหน

เครื่องมือเดียวที่ใช้บ่อยสุด: **ค้นข้อความในโค้ด** (`grep`)
```bash
cd ~/Projects/hr/src/frontend

grep -rn "สรุปค่าตอบแทน" src/        # หาว่าข้อความนี้อยู่ไฟล์ไหน
grep -rln "payroll-summary" src/      # หาไฟล์ที่พูดถึง payroll-summary
grep -rn "useTimeCorrections" src/    # หาว่า store นี้ถูกใช้ที่ไหนบ้าง
```
- `-r` = ค้นทุกไฟล์ในโฟลเดอร์, `-n` = บอกเลขบรรทัด, `-l` = บอกแค่ชื่อไฟล์

> เริ่มงานทุกครั้งด้วยการ grep คำที่เกี่ยวข้อง → จะเจอจุดเริ่มเร็วมาก

---

## เช็กลิสต์ปิดงานทุกสูตร

- [ ] ดูผลบนเบราว์เซอร์จริง (ไม่ใช่เดา)
- [ ] เช็คครบสองภาษา (`/th` + `/en`) ถ้าแตะข้อความ
- [ ] เปิด Console (F12) ไม่มี error/warning ใหม่
- [ ] `npm run build` ผ่าน (exit 0)
- [ ] ถ้าแตะ logic/หน้าจอ → มีเทสต์คุ้ม (บท 09)

**ต่อไป →** [บท 09: ทดสอบและตรวจสอบ](./09-testing-and-verify.md)
