// โหลดค่าตัวแปรจากไฟล์ .env (เช่น PORT, DB config, JWT secret) เข้ามาใน process.env
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");       // middleware เสริมความปลอดภัย ตั้งค่า HTTP headers ต่างๆ ให้อัตโนมัติ (ป้องกันการโจมตีพื้นฐาน)
const cors = require("cors");            // middleware จัดการ Cross-Origin Resource Sharing (อนุญาต/บล็อก domain ที่เรียก API นี้ได้)
const morgan = require("morgan");        // middleware สำหรับ log คำขอ HTTP (method, path, status, เวลาที่ใช้) ลง console
const { graphqlHTTP } = require("express-graphql"); // ตัวเชื่อม GraphQL เข้ากับ Express (import ไว้แต่ยังไม่เห็นถูกนำไปใช้ mount ในไฟล์นี้)

const schema = require("./schema");      // GraphQL schema ที่สร้างไว้ก่อนหน้า
const root = require("./resolvers");     // GraphQL resolver ที่สร้างไว้ก่อนหน้า
const pool = require("./db");            // connection pool สำหรับเชื่อมต่อฐานข้อมูล MySQL (ใช้ query จริงแทน mock array)

const {
  hashPassword,     // ฟังก์ชันเข้ารหัสรหัสผ่านก่อนเก็บลง DB (เช่นใช้ bcrypt)
  verifyPassword,   // ฟังก์ชันตรวจสอบรหัสผ่านที่ผู้ใช้กรอก เทียบกับ hash ที่เก็บไว้
  generateToken,    // ฟังก์ชันสร้าง JWT token หลัง login สำเร็จ
} = require("./auth-helpers");

const { authenticateToken, authorizeRole } = require("./middlewares/auth");
// authenticateToken: middleware ตรวจสอบว่า request มี token ที่ถูกต้องหรือไม่ (ยืนยันตัวตน)
// authorizeRole: middleware ตรวจสอบว่า user มีสิทธิ์ (role) ตามที่กำหนดหรือไม่ (เช่นต้องเป็น admin)

const app = express();
const PORT = process.env.PORT || 3000; // ใช้ PORT จาก .env ถ้าไม่มีให้ใช้ 3000 เป็นค่าเริ่มต้น

// ===== Global Middlewares (ทำงานกับทุก request ที่เข้ามา) =====
app.use(helmet()); // เปิดใช้ security headers พื้นฐาน

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN, // อนุญาตเฉพาะ origin ที่กำหนดใน .env เท่านั้นที่เรียก API นี้ได้ (ไม่เปิดกว้างให้ทุกที่)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // HTTP method ที่อนุญาตให้เรียกข้าม origin ได้
  })
);

app.use(morgan("dev")); // log ทุก request แบบย่อ (method, path, status, response time) เหมาะกับตอน dev

app.use(express.json({ limit: "10kb" })); // แปลง request body ที่เป็น JSON ให้ใช้งานผ่าน req.body ได้ จำกัดขนาดไม่เกิน 10kb (ป้องกัน payload ใหญ่เกินไป)

app.use(express.json());
// ⚠️ มีการเรียก express.json() ซ้ำอีกครั้งโดยไม่จำกัด limit — บรรทัดนี้ทำงานซ้ำซ้อนกับบรรทัดด้านบน ไม่จำเป็นและอาจทำให้ limit 10kb ที่ตั้งไว้ไม่มีผลจริง

// ===== Mock Data ที่หลงเหลืออยู่ =====
// courses ตัวนี้เป็น array ในหน่วยความจำ ใช้ในบาง route เก่า (เช่น PUT/PATCH students) ที่ยังไม่ได้ย้ายไปใช้ pool (MySQL) จริง
let courses = [
    { id: 101, courseName: "การเขียนโปรแกรมเบื้องต้น", credit: 3 },
    { id: 102, courseName: "โครงสร้างข้อมูล", credit: 3 },
];
// ⚠️ สังเกตว่าตัวแปรนี้ประกาศไว้แต่ไม่ได้ถูกใช้งานที่ไหนในไฟล์นี้เลย (dead code)
// และตัวแปร students (ที่ใช้ในหลาย route ด้านล่าง) ก็ไม่เห็นถูกประกาศไว้ในไฟล์นี้ — น่าจะเป็นร่องรอยของการ refactor จาก mock data ไปเป็น MySQL แต่ทำไม่ครบทุก route

