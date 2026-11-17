/* ======================================================================
   SIABA_IMPORT_PRESENSI.GS - CRUD SUMBER PRESENSI BULANAN (KHUSUS ADMIN)
   Target Sheet: tbl_siaba_sumber_presensi di SIKS_DB_SIABA
   ====================================================================== */

function getImportPresensiSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var sheet = ss.getSheetByName("tbl_siaba_sumber_presensi");
  if (!sheet) {
    sheet = ss.insertSheet("tbl_siaba_sumber_presensi");
    var headers = ["Bulan", "Tahun", "Link_Spreadsheet", "ID_Spreadsheet", "Terakhir_Diproses", "Status"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function extractSpreadsheetIdFromUrl_(url) {
  var str = String(url || "").trim();
  var match = str.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(str)) return str;
  return "";
}

function getImportPresensiList() {
  try {
    var sheet = getImportPresensiSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ status: "success", data: [] });

    var data = sheet.getRange(2, 1, lastRow - 1, 6).getDisplayValues();
    var list = [];
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (!r[0] && !r[1] && !r[2]) continue;
      list.push({
        rowIndex: i + 2,
        bulan: r[0],
        tahun: r[1],
        link: r[2],
        idSpreadsheet: r[3],
        terakhirDiproses: r[4],
        status: r[5] || "Belum Diproses"
      });
    }
    return JSON.stringify({ status: "success", data: list });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.message });
  }
}

function saveImportPresensi(payload) {
  try {
    var bulan = String(payload.bulan || "").trim();
    var tahun = String(payload.tahun || "").trim();
    var link = String(payload.link || "").trim();
    var rowIndex = payload.rowIndex ? parseInt(payload.rowIndex, 10) : 0;

    if (!bulan || !tahun || !link) {
      return JSON.stringify({ status: "error", message: "Bulan, Tahun, dan Link Spreadsheet wajib diisi." });
    }

    var idSpreadsheet = extractSpreadsheetIdFromUrl_(link);
    if (!idSpreadsheet) {
      return JSON.stringify({ status: "error", message: "Link Spreadsheet tidak valid. Pastikan menyalin URL Google Sheets yang benar." });
    }

    var sheet = getImportPresensiSheet_();
    if (rowIndex >= 2) {
      sheet.getRange(rowIndex, 1, 1, 4).setValues([[bulan, tahun, link, idSpreadsheet]]);
    } else {
      sheet.appendRow([bulan, tahun, link, idSpreadsheet, "", "Belum Diproses"]);
    }

    return JSON.stringify({ status: "success", message: "Data sumber presensi berhasil disimpan.", idSpreadsheet: idSpreadsheet });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.message });
  }
}

function deleteImportPresensi(rowIndex) {
  try {
    var idx = parseInt(rowIndex, 10);
    if (!idx || idx < 2) return JSON.stringify({ status: "error", message: "Baris tidak valid." });
    var sheet = getImportPresensiSheet_();
    sheet.deleteRow(idx);
    return JSON.stringify({ status: "success", message: "Data sumber presensi berhasil dihapus." });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.message });
  }
}
