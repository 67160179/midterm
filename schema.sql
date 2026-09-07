-- สร้างฐานข้อมูลชื่อ student_api ถ้ายังไม่มีอยู่แล้ว (ป้องกัน error ถ้ามีอยู่แล้ว)
CREATE DATABASE IF NOT EXISTS student_api;

-- เลือกใช้งานฐานข้อมูล student_api ที่เพิ่งสร้าง
USE student_api;

-- ตาราง students เก็บข้อมูลนักเรียน/นักศึกษา
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,       -- รหัสนักเรียน เพิ่มอัตโนมัติ, เป็น Primary Key ของตาราง
  name VARCHAR(100) NOT NULL,              -- ชื่อนักเรียน ห้ามเป็นค่าว่าง
  major VARCHAR(100) NOT NULL,             -- สาขาวิชา/major ห้ามเป็นค่าว่าง
  email VARCHAR(100) NOT NULL UNIQUE,      -- อีเมล ห้ามซ้ำกันในตาราง (UNIQUE) และห้ามว่าง
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- วันเวลาที่สร้างข้อมูล ถ้าไม่ระบุจะใส่เวลาปัจจุบันให้อัตโนมัติ
);

-- ตาราง courses เก็บข้อมูลรายวิชาที่เปิดสอน
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,       -- รหัสวิชา เพิ่มอัตโนมัติ, เป็น Primary Key
  course_name VARCHAR(150) NOT NULL,       -- ชื่อวิชา ห้ามว่าง
  credit INT NOT NULL,                     -- จำนวนหน่วยกิต ห้ามว่าง
  seat_available INT NOT NULL DEFAULT 30   -- จำนวนที่นั่งที่เหลือ ถ้าไม่ระบุจะตั้งค่าเริ่มต้นเป็น 30
);

-- ตาราง enrollments เก็บข้อมูลการลงทะเบียนเรียน (เชื่อมระหว่าง students กับ courses)
-- เป็นตารางกลาง (junction table) สำหรับความสัมพันธ์แบบ many-to-many
CREATE TABLE enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,       -- รหัสการลงทะเบียน เพิ่มอัตโนมัติ, เป็น Primary Key

  student_id INT NOT NULL,                 -- รหัสนักเรียนที่ลงทะเบียน (Foreign Key อ้างถึง students.id)
  course_id INT NOT NULL,                  -- รหัสวิชาที่ถูกลงทะเบียน (Foreign Key อ้างถึง courses.id)

  -- กำหนดว่า student_id ต้องอ้างอิงกับ id ในตาราง students
  -- ถ้าลบนักเรียนคนนั้นออก ข้อมูลการลงทะเบียนที่เกี่ยวข้องจะถูกลบตามไปด้วย (CASCADE)
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,

  -- กำหนดว่า course_id ต้องอ้างอิงกับ id ในตาราง courses
  -- ถ้าลบวิชานั้นออก ข้อมูลการลงทะเบียนที่เกี่ยวข้องจะถูกลบตามไปด้วย (CASCADE)
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,

  -- ป้องกันไม่ให้นักเรียนคนเดียวกันลงทะเบียนวิชาเดียวกันซ้ำสองครั้ง
  -- โดยบังคับให้คู่ (student_id, course_id) ต้องไม่ซ้ำกันในตาราง
  UNIQUE KEY unique_enrollment (student_id, course_id)
);