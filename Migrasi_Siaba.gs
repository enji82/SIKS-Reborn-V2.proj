/* ======================================================================
   MIGRASI_SIABA.GS - SETUP & SINKRONISASI SIKS_DB_SIABA
   Tujuan:
   1. Membuat struktur sheet standar di SIKS_DB_SIABA.
   2. Menyalin data transaksi SIABA (Cuti, Dinas, Presensi, Koreksi)
      dari spreadsheet lama secara otomatis tanpa menghapus data lama.
   ====================================================================== */

const SIABA_SCHEMA = {
  tbl_siaba_presensi: [
    "id_presensi", "tanggal", "nip", "nama_ptk", "npsn", "unit_kerja",
    "jam_masuk", "jam_pulang", "status_presensi", "keterangan", "updated_at"
  ],
  tbl_siaba_cuti: [
    "id_cuti", "tanggal_pengajuan", "nip", "nama_ptk", "npsn", "unit_kerja",
    "jenis_cuti", "tanggal_mulai", "tanggal_selesai", "lama_hari",
    "alasan", "status_verifikasi", "url_dokumen", "updated_at"
  ],
  tbl_siaba_dinas: [
    "id_dinas", "tanggal_pengajuan", "nip", "nama_ptk", "npsn", "unit_kerja",
    "tanggal_mulai", "tanggal_selesai", "tujuan", "keperluan",
    "status_verifikasi", "url_dokumen", "updated_at"
  ],
  tbl_siaba_lupa: [
    "id_lupa", "tanggal_presensi", "nip", "nama_ptk", "npsn", "unit_kerja",
    "jenis_lupa", "alasan", "status_verifikasi", "url_dokumen", "updated_at"
  ],
  tbl_siaba_salah: [
    "id_salah", "tanggal_presensi", "nip", "nama_ptk", "npsn", "unit_kerja",
    "keterangan_salah", "perbaikan", "status_verifikasi", "url_dokumen", "updated_at"
  ],
  tbl_siaba_ta_pa: [
    "id_tapa", "tanggal", "nip", "nama_ptk", "npsn", "unit_kerja",
    "jenis", "keterangan", "status_verifikasi", "updated_at"
  ],
  tbl_siaba_data_atasan: [
    "jenis_cuti", "jabatan", "golongan", "nama_sekolah",
    "jabatan_atasan", "nama_atasan", "nip_atasan",
    "jabatan_setuju", "nama_setuju", "nip_setuju", "kepada"
  ],
  tbl_siaba_sisa_cuti: [
    "unit_kerja", "nama_asn", "nip", "status",
    "n_2", "n_1", "n", "jml_n", "diambil",
    "sisa_n_2", "sisa_n_1", "sisa_n", "sisa_ct"
  ]
};

/**
 * Membuat 6 sheet standar di SIKS_DB_SIABA beserta baris header-nya.
 * Aman dijalankan berulang kali.
 */
function setupSiabaSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var created = [];
  var existing = [];

  Object.keys(SIABA_SCHEMA).forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = SIABA_SCHEMA[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      created.push(sheetName);
    } else {
      existing.push(sheetName);
    }
  });

  Logger.log("Setup SIABA selesai. Dibuat: " + created.join(", ") + " | Sudah ada: " + existing.join(", "));
  return { created: created, existing: existing };
}

/**
 * Menyalin data Cuti dari SIABA_CUTI_DB ke tbl_siaba_cuti di SIKS_DB_SIABA.
 * Aman dijalankan berkali-kali (cek duplikasi berdasarkan id_cuti).
 */
