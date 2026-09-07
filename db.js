// mysql2/promise: เวอร์ชันของไลบรารี mysql2 ที่รองรับ Promise/async-await โดยตรง
// (ต่างจาก mysql2 ปกติที่ใช้ callback) ทำให้เขียน await pool.query(...) ได้เลยแบบที่เห็นในไฟล์อื่นๆ
const mysql = require("mysql2/promise");

// สร้าง "connection pool" แทนที่จะเปิดการเชื่อมต่อ MySQL ใหม่ทุกครั้งที่มี request เข้ามา
// pool จะเปิดการเชื่อมต่อไว้ล่วงหน้าจำนวนหนึ่งแล้ว "หมุนเวียนใช้ซ้ำ" ระหว่าง request ต่างๆ
// เร็วกว่าและประหยัดทรัพยากรกว่าการ connect/disconnect ใหม่ทุกครั้งมาก
const pool = mysql.createPool({
  host: process.env.DB_HOST,         // ที่อยู่เซิร์ฟเวอร์ฐานข้อมูล (เช่น localhost หรือ IP/URL ของ DB server)
  user: process.env.DB_USER,         // username สำหรับ login เข้า MySQL
  password: process.env.DB_PASSWORD, // password ของ user นั้น
  database: process.env.DB_NAME,     // ชื่อฐานข้อมูลที่จะใช้งาน (เช่น student_api ที่สร้างไว้ตอนแรก)

  waitForConnections: true,
  // ถ้า connection ใน pool ถูกใช้งานจนครบ connectionLimit แล้ว และมี request ใหม่เข้ามาอีก
  // true = ให้ "รอคิว" จนกว่าจะมี connection ว่าง แทนที่จะโยน error ทันที (false จะ throw error ทันทีถ้าเต็ม)

  connectionLimit: 10,
  // จำนวนการเชื่อมต่อสูงสุดที่ pool จะเปิดค้างไว้พร้อมกันได้ (10 การเชื่อมต่อ)
  // ค่านี้ควรตั้งให้เหมาะกับ traffic จริงและขีดจำกัดของ MySQL server ฝั่งนั้นด้วย

  queueLimit: 0,
  // จำกัดจำนวน request ที่ "รอคิว" ได้สูงสุดกี่ตัว (เมื่อ waitForConnections เป็น true)
  // 0 หมายถึง "ไม่จำกัด" ปล่อยให้เข้าคิวรอได้เรื่อยๆ ไม่มีเพดาน
});

// export pool นี้ไปให้ไฟล์อื่น (server.js, resolvers ถ้ามีการต่อ DB จริง) เรียกใช้ pool.query(...) หรือ pool.getConnection() ได้เลย
// เพราะเป็น pool เดียวกันที่ใช้ร่วมกันทั้งแอป (shared instance) ไม่ต้องสร้างใหม่ทุกไฟล์
module.exports = pool;