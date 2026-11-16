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