function syncSiabaCuti() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_CUTI_DB);
  var srcSheet = srcSs.getSheetByName("Form Cuti") || srcSs.getSheets()[0];
  if (!srcSheet) throw new Error("Sheet sumber cuti tidak ditemukan di SIABA_CUTI_DB.");

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_cuti");
  if (!dstSheet) throw new Error("Sheet 'tbl_siaba_cuti' belum ada. Jalankan setupSiabaSheets() terlebih dahulu.");

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  var h = srcData[0];
  var idxId = findColIndex_(h, ["id", "id_cuti", "no", "kode"]);
  var idxTgl = findColIndex_(h, ["tanggal input", "tanggal", "tgl pengajuan", "tanggal_pengajuan", "timestamp"]);
  var idxNip = findColIndex_(h, ["nip"]);
  var idxNama = findColIndex_(h, ["asn", "nama", "nama ptk", "nama pegawai", "nama_lengkap"]);
  var idxNpsn = findColIndex_(h, ["npsn"]);
  var idxUnit = findColIndex_(h, ["unit kerja", "sekolah", "nama sekolah", "unit_kerja", "unit"]);
  var idxJenis = findColIndex_(h, ["jenis cuti", "jenis_cuti", "jenis"]);
  var idxMulai = findColIndex_(h, ["tmc", "mulai", "tanggal mulai", "tgl mulai", "tanggal_mulai"]);
  var idxSelesai = findColIndex_(h, ["tsc", "selesai", "tanggal selesai", "tgl selesai", "tanggal_selesai"]);
  var idxLama = findColIndex_(h, ["jumlah", "lama", "lama hari", "jumlah hari", "lama_hari"]);
  var idxAlasan = findColIndex_(h, ["alasan", "keterangan"]);
  var idxStatus = findColIndex_(h, ["status", "status_verifikasi", "status verifikasi"]);
  var idxUrl = findColIndex_(h, ["file", "unggah file", "url", "link", "dokumen", "url_dokumen"]);

  var dstData = dstSheet.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < dstData.length; i++) {
    var idVal = String(dstData[i][0] || "").trim();
    if (idVal) existingIds[idVal] = true;
  }

  var now = new Date();
  var toInsert = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var nama = idxNama > -1 ? String(row[idxNama] || "").trim() : "";
    var nip = idxNip > -1 ? String(row[idxNip] || "").trim() : "";
    if (!nama && !nip) continue;

    var idCuti = idxId > -1 && row[idxId] ? String(row[idxId]).trim() : ("CUTI-" + (r + 1));
    if (existingIds[idCuti]) continue;

    toInsert.push([
      idCuti,
      idxTgl > -1 ? row[idxTgl] : "",
      nip,
      nama,
      idxNpsn > -1 ? String(row[idxNpsn] || "").trim() : "",
      idxUnit > -1 ? String(row[idxUnit] || "").trim() : "",
      idxJenis > -1 ? String(row[idxJenis] || "").trim() : "",
      idxMulai > -1 ? row[idxMulai] : "",
      idxSelesai > -1 ? row[idxSelesai] : "",
      idxLama > -1 ? row[idxLama] : "",
      idxAlasan > -1 ? String(row[idxAlasan] || "").trim() : "",
      idxStatus > -1 ? String(row[idxStatus] || "").trim() : "",
      idxUrl > -1 ? String(row[idxUrl] || "").trim() : "",
      now
    ]);
    existingIds[idCuti] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 14).setValues(toInsert);
  }

  Logger.log("Sync tbl_siaba_cuti selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Menyalin data Perjalanan Dinas dari SIABA_DINAS_DB ke tbl_siaba_dinas.
 */
function syncSiabaDinas() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_DINAS_DB);
  var srcSheet = srcSs.getSheets()[0];
  if (!srcSheet) return { inserted: 0 };

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_dinas");
  if (!dstSheet) throw new Error("Sheet 'tbl_siaba_dinas' belum ada.");

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  var h = srcData[0];
  var idxId = findColIndex_(h, ["id", "id_dinas", "no", "kode"]);
  var idxTgl = findColIndex_(h, ["tanggal", "tgl pengajuan", "tanggal_pengajuan", "timestamp"]);
  var idxNip = findColIndex_(h, ["nip"]);
  var idxNama = findColIndex_(h, ["nama", "nama ptk", "nama pegawai", "nama_lengkap"]);
  var idxNpsn = findColIndex_(h, ["npsn"]);
  var idxUnit = findColIndex_(h, ["unit kerja", "sekolah", "nama sekolah", "unit_kerja"]);
  var idxMulai = findColIndex_(h, ["mulai", "tanggal mulai", "tgl mulai", "tanggal_mulai"]);
  var idxSelesai = findColIndex_(h, ["selesai", "tanggal selesai", "tgl selesai", "tanggal_selesai"]);
  var idxTujuan = findColIndex_(h, ["tujuan", "tempat"]);
  var idxKeperluan = findColIndex_(h, ["keperluan", "keterangan", "uraian"]);
  var idxStatus = findColIndex_(h, ["status", "status_verifikasi", "status verifikasi"]);
  var idxUrl = findColIndex_(h, ["url", "link", "dokumen", "file", "url_dokumen"]);

  var dstData = dstSheet.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < dstData.length; i++) {
    var idVal = String(dstData[i][0] || "").trim();
    if (idVal) existingIds[idVal] = true;
  }

  var now = new Date();
  var toInsert = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var nama = idxNama > -1 ? String(row[idxNama] || "").trim() : "";
    var nip = idxNip > -1 ? String(row[idxNip] || "").trim() : "";
    if (!nama && !nip) continue;

    var idDinas = idxId > -1 && row[idxId] ? String(row[idxId]).trim() : ("DINAS-" + (r + 1));
    if (existingIds[idDinas]) continue;

    toInsert.push([
      idDinas,
      idxTgl > -1 ? row[idxTgl] : "",
      nip,
      nama,
      idxNpsn > -1 ? String(row[idxNpsn] || "").trim() : "",
      idxUnit > -1 ? String(row[idxUnit] || "").trim() : "",
      idxMulai > -1 ? row[idxMulai] : "",
      idxSelesai > -1 ? row[idxSelesai] : "",
      idxTujuan > -1 ? String(row[idxTujuan] || "").trim() : "",
      idxKeperluan > -1 ? String(row[idxKeperluan] || "").trim() : "",
      idxStatus > -1 ? String(row[idxStatus] || "").trim() : "",
      idxUrl > -1 ? String(row[idxUrl] || "").trim() : "",
      now
    ]);
    existingIds[idDinas] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 13).setValues(toInsert);
  }

  Logger.log("Sync tbl_siaba_dinas selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Menyalin data Lupa Presensi dari SIABA_LUPA_DB ke tbl_siaba_lupa.
 */
function syncSiabaLupa() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_LUPA_DB);
  var srcSheet = srcSs.getSheets()[0];
  if (!srcSheet) return { inserted: 0 };

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_lupa");
  if (!dstSheet) throw new Error("Sheet 'tbl_siaba_lupa' belum ada.");

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  var h = srcData[0];
  var idxId = findColIndex_(h, ["id", "id_lupa", "no", "kode"]);
  var idxTgl = findColIndex_(h, ["tanggal", "tgl presensi", "tanggal_presensi"]);
  var idxNip = findColIndex_(h, ["nip"]);
  var idxNama = findColIndex_(h, ["nama", "nama ptk", "nama pegawai", "nama_lengkap"]);
  var idxNpsn = findColIndex_(h, ["npsn"]);
  var idxUnit = findColIndex_(h, ["unit kerja", "sekolah", "nama sekolah", "unit_kerja"]);
  var idxJenis = findColIndex_(h, ["jenis", "jenis lupa", "jenis_lupa", "keterangan"]);
  var idxAlasan = findColIndex_(h, ["alasan", "uraian"]);
  var idxStatus = findColIndex_(h, ["status", "status_verifikasi", "status verifikasi"]);
  var idxUrl = findColIndex_(h, ["url", "link", "dokumen", "file", "url_dokumen"]);

  var dstData = dstSheet.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < dstData.length; i++) {
    var idVal = String(dstData[i][0] || "").trim();
    if (idVal) existingIds[idVal] = true;
  }

  var now = new Date();
  var toInsert = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var nama = idxNama > -1 ? String(row[idxNama] || "").trim() : "";
    var nip = idxNip > -1 ? String(row[idxNip] || "").trim() : "";
    if (!nama && !nip) continue;

    var idLupa = idxId > -1 && row[idxId] ? String(row[idxId]).trim() : ("LUPA-" + (r + 1));
    if (existingIds[idLupa]) continue;

    toInsert.push([
      idLupa,
      idxTgl > -1 ? row[idxTgl] : "",
      nip,
      nama,
      idxNpsn > -1 ? String(row[idxNpsn] || "").trim() : "",
      idxUnit > -1 ? String(row[idxUnit] || "").trim() : "",
      idxJenis > -1 ? String(row[idxJenis] || "").trim() : "",
      idxAlasan > -1 ? String(row[idxAlasan] || "").trim() : "",
      idxStatus > -1 ? String(row[idxStatus] || "").trim() : "",
      idxUrl > -1 ? String(row[idxUrl] || "").trim() : "",
      now
    ]);
    existingIds[idLupa] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 11).setValues(toInsert);
  }

  Logger.log("Sync tbl_siaba_lupa selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Menyalin data Salah Presensi dari SIABA_SALAH_DB ke tbl_siaba_salah.
 */
function syncSiabaSalah() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SALAH_DB);
  var srcSheet = srcSs.getSheets()[0];
  if (!srcSheet) return { inserted: 0 };

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_salah");
  if (!dstSheet) throw new Error("Sheet 'tbl_siaba_salah' belum ada.");

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  var h = srcData[0];
  var idxId = findColIndex_(h, ["id", "id_salah", "no", "kode"]);
  var idxTgl = findColIndex_(h, ["tanggal", "tgl presensi", "tanggal_presensi"]);
  var idxNip = findColIndex_(h, ["nip"]);
  var idxNama = findColIndex_(h, ["nama", "nama ptk", "nama pegawai", "nama_lengkap"]);
  var idxNpsn = findColIndex_(h, ["npsn"]);
  var idxUnit = findColIndex_(h, ["unit kerja", "sekolah", "nama sekolah", "unit_kerja"]);
  var idxKet = findColIndex_(h, ["keterangan", "keterangan_salah", "kesalahan"]);
  var idxPerbaikan = findColIndex_(h, ["perbaikan", "usulan", "koreksi"]);
  var idxStatus = findColIndex_(h, ["status", "status_verifikasi", "status verifikasi"]);
  var idxUrl = findColIndex_(h, ["url", "link", "dokumen", "file", "url_dokumen"]);

  var dstData = dstSheet.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < dstData.length; i++) {
    var idVal = String(dstData[i][0] || "").trim();
    if (idVal) existingIds[idVal] = true;
  }

  var now = new Date();
  var toInsert = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var nama = idxNama > -1 ? String(row[idxNama] || "").trim() : "";
    var nip = idxNip > -1 ? String(row[idxNip] || "").trim() : "";
    if (!nama && !nip) continue;

    var idSalah = idxId > -1 && row[idxId] ? String(row[idxId]).trim() : ("SALAH-" + (r + 1));
    if (existingIds[idSalah]) continue;

    toInsert.push([
      idSalah,
      idxTgl > -1 ? row[idxTgl] : "",
      nip,
      nama,
      idxNpsn > -1 ? String(row[idxNpsn] || "").trim() : "",
      idxUnit > -1 ? String(row[idxUnit] || "").trim() : "",
      idxKet > -1 ? String(row[idxKet] || "").trim() : "",
      idxPerbaikan > -1 ? String(row[idxPerbaikan] || "").trim() : "",
      idxStatus > -1 ? String(row[idxStatus] || "").trim() : "",
      idxUrl > -1 ? String(row[idxUrl] || "").trim() : "",
      now
    ]);
    existingIds[idSalah] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 11).setValues(toInsert);
  }

  Logger.log("Sync tbl_siaba_salah selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Menyalin data TA/PA dari SIABA_TA_PA ke tbl_siaba_ta_pa.
 */
function syncSiabaTaPa() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_TA_PA);
  var srcSheet = srcSs.getSheets()[0];
  if (!srcSheet) return { inserted: 0 };

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_ta_pa");
  if (!dstSheet) throw new Error("Sheet 'tbl_siaba_ta_pa' belum ada.");

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  var h = srcData[0];
  var idxId = findColIndex_(h, ["id", "id_tapa", "no", "kode"]);
  var idxTgl = findColIndex_(h, ["tanggal", "tgl"]);
  var idxNip = findColIndex_(h, ["nip"]);
  var idxNama = findColIndex_(h, ["nama", "nama ptk", "nama pegawai", "nama_lengkap"]);
  var idxNpsn = findColIndex_(h, ["npsn"]);
  var idxUnit = findColIndex_(h, ["unit kerja", "sekolah", "nama sekolah", "unit_kerja"]);
  var idxJenis = findColIndex_(h, ["jenis", "kategori", "ta/pa"]);
  var idxKet = findColIndex_(h, ["keterangan", "alasan"]);
  var idxStatus = findColIndex_(h, ["status", "status_verifikasi", "status verifikasi"]);

  var dstData = dstSheet.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < dstData.length; i++) {
    var idVal = String(dstData[i][0] || "").trim();
    if (idVal) existingIds[idVal] = true;
  }

  var now = new Date();
  var toInsert = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var nama = idxNama > -1 ? String(row[idxNama] || "").trim() : "";
    var nip = idxNip > -1 ? String(row[idxNip] || "").trim() : "";
    if (!nama && !nip) continue;

    var idTapa = idxId > -1 && row[idxId] ? String(row[idxId]).trim() : ("TAPA-" + (r + 1));
    if (existingIds[idTapa]) continue;

    toInsert.push([
      idTapa,
      idxTgl > -1 ? row[idxTgl] : "",
      nip,
      nama,
      idxNpsn > -1 ? String(row[idxNpsn] || "").trim() : "",
      idxUnit > -1 ? String(row[idxUnit] || "").trim() : "",
      idxJenis > -1 ? String(row[idxJenis] || "").trim() : "",
      idxKet > -1 ? String(row[idxKet] || "").trim() : "",
      idxStatus > -1 ? String(row[idxStatus] || "").trim() : "",
      now
    ]);
    existingIds[idTapa] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 10).setValues(toInsert);
  }

  Logger.log("Sync tbl_siaba_ta_pa selesai. Ditambahkan: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Menyalin sheet referensi 'Data Atasan' dari SIABA_CUTI_DB ke tbl_siaba_data_atasan.
 */
function syncSiabaDataAtasan() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_CUTI_DB);
  var srcSheet = srcSs.getSheetByName("Data Atasan");
  if (!srcSheet) {
    Logger.log("Sheet 'Data Atasan' tidak ditemukan di SIABA_CUTI_DB.");
    return { inserted: 0 };
  }

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_data_atasan");
  if (!dstSheet) {
    setupSiabaSheets();
    dstSheet = dstSs.getSheetByName("tbl_siaba_data_atasan");
  }

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  dstSheet.clearContents();
  dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
  dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
  dstSheet.setFrozenRows(1);

  Logger.log("Sync tbl_siaba_data_atasan selesai. Total baris data: " + (srcData.length - 1));
  return { inserted: srcData.length - 1 };
}

