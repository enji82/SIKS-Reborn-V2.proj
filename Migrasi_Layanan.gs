/* ======================================================================
   MIGRASI_LAYANAN.GS - SETUP & SINKRONISASI SIKS_DB_LAYANAN
   Tujuan:
   1. Membuat struktur sheet standar di SIKS_DB_LAYANAN.
   2. Menyalin data layanan & publik (SK, Aduan, E-Mading, KomBel,
      Kemitraan, TPG, Seragam) dari spreadsheet lama secara otomatis.
   ====================================================================== */

const LAYANAN_SCHEMA = {
  tbl_sk: [
    "id_sk", "nomor_sk", "tanggal_sk", "tentang", "npsn", "unit_kerja",
    "nama_ptk", "nip", "url_file", "status", "updated_at"
  ],
  tbl_aduan: [
    "id_aduan", "tanggal", "pelapor", "npsn", "unit_kerja", "kategori",
    "judul", "isi_aduan", "status", "tindak_lanjut", "url_lampiran", "updated_at"
  ],
  tbl_emading: [
    "id_mading", "tanggal", "judul", "kategori", "penulis", "npsn",
    "isi", "url_gambar", "status", "updated_at"
  ],
  tbl_kombel: [
    "id_kombel", "nama_kombel", "npsn", "unit_kerja", "ketua",
    "jumlah_anggota", "kegiatan", "tanggal", "url_dokumen", "updated_at"
  ],
  tbl_kemitraan: [
    "id_kemitraan", "nama_mitra", "jenis_kerjasama", "npsn", "unit_kerja",
    "tanggal_mulai", "tanggal_selesai", "status", "url_dokumen", "updated_at"
  ],
  tbl_tpg_perbaikan: [
    "id_tpg", "tanggal", "nip", "nama_ptk", "npsn", "unit_kerja",
    "jenis_perbaikan", "keterangan", "status", "url_dokumen", "updated_at"
  ],
  tbl_seragam: [
    "id_seragam", "tanggal", "npsn", "nama_sekolah", "jumlah_penerima",
    "status", "url_dokumen", "updated_at"
  ],
  tbl_lapbul_sd: ["id_lapbul", "npsn", "nama_sekolah", "bulan", "tahun", "status", "url_file", "updated_at"],
  tbl_lapbul_paud: ["id_lapbul", "npsn", "nama_sekolah", "bulan", "tahun", "status", "url_file", "updated_at"]
};

/**
 * Membuat 7 sheet standar di SIKS_DB_LAYANAN beserta baris header-nya.
 * Aman dijalankan berulang kali.
 */
function setupLayananSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_LAYANAN);
  var created = [];
  var existing = [];

  Object.keys(LAYANAN_SCHEMA).forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var headers = LAYANAN_SCHEMA[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      created.push(sheetName);
    } else {
      existing.push(sheetName);
    }
  });

  Logger.log("Setup LAYANAN selesai. Dibuat: " + created.join(", ") + " | Sudah ada: " + existing.join(", "));
  return { created: created, existing: existing };
}

/**
 * Helper generik untuk menyalin data dari spreadsheet lama ke sheet target di SIKS_DB_LAYANAN.
 */
function syncGenericLayanan_(srcDbKey, dstSheetName, prefixId, colCount, mapperFn) {
  var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS[srcDbKey]);
  var srcSheet = srcSs.getSheets()[0];
  if (!srcSheet) return 0;

  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_LAYANAN);
  var dstSheet = dstSs.getSheetByName(dstSheetName);
  if (!dstSheet) throw new Error("Sheet '" + dstSheetName + "' belum ada. Jalankan setupLayananSheets() terlebih dahulu.");

  var srcData = srcSheet.getDataRange().getValues();
  if (srcData.length < 2) return 0;

  var dstData = dstSheet.getDataRange().getValues();
  var existingIds = {};
  for (var i = 1; i < dstData.length; i++) {
    var idVal = String(dstData[i][0] || "").trim();
    if (idVal) existingIds[idVal] = true;
  }

  var h = srcData[0];
  var now = new Date();
  var toInsert = [];

  for (var r = 1; r < srcData.length; r++) {
    var row = srcData[r];
    var mapped = mapperFn(row, h, r, prefixId, now);
    if (!mapped) continue;
    var id = String(mapped[0] || "").trim();
    if (!id || existingIds[id]) continue;
    toInsert.push(mapped);
    existingIds[id] = true;
  }

  if (toInsert.length > 0) {
    dstSheet.getRange(dstSheet.getLastRow() + 1, 1, toInsert.length, colCount).setValues(toInsert);
  }
  Logger.log("Sync " + dstSheetName + " selesai. Ditambahkan: " + toInsert.length + " baris.");
  return toInsert.length;
}

