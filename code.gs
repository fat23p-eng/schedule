// ================================================================
// Google Apps Script — Schedule Dashboard (Read + Write via GET)
// ================================================================
// วิธี Deploy:
//   1. Extensions → Apps Script → วางโค้ดนี้
//   2. Deploy → New deployment → Web app
//      Execute as: Me  |  Access: Anyone
//   3. Copy Web app URL
// ================================================================

var SHEET_NAME = "data"; // ← ชื่อ tab Sheet (แก้ได้)

function doGet(e) {
  try {
    var action  = e.parameter.action || "read";
    var sheetId = e.parameter.id     || "";

    if (!sheetId) return jsonOut({ error: "ไม่พบ ?id=SHEET_ID" });

    var ss    = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    // ── READ ────────────────────────────────────────────────────
    if (action === "read") {
      var data = sheet.getDataRange().getValues();
      var keys = data[0]; // header row
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        if (!data[i][3]) continue; // ข้ามถ้าไม่มี title (column D)
        var obj = {};
        for (var j = 0; j < keys.length; j++) {
          obj[keys[j]] = String(data[i][j] || "").trim();
        }
        rows.push(obj);
      }
      return jsonOut({ ok: true, data: rows });
    }

    // ── ADD ─────────────────────────────────────────────────────
    if (action === "add") {
      var item = parseItem(e.parameter);
      sheet.appendRow(itemToRow(item));
      return jsonOut({ ok: true, action: "add", id: item.id });
    }

    // ── UPDATE ──────────────────────────────────────────────────
    if (action === "update") {
      var item = parseItem(e.parameter);
      var rowNum = findRowById(sheet, item.id);
      if (rowNum > 0) {
        sheet.getRange(rowNum, 1, 1, 11).setValues([itemToRow(item)]);
      } else {
        sheet.appendRow(itemToRow(item)); // ถ้าหาไม่เจอ → append
      }
      return jsonOut({ ok: true, action: "update", row: rowNum });
    }

    // ── DELETE ──────────────────────────────────────────────────
    if (action === "delete") {
      var itemId = e.parameter.itemId || "";
      var rowNum = findRowById(sheet, itemId);
      if (rowNum > 0) sheet.deleteRow(rowNum);
      return jsonOut({ ok: true, action: "delete", row: rowNum });
    }

    return jsonOut({ error: "action ไม่รู้จัก: " + action });

  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

// ── HELPERS ────────────────────────────────────────────────────
function parseItem(p) {
  return {
    id:        p.itemId    || p.id    || "",
    date:      p.date      || "",
    startTime: p.startTime || "",
    endTime:   p.endTime   || "",
    title:     p.title     || "",
    type:      p.type      || "",
    priority:  p.priority  || "",
    group:     p.group     || "",
    owner:     p.owner     || "",
    location:  p.location  || "",
    notes:     p.notes     || "",
  };
}

function itemToRow(item) {
  return [
    item.date, item.startTime, item.endTime,
    item.title, item.type, item.priority,
    item.group, item.owner, item.location,
    item.notes, item.id
  ];
}

function findRowById(sheet, id) {
  if (!id) return -1;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][10]) === String(id)) return i + 1;
  }
  return -1;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// โครงสร้าง Sheet (row 1 = Header ชื่อคอลัมน์พอดีด้านล่าง)
//  A=date  B=startTime  C=endTime  D=title  E=type  F=priority
//  G=group  H=owner  I=location  J=notes  K=id
//
//  ตัวอย่าง row:
//  2025-04-22 | 09:30 | 11:00 | ประชุม... | ประชุม | เร่งด่วน
//  กลุ่มอำนวยการ | ชื่อ | ห้องประชุม | หมายเหตุ | uuid
// ================================================================