/**
 * Menyalin sheet ringkasan 'Sisa CT' dari SIABA_CUTI_DB ke tbl_siaba_sisa_cuti.
 */
function syncSiabaSisaCuti() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_CUTI_DB);
  var srcSheet = srcSs.getSheetByName("Sisa CT");
  if (!srcSheet) {
    Logger.log("Sheet 'Sisa CT' tidak ditemukan di SIABA_CUTI_DB.");
    return { inserted: 0 };
  }

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_sisa_cuti");
  if (!dstSheet) {
    setupSiabaSheets();
    dstSheet = dstSs.getSheetByName("tbl_siaba_sisa_cuti");
  }

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { inserted: 0 };

  dstSheet.clearContents();
  dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
  dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
  dstSheet.setFrozenRows(1);

  Logger.log("Sync tbl_siaba_sisa_cuti selesai. Total baris data: " + (srcData.length - 1));
  return { inserted: srcData.length - 1 };
}

/**
 * Menyalin sheet 'Perjalanan_Dinas' dan 'Perjalanan_Dinas_Peserta' dari SIABA_DINAS_DB
 * ke SIKS_DB_SIABA dengan mempertahankan seluruh kolom aslinya.
 */
function syncSiabaDinasExact() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_DINAS_DB);
  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var pairs = [
    { src: "Perjalanan_Dinas", dst: "tbl_siaba_dinas" },
    { src: "Perjalanan_Dinas_Peserta", dst: "tbl_siaba_dinas_peserta" }
  ];

  var res = {};
  pairs.forEach(function (p) {
    var srcSheet = srcSs.getSheetByName(p.src);
    if (!srcSheet) { res[p.dst] = 0; return; }
    var dstSheet = dstSs.getSheetByName(p.dst) || dstSs.insertSheet(p.dst);
    var srcData = srcSheet.getDataRange().getDisplayValues();
    if (srcData.length < 2) { res[p.dst] = 0; return; }
    dstSheet.clearContents();
    dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
    dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
    dstSheet.setFrozenRows(1);
    res[p.dst] = srcData.length - 1;
  });

  Logger.log("syncSiabaDinasExact selesai: " + JSON.stringify(res));
  return res;
}