// เส้นทางทดสอบว่า API ทำงานอยู่หรือไม่
app.get("/", (req, res) => {
    res.status(200).json({ message: "Student API พร้อมใช้งาน" });
});

// ----- ดึงรายชื่อนักศึกษาทั้งหมด (ใช้ MySQL จริงผ่าน pool) -----
app.get("/api/v1/students", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students");
    res.status(200).json({ message: "สำเร็จ", data: rows });
  } catch (err) {
    next(err); // ส่ง error ต่อไปให้ error-handling middleware ท้ายไฟล์จัดการ
  }
});

// ----- ดึงนักศึกษา 1 คนตาม id -----
app.get("/api/v1/students/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);
    // ใช้ placeholder (?) แทนการต่อ string โดยตรง เพื่อป้องกัน SQL Injection

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนิสิต" },
      });
    }

    res.status(200).json({ message: "สำเร็จ", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ----- เพิ่มนักศึกษาใหม่ -----
app.post("/api/v1/students", async (req, res, next) => {
  const { name, major, email } = req.body;

  if (!name || !major || !email) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "กรุณาระบุข้อมูลให้ครบถ้วน" },
    });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO students (name, major, email) VALUES (?, ?, ?)",
      [name, major, email],
    );
    res.status(201).json({
      message: "เพิ่มข้อมูลสำเร็จ",
      data: { id: result.insertId, name, major, email }, // insertId คือ id ที่ MySQL สร้างให้อัตโนมัติ (AUTO_INCREMENT)
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      // error code นี้เกิดจากการชนกับ UNIQUE constraint ในตาราง (เช่น email ซ้ำ)
      return res.status(409).json({
        error: { code: "DUPLICATE_EMAIL", message: "อีเมลนี้มีอยู่ในระบบแล้ว" },
      });
    }
    next(err);
  }
});

// ----- สมัครสมาชิก (สร้าง user สำหรับ login) -----
app.post("/api/v1/auth/register", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ email และ password",
      },
    });
  }

  try {
    const passwordHash = await hashPassword(password); // เข้ารหัส password ก่อนเก็บ ไม่เก็บ plain text เด็ดขาด
    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'student')",
      [email, passwordHash],
    );
    // ผู้ใช้ที่สมัครใหม่ทุกคนจะได้ role เป็น 'student' โดย default (hardcode ไว้ในคำสั่ง SQL)

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      data: { id: result.insertId, email, role: "student" },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: { code: "DUPLICATE_EMAIL", message: "อีเมลนี้มีอยู่ในระบบแล้ว" },
      });
    }
    next(err);
  }
});

// ----- เข้าสู่ระบบ -----
app.post("/api/v1/auth/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ email และ password",
      },
    });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      // ไม่บอกตรงๆ ว่า "ไม่พบอีเมล" เพื่อความปลอดภัย (ป้องกันคนสุ่มเช็คว่าอีเมลไหนมีในระบบบ้าง)
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const user = rows[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    // เทียบ password ที่ผู้ใช้กรอกกับ hash ที่เก็บไว้ (ไม่มีการเทียบ plain text ตรงๆ)

    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const token = generateToken(user); // ออก JWT token ให้ผู้ใช้ที่ login สำเร็จ ใช้แนบไปกับ request ถัดๆ ไปแทนการ login ซ้ำ
    res.status(200).json({ message: "เข้าสู่ระบบสำเร็จ", token });
  } catch (err) {
    next(err);
  }
});

