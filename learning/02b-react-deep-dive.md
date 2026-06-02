# บท 02b — React เจาะลึก (สำหรับคนดูแลระบบจริง)

> ⏭️ **บทนี้ข้ามได้ในรอบแรก!** ถ้าเพิ่งเริ่มและอยากลงมือไวๆ ให้ข้ามไป [บท 03](./03-project-map.md) ก่อน
> แล้ว **กลับมาอ่านบทนี้เมื่อเจอ `useEffect` / `useMemo` / hook แปลกๆ ในงานจริง** (เช่นตอนทำสูตรบท 08)
> เนื้อหาหนากว่าบทอื่น — ค่อยๆ ย่อยทีละหัวข้อตอนต้องใช้ ไม่ต้องอ่านรวดเดียวจบ

---

> เป้าหมาย: เข้าใจ React "ลึกพอจะแก้ของซับซ้อนได้" ไม่ใช่แค่อ่านออก
> บทนี้ต่อจากบท 02 (พื้นฐาน) — ถ้ายังไม่แม่น component/props/useState/`.map` กลับไปอ่าน 02 ก่อน
> ทุกตัวอย่างอิงโค้ดจริงในระบบนี้ React ในระบบนี้ใช้หนักมาก (useState 1,800+ จุด, useEffect/useMemo/useCallback อีกเพียบ)

---

## 1. หัวใจของ React: "หน้าจอ = ฟังก์ชันของ state"

จำสมการนี้ไว้: **UI = f(state)**
> หน้าจอ คือผลลัพธ์ของฟังก์ชัน เมื่อ "ข้อมูล (state/props)" เปลี่ยน React จะ **เรียก component ใหม่** เพื่อวาดจอใหม่

เราไม่ได้ "สั่งให้จอเปลี่ยน" ตรงๆ แบบสมัยก่อน (`document.getElementById(...).innerHTML = ...`)
เราแค่ **เปลี่ยน state** แล้ว React วาดจอใหม่ให้เอง นี่คือกระบวนทัศน์ที่ต้องปรับใจ

```
ผู้ใช้กดปุ่ม → เรียก setState(ค่าใหม่) → React รัน component ใหม่ → จออัปเดต
```

---

## 2. "Re-render" — component รันใหม่เมื่อไหร่

component (= ฟังก์ชัน) จะถูก **รันใหม่ทั้งตัว** เมื่อ:
1. **state ของมันเปลี่ยน** (เรียก `setXxx`)
2. **props ที่รับมาเปลี่ยน**
3. **component แม่ re-render** (ลูกมักรันตามด้วย)

> ⚠️ จุดที่ beginner งงบ่อย: "รันใหม่ทั้งฟังก์ชัน" แปลว่าโค้ดทุกบรรทัดใน component **ทำงานซ้ำ** ทุกครั้งที่ re-render
> ตัวแปรธรรมดาในนั้นถูกสร้างใหม่หมด — ค่าที่อยากให้ "จำข้ามรอบ" ต้องเก็บใน `useState` (หรือ store) เท่านั้น

ตัวอย่าง:
```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const now = Math.random();   // ← ค่านี้ถูกคำนวณใหม่ทุก re-render (ไม่จำ)
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```
ทุกครั้งที่กด → `setCount` → ทั้งฟังก์ชันรันใหม่ → `now` ได้ค่าใหม่ แต่ `count` จำได้เพราะอยู่ใน useState

---

## 3. useState เจาะลึก

### 3.1 อย่าแก้ state ตรงๆ — เรียก setter เสมอ
```tsx
const [count, setCount] = useState(0);
count = count + 1;          // ❌ ผิด! React ไม่รู้ จอไม่อัปเดต
setCount(count + 1);        // ✅ ถูก
```

### 3.2 อัปเดตจากค่าเดิม ใช้ "ฟังก์ชัน updater"
ถ้าค่าใหม่ขึ้นกับค่าเดิม ให้ส่งฟังก์ชันเข้าไป (กันค่าเพี้ยนตอนกดรัวๆ):
```tsx
setCount((prev) => prev + 1);          // ✅ ปลอดภัยกว่า setCount(count + 1)
setRevealed((v) => !v);                // ของจริงจาก payroll-summary (สลับซ่อน/โชว์)
```