/**
 * Menyalin sheet 'Lupa_Presensi' dan 'Salah_Presensi' ke SIKS_DB_SIABA
 * dengan mempertahankan seluruh kolom aslinya.
 */
function syncSiabaLupaSalahExact() {
  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var pairs = [
    { dbKey: "SIABA_LUPA_DB", src: "Lupa_Presensi", dst: "tbl_siaba_lupa" },
    { dbKey: "SIABA_SALAH_DB", src: "Salah_Presensi", dst: "tbl_siaba_salah" }
  ];

  var res = {};
  pairs.forEach(function (p) {
    var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS[p.dbKey]);
    var srcSheet = srcSs.getSheetByName(p.src) || srcSs.getSheets()[0];
    if (!srcSheet) { res[p.dst] = 0; return; }
    var dstSheet = dstSs.getSheetByName(p.dst) || dstSs.insertSheet(p.dst);
    var srcData = srcSheet.getDataRange().getDisplayValues();
    if (srcData.length < 2) { res[p.dst] = 0; return; }
    dstSheet.clearContents();
    dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
    dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
    dstSheet.setFrozenRows(1);
    res[p.dst] = srcData.length - 1;
  });

  Logger.log("syncSiabaLupaSalahExact selesai: " + JSON.stringify(res));
  return res;
}

