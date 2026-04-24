// ============================================================
//  SSP1 Dashboard — Google Apps Script (2 files)
//  Files: Code.gs + index.html
//
//  วิธีใช้:
//  1. ใน Apps Script: สร้างไฟล์ใหม่ชื่อ "index" (type: HTML)
//     วางเนื้อหา index.html ทั้งหมดลงไป
//  2. Deploy → Web App → Execute as: Me → Anyone
//  3. แชร์ URL ให้ทุกคนเข้าใช้ได้เลย
// ============================================================

const SHEET_COOP     = "สหกรณ์";
const SHEET_OFFICERS = "จสส";
const SHEET_LOG      = "Log";
const COOP_HEADERS   = ["Coop_ID","Coop_Name","Type","Mu","Officers","Phone_Officer","Gmail_Officer"];
const OFF_HEADERS    = ["Name","Group","Phone","Gmail"];

// ─────────────────────────────────────────
//  doGet — serve HTML หรือ API
// ─────────────────────────────────────────
function doGet(e) {
  const params   = (e && e.parameter) ? e.parameter : {};
  const action   = params.action || "";
  const callback = params.callback || "";

  // ไม่มี action → serve หน้า HTML
  if (!action) {
    try {
      const tmpl = HtmlService.createTemplateFromFile("index");
      // ดึง URL ด้วยหลายวิธีเผื่อ fallback
      let url = "";
      try { url = ScriptApp.getService().getUrl(); } catch(ex) {}
      if (!url) {
        try { url = ScriptApp.getScriptId()
          ? "https://script.google.com/macros/s/" + ScriptApp.getScriptId() + "/exec"
          : ""; } catch(ex2) {}
      }
      tmpl.scriptURL = url;
      return tmpl.evaluate()
        .setTitle("สสพ.1 Dashboard")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch(htmlErr) {
      // ถ้าหา index.html ไม่เจอ → แสดง error ที่อ่านได้
      return HtmlService.createHtmlOutput(
        '<h2 style="font-family:sans-serif;color:#dc2626">❌ ไม่พบไฟล์ index.html</h2>' +
        '<p style="font-family:sans-serif">กรุณาสร้างไฟล์ HTML ชื่อ <strong>index</strong> ใน Apps Script ' +
        'แล้ว Deploy ใหม่</p>' +
        '<pre style="background:#f1f5f9;padding:12px;border-radius:8px">' + htmlErr.message + '</pre>'
      ).setTitle("Setup Error");
    }
  }

  // มี action → JSON API
  function respond(obj) {
    const json = JSON.stringify(obj);
    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + json + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    let result = {};

    if (action === "getAll" || action === "getCoops")
      result.coops    = readSheet(SHEET_COOP,     COOP_HEADERS);
    if (action === "getAll" || action === "getOfficers")
      result.officers = readSheet(SHEET_OFFICERS, OFF_HEADERS);

    const writeActions = ["saveCoop","deleteCoop","saveCoops",
                          "saveOfficer","deleteOfficer","initCoops","initOfficers"];
    if (writeActions.indexOf(action) >= 0) {
      const payload = JSON.parse(params.payload || "null");
      if (payload === null) throw new Error("Missing payload for: " + action);
      switch (action) {
        case "saveCoop":
          result = upsertRow(SHEET_COOP, COOP_HEADERS, "Coop_ID", payload); break;
        case "deleteCoop":
          result = deleteRow(SHEET_COOP, "Coop_ID", payload.Coop_ID); break;
        case "saveCoops":
          result = bulkUpsert(SHEET_COOP, COOP_HEADERS, "Coop_ID",
                              Array.isArray(payload) ? payload : [payload]); break;
        case "saveOfficer":
          result = upsertRow(SHEET_OFFICERS, OFF_HEADERS, "Name", payload); break;
        case "deleteOfficer":
          result = deleteRow(SHEET_OFFICERS, "Name", payload.Name); break;
        case "initCoops":
          result = initSheet(SHEET_COOP, COOP_HEADERS, payload); break;
        case "initOfficers":
          result = initSheet(SHEET_OFFICERS, OFF_HEADERS, payload); break;
      }
      writeLog(action, JSON.stringify(payload).substring(0, 200));
    }

    return respond({ ok: true, data: result });
  } catch(err) {
    return respond({ ok: false, error: err.message });
  }
}

// ─────────────────────────────────────────
//  SHEET HELPERS
// ─────────────────────────────────────────
function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const r = sheet.getRange(1, 1, 1, headers.length);
    r.setValues([headers]);
    r.setBackground("#1a4f8a").setFontColor("#ffffff").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readSheet(sheetName, headers) {
  const sheet = getOrCreateSheet(sheetName, headers);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const hdrs  = data[0].map(h => String(h).trim());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach(h => {
      const ci = hdrs.indexOf(h);
      obj[h] = ci >= 0 ? String(row[ci] ?? "").trim() : "";
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

function upsertRow(sheetName, headers, keyField, record) {
  const sheet  = getOrCreateSheet(sheetName, headers);
  const data   = sheet.getDataRange().getValues();
  const hdrs   = data[0].map(h => String(h).trim());
  const keyCol = hdrs.indexOf(keyField);
  const keyVal = String(record[keyField] ?? "").trim();
  const rowArr = headers.map(h => record[h] ?? "");
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyCol] ?? "").trim() === keyVal) {
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowArr]);
      return { action: "updated", row: i + 1 };
    }
  }
  sheet.appendRow(rowArr);
  return { action: "inserted" };
}

function deleteRow(sheetName, keyField, keyVal) {
  const headers = sheetName === SHEET_COOP ? COOP_HEADERS : OFF_HEADERS;
  const sheet   = getOrCreateSheet(sheetName, headers);
  const data    = sheet.getDataRange().getValues();
  const hdrs    = data[0].map(h => String(h).trim());
  const keyCol  = hdrs.indexOf(keyField);
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][keyCol] ?? "").trim() === String(keyVal).trim()) {
      sheet.deleteRow(i + 1);
      return { action: "deleted" };
    }
  }
  return { action: "not_found" };
}

function bulkUpsert(sheetName, headers, keyField, records) {
  let inserted = 0, updated = 0;
  records.forEach(r => {
    const res = upsertRow(sheetName, headers, keyField, r);
    if (res.action === "inserted") inserted++; else updated++;
  });
  return { inserted, updated };
}

function initSheet(sheetName, headers, records) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(sheetName);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(sheetName);
  const hRow = sheet.getRange(1, 1, 1, headers.length);
  hRow.setValues([headers]);
  hRow.setBackground("#1a4f8a").setFontColor("#ffffff").setFontWeight("bold");
  sheet.setFrozenRows(1);
  if (records && records.length > 0) {
    const rows = records.map(r => headers.map(h => r[h] ?? ""));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
  return { rows: records ? records.length : 0 };
}

function writeLog(action, detail) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(SHEET_LOG);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_LOG);
      sheet.getRange(1, 1, 1, 3).setValues([["Timestamp","Action","Detail"]]);
    }
    sheet.appendRow([new Date().toLocaleString("th-TH"), action, detail]);
  } catch(e) {}
}
