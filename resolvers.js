// ===== Mock Data (ข้อมูลจำลอง เก็บไว้ใน memory ยังไม่ได้ต่อฐานข้อมูลจริง) =====
// ตัวแปร students เก็บรายชื่อนักเรียนแบบ array of object
// ใช้ let เพราะข้อมูลจะถูกแก้ไข/เพิ่ม/ลบได้ตอน runtime (createStudent, updateStudent, deleteStudent)
let students = [
    {
        id: 1,
        name: "สมชาย ใจดี",
        major: "วิทยาการคอมพิวเตอร์",
        email: "somchai@example.com",
        phone: "080-000-0001",
        courseIds: [101, 102],   // เก็บแค่ "รหัสวิชา" ที่ลงทะเบียนไว้ ไม่ได้เก็บข้อมูลวิชาเต็มๆ (เหมือนเก็บ foreign key)
    },
    {
        id: 2,
        name: "สมหญิง รักเรียน",
        major: "เทคโนโลยีสารสนเทศ",
        email: "somying@example.com",
        phone: "080-000-0002",
        courseIds: [102],
    },
];

// ตัวแปร courses เก็บรายวิชาทั้งหมดที่มีในระบบ
let courses = [
    { id: 101, courseName: "การเขียนโปรแกรมเบื้องต้น", credit: 3 },
    { id: 102, courseName: "โครงสร้างข้อมูล", credit: 3 },
];

// ตัวนับ id ถัดไปสำหรับนักเรียนคนใหม่ที่จะถูกสร้าง (จำลองการทำงานแบบ AUTO_INCREMENT ของฐานข้อมูลจริง)
let nextStudentId = 3;

// ===== Helper Function =====
// ฟังก์ชันนี้ทำหน้าที่ "แปลง" ข้อมูลนักเรียนดิบ (ที่มีแค่ courseIds)
// ให้กลายเป็นรูปแบบที่ตรงกับ GraphQL type Student ซึ่งต้องการ field "courses" เป็น array ของ object วิชาเต็มๆ
// โดยดึงจาก courses ที่มี id ตรงกับใน courseIds ของนักเรียนคนนั้น
function resolveStudent(student) {
    return {
        ...student, // คัดลอกฟิลด์เดิมทั้งหมดของ student (id, name, major, email, phone, courseIds)
        courses: courses.filter((c) => student.courseIds.includes(c.id)), // เพิ่มฟิลด์ courses แบบ join ข้อมูลจาก courseIds
    };
}