/**
 * Menyalin sheet 'Rekap_Terlambat' dan 'Rekap_Pulang_Awal' dari SIABA_TA_PA
 * ke SIKS_DB_SIABA dengan mempertahankan seluruh kolom aslinya.
 */
function syncSiabaTaPaExact() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_TA_PA);
  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var pairs = [
    { src: "Rekap_Terlambat", dst: "tbl_siaba_terlambat" },
    { src: "Rekap_Pulang_Awal", dst: "tbl_siaba_pulang_awal" }
  ];

  var res = {};
  pairs.forEach(function (p) {
    var srcSheet = srcSs.getSheetByName(p.src);
    if (!srcSheet) { res[p.dst] = 0; return; }
    var dstSheet = dstSs.getSheetByName(p.dst) || dstSs.insertSheet(p.dst);
    var srcData = srcSheet.getDataRange().getDisplayValues();
    if (srcData.length < 2) { res[p.dst] = 0; return; }
    dstSheet.clearContents();
    dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
    dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
    dstSheet.setFrozenRows(1);
    res[p.dst] = srcData.length - 1;
  });

  Logger.log("syncSiabaTaPaExact selesai: " + JSON.stringify(res));
  return res;
}

/**
 * Menyalin sheet 'SIABA_KONFIG_JAM_KERJA' dan 'SIABA_KALENDER_LIBUR' dari SIABA_KONFIG_DB
 * ke SIKS_DB_SIABA dengan mempertahankan seluruh kolom aslinya.
 */
