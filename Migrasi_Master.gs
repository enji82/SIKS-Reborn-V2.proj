/* ======================================================================
   MIGRASI_MASTER.GS - SETUP & SINKRONISASI SIKS_DB_MASTER
   Tujuan:
   1. Membuat struktur 5 sheet standar di SIKS_DB_MASTER tanpa menghapus data lama.
   2. Menyalin/sinkronisasi data dari spreadsheet lama secara otomatis (idempotent).
   
   Cara menjalankan dari Apps Script Editor:
   - Pilih fungsi `setupMasterSheets` lalu klik Run (untuk membuat tab & header).
   - Pilih fungsi `syncMasterUsers` lalu klik Run (untuk menyalin data user).
   ====================================================================== */

const MASTER_SCHEMA = {
  tbl_sekolah: [
    "npsn", "nama_sekolah", "jenjang", "status_sekolah", "alamat",
    "kecamatan", "kabupaten", "kode_pos", "telepon", "email",
    "kepala_sekolah", "nip_kepsek", "updated_at"
  ],
  tbl_ptk: [
    "id_ptk", "nip", "nik", "nuptk", "nama_lengkap", "jenis_kelamin",
    "tempat_lahir", "tanggal_lahir", "jenjang", "npsn", "status_kepegawaian",
    "jabatan", "pangkat_golongan", "no_hp", "email", "status_aktif", "updated_at"
  ],
  tbl_murid: [
    "nisn", "nik", "nama_lengkap", "jenis_kelamin", "tempat_lahir",
    "tanggal_lahir", "npsn", "jenjang", "tingkat_kelas", "rombel",
    "nama_ayah", "nama_ibu", "alamat", "status_aktif", "updated_at"
  ],
  tbl_users: [
    "username", "password_hash", "nama_lengkap", "role", "npsn",
    "nip", "status_aktif", "updated_at"
  ],
  tbl_referensi: [
    "kategori", "kode", "nilai", "keterangan", "urutan", "aktif"
  ]
};

/**
 * Membuat 5 sheet standar di SIKS_DB_MASTER beserta baris header-nya.
 * Aman dijalankan berulang kali (tidak menimpa sheet yang sudah ada).
 */
function setupMasterSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_MASTER);
  var created = [];
  var existing = [];

  Object.keys(MASTER_SCHEMA).forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = MASTER_SCHEMA[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      created.push(sheetName);
    } else {
      existing.push(sheetName);
    }
  });

  Logger.log("Setup selesai. Dibuat: " + created.join(", ") + " | Sudah ada: " + existing.join(", "));
  return { created: created, existing: existing };
}

/**
 * Menyalin data user dari USER_DB (Data User) ke tbl_users di SIKS_DB_MASTER.
 * Aman dijalankan berkali-kali: hanya menambah username yang belum ada.
 */
function syncMasterUsers() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.USER_DB);
  var srcSheet = srcSs.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME);
  if (!srcSheet) throw new Error("Sheet sumber 'Data User' tidak ditemukan di USER_DB.");

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_MASTER);
  var dstSheet = dstSs.getSheetByName("tbl_users");
  if (!dstSheet) throw new Error("Sheet 'tbl_users' belum ada. Jalankan setupMasterSheets() terlebih dahulu.");

  var srcData = srcSheet.getDataRange().getValues();
  var dstData = dstSheet.getDataRange().getValues();

  var existingUsernames = {};
  for (var i = 1; i < dstData.length; i++) {
    var uname = String(dstData[i][0] || "").trim().toLowerCase();
    if (uname) existingUsernames[uname] = true;
  }

  var now = new Date();
  var toInsert = [];
  for (var r = 1; r < srcData.length; r++) {
    var username = String(srcData[r][0] || "").trim();
    if (!username || existingUsernames[username.toLowerCase()]) continue;

    var passwordHash = String(srcData[r][1] || "");
    var namaLengkap = String(srcData[r][2] || "");
    var role = String(srcData[r][3] || "");
    var npsn = String(srcData[r][4] || "");
    var nip = String(srcData[r][5] || "");

    toInsert.push([
      username,
      passwordHash,
      namaLengkap,
      role,
      npsn,
      nip,
      "AKTIF",
      now
    ]);
    existingUsernames[username.toLowerCase()] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 8).setValues(toInsert);
  }

  Logger.log("Sync tbl_users selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Helper: Mencari indeks kolom berdasarkan beberapa kemungkinan nama header (case-insensitive).
 */
function findColIndex_(headers, candidates) {
  for (var c = 0; c < candidates.length; c++) {
    var target = candidates[c].toLowerCase().trim();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i] || "").toLowerCase().trim() === target) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Menyalin data sekolah dari DATA_SEKOLAH (sheet 'Data Sekolah' berformat kolom per jenjang:
 * KB | TK | SD | SD Negeri | SD Swasta | SIABA) ke tbl_sekolah di SIKS_DB_MASTER.
 * Sekaligus mencocokkan NPSN dari tbl_users (jika ada).
 * Aman dijalankan berkali-kali: hanya menambah sekolah yang belum ada.
 */