/**
 * Menjalankan sinkronisasi semua modul di SIKS_DB_LAYANAN sekaligus.
 */
function syncLayananAll() {
  var res = {};

  res.sk = syncGenericLayanan_("SK_DATA_DB", "tbl_sk", "SK", 11, function (row, h, r, prefix, now) {
    var iId = findColIndex_(h, ["id", "id_sk", "no"]);
    var iNo = findColIndex_(h, ["nomor", "nomor_sk", "no_sk", "no sk"]);
    var iTgl = findColIndex_(h, ["tanggal", "tanggal_sk", "tgl sk"]);
    var iTentang = findColIndex_(h, ["tentang", "perihal", "judul", "keterangan"]);
    var iNpsn = findColIndex_(h, ["npsn"]);
    var iUnit = findColIndex_(h, ["sekolah", "unit kerja", "unit_kerja", "nama sekolah"]);
    var iNama = findColIndex_(h, ["nama", "nama ptk", "nama_ptk"]);
    var iNip = findColIndex_(h, ["nip"]);
    var iUrl = findColIndex_(h, ["url", "link", "file", "url_file"]);
    var iStatus = findColIndex_(h, ["status"]);
    var noSk = iNo > -1 ? String(row[iNo] || "").trim() : "";
    var tentang = iTentang > -1 ? String(row[iTentang] || "").trim() : "";
    if (!noSk && !tentang) return null;
    var id = (iId > -1 && row[iId]) ? String(row[iId]).trim() : (prefix + "-" + (r + 1));
    return [id, noSk, iTgl > -1 ? row[iTgl] : "", tentang, iNpsn > -1 ? String(row[iNpsn] || "") : "", iUnit > -1 ? String(row[iUnit] || "") : "", iNama > -1 ? String(row[iNama] || "") : "", iNip > -1 ? String(row[iNip] || "") : "", iUrl > -1 ? String(row[iUrl] || "") : "", iStatus > -1 ? String(row[iStatus] || "") : "", now];
  });

  res.aduan = syncGenericLayanan_("ADUAN_DB", "tbl_aduan", "ADU", 12, function (row, h, r, prefix, now) {
    var iId = findColIndex_(h, ["id", "id_aduan", "no"]);
    var iTgl = findColIndex_(h, ["tanggal", "timestamp", "tgl"]);
    var iPelapor = findColIndex_(h, ["pelapor", "nama", "pengirim"]);
    var iNpsn = findColIndex_(h, ["npsn"]);
    var iUnit = findColIndex_(h, ["sekolah", "unit kerja", "unit_kerja"]);
    var iKat = findColIndex_(h, ["kategori", "jenis"]);
    var iJudul = findColIndex_(h, ["judul", "perihal", "topik"]);
    var iIsi = findColIndex_(h, ["isi", "isi_aduan", "uraian", "keluhan", "keterangan"]);
    var iStatus = findColIndex_(h, ["status"]);
    var iTindak = findColIndex_(h, ["tindak lanjut", "tindak_lanjut", "respon", "tanggapan"]);
    var iUrl = findColIndex_(h, ["url", "link", "lampiran", "file"]);
    var isi = iIsi > -1 ? String(row[iIsi] || "").trim() : "";
    var judul = iJudul > -1 ? String(row[iJudul] || "").trim() : "";
    if (!isi && !judul) return null;
    var id = (iId > -1 && row[iId]) ? String(row[iId]).trim() : (prefix + "-" + (r + 1));
    return [id, iTgl > -1 ? row[iTgl] : "", iPelapor > -1 ? String(row[iPelapor] || "") : "", iNpsn > -1 ? String(row[iNpsn] || "") : "", iUnit > -1 ? String(row[iUnit] || "") : "", iKat > -1 ? String(row[iKat] || "") : "", judul, isi, iStatus > -1 ? String(row[iStatus] || "") : "", iTindak > -1 ? String(row[iTindak] || "") : "", iUrl > -1 ? String(row[iUrl] || "") : "", now];
  });

  res.emading = syncGenericLayanan_("EMADING_DB", "tbl_emading", "EMD", 10, function (row, h, r, prefix, now) {
    var iId = findColIndex_(h, ["id", "id_mading", "no"]);
    var iTgl = findColIndex_(h, ["tanggal", "tgl", "timestamp"]);
    var iJudul = findColIndex_(h, ["judul", "title"]);
    var iKat = findColIndex_(h, ["kategori"]);
    var iPenulis = findColIndex_(h, ["penulis", "author", "nama"]);
    var iNpsn = findColIndex_(h, ["npsn"]);
    var iIsi = findColIndex_(h, ["isi", "konten", "deskripsi"]);
    var iUrl = findColIndex_(h, ["url", "gambar", "foto", "link"]);
    var iStatus = findColIndex_(h, ["status"]);
    var judul = iJudul > -1 ? String(row[iJudul] || "").trim() : "";
    if (!judul) return null;
    var id = (iId > -1 && row[iId]) ? String(row[iId]).trim() : (prefix + "-" + (r + 1));
    return [id, iTgl > -1 ? row[iTgl] : "", judul, iKat > -1 ? String(row[iKat] || "") : "", iPenulis > -1 ? String(row[iPenulis] || "") : "", iNpsn > -1 ? String(row[iNpsn] || "") : "", iIsi > -1 ? String(row[iIsi] || "") : "", iUrl > -1 ? String(row[iUrl] || "") : "", iStatus > -1 ? String(row[iStatus] || "") : "", now];
  });

  res.kombel = syncGenericLayanan_("KOMBEL_DB", "tbl_kombel", "KMB", 10, function (row, h, r, prefix, now) {
    var iId = findColIndex_(h, ["id", "id_kombel", "no"]);
    var iNama = findColIndex_(h, ["nama kombel", "nama_kombel", "nama", "komunitas"]);
    var iNpsn = findColIndex_(h, ["npsn"]);
    var iUnit = findColIndex_(h, ["sekolah", "unit kerja", "unit_kerja"]);
    var iKetua = findColIndex_(h, ["ketua", "koordinator", "penanggung jawab"]);
    var iJml = findColIndex_(h, ["jumlah", "jumlah anggota", "anggota"]);
    var iKeg = findColIndex_(h, ["kegiatan", "deskripsi", "materi"]);
    var iTgl = findColIndex_(h, ["tanggal", "tgl"]);
    var iUrl = findColIndex_(h, ["url", "link", "dokumen", "file"]);
    var nama = iNama > -1 ? String(row[iNama] || "").trim() : "";
    if (!nama) return null;
    var id = (iId > -1 && row[iId]) ? String(row[iId]).trim() : (prefix + "-" + (r + 1));
    return [id, nama, iNpsn > -1 ? String(row[iNpsn] || "") : "", iUnit > -1 ? String(row[iUnit] || "") : "", iKetua > -1 ? String(row[iKetua] || "") : "", iJml > -1 ? row[iJml] : "", iKeg > -1 ? String(row[iKeg] || "") : "", iTgl > -1 ? row[iTgl] : "", iUrl > -1 ? String(row[iUrl] || "") : "", now];
  });

  res.kemitraan = syncGenericLayanan_("KEMITRAAN_DB", "tbl_kemitraan", "MTR", 10, function (row, h, r, prefix, now) {
    var iId = findColIndex_(h, ["id", "id_kemitraan", "no"]);
    var iMitra = findColIndex_(h, ["nama mitra", "nama_mitra", "mitra", "instansi"]);
    var iJenis = findColIndex_(h, ["jenis", "jenis kerjasama", "jenis_kerjasama"]);
    var iNpsn = findColIndex_(h, ["npsn"]);
    var iUnit = findColIndex_(h, ["sekolah", "unit kerja", "unit_kerja"]);
    var iMulai = findColIndex_(h, ["mulai", "tanggal mulai", "tanggal_mulai"]);
    var iSelesai = findColIndex_(h, ["selesai", "tanggal selesai", "tanggal_selesai"]);
    var iStatus = findColIndex_(h, ["status"]);
    var iUrl = findColIndex_(h, ["url", "link", "dokumen", "file"]);
    var mitra = iMitra > -1 ? String(row[iMitra] || "").trim() : "";
    if (!mitra) return null;
    var id = (iId > -1 && row[iId]) ? String(row[iId]).trim() : (prefix + "-" + (r + 1));
    return [id, mitra, iJenis > -1 ? String(row[iJenis] || "") : "", iNpsn > -1 ? String(row[iNpsn] || "") : "", iUnit > -1 ? String(row[iUnit] || "") : "", iMulai > -1 ? row[iMulai] : "", iSelesai > -1 ? row[iSelesai] : "", iStatus > -1 ? String(row[iStatus] || "") : "", iUrl > -1 ? String(row[iUrl] || "") : "", now];
  });

  Logger.log("syncLayananAll selesai: " + JSON.stringify(res));
  return res;
}

