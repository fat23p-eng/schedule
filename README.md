นี่ครับ — วิธีใช้:
-----------
เปิด Google Sheet → Extensions → Apps Script
ลบโค้ดเดิม → วางโค้ดนี้ทั้งหมด
Deploy → New deployment → Web app

Execute as: Me
Who has access: Anyone


Copy URL ที่ได้ เช่น https://script.google.com/macros/s/AKfyc.../exec
นำไปใส่ใน Dashboard พร้อม parameter:

https://script.google.com/macros/s/AKfyc.../exec?id=SHEET_ID&gid=0
โดย SHEET_ID คือไอดีจาก URL ของ Sheet:
https://docs.google.com/spreadsheets/d/**[SHEET_ID]**/edit
