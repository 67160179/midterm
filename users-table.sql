-- เลือกใช้งานฐานข้อมูล student_api
USE student_api;

-- ตาราง users เก็บข้อมูลบัญชีผู้ใช้สำหรับระบบ login/authentication
-- แยกออกจากตาราง students โดยเจตนา: students เก็บ "ข้อมูลนักศึกษา" ส่วน users เก็บ "บัญชีสำหรับเข้าสู่ระบบ"
-- ทำให้รองรับกรณีมี role อื่นที่ไม่ใช่นักศึกษา (เช่น admin) ได้โดยไม่ต้องยัดข้อมูล login ปนกับข้อมูลนักศึกษา
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,        -- รหัสผู้ใช้ เพิ่มอัตโนมัติ, เป็น Primary Key

  email VARCHAR(100) NOT NULL UNIQUE,       -- อีเมลสำหรับ login ห้ามซ้ำกัน (ใช้เป็น username โดยพฤตินัย) และห้ามว่าง

  password_hash VARCHAR(255) NOT NULL,      -- เก็บรหัสผ่านที่ผ่านการ hash ด้วย bcrypt แล้วเท่านั้น (มาจาก hashPassword ในไฟล์ auth-helpers)
                                             -- ตั้งความยาวไว้ 255 ตัวอักษร เผื่อพอสำหรับความยาวของ bcrypt hash (ปกติยาวประมาณ 60 ตัวอักษร)

  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  -- ENUM จำกัดค่าที่เก็บได้ให้เป็นแค่ 'student' หรือ 'admin' เท่านั้น (ป้องกันค่าผิดเพี้ยนตั้งแต่ระดับฐานข้อมูล)
  -- ค่าเริ่มต้นเป็น 'student' สอดคล้องกับ route /api/v1/auth/register ที่ hardcode role เป็น 'student' ตอนสมัครสมาชิกใหม่
  -- การจะมี user role 'admin' ต้องเปลี่ยนค่าด้วยมือ (เช่น UPDATE ตรงๆ ใน DB) เพราะไม่มี route ไหนให้สมัครเป็น admin ได้โดยตรง

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- วันเวลาที่สร้างบัญชี ใส่ให้อัตโนมัติถ้าไม่ระบุ
);