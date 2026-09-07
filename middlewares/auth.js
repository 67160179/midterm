// ไลบรารีสำหรับสร้างและตรวจสอบ JWT (JSON Web Token)
const jwt = require("jsonwebtoken");

// ===== Middleware: authenticateToken =====
// หน้าที่: ตรวจสอบว่า request นี้แนบ token ที่ถูกต้องมาหรือไม่ (ยืนยันตัวตนผู้ใช้)
// ถ้าผ่าน จะแนบข้อมูลผู้ใช้ไว้ที่ req.user แล้วปล่อยให้ route ถัดไปทำงานต่อ (next())
function authenticateToken(req, res, next) {
  // token มักถูกส่งมาใน header แบบ: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];

  // ตัด header ด้วย space แล้วเอาส่วนที่ 2 (index 1) ซึ่งคือตัว token จริงๆ
  // ถ้า authHeader ไม่มีค่าเลย (undefined) การเช็ค && ทำให้ token เป็น undefined ไปด้วย ไม่เกิด error
  const token = authHeader && authHeader.split(" ")[1];

  // ไม่มี token แนบมาเลย → ปฏิเสธทันที ไม่ต้องเช็คอย่างอื่นต่อ
  if (!token) {
    return res.status(401).json({
      error: { code: "NO_TOKEN", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
    });
  }

  try {
    // ตรวจสอบลายเซ็นของ token ด้วย secret key (JWT_SECRET) ว่าถูกต้องและยังไม่หมดอายุ
    // ถ้าผ่าน jwt.verify จะคืนค่า payload ที่ฝังไว้ตอนสร้าง token (เช่น id, email, role ของผู้ใช้)
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next(); // ส่งต่อไปยัง middleware/route ถัดไปในลำดับ
  } catch (err) {
    // เข้ามาตรงนี้ได้ 2 กรณีหลัก: token ปลอมแปลง/แก้ไข (ลายเซ็นไม่ตรง) หรือ token หมดอายุแล้ว
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Token ไม่ถูกต้องหรือหมดอายุ" },
    });
  }
}

// ===== Middleware Factory: authorizeRole =====
// เป็น "โรงงานสร้าง middleware" — รับรายชื่อ role ที่อนุญาต แล้วคืนฟังก์ชัน middleware กลับไป
// ใช้ ...allowedRoles (rest parameter) เพื่อให้เรียกใช้ได้ยืดหยุ่น เช่น authorizeRole("admin")
// หรือ authorizeRole("admin", "teacher") ก็ได้ในอนาคต
function authorizeRole(...allowedRoles) {
  // คืนค่าเป็น middleware function จริงๆ ที่ Express จะเอาไปรันตอนมี request เข้ามา
  return (req, res, next) => {
    // ต้องรันหลัง authenticateToken เสมอ เพราะต้องพึ่ง req.user ที่ authenticateToken เป็นคนใส่ให้
    // ถ้าไม่มี req.user แปลว่ายังไม่ได้ผ่านการยืนยันตัวตนมาก่อน
    if (!req.user) {
      return res.status(401).json({
        error: { code: "NO_TOKEN", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
      });
    }

    // เช็คว่า role ของผู้ใช้ (ที่ฝังมาใน token) อยู่ในรายชื่อ role ที่อนุญาตหรือไม่
    if (!allowedRoles.includes(req.user.role)) {
      // login ถูกต้อง แต่สิทธิ์ไม่พอ (เช่น เป็น student แต่ route ต้องการ admin) → 403 Forbidden
      // ต่างจาก 401 (Unauthorized) ที่หมายถึง "ยังไม่ยืนยันตัวตน" หรือ "ยืนยันไม่ผ่าน"
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้",
        },
      });
    }
    next(); // สิทธิ์ผ่าน ปล่อยให้ route ทำงานต่อ
  };
}

// export ทั้งสอง middleware ให้ไฟล์อื่น (เช่น server.js) นำไปใช้กับ route ที่ต้องการป้องกัน
module.exports = { authenticateToken, authorizeRole };