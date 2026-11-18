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
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var targetNpsn = filterNpsn ? String(filterNpsn).trim() : "";
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var hName = String(headers[c] || "").trim();
      if (hName) obj[hName] = row[c];
    }
    // Normalisasi field standar agar kompatibel dengan modul lain
    obj.nama_lengkap = obj.nama_lengkap || obj["Nama Lengkap"] || obj["Nama"] || obj["Nama GTK"] || "";
    obj.nip = obj.nip || obj["NIP"] || "";
    obj.nik = obj.nik || obj["NIK"] || "";
    obj.npsn = obj.npsn || obj["NPSN"] || "";
    obj.status_kepegawaian = obj.status_kepegawaian || obj["Status Kepegawaian"] || obj["Status Pegawai"] || obj["Status"] || "";
    obj.jabatan = obj.jabatan || obj["Jabatan"] || obj["Jenis PTK"] || "";
    obj.no_hp = obj.no_hp || obj["No HP"] || obj["HP"] || "";

    if (!obj.nama_lengkap) continue;
    if (targetNpsn && String(obj.npsn || "").trim() !== targetNpsn) continue;
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

/**
 * Mengambil opsi filter (daftar sekolah/unit & status kepegawaian) dari SIKS_DB_MASTER.
 */
function getFilterOptionsPTK_Central() {
  var sekolahList = getMasterSekolah();
  var ptkList = getMasterPTK();
  var unitSet = {};
  var statusSet = {};

  for (var i = 0; i < sekolahList.length; i++) {
    var namaSek = String(sekolahList[i].nama_sekolah || "").trim();
    if (namaSek) unitSet[namaSek] = true;
  }
  for (var j = 0; j < ptkList.length; j++) {
    var st = String(ptkList[j].status_kepegawaian || "").trim();
    if (st) statusSet[st] = true;
  }

  return JSON.stringify({
    units: Object.keys(unitSet).sort(),
    statuses: Object.keys(statusSet).sort()
  });
}

/**
 * Mengambil sheet dari SIKS_DB_SIABA (tbl_siaba_cuti, tbl_siaba_dinas, tbl_siaba_lupa, tbl_siaba_salah, dll).
 */
function getSiabaCentralSheet(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  return ss.getSheetByName(sheetName);
}

/**
 * Mengambil sheet dari SIKS_DB_LAYANAN (tbl_sk, tbl_efile, tbl_tpg_perbaikan, tbl_lapbul_sd, dll).
 */
function getLayananCentralSheet(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_LAYANAN);
  return ss.getSheetByName(sheetName);
}

/**
 * Mematikan seluruh trigger sinkronisasi harian (syncAllMaster, syncSiabaAll, syncLayananAll)
 * secara otomatis saat web utama sudah resmi menggunakan database terpusat.
 */
function disableAllSyncTriggers() {
  var targetFns = { syncAllMaster: true, syncSiabaAll: true, syncLayananAll: true };
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (targetFns[triggers[i].getHandlerFunction()]) {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  Logger.log("Trigger sinkronisasi dimatikan: " + removed + " trigger.");
  return { removed: removed };
}