/**
 * Memasang jadwal otomatis (Trigger) agar syncLayananAll() berjalan setiap malam pukul 02:00.
 * Cukup dijalankan SEKALI saja dari Apps Script Editor.
 */
function setupLayananSyncTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncLayananAll") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("syncLayananAll")
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  Logger.log("Trigger harian syncLayananAll (pukul 02:00) berhasil dipasang.");
}

/**
 * Menyalin data Laporan Bulanan (Input SD & Input PAUD) ke SIKS_DB_LAYANAN
 * dengan mempertahankan seluruh kolom aslinya agar siap dipakai langsung oleh Lapbul.gs.
 */
function syncLapbulAll() {
  var dstSs = SpreadsheetApp.openById(SPREADSHEET_IDS.SIKS_DB_LAYANAN);
  var sources = [
    { dbKey: "LAPBUL_SD_DB", srcSheetName: "Input SD", dstSheetName: "tbl_lapbul_sd" },
    { dbKey: "LAPBUL_PAUD_DB", srcSheetName: "Input PAUD", dstSheetName: "tbl_lapbul_paud" }
  ];

  var result = {};
  sources.forEach(function (src) {
    var srcSs = SpreadsheetApp.openById(SPREADSHEET_IDS[src.dbKey]);
    var srcSheet = srcSs.getSheetByName(src.srcSheetName);
    if (!srcSheet) {
      result[src.dstSheetName] = 0;
      return;
    }

    var dstSheet = dstSs.getSheetByName(src.dstSheetName);
    if (!dstSheet) {
      dstSheet = dstSs.insertSheet(src.dstSheetName);
    }

    var srcData = srcSheet.getDataRange().getValues();
    if (srcData.length < 2) {
      result[src.dstSheetName] = 0;
      return;
    }

    dstSheet.clearContents();
    dstSheet.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
    dstSheet.getRange(1, 1, 1, srcData[0].length).setFontWeight("bold");
    dstSheet.setFrozenRows(1);
    result[src.dstSheetName] = srcData.length - 1;
  });

  Logger.log("syncLapbulAll selesai: " + JSON.stringify(result));
  return result;
}