function syncSiabaKonfigJadwal() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_KONFIG_DB);
  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var sheets = ["SIABA_KONFIG_JAM_KERJA", "SIABA_KALENDER_LIBUR"];

  var res = {};
  sheets.forEach(function (name) {
    var srcSheet = srcSs.getSheetByName(name);
    if (!srcSheet) { res[name] = 0; return; }
    var dstSheet = dstSs.getSheetByName(name) || dstSs.insertSheet(name);
    var srcData = srcSheet.getDataRange().getDisplayValues();
    if (srcData.length < 1) { res[name] = 0; return; }
    dstSheet.clearContents();
    dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
    dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
    dstSheet.setFrozenRows(1);
    res[name] = Math.max(0, srcData.length - 1);
  });

  Logger.log("syncSiabaKonfigJadwal selesai: " + JSON.stringify(res));
  return res;
}

/**
 * Menyalin sheet 'arsip_siaba' dan 'master_sekolah' dari ARSIP_SIABA_DB
 * ke SIKS_DB_SIABA dengan mempertahankan seluruh kolom aslinya.
 */
function syncSiabaArsip() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.ARSIP_SIABA_DB);
  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var pairs = [
    { src: "arsip_siaba", dst: "tbl_siaba_arsip" },
    { src: "master_sekolah", dst: "tbl_siaba_arsip_master" }
  ];

  var res = {};
  pairs.forEach(function (p) {
    var srcSheet = srcSs.getSheetByName(p.src);
    if (!srcSheet) { res[p.dst] = 0; return; }
    var dstSheet = dstSs.getSheetByName(p.dst) || dstSs.insertSheet(p.dst);
    var srcData = srcSheet.getDataRange().getDisplayValues();
    if (srcData.length < 1) { res[p.dst] = 0; return; }
    dstSheet.clearContents();
    dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
    dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
    dstSheet.setFrozenRows(1);
    res[p.dst] = Math.max(0, srcData.length - 1);
  });

  Logger.log("syncSiabaArsip selesai: " + JSON.stringify(res));
  return res;
}

/**
 * Menyalin sheet 'Form Cuti' (52 kolom A-AZ) dari SIABA_CUTI_DB ke tbl_siaba_form_cuti
 * di SIKS_DB_SIABA agar cetak PDF & seluruh fitur cuti berjalan 100% di database baru.
 */
function syncSiabaFormCutiExact() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_CUTI_DB);
  var srcSheet = srcSs.getSheetByName("Form Cuti");
  if (!srcSheet) return { tbl_siaba_form_cuti: 0 };

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_form_cuti") || dstSs.insertSheet("tbl_siaba_form_cuti");

  var srcData = srcSheet.getDataRange().getDisplayValues();
  if (srcData.length < 2) return { tbl_siaba_form_cuti: 0 };

  dstSheet.clearContents();
  dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
  dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
  dstSheet.setFrozenRows(1);

  Logger.log("syncSiabaFormCutiExact selesai: " + (srcData.length - 1) + " baris.");
  return { tbl_siaba_form_cuti: srcData.length - 1 };
}

/**
 * Membuat sheet tbl_siaba_riwayat_ct (8 kolom tetap) dan mengisi data awal tahun aktif
 * dari tbl_siaba_sisa_cuti di SIKS_DB_SIABA.
 */
