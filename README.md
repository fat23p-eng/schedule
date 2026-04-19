เพิ่ม Template Config แล้วครับ — แก้ไขได้ง่ายๆ ที่บรรทัดแรกของ <script> เลย:
-------
javascriptconst CONFIG = {
  officeName: "Dashboard ตารางนัดหมาย 🎉",      // ← แก้ชื่อหน่วยงาน
  officeSubName: "สำนักงานส่งเสริมสหกรณ์ กทม.", // ← แก้ชื่อย่อย
  superAdminPin: "xxxx",                          // ← แก้รหัส Super Admin

  defaultGroups: [
    { name: "กลุ่มอำนวยการ", pin: "xxxx" },      // ← เพิ่ม/ลบ/แก้กลุ่มงาน
    ...
  ],
};

แค่แก้ใน block นี้ที่เดียว ทุกที่ในระบบจะอัปเดตตามอัตโนมัติ
-------