### 3.3 state ที่เป็น object/array — ต้องสร้างใหม่ ห้ามแก้ของเดิม
React เช็คว่า "เปลี่ยนไหม" จากการที่ object เป็น "คนละตัว" ไม่ใช่ดูข้างใน
```tsx
const [user, setUser] = useState({ name: 'A', age: 30 });

user.age = 31;  setUser(user);                 // ❌ ตัวเดิม — React มองว่าไม่เปลี่ยน
setUser({ ...user, age: 31 });                 // ✅ สร้าง object ใหม่ (คัดลอกของเดิม + ทับ age)

const [list, setList] = useState([1, 2]);
setList([...list, 3]);                          // ✅ array ใหม่ที่มี 3 ต่อท้าย
```
> `...` (spread) = "คัดลอกทุกอย่างจากของเดิม" แล้วเราทับเฉพาะที่อยากเปลี่ยน — เจอบ่อยมาก

---

## 4. ค่าที่ "คำนวณจาก state" + useMemo

บ่อยครั้งเราต้องการค่าที่ derived (คำนวณ) จาก state เช่น "ผลรวม", "รายการที่กรองแล้ว"
ทำตรงๆ ได้เลย ไม่ต้อง state ใหม่:
```tsx
const total = rows.reduce((sum, r) => sum + r.total, 0);   // คำนวณสดทุก render
```

แต่ถ้าการคำนวณ **หนัก** หรืออยากให้ผลลัพธ์ "เป็นตัวเดิม" เมื่อ input ไม่เปลี่ยน → ใช้ `useMemo`
ของจริงจาก `manager/payroll-summary/page.tsx`:
```tsx
const scope = useMemo(
  () => filterEmployeesByPersona(ALL_PORTED_EMPLOYEES, roles, currentEmpId),
  [roles, currentEmpId],     // ← "dependency array": คำนวณใหม่เฉพาะตอน 2 ตัวนี้เปลี่ยน
);
const teamTotal = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);
```
อ่านว่า: "จำผลลัพธ์ไว้ ถ้า `roles`/`currentEmpId` ไม่เปลี่ยน ก็ไม่ต้องคำนวณซ้ำ"

> 📌 `useMemo` เป็น optimization — ไม่ใส่ก็ทำงานถูก แค่คำนวณซ้ำบ่อยขึ้น
> กฎง่ายๆ สำหรับเคน: เห็นในโค้ดเข้าใจว่ามันทำอะไร; เวลาเขียนใหม่ ใส่เมื่อคำนวณหนัก/ลิสต์ใหญ่จริงๆ พอ

---

## 5. useEffect — "ทำอย่างอื่นนอกจากวาดจอ" (side effect)

component หลักๆ ทำหน้าที่ "วาดจอ" แต่บางทีต้องทำสิ่งอื่นที่ไม่ใช่การวาด เช่น
อ่าน `localStorage`, ตั้ง timer, sync กับของนอก React — พวกนี้เรียก "side effect" ใช้ `useEffect`

```tsx
import { useEffect } from 'react';

useEffect(() => {
  // โค้ดนี้รัน "หลังจาก" จอวาดเสร็จ
  console.log('หน้านี้แสดงแล้ว');
}, []);   // ← dependency array
```

### dependency array สำคัญมาก — มี 3 แบบ
```tsx
useEffect(() => { ... }, []);          // รันครั้งเดียวตอน component โผล่ครั้งแรก
useEffect(() => { ... }, [userId]);    // รันใหม่ทุกครั้งที่ userId เปลี่ยน
useEffect(() => { ... });              // รันทุก render (อันตราย — มักไม่ใช่ที่ต้องการ)
```

### cleanup — เก็บกวาดตอนเลิก
ถ้า effect สร้างของที่ต้องเลิก (timer, subscription) ให้ return ฟังก์ชันเก็บกวาด:
```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);   // รันตอน component หายไป / ก่อน effect รันรอบใหม่
}, []);
```

> ⚠️ **กับดักที่ต้องรู้:** อย่าใช้ `useEffect` เพื่อ "คำนวณค่าจาก state" — อันนั้นใช้ตัวแปรธรรมดา/useMemo (ข้อ 4)
> `useEffect` ไว้สำหรับ "ติดต่อโลกภายนอก React" เท่านั้น ใช้ผิดที่ = จอกระพริบ/ลูปไม่จบ
> ในระบบนี้ `useEffect` มักใช้กับ: อ่าน localStorage, ผูก event ของ browser, redirect

---

## 6. useCallback กับ useRef (รู้จักไว้ เจอในโค้ด)

- **useCallback** — "จำฟังก์ชันตัวเดิม" ข้าม render (เหมือน useMemo แต่สำหรับฟังก์ชัน)
  ใช้เมื่อส่งฟังก์ชันเป็น prop ให้ลูกที่ optimize ไว้ หรือใส่ใน dependency array ของ effect
  ```tsx
  const handleSave = useCallback(() => save(id), [id]);
  ```
