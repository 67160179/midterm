// import ฟังก์ชัน buildSchema จากไลบรารี graphql
// ใช้สำหรับแปลง GraphQL Schema Language (เขียนเป็น string) ให้เป็น schema object ที่ใช้งานได้จริง
const { buildSchema } = require("graphql");

// สร้าง schema โดยเขียนโครงสร้างด้วย GraphQL Schema Definition Language (SDL)
const schema = buildSchema(`
  # type Course คือรูปแบบข้อมูลของ "วิชา" ที่จะส่งกลับให้ client
  type Course {
    id: ID!           # รหัสวิชา (ID! หมายถึงต้องมีค่าเสมอ ห้ามเป็น null)
    courseName: String!  # ชื่อวิชา ต้องมีค่าเสมอ
    credit: Int!          # จำนวนหน่วยกิต ต้องมีค่าเสมอ
  }

  # type Student คือรูปแบบข้อมูลของ "นักเรียน" ที่จะส่งกลับให้ client
  type Student {
    id: ID!
    name: String!
    major: String!
    email: String!
    phone: String!
    courses: [Course!]!   # รายการวิชาที่นักเรียนคนนี้ลงทะเบียน
                           # [Course!]! หมายถึง: ต้องเป็น array เสมอ (! ท้ายวงเล็บ)
                           # และสมาชิกแต่ละตัวใน array ต้องไม่เป็น null (Course!)
  }

  # type Query รวมทุก endpoint สำหรับ "อ่านข้อมูล" (read-only) ที่ client เรียกได้
  type Query {
    student(id: ID!): Student
    # ดึงนักเรียน 1 คนตาม id, ถ้าไม่เจอคืนค่า null ได้ (ไม่มี ! ต่อท้าย Student)

    students(major: String, sortBy: String): [Student!]!
    # ดึงรายชื่อนักเรียนทั้งหมด
    # รับ argument เสริม (optional) สองตัว: กรองตาม major และเรียงลำดับตาม sortBy
    # ผลลัพธ์เป็น array เสมอ (ถึงไม่มีข้อมูลก็คืน [] ไม่คืน null)

    studentCount: Int!
    # นับจำนวนนักเรียนทั้งหมด คืนค่าเป็นตัวเลข ต้องมีค่าเสมอ

    course(id: ID!): Course
    # ดึงวิชา 1 วิชาตาม id, ถ้าไม่เจอคืนค่า null ได้

    courses(minCredit: Int): [Course!]!
    # ดึงรายการวิชาทั้งหมด รับ argument เสริมสำหรับกรองวิชาที่มีหน่วยกิตขั้นต่ำ

    searchStudents(keyword: String!): [Student!]!
    # ค้นหานักเรียนด้วยคำค้น keyword (บังคับต้องส่งมา เพราะมี !)
  }

  # input type ใช้สำหรับรับข้อมูลตอน "สร้าง" นักเรียนใหม่ (ผ่าน mutation)
  # ต่างจาก type ตรงที่ input ใช้เป็น argument ขาเข้าเท่านั้น ไม่ใช่ผลลัพธ์ขาออก
  input CreateStudentInput {
    name: String!      # ต้องระบุชื่อ
    major: String!     # ต้องระบุสาขา
    email: String!     # ต้องระบุอีเมล
    phone: String!     # ต้องระบุเบอร์โทร
    courseIds: [ID!]   # รายการรหัสวิชาที่จะลงทะเบียนพร้อมกัน (ไม่บังคับ ไม่มี ! ท้าย array)
  }

  # input type ใช้สำหรับรับข้อมูลตอน "แก้ไข" ข้อมูลนักเรียน
  # ทุกฟิลด์เป็น optional หมด (ไม่มี !) เพราะการ update อาจส่งมาแค่บางฟิลด์ที่ต้องการเปลี่ยน
  input UpdateStudentInput {
    name: String
    major: String
    email: String
    phone: String
    courseIds: [ID!]
  }

  # type สำหรับผลลัพธ์การลบข้อมูล
  type DeleteResult {
    success: Boolean!   # ลบสำเร็จหรือไม่
    message: String!    # ข้อความแจ้งผลลัพธ์
  }

  # type Mutation รวมทุก endpoint สำหรับ "เขียน/แก้ไข/ลบข้อมูล" ที่ client เรียกได้
  type Mutation {
    createStudent(input: CreateStudentInput!): Student!
    # สร้างนักเรียนใหม่ ต้องส่ง input ตาม CreateStudentInput มา
    # คืนค่าเป็น Student ที่สร้างเสร็จแล้ว (ต้องมีค่าเสมอ ไม่เป็น null)

    updateStudent(id: ID!, input: UpdateStudentInput!): Student
    # แก้ไขนักเรียนตาม id ที่ระบุ ด้วยข้อมูลใน input
    # คืนค่า Student ที่อัปเดตแล้ว หรือ null ถ้าไม่เจอนักเรียนคนนั้น

    deleteStudent(id: ID!): DeleteResult!
    # ลบนักเรียนตาม id ที่ระบุ คืนค่าผลลัพธ์ว่าสำเร็จหรือไม่พร้อมข้อความ
  }
`);

// export schema นี้ออกไปให้ไฟล์อื่น (เช่น server.js) นำไปใช้ตอนสร้าง GraphQL server
module.exports = schema;