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
 * Menyalin sheet 'Perjalanan_Dinas' dari SIABA_DINAS_DB ke tbl_siaba_dinas
 * dengan mempertahankan seluruh kolom aslinya agar siap dipakai langsung oleh Siaba_perjadin.gs.
 */
function syncSiabaDinasExact() {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_DINAS_DB);
  var srcSheet = srcSs.getSheetByName("Perjalanan_Dinas") || srcSs.getSheets()[0];
  if (!srcSheet) return { tbl_siaba_dinas: 0 };

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_SIABA);
  var dstSheet = dstSs.getSheetByName("tbl_siaba_dinas");
  if (!dstSheet) dstSheet = dstSs.insertSheet("tbl_siaba_dinas");

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return { tbl_siaba_dinas: 0 };

  dstSheet.clearContents();
  dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
  dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
  dstSheet.setFrozenRows(1);

  Logger.log("syncSiabaDinasExact selesai: " + (srcData.length - 1) + " baris.");
  return { tbl_siaba_dinas: srcData.length - 1 };
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
