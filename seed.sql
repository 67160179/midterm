-- เลือกใช้งานฐานข้อมูล student_api (ต้องรันหลังจากที่สร้างตารางไว้แล้วเท่านั้น)
USE student_api;

-- เพิ่มข้อมูลนักศึกษาตัวอย่าง 2 คนลงในตาราง students
-- ไม่ได้ระบุค่า id เพราะเป็น AUTO_INCREMENT จะได้ id = 1 และ 2 ตามลำดับที่ insert
-- ไม่ได้ระบุ created_at เพราะมี DEFAULT CURRENT_TIMESTAMP กำหนดไว้ให้อัตโนมัติอยู่แล้ว
INSERT INTO students (name, major, email) VALUES
  ('สมชาย ใจดี', 'วิทยาการคอมพิวเตอร์', 'somchai@example.com'),   -- จะได้ id = 1
  ('สมหญิง รักเรียน', 'เทคโนโลยีสารสนเทศ', 'somying@example.com'); -- จะได้ id = 2

-- เพิ่มข้อมูลรายวิชาตัวอย่าง 2 วิชาลงในตาราง courses
-- ระบุ seat_available ตรงๆ แทนการปล่อยให้ใช้ค่า DEFAULT 30 ที่ตั้งไว้ในตาราง
INSERT INTO courses (course_name, credit, seat_available) VALUES
  ('การเขียนโปรแกรมเบื้องต้น', 3, 30),  -- จะได้ id = 1
  ('โครงสร้างข้อมูล', 3, 25);            -- จะได้ id = 2

-- เพิ่มข้อมูลการลงทะเบียนเรียน เชื่อมนักศึกษากับวิชาที่ลงทะเบียนไว้
-- อ้างอิง id ของ students และ courses ที่เพิ่งสร้างไปด้านบน (1, 1, 2 ตามลำดับการ insert)
INSERT INTO enrollments (student_id, course_id) VALUES
  (1, 1),  -- สมชาย (student_id=1) ลงทะเบียนวิชาการเขียนโปรแกรมเบื้องต้น (course_id=1)
  (1, 2),  -- สมชาย (student_id=1) ลงทะเบียนวิชาโครงสร้างข้อมูล (course_id=2)
  (2, 2);  -- สมหญิง (student_id=2) ลงทะเบียนวิชาโครงสร้างข้อมูล (course_id=2)