// ----- ลงทะเบียนเรียนวิชา (มีการจัดการ transaction เพราะต้องแก้ 2 ตารางพร้อมกันแบบ atomic) -----
app.post("/api/v1/students/:id/enrollments", async (req, res, next) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  const connection = await pool.getConnection();
  // ดึง connection เดี่ยวออกมาจาก pool เพื่อควบคุม transaction เอง (query ปกติผ่าน pool.query จะสุ่มใช้คนละ connection กัน ทำ transaction ไม่ได้)

  try {
    await connection.beginTransaction(); // เริ่ม transaction

    const [courseRows] = await connection.query(
      "SELECT * FROM courses WHERE id = ? FOR UPDATE",
      [courseId],
    );
    // FOR UPDATE คือการ "ล็อกแถวนี้ไว้" ชั่วคราว กันไม่ให้ request อื่นมาแก้ seat_available พร้อมกัน (ป้องกัน race condition ตอนที่นั่งเหลือน้อย)

    if (courseRows.length === 0) {
      await connection.rollback(); // ยกเลิก transaction ทั้งหมดถ้าไม่พบวิชา
      return res.status(404).json({
        error: { code: "COURSE_NOT_FOUND", message: "ไม่พบรายวิชาที่ระบุ" },
      });
    }

    if (courseRows[0].seat_available <= 0) {
      await connection.rollback(); // ที่นั่งเต็ม ยกเลิก transaction เช่นกัน
      return res.status(409).json({
        error: { code: "SEAT_FULL", message: "ที่นั่งเต็มแล้ว" },
      });
    }

    // เพิ่มแถวการลงทะเบียนใหม่
    await connection.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, courseId],
    );

    // ลดจำนวนที่นั่งที่เหลือลง 1
    await connection.query(
      "UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?",
      [courseId],
    );

    await connection.commit(); // ยืนยันการเปลี่ยนแปลงทั้งหมดพร้อมกัน (ถ้าถึงจุดนี้ได้แปลว่าทั้ง insert และ update สำเร็จทั้งคู่)
    res.status(201).json({ message: "ลงทะเบียนสำเร็จ" });
  } catch (err) {
    await connection.rollback(); // ถ้ามี error เกิดขึ้นระหว่างทาง ย้อนกลับทุกอย่างที่ทำไปแล้วใน transaction นี้ ไม่ให้ข้อมูลครึ่งๆ กลางๆ
    if (err.code === "ER_DUP_ENTRY") {
      // ชนกับ UNIQUE KEY unique_enrollment (student_id, course_id) ที่ตั้งไว้ในตาราง แปลว่าลงทะเบียนวิชานี้ไปแล้ว
      return res.status(409).json({
        error: {
          code: "ALREADY_ENROLLED",
          message: "นิสิตลงทะเบียนรายวิชานี้ไปแล้ว",
        },
      });
    }
    next(err);
  } finally {
    connection.release(); // คืน connection กลับเข้า pool เสมอ ไม่ว่าจะสำเร็จหรือ error (ป้องกัน connection รั่วไหลจนหมด pool)
  }
});

// ----- แก้ไขข้อมูลนักศึกษาแบบเต็ม (PUT) -----
// ⚠️ route นี้ยังใช้ตัวแปร students แบบ in-memory (ไม่ได้ query MySQL) และไม่ใช่ async/await เหมือน route อื่นด้านบน
// ทั้งที่ students ไม่ได้ถูกประกาศไว้ในไฟล์นี้เลย รันจริงจะเกิด ReferenceError: students is not defined
app.put("/api/v1/students/:id", (req, res) => {
    const id = Number(req.params.id);
    const { name, major, email, phone, courseIds } = req.body;
    const student = students.find((s) => s.id === id);

    if (!student) {
        return sendError(res, 404, "NOT_FOUND", "ไม่พบข้อมูลนักศึกษา");
        // ⚠️ ฟังก์ชัน sendError ไม่ได้ถูกประกาศ/import ไว้ในไฟล์นี้เลย จะเกิด ReferenceError เช่นกันถ้าโค้ดมาถึงบรรทัดนี้
    }

    if (!name || !major || !email) {
        return sendError(
            res,
            400,
            "VALIDATION_ERROR",
            "กรุณาระบุ name, major และ email ให้ครบถ้วน",
        );
    }

    // แทนที่ข้อมูลเดิมทั้งหมดด้วยข้อมูลใหม่ (PUT = replace ทั้ง resource)
    student.name = name;
    student.major = major;
    student.email = email;
    student.phone = phone || "";
    student.courseIds = Array.isArray(courseIds) ? courseIds.map(Number) : [];

    res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: student });
});

