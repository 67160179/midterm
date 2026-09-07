// bcrypt: ไลบรารีสำหรับเข้ารหัส (hash) รหัสผ่านแบบทางเดียว (one-way) ปลอดภัยสำหรับเก็บลงฐานข้อมูล
const bcrypt = require("bcrypt");
// jsonwebtoken: ไลบรารีสำหรับสร้าง/ตรวจสอบ JWT ใช้คู่กับ middlewares/auth.js ที่ตรวจ token ฝั่ง route
const jwt = require("jsonwebtoken");

// จำนวนรอบ (cost factor) ที่ bcrypt ใช้ในการ "สุ่ม salt" และวนเข้ารหัสซ้ำๆ ก่อนได้ hash สุดท้าย
// ยิ่งค่ามาก ยิ่งปลอดภัยแต่ก็ยิ่งใช้เวลา/ทรัพยากรมากขึ้น (คำนวณช้าลงแบบ exponential)
// 10 คือค่ามาตรฐานที่นิยมใช้ เพราะสมดุลระหว่างความปลอดภัยกับความเร็วในการ login/register
const SALT_ROUNDS = 10;

// ===== เข้ารหัสรหัสผ่าน =====
// ใช้ตอนสมัครสมาชิก (register) ก่อนนำ password ไปเก็บลงฐานข้อมูล
// ห้ามเก็บ plain password ลง DB เด็ดขาด เพราะถ้าฐานข้อมูลรั่วไหล รหัสผ่านผู้ใช้ทุกคนจะหลุดไปด้วย
async function hashPassword(plainPassword) {
  // bcrypt.hash จะสุ่ม salt ให้อัตโนมัติในตัว (ไม่ต้องสร้าง salt แยกเอง)
  // ผลลัพธ์ที่ได้คือ string ที่มี salt ฝังอยู่ในตัวมันเองแล้ว (เอาไปใช้ verify ได้เลยโดยไม่ต้องเก็บ salt แยก)
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// ===== ตรวจสอบรหัสผ่าน =====
// ใช้ตอน login เปรียบเทียบรหัสผ่านที่ผู้ใช้กรอกเข้ามา กับ hash ที่เก็บไว้ในฐานข้อมูล
async function verifyPassword(plainPassword, hashedPassword) {
  // bcrypt.compare จะแกะ salt ออกจาก hashedPassword เอง แล้ว hash plainPassword ด้วย salt เดียวกัน
  // เพื่อเทียบผลลัพธ์ว่าตรงกันหรือไม่ — คืนค่า true/false ไม่เคย "ถอดรหัส" hash กลับมาเป็น plain text ได้จริง (เพราะ bcrypt เป็น one-way)
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// ===== สร้าง JWT Token =====
// ใช้ตอน login สำเร็จ เพื่อออก "บัตรผ่าน" ให้ client เก็บไว้แนบมากับ request ถัดๆ ไป
// แทนที่จะต้องส่ง email/password มาเทียบกับ DB ทุกครั้ง
function generateToken(user) {
  return jwt.sign(
    // payload: ข้อมูลที่ฝังไว้ใน token เพื่อให้ middleware (authenticateToken) ดึงไปใช้ได้ทันทีโดยไม่ต้อง query DB ซ้ำ
    // เลือกเฉพาะฟิลด์ที่จำเป็น (id, email, role) ไม่ใส่ข้อมูลอ่อนไหว เช่น password_hash ลงไปเด็ดขาด
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,       // secret key ใช้เซ็นลายเซ็นของ token กันคนปลอมแปลง (ต้องเก็บเป็นความลับ ห้ามหลุด)
    { expiresIn: process.env.JWT_EXPIRES_IN },  // อายุของ token เช่น "1h", "7d" — หมดเวลาแล้วต้อง login ใหม่
  );
}

// export ทั้ง 3 ฟังก์ชันให้ไฟล์อื่นเรียกใช้ (server.js เรียก hashPassword ตอน register, verifyPassword กับ generateToken ตอน login)
module.exports = { hashPassword, verifyPassword, generateToken };