function syncMasterSekolah() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.DATA_SEKOLAH);
  var srcSheet = srcSs.getSheetByName("Data Sekolah") || srcSs.getSheets()[0];
  if (!srcSheet) throw new Error("Sheet sumber sekolah tidak ditemukan di DATA_SEKOLAH.");

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_MASTER);
  var dstSheet = dstSs.getSheetByName("tbl_sekolah");
  if (!dstSheet) throw new Error("Sheet 'tbl_sekolah' belum ada. Jalankan setupMasterSheets() terlebih dahulu.");

  // Ambil mapping nama_sekolah -> npsn dari tbl_users (jika sudah di-sync)
  var npsnByNama = {};
  var userSheet = dstSs.getSheetByName("tbl_users");
  if (userSheet) {
    var userData = userSheet.getDataRange().getValues();
    for (var u = 1; u < userData.length; u++) {
      var uNama = String(userData[u][2] || "").trim().toLowerCase();
      var uNpsn = String(userData[u][4] || "").trim();
      if (uNama && uNpsn && !npsnByNama[uNama]) {
        npsnByNama[uNama] = uNpsn;
      }
    }
  }

  var dstData = dstSheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < dstData.length; i++) {
    var exNpsn = String(dstData[i][0] || "").trim();
    var exNama = String(dstData[i][1] || "").trim().toLowerCase();
    if (exNpsn) existingKeys["npsn:" + exNpsn] = true;
    if (exNama) existingKeys["nama:" + exNama] = true;
  }

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  var headers = srcData[0];
  var now = new Date();
  var toInsert = [];

  for (var col = 0; col < headers.length; col++) {
    var kategori = String(headers[col] || "").trim();
    if (!kategori) continue;

    var jenjang = kategori;
    var statusSekolah = "";
    if (kategori.toLowerCase().indexOf("negeri") > -1) statusSekolah = "Negeri";
    else if (kategori.toLowerCase().indexOf("swasta") > -1) statusSekolah = "Swasta";

    for (var r = 1; r < srcData.length; r++) {
      var namaSekolah = String(srcData[r][col] || "").trim();
      if (!namaSekolah) continue;

      var keyNama = "nama:" + namaSekolah.toLowerCase();
      if (existingKeys[keyNama]) continue;

      var npsnVal = npsnByNama[namaSekolah.toLowerCase()] || "";
      if (npsnVal && existingKeys["npsn:" + npsnVal]) continue;

      toInsert.push([
        npsnVal,          // npsn
        namaSekolah,      // nama_sekolah
        jenjang,          // jenjang
        statusSekolah,    // status_sekolah
        "", "", "", "", "", "", "", "", // alamat s/d nip_kepsek
        now               // updated_at
      ]);

      existingKeys[keyNama] = true;
      if (npsnVal) existingKeys["npsn:" + npsnVal] = true;
    }
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 13).setValues(toInsert);
  }

  Logger.log("Sync tbl_sekolah selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}
