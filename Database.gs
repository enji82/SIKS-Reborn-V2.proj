/* ======================================================================
   DATABASE.GS - LAPISAN AKSES DATA TERPUSAT (SIKS_DB_MASTER)
   Tujuan:
   Menyediakan fungsi standar untuk membaca data dari SIKS_DB_MASTER
   sehingga modul lain tidak perlu memanggil SpreadsheetApp.openById()
   secara langsung ke spreadsheet lama.
   ====================================================================== */

function getMasterSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_MASTER);
}

/**
 * Mengambil seluruh data sekolah dari tbl_sekolah sebagai array of objects.
 */
function getMasterSekolah() {
  var sheet = getMasterSpreadsheet_().getSheetByName("tbl_sekolah");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    result.push(obj);
  }
  return result;
}

/**
 * Mencari satu sekolah berdasarkan NPSN.
 */
function getSekolahByNpsn(npsn) {
  var target = String(npsn || "").trim();
  if (!target) return null;
  var list = getMasterSekolah();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].npsn || "").trim() === target) {
      return list[i];
    }
  }
  return null;
}

/**
 * Mengambil data PTK dari tbl_ptk (opsional filter berdasarkan NPSN).
 */
function getMasterPTK(filterNpsn) {
  var sheet = getMasterSpreadsheet_().getSheetByName("tbl_ptk");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var targetNpsn = filterNpsn ? String(filterNpsn).trim() : "";
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[4]) continue; // nama_lengkap kosong
    if (targetNpsn && String(row[9] || "").trim() !== targetNpsn) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    result.push(obj);
  }
  return result;
}

/**
 * Mencari satu PTK berdasarkan NIP atau NIK.
 */
function getPTKByNip(nipOrNik) {
  var target = String(nipOrNik || "").trim();
  if (!target) return null;
  var list = getMasterPTK();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].nip || "").trim() === target || String(list[i].nik || "").trim() === target) {
      return list[i];
    }
  }
  return null;
}

/**
 * Mencari satu user berdasarkan username dari tbl_users.
 */
function getMasterUserByUsername(username) {
  var target = String(username || "").trim().toLowerCase();
  if (!target) return null;
  var sheet = getMasterSpreadsheet_().getSheetByName("tbl_users");
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || "").trim().toLowerCase() === target) {
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = data[i][c];
      }
      return obj;
    }
  }
  return null;
}