- **useRef** — "กล่องเก็บค่าที่ไม่ทำให้ re-render" หรือ "อ้างถึง DOM element"
  ```tsx
  const inputRef = useRef(null);
  <input ref={inputRef} />        // เข้าถึง element จริงผ่าน inputRef.current
  ```

> สำหรับเคน: 2 ตัวนี้ "อ่านให้เข้าใจ" พอ ยังไม่ต้องรีบเขียนเอง เจอเมื่อไหร่รู้ว่ามันคืออะไร

---

## 7. ฟอร์ม: "controlled input" (แพตเทิร์นหลักของระบบ)

ช่องกรอกใน React ผูกกับ state เสมอ เรียกว่า "controlled" — state เป็นเจ้าของค่า
ของจริงจาก `time/corrections/page.tsx`:
```tsx
const [reason, setReason] = useState('');

<Textarea
  value={reason}                              // ค่าที่แสดง = state
  onChange={(e) => setReason(e.target.value)} // พิมพ์ → อัปเดต state → จอวาดใหม่ → เห็นที่พิมพ์
/>
```
วงจร: พิมพ์ → `onChange` → `setReason` → re-render → `value` ใหม่ขึ้นจอ
> ถ้าลืม `onChange` → พิมพ์แล้วช่องไม่ขึ้นอะไร (เพราะ value ถูกล็อกที่ state ที่ไม่เปลี่ยน) — กับดักคลาสสิก

---

## 8. การแสดงผลแบบมีเงื่อนไข (conditional rendering)

3 แบบที่เจอทั่วระบบ:
```tsx
{/* แบบ ternary: ถ้า-ไม่งั้น */}
{revealed ? <span>{value}</span> : <span>•••</span>}

{/* แบบ &&: "ถ้าจริงค่อยแสดง" (ถ้าเท็จ ไม่แสดงอะไร) */}
{count > 0 && <Button>เผยข้อมูล</Button>}

{/* แบบ early return: ทั้งบล็อก */}
if (count === 0) {
  return <EmptyState ... />;     // ไม่มีข้อมูล → แสดงจอว่าง จบเลย
}
return <DataTable ... />;        // มีข้อมูล → แสดงตาราง
```
ของจริง `payroll-summary` ใช้ทั้ง 3 แบบ (mask ด้วย ternary, ปุ่มเผยด้วย `&&`, จอว่างด้วย early return)

> ⚠️ ระวัง `&&` กับตัวเลข: `{count && <X/>}` ถ้า count เป็น 0 จะโชว์ "0" บนจอ!
> ใช้ `{count > 0 && <X/>}` ให้เป็น boolean ชัดๆ เสมอ

---

## 9. ลิสต์ + key (ทบทวน — จุดที่ทำพังบ่อยสุด)

```tsx
{employees.map((emp) => <Row key={emp.id} emp={emp} />)}
```
- ทุกตัวใน `.map()` ต้องมี `key` ที่ **ไม่ซ้ำกัน** (นิยม `id`)
- ห้ามใช้ค่าที่ซ้ำได้ (เช่น label/ชื่อ) เป็น key
- ถ้าไม่มี id จริง และลิสต์ static ไม่สลับลำดับ → ใช้ index (`(x, i) => ... key={i}`) ได้

> 🐛 bug จริงในระบบนี้: `FieldCard` เคยใช้ `key={label}` แต่ label ซ้ำข้าม section → React เตือน
> แก้เป็น `key={index}` (ดูเคสเต็มใน [บท 08 สูตร 5](./08-maintenance-recipes.md))
> นี่คือเหตุผลที่ key สำคัญ — มันคือ "บัตรประจำตัว" ที่ React ใช้จำว่าแถวไหนเป็นแถวไหน

---

## 10. Custom hooks — "ฟังก์ชัน use... ที่เราเขียนเอง"

ระบบนี้มี custom hook เยอะมาก (`useEmployee`, `useLeave`, `useManagerDashboard`, `useCapabilities`, ...)
มันคือ **ฟังก์ชันที่ห่อ logic/ข้อมูลไว้ใช้ซ้ำ** ชื่อขึ้นต้น `use` เสมอ

```tsx
// แทนที่จะดึงข้อมูลพนักงานเองทุกหน้า เรียก hook สำเร็จรูป:
const employee = useEmployee(empId);    // ห่อการอ่าน store/mock ไว้ให้แล้ว
const { capabilities } = useCapabilities();
```

