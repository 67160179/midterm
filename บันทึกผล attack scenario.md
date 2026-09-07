# บันทึกผลทดสอบ student-api (wk04 - ส่วนที่ 3)
  
**3.1 เช็ค Security Header**
ยิง GET ไปดู response header เจอ `X-Content-Type-Options: nosniff` กับ `X-Frame-Options: SAMEORIGIN` ครบตามที่ควรมี และไม่เห็น `X-Powered-By` เลย (helmet บล็อกให้อัตโนมัติ)
 
**3.2 ลอง CORS ด้วย origin แปลกปลอม**
ใส่ header `Origin: http://malicious-site.example.com` ไปตอนยิง request แล้วเช็คว่า server ส่ง `Access-Control-Allow-Origin` กลับมาเป็น origin ที่เราตั้งไว้จริง (localhost:3001) ไม่ใช่ origin ปลอมที่ส่งไป ถือว่า cors ทำงานถูก
 
**3.3 เช็ค error response**
ลองยิง 4 แบบ:
- route มั่ว → 404
- id ไม่มีจริง → 404
- ไม่ใส่ name → 400
- email ซ้ำ → 409
ได้ตามที่ต้องการทุกอัน มีติดปัญหานิดหน่อยตอนทดสอบ 400 คือลืมใส่ body ไปเลย เลยขึ้น 500 แทน พอใส่ body ให้ถูก (แค่ไม่มี name) ก็ได้ 400 ปกติ แล้วก็แก้โค้ดกันไว้อีกชั้นด้วย `req.body || {}` เผื่อ client ไม่ส่ง body มาจะได้ไม่ crash
 
**3.4 ทดสอบส่ง payload ใหญ่เกิน 10kb**
ตอนแรกเซ็ตตัวแปรผิด tab (ใส่ pre-request script ไว้ผิดที่ ไปอยู่ post-response) เลยไม่มีผล ได้ 201 มาแทน 413 พอย้าย script ไปไว้ pre-request ให้ถูกจุด ลองใหม่ได้ 413 ตามที่ควรจะเป็น
 
**3.5 ส่ง type ผิด**
ลองส่ง name เป็น object แทนที่จะเป็น string ดูว่า server เช็ค type ไหม ปรากฏว่าไม่เช็ค รับเข้าไปเฉยๆ เลย ตรงตามที่คาดว่าจะเจอช่องโหว่แบบนี้ (จะไปแก้ด้วย Zod ทีหลังตอน wk13)
 
**สรุป**
ทำครบทุกข้อของจุดตรวจสอบที่ 3 แล้ว ผ่านทั้งหมด
