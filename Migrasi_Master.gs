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

/**
 * Menyalin data PTK dari PTK_SD_DB dan PTK_PAUD_DB ke tbl_ptk di SIKS_DB_MASTER.
 * Aman dijalankan berkali-kali: mencegah duplikasi berdasarkan NIP / NIK / (Nama + Sekolah).
 */
function syncMasterPTK() {
  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_MASTER);
  var dstSheet = dstSs.getSheetByName("tbl_ptk");
  if (!dstSheet) throw new Error("Sheet 'tbl_ptk' belum ada. Jalankan setupMasterSheets() terlebih dahulu.");

  // Mapping nama sekolah -> npsn dari tbl_sekolah
  var npsnBySekolah = {};
  var sekolahSheet = dstSs.getSheetByName("tbl_sekolah");
  if (sekolahSheet) {
    var sekData = sekolahSheet.getDataRange().getValues();
    for (var s = 1; s < sekData.length; s++) {
      var sNpsn = String(sekData[s][0] || "").trim();
      var sNama = String(sekData[s][1] || "").trim().toLowerCase();
      if (sNama && sNpsn) npsnBySekolah[sNama] = sNpsn;
    }
  }

  var dstData = dstSheet.getDataRange().getValues();
  var existingKeys = {};
  for (var i = 1; i < dstData.length; i++) {
    var exNip = String(dstData[i][1] || "").trim();
    var exNik = String(dstData[i][2] || "").trim();
    var exNama = String(dstData[i][4] || "").trim().toLowerCase();
    var exNpsn = String(dstData[i][9] || "").trim();
    if (exNip) existingKeys["nip:" + exNip] = true;
    if (exNik) existingKeys["nik:" + exNik] = true;
    if (exNama) existingKeys["nama:" + exNama + "|" + exNpsn] = true;
  }

  var sources = [
    { key: "PTK_SD_DB", sheetName: "Master Data GTK", jenjangDefault: "SD" },
    { key: "PTK_PAUD_DB", sheetName: "Master Data GTK", jenjangDefault: "PAUD" }
  ];

  var now = new Date();
  var toInsert = [];

  sources.forEach(function (src) {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS[src.key]);
    var sheet = ss.getSheetByName(src.sheetName) || ss.getSheets()[0];
    if (!sheet) {
      Logger.log("Sheet tidak ditemukan: " + src.sheetName);
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    // Cari baris header (baris 1-5) yang mengandung kolom Nama
    var headerIdx = -1;
    var idxNama = -1;
    for (var rCheck = 0; rCheck < Math.min(5, data.length); rCheck++) {
      var cIdx = findColIndex_(data[rCheck], ["nama", "nama lengkap", "nama_lengkap", "nama ptk", "nama gtk", "nama guru"]);
      if (cIdx !== -1) {
        headerIdx = rCheck;
        idxNama = cIdx;
        break;
      }
    }
    if (headerIdx === -1) {
      Logger.log("Header Nama tidak ditemukan di " + src.sheetName + ". Baris 1: " + data[0].join(" | "));
      return;
    }

    var h = data[headerIdx];
    var idxNip = findColIndex_(h, ["nip"]);
    var idxNik = findColIndex_(h, ["nik", "no ktp", "no_ktp"]);
    var idxNuptk = findColIndex_(h, ["nuptk"]);
    var idxJk = findColIndex_(h, ["jk", "jenis kelamin", "jenis_kelamin", "l/p"]);
    var idxTmpLahir = findColIndex_(h, ["tempat lahir", "tempat_lahir"]);
    var idxTglLahir = findColIndex_(h, ["tanggal lahir", "tanggal_lahir", "tgl lahir"]);
    var idxSekolah = findColIndex_(h, ["sekolah", "nama sekolah", "nama_sekolah", "unit kerja", "satuan pendidikan"]);
    var idxNpsn = findColIndex_(h, ["npsn"]);
    var idxStatusPeg = findColIndex_(h, ["status kepegawaian", "status_kepegawaian", "status pegawai", "status"]);
    var idxJabatan = findColIndex_(h, ["jabatan", "jenis ptk", "tugas"]);
    var idxPangkat = findColIndex_(h, ["pangkat", "golongan", "pangkat/golongan", "pangkat_golongan"]);
    var idxHp = findColIndex_(h, ["no hp", "no_hp", "hp", "telepon", "wa", "no wa"]);
    var idxEmail = findColIndex_(h, ["email"]);

    for (var r = headerIdx + 1; r < data.length; r++) {
      var row = data[r];
      var nama = String(row[idxNama] || "").trim();
      if (!nama) continue;

      var nip = idxNip > -1 ? String(row[idxNip] || "").trim() : "";
      var nik = idxNik > -1 ? String(row[idxNik] || "").trim() : "";
      var namaSekolah = idxSekolah > -1 ? String(row[idxSekolah] || "").trim() : "";
      var npsn = idxNpsn > -1 ? String(row[idxNpsn] || "").trim() : (npsnBySekolah[namaSekolah.toLowerCase()] || "");

      if (nip && existingKeys["nip:" + nip]) continue;
      if (nik && existingKeys["nik:" + nik]) continue;
      if (existingKeys["nama:" + nama.toLowerCase() + "|" + npsn]) continue;

      var idPtk = nip || nik || ("PTK-" + src.jenjangDefault + "-" + (dstData.length + toInsert.length + 1));

      toInsert.push([
        idPtk,
        nip,
        nik,
        idxNuptk > -1 ? String(row[idxNuptk] || "").trim() : "",
        nama,
        idxJk > -1 ? String(row[idxJk] || "").trim() : "",
        idxTmpLahir > -1 ? String(row[idxTmpLahir] || "").trim() : "",
        idxTglLahir > -1 ? row[idxTglLahir] : "",
        src.jenjangDefault,
        npsn,
        idxStatusPeg > -1 ? String(row[idxStatusPeg] || "").trim() : "",
        idxJabatan > -1 ? String(row[idxJabatan] || "").trim() : "",
        idxPangkat > -1 ? String(row[idxPangkat] || "").trim() : "",
        idxHp > -1 ? String(row[idxHp] || "").trim() : "",
        idxEmail > -1 ? String(row[idxEmail] || "").trim() : "",
        "AKTIF",
        now
      ]);

      if (nip) existingKeys["nip:" + nip] = true;
      if (nik) existingKeys["nik:" + nik] = true;
      existingKeys["nama:" + nama.toLowerCase() + "|" + npsn] = true;
    }
  });

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 17).setValues(toInsert);
  }

  Logger.log("Sync tbl_ptk selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}