function initRiwayatCtDariSisaCt(tahunAktif) {
  var tahun = String(tahunAktif || new Date().getFullYear());
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var srcSheet = ss.getSheetByName("tbl_siaba_sisa_cuti");
  if (!srcSheet || srcSheet.getLastRow() < 2) {
    return { inserted: 0, message: "tbl_siaba_sisa_cuti kosong." };
  }

  var dstSheet = ss.getSheetByName("tbl_siaba_riwayat_ct");
  if (!dstSheet) {
    dstSheet = ss.insertSheet("tbl_siaba_riwayat_ct");
    var headers = ["nip", "tahun", "jatah_tahun_ini", "sisa_n_1", "sisa_n_2", "total_hak_ct", "diambil", "sisa_akhir"];
    dstSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    dstSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    dstSheet.setFrozenRows(1);
  }

  var existing = {};
  if (dstSheet.getLastRow() >= 2) {
    var exData = dstSheet.getRange(2, 1, dstSheet.getLastRow() - 1, 2).getDisplayValues();
    for (var i = 0; i < exData.length; i++) {
      existing[String(exData[i][0]).trim() + "|" + String(exData[i][1]).trim()] = true;
    }
  }

  var srcData = srcSheet.getDataRange().getValues();
  var toInsert = [];
  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var nip = String(row[2] || "").trim();
    if (!nip || existing[nip + "|" + tahun]) continue;

    var n2 = Number(row[4]) || 0;
    var n1 = Number(row[5]) || 0;
    var n0 = Number(row[6]) || 12;
    var jmlN = Number(row[7]) || (n0 + n1 + n2);
    var diambil = Number(row[8]) || 0;
    var sisaAkhir = Number(row[12]) || (jmlN - diambil);

    toInsert.push([nip, tahun, n0, n1, n2, jmlN, diambil, sisaAkhir]);
    existing[nip + "|" + tahun] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 8).setValues(toInsert);
  }

  Logger.log("initRiwayatCtDariSisaCt (" + tahun + ") selesai: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Mengimpor riwayat CT tahun 2024 dan 2025 dari sheet 'Hitung Cuti' (SIABA_CUTI_DB)
 * ke tbl_siaba_riwayat_ct di SIKS_DB_SIABA tanpa menduplikasi data yang sudah ada.
 */
function importRiwayatCtHistoris() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_CUTI_DB);
  var srcSheet = srcSs.getSheetByName("Hitung Cuti");
  if (!srcSheet) return { inserted: 0, message: "Sheet 'Hitung Cuti' tidak ditemukan." };

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_riwayat_ct");
  if (!dstSheet) throw new Error("Jalankan initRiwayatCtDariSisaCt() terlebih dahulu.");

  var existing = {};
  if (dstSheet.getLastRow() >= 2) {
    var exData = dstSheet.getRange(2, 1, dstSheet.getLastRow() - 1, 2).getDisplayValues();
    for (var i = 0; i < exData.length; i++) {
      existing[String(exData[i][0]).trim() + "|" + String(exData[i][1]).trim()] = true;
    }
  }

  var data = srcSheet.getDataRange().getValues();
  var toInsert = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var nip = String(row[0] || "").trim();
    if (!nip) continue;

    // Tahun 2024: N-2 (5), N-1 (6), N (7), Jml 2024 (8), Diambil 2024 (9), Sisa CT 2024 (16)
    if (!existing[nip + "|2024"]) {
      toInsert.push([nip, "2024", Number(row[7]) || 0, Number(row[6]) || 0, Number(row[5]) || 0, Number(row[8]) || 0, Number(row[9]) || 0, Number(row[16]) || 0]);
      existing[nip + "|2024"] = true;
    }
    // Tahun 2025: N-2 (17), N-1 (18), N (19), Jml 2025 (20), Diambil 2025 (21), Sisa CT 2025 (28)
    if (!existing[nip + "|2025"]) {
      toInsert.push([nip, "2025", Number(row[19]) || 0, Number(row[18]) || 0, Number(row[17]) || 0, Number(row[20]) || 0, Number(row[21]) || 0, Number(row[28]) || 0]);
      existing[nip + "|2025"] = true;
    }
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, 8).setValues(toInsert);
  }

  Logger.log("importRiwayatCtHistoris (2024 & 2025) selesai: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Menghitung ulang seluruh saldo di tbl_siaba_riwayat_ct secara berantai (FIFO, maks 6 hari/tahun).
 * Jalankan setelah ada revisi jatah_tahun_ini atau diambil di tahun mana pun.
 */
function recalculateAllRiwayatCt() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var sheet = ss.getSheetByName("tbl_siaba_riwayat_ct");
  if (!sheet || sheet.getLastRow() < 2) return { updated: 0 };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  var byNip = {};
  for (var i = 0; i < data.length; i++) {
    var nip = String(data[i][0] || "").trim();
    if (!nip) continue;
    if (!byNip[nip]) byNip[nip] = [];
    byNip[nip].push({ idx: i, row: data[i] });
  }

  Object.keys(byNip).forEach(function (nip) {
    var list = byNip[nip];
    list.sort(function (a, b) { return Number(a.row[1]) - Number(b.row[1]); });

    var carryN1 = null;
    var carryN2 = null;
    for (var k = 0; k < list.length; k++) {
      var r = list[k].row;
      var n0 = Number(r[2]) || 0;
      var n1 = (carryN1 !== null) ? carryN1 : (Number(r[3]) || 0);
      var n2 = (carryN2 !== null) ? carryN2 : (Number(r[4]) || 0);
      var diambil = Number(r[6]) || 0;

      var totalHak = n0 + n1 + n2;
      var sisaAkhir = Math.max(0, totalHak - diambil);

      // FIFO: potong n2 -> n1 -> n0
      var sisaPakai = diambil;
      var remN2 = Math.max(0, n2 - sisaPakai);
      sisaPakai = Math.max(0, sisaPakai - n2);
      var remN1 = Math.max(0, n1 - sisaPakai);
      sisaPakai = Math.max(0, sisaPakai - n1);
      var remN0 = Math.max(0, n0 - sisaPakai);

      r[3] = n1;
      r[4] = n2;
      r[5] = totalHak;
      r[7] = sisaAkhir;

      carryN1 = Math.min(6, remN0);
      carryN2 = Math.min(6, remN1);
    }
  });

  sheet.getRange(2, 1, data.length, 8).setValues(data);
  Logger.log("recalculateAllRiwayatCt selesai: " + data.length + " baris diperbarui.");
  return { updated: data.length };
}