ข้อดี: หน้าจอสะอาด ไม่ต้องรู้ว่าข้อมูลมาจากไหน — แค่เรียก hook
> เวลาเจอ `useXxx` ที่ไม่ใช่ของ React มาตรฐาน → มันคือ custom hook ของเรา หาไฟล์มันด้วย `grep -rn "export function useXxx" src/`

---

## 11. ⭐ กฎของ Hooks (Rules of Hooks) — ห้ามฝ่าฝืน

`useState`, `useEffect`, `useMemo`, ... (อะไรที่ขึ้นต้น `use`) มีกฎเหล็ก 2 ข้อ:

1. **เรียกที่ "บนสุด" ของ component เท่านั้น** — ห้ามเรียกใน `if`, ใน loop, ใน nested function
   ```tsx
   if (x) { const [a] = useState(); }   // ❌ ผิดกฎ! React จะพัง/เพี้ยน
   const [a] = useState();              // ✅ บนสุดเสมอ
   if (x) { ... }                       // เงื่อนไขมาทีหลังได้
   ```
2. **เรียกใน React component หรือ custom hook เท่านั้น** (ไม่ใช่ฟังก์ชันธรรมดา)

> เหตุผล: React จำ hooks ด้วย "ลำดับการเรียก" ถ้าลำดับเปลี่ยนระหว่าง render (เพราะอยู่ใน if) ทุกอย่างเพี้ยน
> ตัว ESLint จะเตือนถ้าฝ่าฝืน — เห็น warning เรื่อง hooks ให้รีบแก้

---

## 12. การประกอบ component (composition) + `children`

component ซ้อน component ได้ และส่ง "เนื้อหาข้างใน" ผ่าน `children`:
```tsx
function Panel({ children }) {
  return <div className="humi-card">{children}</div>;
}

<Panel>
  <h3>หัวข้อ</h3>      {/* ทั้งหมดนี้คือ children ที่ส่งเข้า Panel */}
  <p>เนื้อหา</p>
</Panel>
```
ของจริง: `<Card> <Button> <FormField>` ของ Humi ทำงานแบบนี้ — เราเอาเนื้อหาใส่ข้างใน

---

## 13. กับดัก React ที่เจอบ่อยในระบบนี้ (สรุป)

| อาการ | สาเหตุ | แก้ |
|-------|--------|-----|
| พิมพ์ในช่องแล้วไม่ขึ้น | ลืม `onChange` (controlled input) | ใส่ `onChange={e => setX(e.target.value)}` |
| `useState` ใช้ไม่ได้ / error | ลืม `'use client'` บนหัวไฟล์ | เติม `'use client';` บรรทัดแรก |
| warning "same key" / ลิสต์เพี้ยน | key ซ้ำใน `.map()` | ใช้ key ไม่ซ้ำ (id/index) |
| จอกระพริบ/ลูปไม่จบ | `useEffect` ไม่มี/ผิด dependency array | ใส่ array ให้ถูก; ค่าคำนวณใช้ useMemo ไม่ใช่ effect |
| กดปุ่มแล้วจอไม่เปลี่ยน | แก้ state ตรงๆ ไม่ผ่าน setter / แก้ object เดิม | ใช้ `setX(...)` + สร้าง object/array ใหม่ |
| เลข 0 โผล่บนจอแปลกๆ | `{count && <X/>}` ตอน count=0 | ใช้ `{count > 0 && <X/>}` |
| ESLint เตือน hooks | เรียก hook ใน if/loop | ย้าย hook ขึ้นบนสุดของ component |

---

## สรุปบทนี้

- **UI = f(state)**: เปลี่ยน state → React วาดจอใหม่ (ไม่สั่งจอตรงๆ)
- component re-render เมื่อ state/props เปลี่ยน → ทั้งฟังก์ชันรันซ้ำ (ค่าที่ต้องจำเก็บใน useState)
- `useState`: ผ่าน setter เสมอ, ใช้ updater `(prev)=>...`, object/array สร้างใหม่ด้วย `...`
- ค่าที่คำนวณจาก state → ตัวแปรธรรมดา/`useMemo` (ไม่ใช่ effect)
- `useEffect` = ติดต่อโลกนอก React (localStorage/timer/redirect) + dependency array + cleanup
- ฟอร์ม = controlled input (`value` + `onChange`)
- ลิสต์ = `.map()` + key ไม่ซ้ำ
- custom hook (`useEmployee`, ...) = logic/data ห่อไว้ใช้ซ้ำ
- กฎ hooks: เรียกบนสุดเท่านั้น

**ต่อไป →** [บท 03: แผนที่โครงสร้างโปรเจกต์](./03-project-map.md)
