# URI Schema — student-api (67160179)

โปรเจกต์ `student-api` ปรับปรุงตามปฏิบัติการสัปดาห์ที่ 3 (wk03-lab.md)
ต่อยอดจากสัปดาห์ที่ 1 (CRUD พื้นฐาน) และสัปดาห์ที่ 2 (email/phone/courses + GraphQL)

## REST API (`/api/v1`)

| Method | URI | คำอธิบาย | Status Code ที่เป็นไปได้ |
|---|---|---|---|
| GET | `/api/v1/students` | ดึงรายชื่อนักศึกษาทั้งหมด | 200 |
| GET | `/api/v1/students/{id}` | ดึงข้อมูลนักศึกษารายบุคคล (รองรับ `?include=courses` เพื่อแนบข้อมูลรายวิชา) | 200, 404 |
| POST | `/api/v1/students` | เพิ่มนักศึกษาใหม่ | 201, 400, 409 |
| PUT | `/api/v1/students/{id}` | แก้ไขข้อมูลนักศึกษาทั้งระเบียน (ต้องส่งครบทุกฟิลด์บังคับ) | 200, 400, 404 |
| PATCH | `/api/v1/students/{id}` | แก้ไขข้อมูลนักศึกษาบางส่วน (ฟิลด์ที่ไม่ส่งมาคงค่าเดิม) | 200, 404 |
| DELETE | `/api/v1/students/{id}` | ลบนักศึกษา | 200, 404 |

## GraphQL (`/graphql`)

Endpoint เดียว รองรับทั้ง Query และ Mutation (ต่อยอดจากสัปดาห์ที่ 2) — ไม่อยู่ภายใต้หลักการตั้งชื่อ URI แบบ REST เนื่องจากเป็นคนละสถาปัตยกรรม แต่บันทึกไว้เพื่อความครบถ้วนของ schema ทั้งโปรเจกต์

| Method | URI | คำอธิบาย |
|---|---|---|
| POST | `/graphql` | รับ Query/Mutation ทั้งหมด (student, students, createStudent, updateStudent, deleteStudent ฯลฯ) |

## บันทึกการเปลี่ยนแปลงจากสัปดาห์ก่อนหน้า (Changelog)

| จุดที่แก้ไข | ก่อนแก้ | หลังแก้ | เหตุผล |
|---|---|---|---|
| `POST /api/v1/students` เมื่อ email ซ้ำ | ตอบ 400 | ตอบ **409 Conflict** | 400 ควรใช้กับข้อมูลที่ผิดรูปแบบ/ไม่ครบ ส่วน 409 สื่อถึงข้อมูลขัดแย้งกับสถานะปัจจุบันของระบบ (email ซ้ำ) ตรงกว่า |
| ดึงข้อมูลพร้อมรายวิชา | `GET /api/v1/students/:id/full` | `GET /api/v1/students/:id?include=courses` | คำว่า `full` ไม่ใช่คำนามที่สื่อถึง resource และไม่ใช่แนวทาง RESTful — ควรใช้ query parameter แทนการสร้าง path ใหม่สำหรับ "มุมมอง" ของ resource เดิม |
| แก้ไขข้อมูลบางส่วน | ไม่มี endpoint | เพิ่ม `PATCH /api/v1/students/:id` | เดิมมีแค่ PUT ซึ่งบังคับส่งข้อมูลครบทุกฟิลด์ ทำให้ client ที่ต้องการแก้แค่บางฟิลด์ต้องดึงข้อมูลเดิมมาก่อนเสมอ PATCH แก้ปัญหานี้ |
| Error response | รูปแบบไม่คงที่ในแต่ละ route | รวมศูนย์ผ่านฟังก์ชัน `sendError(res, statusCode, code, message)` | ให้ error response มีโครงสร้างเดียวกันทุก endpoint (`{ error: { code, message } }`) |
| `POST /api/v1/students` | ตัวแปร `nextId` ไม่ได้ประกาศไว้ (บั๊กจากสัปดาห์ที่ 2 ทำให้ route พังเมื่อเรียกใช้จริง) | ประกาศ `let nextId = 3;` ก่อนใช้งาน | เป็น bug fix ที่จำเป็นก่อนทดสอบ endpoint อื่น |
| `PUT` / `DELETE` | หายไปจากสัปดาห์ที่ 2 (มีเฉพาะในสัปดาห์ที่ 1) | กู้คืนและปรับให้ใช้ฟิลด์ email/phone/courseIds ที่เพิ่มมาในสัปดาห์ที่ 2 | ต้องคงคุณสมบัติ RESTful ครบตาม CRUD เดิม |

## หมายเหตุด้าน Idempotency (สำหรับแบบฝึกหัดต่อยอดที่ 3)

- `PUT /api/v1/students/:id` และ `DELETE /api/v1/students/:id` เป็น **idempotent**: เรียกซ้ำด้วยข้อมูล/พารามิเตอร์เดิมกี่ครั้ง ผลลัพธ์สุดท้ายในระบบจะเหมือนเดิม (ครั้งที่ 2 เป็นต้นไปของ DELETE จะตอบ 404 แต่สถานะข้อมูลในระบบไม่เปลี่ยนแปลงเพิ่มเติม)
- `POST /api/v1/students` **ไม่ idempotent**: เรียกซ้ำด้วย payload เดิมจะสร้างระเบียนใหม่ทุกครั้ง (คนละ id) ยกเว้นจะถูกกันด้วยเงื่อนไข unique email ที่ทำให้ครั้งถัดไปตอบ 409 แทน