// ----- แก้ไขข้อมูลนักศึกษาแบบบางส่วน (PATCH) -----
// มีปัญหาเดียวกับ route PUT ด้านบน: ใช้ students ที่ไม่ได้ประกาศไว้
app.patch("/api/v1/students/:id", (req, res) => {
    const id = Number(req.params.id);
    const student = students.find((s) => s.id === id);

    if (!student) {
        return sendError(res, 404, "NOT_FOUND", "ไม่พบข้อมูลนักศึกษา");
    }

    const { name, major, email, phone, courseIds } = req.body;

    // อัปเดตเฉพาะฟิลด์ที่ส่งมา (partial update) ต่างจาก PUT ที่บังคับส่งครบทุกฟิลด์
    if (name !== undefined) student.name = name;
    if (major !== undefined) student.major = major;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (courseIds !== undefined) student.courseIds = courseIds.map(Number);

    res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: student });
});

// ----- ลบนักศึกษา (เฉพาะ admin เท่านั้น) -----
app.delete(
  "/api/v1/students/:id",
  authenticateToken,      // ต้อง login ก่อน (มี token ที่ถูกต้อง)
  authorizeRole("admin"), // และต้องมี role เป็น admin เท่านั้นถึงจะลบได้
  async (req, res, next) => {
    try {
      const [result] = await pool.query("DELETE FROM students WHERE id = ?", [
        req.params.id,
      ]);
      if (result.affectedRows === 0) {
        // affectedRows = 0 หมายถึงไม่มีแถวไหนถูกลบ (ไม่พบ id นี้)
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนิสิต" },
        });
      }
      res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });
    } catch (err) {
      next(err);
    }
  },
);

// ----- ดูข้อมูลตัวเอง (ต้อง login ก่อน) -----
app.get("/api/v1/auth/me", authenticateToken, (req, res) => {
  // authenticateToken ทำหน้าที่ decode token แล้วแนบข้อมูลผู้ใช้ไว้ที่ req.user ให้ route นี้ใช้ต่อได้เลย
  res.status(200).json({ message: "สำเร็จ", data: req.user });
});

// ----- Catch-all: ดักทุก route ที่ไม่ตรงกับที่ประกาศไว้ด้านบน (ต้องอยู่หลังสุดก่อน error handler) -----
app.use((req, res) => {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "ไม่พบเส้นทางที่ร้องขอ" },
  });
});

// ----- Global Error Handler (middleware 4 พารามิเตอร์ = Express รู้ว่านี่คือ error handler โดยเฉพาะ) -----
app.use((err, req, res, next) => {
  console.error(err.stack); // log stack trace ไว้ฝั่ง server เพื่อ debug (ไม่ส่งกลับไปให้ client เห็น เพื่อความปลอดภัย)
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : err.type || "ERROR",
      // ถ้าเป็น error 500 (ไม่คาดคิด) จะไม่ส่งรายละเอียดจริงกลับไป กันข้อมูลภายในระบบรั่วไหล
      message: statusCode === 500 ? "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ" : err.message,
    },
  });
});

// เริ่มรัน server ที่ port ที่กำหนด
app.listen(PORT, () => {
  console.log(`Server กำลังทำงานที่พอร์ต ${PORT} (${process.env.NODE_ENV})`);
});