// ===== Root Resolver =====
// object root นี้คือ "resolver" ของ GraphQL — แต่ละ key ต้องตรงกับชื่อ field ใน Query/Mutation ของ schema
// เมื่อ client ยิง query/mutation เข้ามา ฟังก์ชันที่ชื่อตรงกันในนี้จะถูกเรียกให้ทำงาน
const root = {
    // ----- Read (ส่วนของ Query resolver) -----

    // ดึงนักเรียน 1 คนตาม id
    student: ({ id }) => {
        const student = students.find((s) => s.id === Number(id)); 
        // id ที่ client ส่งมาจาก GraphQL เป็น string เสมอ (type ID!) จึงต้องแปลงเป็น Number ก่อนเทียบ
        return student ? resolveStudent(student) : null; // ถ้าไม่เจอคืน null (ตรงกับ schema ที่ Student ไม่มี ! ต่อท้าย)
    },

    // ดึงรายชื่อนักเรียนทั้งหมด พร้อมรองรับการกรองและเรียงลำดับ
    students: ({ major, sortBy }) => {
        let result = students;

        if (major) {
            result = result.filter((s) => s.major === major); // กรองเฉพาะนักเรียนที่ major ตรงกับที่ระบุ
        }

        if (sortBy === "name") {
            result = [...result].sort((a, b) => a.name.localeCompare(b.name)); 
            // [...result] คือการ copy array ก่อน sort เพื่อไม่ให้ไปแก้ไข array ต้นฉบับ (students) โดยตรง
            // localeCompare ใช้เปรียบเทียบข้อความแบบรองรับภาษา (เรียงตามตัวอักษรได้ถูกต้องแม้เป็นภาษาไทย)
        }

        return result.map(resolveStudent); // แปลงทุกคนให้มี field courses ก่อนส่งกลับ
    },

    // นับจำนวนนักเรียนทั้งหมด
    studentCount: () => students.length,

    // ดึงวิชา 1 วิชาตาม id
    course: ({ id }) => courses.find((c) => c.id === Number(id)) || null,

    // ดึงรายวิชาทั้งหมด กรองตามหน่วยกิตขั้นต่ำถ้ามีการระบุ
    courses: ({ minCredit }) => {
        if (minCredit === undefined || minCredit === null) {
            return courses; // ถ้าไม่ส่ง minCredit มา คืนวิชาทั้งหมดโดยไม่กรอง
        }
        return courses.filter((c) => c.credit >= minCredit);
    },

    // ค้นหานักเรียนจากคำค้น (keyword) โดยเทียบกับชื่อหรือสาขา
    searchStudents: ({ keyword }) => {
        const lowerKeyword = keyword.toLowerCase(); // แปลงเป็นตัวพิมพ์เล็กเพื่อค้นหาแบบไม่สนตัวพิมพ์เล็ก-ใหญ่
        return students
            .filter(
                (s) =>
                    s.name.toLowerCase().includes(lowerKeyword) ||
                    s.major.toLowerCase().includes(lowerKeyword),
            )
            .map(resolveStudent);
    },

    // ----- Create (ส่วนของ Mutation resolver) -----
    createStudent: ({ input }) => {
        const newStudent = {
            id: nextStudentId++,        // ใช้ id ปัจจุบันแล้วค่อยเพิ่มค่าไปอีก 1 สำหรับคนถัดไป (post-increment)
            name: input.name,
            major: input.major,
            email: input.email,
            phone: input.phone,
            courseIds: (input.courseIds || []).map(Number), 
            // ถ้าไม่ส่ง courseIds มาให้เป็น array ว่างแทน (ป้องกัน error ตอนเรียก .map)
            // แปลงแต่ละ id เป็น Number เพราะ ID จาก GraphQL เป็น string
        };
        students.push(newStudent);       // เพิ่มนักเรียนใหม่เข้าไปใน array students (mock database)
        return resolveStudent(newStudent); // คืนค่ากลับพร้อมข้อมูล courses ที่ join แล้ว
    },

    // ----- Update -----
    updateStudent: ({ id, input }) => {
        const student = students.find((s) => s.id === Number(id));

        if (!student) {
            return null; // ถ้าไม่เจอนักเรียนตาม id ที่ส่งมา คืน null (ตรงกับ schema)
        }

        // อัปเดตเฉพาะฟิลด์ที่ client ส่งมาเท่านั้น (partial update)
        // เช็คด้วย !== undefined เพื่อแยกแยะระหว่าง "ไม่ได้ส่งมา" กับ "ส่งมาเป็นค่าว่าง/false/0"
        if (input.name !== undefined) student.name = input.name;
        if (input.major !== undefined) student.major = input.major;
        if (input.email !== undefined) student.email = input.email;
        if (input.phone !== undefined) student.phone = input.phone;
        if (input.courseIds !== undefined) {
            student.courseIds = input.courseIds.map(Number);
        }

        return resolveStudent(student); // คืนข้อมูลนักเรียนที่อัปเดตแล้ว
    },

    // ----- Delete -----
    deleteStudent: ({ id }) => {
        const index = students.findIndex((s) => s.id === Number(id));

        if (index === -1) {
            // ไม่เจอนักเรียนที่จะลบ คืนผลลัพธ์ว่าไม่สำเร็จ พร้อมข้อความแจ้งเตือน
            return { success: false, message: "ไม่พบข้อมูลนักศึกษาที่ต้องการลบ" };
        }

        students.splice(index, 1); // ลบนักเรียนออกจาก array ที่ตำแหน่ง index ที่เจอ จำนวน 1 ตัว
        return { success: true, message: "ลบข้อมูลนักศึกษาสำเร็จ" };
    },
};

module.exports = root; // export resolver นี้ให้ไฟล์ server นำไปใช้คู่กับ schema ตอนสร้าง GraphQL server