/**
 * Membuat baris jatah CT tahun baru di tbl_siaba_riwayat_ct untuk seluruh pegawai.
 * Contoh: generateJatahCtTahunBaru(2027)
 */
function generateJatahCtTahunBaru(tahunBaru) {
  var targetTahun = String(tahunBaru || (new Date().getFullYear() + 1));
  var prevTahun = String(Number(targetTahun) - 1);
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var sheet = ss.getSheetByName("tbl_siaba_riwayat_ct");
  if (!sheet || sheet.getLastRow() < 2) return { inserted: 0 };

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  var existingTarget = {};
  var prevRows = [];

  for (var i = 0; i < data.length; i++) {
    var nip = String(data[i][0] || "").trim();
    var th = String(data[i][1] || "").trim();
    if (th === targetTahun) existingTarget[nip] = true;
    if (th === prevTahun) prevRows.push(data[i]);
  }

  var toInsert = [];
  for (var p = 0; p < prevRows.length; p++) {
    var pr = prevRows[p];
    var pNip = String(pr[0] || "").trim();
    if (!pNip || existingTarget[pNip]) continue;

    var n0 = Number(pr[2]) || 0;
    var n1 = Number(pr[3]) || 0;
    var n2 = Number(pr[4]) || 0;
    var diambil = Number(pr[6]) || 0;

    var sisaPakai = diambil;
    sisaPakai = Math.max(0, sisaPakai - n2);
    var remN1 = Math.max(0, n1 - sisaPakai);
    sisaPakai = Math.max(0, sisaPakai - n1);
    var remN0 = Math.max(0, n0 - sisaPakai);

    var newN1 = Math.min(6, remN0);
    var newN2 = Math.min(6, remN1);
    var newN0 = 12;
    var totalHak = newN0 + newN1 + newN2;

    toInsert.push([pNip, targetTahun, newN0, newN1, newN2, totalHak, 0, totalHak]);
    existingTarget[pNip] = true;
  }

  if (toInsert.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toInsert.length, 8).setValues(toInsert);
  }

  Logger.log("generateJatahCtTahunBaru (" + targetTahun + ") selesai: " + toInsert.length + " baris.");
  return { inserted: toInsert.length };
}

/**
 * Menjalankan sinkronisasi semua modul SIABA sekaligus.
 */
function syncSiabaAll() {
  var cuti = syncSiabaCuti();
  var dinas = syncSiabaDinas();
  var lupa = syncSiabaLupa();
  var salah = syncSiabaSalah();
  var tapa = syncSiabaTaPa();
  Logger.log(
    "syncSiabaAll selesai: Cuti=" + cuti.inserted +
    ", Dinas=" + dinas.inserted +
    ", Lupa=" + lupa.inserted +
    ", Salah=" + salah.inserted +
    ", TAPA=" + tapa.inserted
  );
  return {
    cuti: cuti.inserted,
    dinas: dinas.inserted,
    lupa: lupa.inserted,
    salah: salah.inserted,
    tapa: tapa.inserted
  };
}

/**
 * Memasang jadwal otomatis (Trigger) agar syncSiabaAll() berjalan setiap malam pukul 01:30.
 * Cukup dijalankan SEKALI saja dari Apps Script Editor.
 */
function setupSiabaSyncTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncSiabaAll") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("syncSiabaAll")
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .nearMinute(30)
    .create();
  Logger.log("Trigger harian syncSiabaAll (pukul 01:30) berhasil dipasang.");
}
