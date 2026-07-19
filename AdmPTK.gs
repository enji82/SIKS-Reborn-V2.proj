/* ======================================================================
   MODUL: ADMINISTRASI PTK (ARSIP DIGITAL DOKUMEN HASIL PEKERJAAN PEGAWAI)
   DB Key    : ADM_PTK_DB   (Spreadsheet: 1upUTFyD97ylynU1ekUQ9VVJphTrh-kfSvu89dwqEPUw)
   Folder    : ADM_PTK_DOCS (Drive: 1oAHVo-cX9SyglDZtF2fiQWArBZr-PygB)
   
   PERBEDAAN DENGAN AdmSekolah.gs:
   - Unit utama  : PTK (Pegawai/Guru), bukan Sekolah (NPSN)
   - Identitas   : Nama PTK + NIP
   - Akses user  : User sekolah hanya bisa akses PTK dari sekolahnya (berdasarkan NPSN user)
   - Folder Drive: <Nama PTK> - <NIP> (langsung di root folder)
   - Nama file   : <Nama Dokumen> - <Tahun> - <Periode>.<ext>
   ====================================================================== */

const KONFIG_ADM_PTK = {
  DB_KEY: "ADM_PTK_DB",
  get FOLDER_ID() { return FOLDER_CONFIG.ADM_PTK_DOCS; }
};

function getOrCreateSheetAdmPtk(sheetName) {
  var ss = getDB(KONFIG_ADM_PTK.DB_KEY);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "Master_Kategori") {
      sheet.appendRow(["ID_Kategori", "Nama_Dokumen", "Format_File", "Ukuran_File", "Jenis_Periode", "Keterangan", "Status", "Integrasi_Dashboard", "Klasifikasi_Jenjang", "Klasifikasi_Kepegawaian", "Klasifikasi_Tugas"]);
    } else if (sheetName === "Database_Dokumen") {
      sheet.appendRow(["ID_PTK", "Nama_PTK", "NIP", "NPSN", "ID_Kategori", "Nama_Kategori", "Tahun", "Nama_File", "URL_File", "Status", "Catatan", "Tgl_Upload", "Uploader", "Tgl_Verif", "Verifikator", "Periode", "Tgl_Edit", "User_Edit"]);
    }
  } else {
    // Migrasi kolom jika sheet Master_Kategori sudah ada tapi belum punya kolom klasifikasi
    if (sheetName === "Master_Kategori" && sheet.getLastColumn() < 9) {
      sheet.getRange(1, 9, 1, 3).setValues([["Klasifikasi_Jenjang", "Klasifikasi_Kepegawaian", "Klasifikasi_Tugas"]]);
    }
  }
  return sheet;
}

/* -----------------------------------------------------------------------
   HELPER: Ambil daftar PTK dari sheet Master Data GTK (PTK_DB)
   Menggabungkan data dari: Master Data GTK (SDN), Master Data GTK PAUD, Master Data GTK SDS
   Filter: berdasarkan NPSN jika user bukan admin
   ----------------------------------------------------------------------- */
function admPtk_getDaftarPtk(npsnFilter) {
  /* Mapping DB key yang benar per jenjang:
     - SD & SDS  → PTK_DB      (1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE)
     - PAUD      → PTK_PAUD_DB (1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU)
     Kolom berbeda antar jenjang:
     - SD/SDS : A=ID(0) B=NPSN(1) C=Unit(2) G=NamaLengkap(6) H=NIP(7)  T=StatusPeg(19) Z=Tugas(25)
     - PAUD   : A=ID(0) B=NPSN(1) C=Unit(2) H=NamaLengkap(7) I=NIY(8)  U=StatusPeg(20)
     CATATAN: filter bisa berupa NPSN angka ATAU nama unit/sekolah (dari user.unit sesi login).
     Gunakan try/catch per-sheet agar error satu jenjang tidak mempengaruhi lainnya. */
  var sheets = [
    { dbKey: "PTK_DB",      sheetName: "Master Data GTK",      jenjang: "SD",   namaCol: 6,  nipCol: 7,  statusCol: 19, tugasCol: 25, colCount: 26 },
    { dbKey: "PTK_PAUD_DB", sheetName: "Master Data GTK PAUD", jenjang: "PAUD", namaCol: 7,  nipCol: 8,  statusCol: 20, tugasCol: -1, colCount: 26 },
    { dbKey: "PTK_DB",      sheetName: "Master Data GTK SDS",  jenjang: "SDS",  namaCol: 6,  nipCol: 7,  statusCol: 19, tugasCol: 20, colCount: 26 }
  ];
  var result = [];
  var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
  // Cek apakah filter berupa angka NPSN murni atau nama sekolah
  var filterIsNpsn = /^[0-9]+$/.test(targetNpsn);
 
  sheets.forEach(function(s) {
    try {
      var sheet = getSheet(s.dbKey, s.sheetName);
      if (!sheet) return;
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      var maxCol = sheet.getLastColumn();
      var readCol = Math.min(maxCol, s.colCount);
      var data = sheet.getRange(2, 1, lastRow - 1, readCol).getDisplayValues();
      data.forEach(function(row) {
        if (!row[0]) return;
        var rNpsn = String(row[1] || "").trim().toUpperCase();
        var rUnit = String(row[2] || "").trim().toUpperCase();
        if (targetNpsn && targetNpsn !== "SEMUA") {
          // Cocokkan dengan NPSN (kolom B) ATAU dengan nama unit (kolom C)
          var matchNpsn = (rNpsn === targetNpsn);
          var matchUnit = (!filterIsNpsn && rUnit === targetNpsn);
          if (!matchNpsn && !matchUnit) return;
        }
        var nama = String(row[s.namaCol] || "").trim();
        var nip  = String(row[s.nipCol]  || "").trim();
        if (!nama) return;
        result.push({
          id:         String(row[0]).trim(),
          npsn:       rNpsn,
          unit:       String(row[2] || "").trim(),
          nama:       nama,
          nip:        nip,
          jenjang:    s.jenjang,
          status_peg: String(row[s.statusCol] || "").trim(),
          tugas:      (s.tugasCol !== -1 && s.tugasCol < readCol) ? String(row[s.tugasCol] || "").trim() : "",
          folderKey:  nip ? (nama + " - " + nip) : nama
        });
      });
    } catch(sheetErr) {
      Logger.log("admPtk_getDaftarPtk skip sheet [" + s.sheetName + "]: " + sheetErr.message);
    }
  });

  result.sort(function(a, b) { return a.nama.localeCompare(b.nama); });
  return result;
}

/* Helper filter kecocokan PTK terhadap Rule Klasifikasi Kategori */
function admPtk_apakahPtkCocokKlasifikasi(ptk, ruleJenjang, ruleKepegawaian, ruleTugas) {
  // 1. Filter Jenjang
  if (ruleJenjang && ruleJenjang.trim() !== "" && ruleJenjang.trim() !== "SEMUA") {
    var arrJ = ruleJenjang.split(",").map(function(x){ return x.trim().toUpperCase(); });
    var pJenjang = String(ptk.jenjang || "").toUpperCase();
    var matchJ = arrJ.indexOf(pJenjang) !== -1;
    if (pJenjang === "SDS" && arrJ.indexOf("SD") !== -1) matchJ = true;
    if (!matchJ) return false;
  }

  // 2. Filter Status Kepegawaian
  if (ruleKepegawaian && ruleKepegawaian.trim() !== "" && ruleKepegawaian.trim() !== "SEMUA") {
    var arrK = ruleKepegawaian.split(",").map(function(x){ return x.trim().toUpperCase(); });
    var pPeg = String(ptk.status_peg || "").toUpperCase();
    if (arrK.indexOf(pPeg) === -1) return false;
  }

  // 3. Filter Tugas
  if (ruleTugas && ruleTugas.trim() !== "" && ruleTugas.trim() !== "SEMUA") {
    var arrT = ruleTugas.split(",").map(function(x){ return x.trim().toUpperCase(); });
    var pTug = String(ptk.tugas || "").toUpperCase();
    if (arrT.indexOf(pTug) === -1) return false;
  }

  return true;
}


/* ----------------------------------------------------------------------
   1. MASTER KATEGORI
   ---------------------------------------------------------------------- */
function getAdmPtkMasterData(npsnFilter) {
  try {
    var shKat = getOrCreateSheetAdmPtk("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var resKat = [];
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() !== "") {
        var isAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE";
        if (!isAktif) continue;
        resKat.push({
          idKat:            dataKat[i][0],
          namaKat:          dataKat[i][1],
          format:           dataKat[i][2] ? String(dataKat[i][2]).trim().toUpperCase() : "PDF",
          ukuran:           dataKat[i][3] ? String(dataKat[i][3]).trim() : "2",
          jenisPeriode:     dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "",
          keterangan:       dataKat[i][5] ? String(dataKat[i][5]).trim() : "",
          integrasiDashboard: dataKat[i][7] ? String(dataKat[i][7]).trim().toUpperCase() : "TRUE",
          klasifikasiJenjang: dataKat[i][8] ? String(dataKat[i][8]).trim() : "SEMUA",
          klasifikasiKepegawaian: dataKat[i][9] ? String(dataKat[i][9]).trim() : "SEMUA",
          klasifikasiTugas:   dataKat[i][10] ? String(dataKat[i][10]).trim() : "SEMUA"
        });
      }
    }

    var isAdminInit = !npsnFilter || String(npsnFilter).trim() === "" || String(npsnFilter).trim().toUpperCase() === "SEMUA";

    // Untuk admin init (SEMUA): hanya kembalikan kategori + daftar sekolah, TANPA PTK
    // PTK akan dimuat terpisah saat admin memilih sekolah tertentu
    var resPtk = [];
    if (!isAdminInit) {
      resPtk = admPtk_getDaftarPtk(npsnFilter);
    }

    // Ambil daftar sekolah jika diakses oleh admin
    var resSekolah = [];
    if (isAdminInit) {
      var shSekolah = getSheet("USER_DB", "Data_Sekolah");
      var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
      for (var j = 1; j < dataSekolah.length; j++) {
        var rNpsn = String(dataSekolah[j][0]).trim();
        var rNama = String(dataSekolah[j][2]).trim();
        if (rNpsn !== "") {
          resSekolah.push({ npsn: rNpsn, nama: rNama });
        }
      }
      resSekolah.sort(function(a, b) { return a.nama.localeCompare(b.nama); });
    }

    return JSON.stringify({ success: true, kategori: resKat, ptk: resPtk, sekolah: resSekolah });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function simpanAdmPtkMaster(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetAdmPtk("Master_Kategori");
    var data = sheet.getDataRange().getValues();
    var idKategori = String(payload.idKat || "").trim();
    if (!idKategori) return JSON.stringify({ success: false, message: "ID Kategori tidak boleh kosong." });

    var isUpdate = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === idKategori) {
        sheet.getRange(i + 1, 2).setValue(payload.namaKat);
        sheet.getRange(i + 1, 3).setValue(payload.format);
        sheet.getRange(i + 1, 4).setValue(payload.ukuran);
        sheet.getRange(i + 1, 5).setValue(payload.jenisPeriode);
        sheet.getRange(i + 1, 6).setValue(payload.keterangan);
        sheet.getRange(i + 1, 7).setValue(payload.status);
        sheet.getRange(i + 1, 8).setValue(payload.integrasi);
        sheet.getRange(i + 1, 9).setValue(payload.klasifikasiJenjang || "SEMUA");
        sheet.getRange(i + 1, 10).setValue(payload.klasifikasiKepegawaian || "SEMUA");
        sheet.getRange(i + 1, 11).setValue(payload.klasifikasiTugas || "SEMUA");
        isUpdate = true;
        break;
      }
    }

    if (!isUpdate) {
      sheet.appendRow([idKategori, payload.namaKat, payload.format, payload.ukuran, payload.jenisPeriode, payload.keterangan, payload.status, payload.integrasi, payload.klasifikasiJenjang || "SEMUA", payload.klasifikasiKepegawaian || "SEMUA", payload.klasifikasiTugas || "SEMUA"]);
    }

    SpreadsheetApp.flush();
    invalidateAdmPtkDashboardCache();
    return JSON.stringify({ success: true, message: "Kategori berhasil disimpan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function hapusAdmPtkMaster(idKategori) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetAdmPtk("Master_Kategori");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet Master_Kategori tidak ditemukan." });
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idKategori).trim()) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        invalidateAdmPtkDashboardCache();
        return JSON.stringify({ success: true, message: "Kategori berhasil dihapus." });
      }
    }
    return JSON.stringify({ success: false, message: "Kategori tidak ditemukan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}


/* ----------------------------------------------------------------------
   2. KELOLA DOKUMEN (CRUD)
   ---------------------------------------------------------------------- */
function getAdmPtkData(npsnFilter) {
  try {
    var sheet = getOrCreateSheetAdmPtk("Database_Dokumen");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet Database_Dokumen tidak ditemukan." });

    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();

    for (var i = 1; i < data.length; i++) {
      var rNpsn = String(data[i][3] || "").trim().toUpperCase();
      if (targetNpsn && targetNpsn !== "SEMUA" && rNpsn !== targetNpsn) continue;
      if (!data[i][0]) continue;

      result.push({
        rowId:         i + 1,
        id_ptk:        data[i][0],
        nama_ptk:      data[i][1],
        nip:           data[i][2],
        npsn:          rNpsn,
        id_kategori:   data[i][4],
        nama_kategori: data[i][5],
        tahun:         data[i][6],
        file_name:     data[i][7],
        url:           data[i][8],
        status:        data[i][9],
        catatan:       data[i][10],
        tgl_upload:    data[i][11],
        uploader:      data[i][12],
        tgl_verif:     data[i][13] || "-",
        verifikator:   data[i][14] || "-",
        periode:       data[i][15] || "-",
        tgl_edit:      data[i][16] || "-",
        user_edit:     data[i][17] || "-"
      });
    }
    result.sort(function(a, b) { return b.rowId - a.rowId; });
    return JSON.stringify({ success: true, data: result });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function admPtkCheckDuplikat(sheet, idPtk, idKategori, tahun, periode) {
  var data = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < data.length; i++) {
    var rId    = String(data[i][0]).trim();
    var rKat   = String(data[i][4]).trim();
    var rThn   = String(data[i][6]).trim();
    var rPer   = String(data[i][15] || "-").trim();
    if (rId === String(idPtk).trim() && rKat === String(idKategori).trim() && rThn === String(tahun).trim() && rPer === String(periode).trim()) {
      return { ada: true, status: String(data[i][9]).trim() };
    }
  }
  return { ada: false };
}

/* Simpan batch upload dokumen PTK */
function simpanAdmPtkBatch(batchData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = getDB(KONFIG_ADM_PTK.DB_KEY);
    var sheet = ss.getSheetByName("Database_Dokumen");
    if (!sheet) {
      sheet = ss.insertSheet("Database_Dokumen");
      sheet.appendRow(["ID_PTK", "Nama_PTK", "NIP", "NPSN", "ID_Kategori", "Nama_Kategori", "Tahun", "Nama_File", "URL_File", "Status", "Catatan", "Tgl_Upload", "Uploader", "Tgl_Verif", "Verifikator", "Periode", "Tgl_Edit", "User_Edit"]);
    }

    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    var rootFolder = DriveApp.getFolderById(KONFIG_ADM_PTK.FOLDER_ID);
    var rowsToAppend = [];
    var laporan = [];
    var berhasilCount = 0;
    var skipCount = 0;

    for (var i = 0; i < batchData.length; i++) {
      var item = batchData[i];
      var periodeItem = String(item.periode || "-").trim();

      // Proteksi duplikat
      var duplikat = admPtkCheckDuplikat(sheet, item.id_ptk, item.id_kategori, item.tahun, periodeItem);
      if (duplikat.ada) {
        var alasan = (duplikat.status.toLowerCase().includes('setuju') || duplikat.status.toLowerCase().includes('ok'))
          ? "Sudah Disetujui, tidak dapat diubah lagi."
          : "Sudah ada dengan status '" + duplikat.status + "'. Gunakan tombol Edit (✏️).";
        laporan.push({ nama_kategori: item.nama_kategori, tahun: item.tahun, periode: periodeItem, result: "SKIP", alasan: alasan });
        skipCount++;
        continue;
      }

      var fileUrl = "";
      if (item.fileBase64) {
        // Buat / cari folder pegawai: <Nama PTK> - <NIP>
        var folderKey = item.folder_key || item.nama_ptk;
        var iterFolder = rootFolder.getFoldersByName(folderKey);
        var fPtk = iterFolder.hasNext() ? iterFolder.next() : rootFolder.createFolder(folderKey);

        // Nama file: <Nama Dokumen> - <Tahun> - <Periode>.<ext>
        var ext = item.nama_file.split('.').pop().toLowerCase();
        var nf = item.nama_kategori + " - " + item.tahun + (periodeItem && periodeItem !== "-" ? " - " + periodeItem : "") + "." + ext;

        var blob = Utilities.newBlob(Utilities.base64Decode(item.fileBase64), item.mimeType, nf);
        var file = fPtk.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } else {
        laporan.push({ nama_kategori: item.nama_kategori, tahun: item.tahun, periode: periodeItem, result: "ERROR", alasan: "File tidak valid atau kosong." });
        skipCount++;
        continue;
      }

      rowsToAppend.push([
        item.id_ptk, item.nama_ptk, item.nip, item.npsn,
        item.id_kategori, item.nama_kategori, item.tahun,
        nf, fileUrl, "Diproses", "", "'" + now,
        item.user_login, "", "", periodeItem, "", ""
      ]);
      laporan.push({ nama_kategori: item.nama_kategori, tahun: item.tahun, periode: periodeItem, result: "OK", alasan: "" });
      berhasilCount++;
    }

    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    }
    SpreadsheetApp.flush();
    invalidateAdmPtkDashboardCache();

    var msg;
    if (berhasilCount > 0 && skipCount === 0) {
      msg = berhasilCount + " dokumen berhasil diunggah.";
    } else if (berhasilCount > 0 && skipCount > 0) {
      msg = berhasilCount + " dokumen berhasil, " + skipCount + " dilewati.";
    } else {
      msg = "Tidak ada dokumen yang berhasil diunggah. " + skipCount + " dokumen dilewati.";
    }

    return JSON.stringify({ success: berhasilCount > 0, message: msg, berhasil: berhasilCount, skip: skipCount, laporan: laporan });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function perbaikiAdmPtkData(payload, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var sheet = getOrCreateSheetAdmPtk("Database_Dokumen");
    var r = parseInt(payload.rowId);
    var oldUrl = sheet.getRange(r, 9).getValue();
    var newFileUrl = oldUrl;

    if (fileData && fileData.data) {
      // Hapus file lama
      if (oldUrl && oldUrl.includes('drive.google.com')) {
        try {
          var match = oldUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || oldUrl.match(/id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true);
        } catch(ex) {}
      }
      var rootFolder = DriveApp.getFolderById(KONFIG_ADM_PTK.FOLDER_ID);
      var folderKey = payload.folder_key || payload.nama_ptk;
      var iterFolder = rootFolder.getFoldersByName(folderKey);
      var fPtk = iterFolder.hasNext() ? iterFolder.next() : rootFolder.createFolder(folderKey);

      var periodeNew = String(payload.periode || "-").trim();
      var ext = fileData.nama_file ? fileData.nama_file.split('.').pop().toLowerCase() : "pdf";
      var nf = payload.nama_kategori + " - " + payload.tahun + (periodeNew && periodeNew !== "-" ? " - " + periodeNew : "") + "." + ext;

      var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, nf);
      var file = fPtk.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      newFileUrl = file.getUrl();
      sheet.getRange(r, 8).setValue(nf); // Update Nama_File
    }

    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(r, 7).setValue(payload.tahun);      // Tahun
    sheet.getRange(r, 9).setValue(newFileUrl);         // URL
    sheet.getRange(r, 10).setValue("Diproses");        // Status
    sheet.getRange(r, 11).setValue("");                // Catatan
    sheet.getRange(r, 14).setValue("");                // Tgl_Verif
    sheet.getRange(r, 15).setValue("");                // Verifikator
    sheet.getRange(r, 16).setValue(payload.periode);   // Periode
    sheet.getRange(r, 17).setValue(now);               // Tgl_Edit
    sheet.getRange(r, 18).setValue(payload.user_login);// User_Edit

    SpreadsheetApp.flush();
    invalidateAdmPtkDashboardCache();
    return JSON.stringify({ success: true, message: "Perbaikan dokumen berhasil disimpan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function hapusAdmPtk(rowId, securityCode) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = new Date();
    var kd = d.getFullYear() + "" + String(d.getMonth() + 1).padStart(2, '0') + "" + String(d.getDate()).padStart(2, '0');
    if (String(securityCode).trim() !== kd) return JSON.stringify({ success: false, message: "Kode Keamanan Salah!" });
    var sheet = getOrCreateSheetAdmPtk("Database_Dokumen");
    var r = parseInt(rowId);
    var urlDrive = sheet.getRange(r, 9).getValue();
    if (urlDrive && urlDrive.includes('drive.google.com')) {
      try {
        var match = urlDrive.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlDrive.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true);
      } catch(ex) {}
    }
    sheet.deleteRow(r);
    SpreadsheetApp.flush();
    invalidateAdmPtkDashboardCache();
    return JSON.stringify({ success: true, message: "Dokumen berhasil dihapus permanen." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function verifikasiAdmPtk(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetAdmPtk("Database_Dokumen");
    var r = parseInt(payload.rowId);
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(r, 10).setValue(payload.status);      // Status
    sheet.getRange(r, 11).setValue(payload.catatan);     // Catatan
    sheet.getRange(r, 14).setValue(now);                 // Tgl_Verif
    sheet.getRange(r, 15).setValue(payload.verifikator); // Verifikator
    SpreadsheetApp.flush();
    invalidateAdmPtkDashboardCache();
    return JSON.stringify({ success: true, message: "Dokumen berhasil di-" + payload.status });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}


/* ----------------------------------------------------------------------
   3. DASHBOARD ADMINISTRASI PTK
   ---------------------------------------------------------------------- */
function getAdmPtkDashboardInit(npsnFilter) {
  try {
    var shKat = getOrCreateSheetAdmPtk("Master_Kategori");
    if (!shKat) return JSON.stringify({ success: false, message: "Sheet Master_Kategori tidak ditemukan." });

    var dataKat = shKat.getDataRange().getDisplayValues();
    var listKategori = [];
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() !== "") {
        var showDash = String(dataKat[i][7] || "TRUE").trim().toUpperCase() !== "FALSE";
        if (showDash) {
          listKategori.push({ idKat: dataKat[i][0], namaKategori: dataKat[i][1] });
        }
      }
    }

    return JSON.stringify({ success: true, kategori: listKategori });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getAdmPtkDashboardData(idKategori, npsnFilter, jenjangFilter, forceRefresh) {
  try {
    var cacheKey = "ADM_PTK_DASH_" + idKategori + "_" + (npsnFilter || "ALL") + "_" + (jenjangFilter || "ALL");
    if (!forceRefresh) {
      var cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) return cached;
    }

    // Ambil detail rule klasifikasi dari Master Kategori
    var shKat = getOrCreateSheetAdmPtk("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var jPeriode = "TAHUNAN";
    var rJenjang = "SEMUA", rKepegawaian = "SEMUA", rTugas = "SEMUA";

    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() === String(idKategori).trim()) {
        var jpVal = String(dataKat[i][4] || "").toUpperCase();
        if (jpVal.includes("PERMANEN")) jPeriode = "PERMANEN";
        else if (jpVal.includes("BULANAN")) jPeriode = "BULANAN";
        else if (jpVal.includes("SEMESTER (TAHUN PELAJARAN)") || jpVal.includes("SEMESTER_TAPEL") || jpVal === "SEMESTER TAPEL") jPeriode = "SEMESTER_TAPEL";
        else if (jpVal.includes("SEMESTER (TAHUN KALENDER)") || jpVal.includes("SEMESTER_KALENDER") || jpVal === "SEMESTER") jPeriode = "SEMESTER_KALENDER";
        else if (jpVal.includes("TRIWULAN")) jPeriode = "TRIWULAN";
        else if (jpVal.includes("PERIODE") || jpVal.includes("BEBAS")) jPeriode = "PERIODE";
        else if (jpVal.includes("TMT")) jPeriode = "TMT";
        else jPeriode = "TAHUNAN";

        rJenjang = dataKat[i][8] || "SEMUA";
        rKepegawaian = dataKat[i][9] || "SEMUA";
        rTugas = dataKat[i][10] || "SEMUA";
        break;
      }
    }

    // Ambil daftar PTK (filter by NPSN)
    var ptkList = admPtk_getDaftarPtk(npsnFilter);
    var rawCount = ptkList.length;
    var sdsRawCount = ptkList.filter(function(p){ return p.jenjang === "SDS"; }).length;

    // Filter list PTK berdasarkan target rule klasifikasi Master Kategori
    ptkList = ptkList.filter(function(p) {
      return admPtk_apakahPtkCocokKlasifikasi(p, rJenjang, rKepegawaian, rTugas);
    });
    var postKlasifikasiCount = ptkList.length;
    var sdsPostKlasifikasiCount = ptkList.filter(function(p){ return p.jenjang === "SDS"; }).length;

    // Filter tambahan by jenjang aktif dari dashboard UI
    if (jenjangFilter && jenjangFilter !== "SEMUA") {
      ptkList = ptkList.filter(function(p) {
        var jj = String(p.jenjang || "").toUpperCase();
        if (jenjangFilter === "PAUD") return jj === "PAUD" || jj === "TK" || jj === "KB" || jj === "SPS" || jj === "TPA";
        if (jenjangFilter === "SD") return jj === "SD" || jj === "SDS";
        if (jenjangFilter === "SDS") return jj === "SDS";
        return true;
      });
    }
    var postJenjangFilterCount = ptkList.length;
    var sdsPostJenjangFilterCount = ptkList.filter(function(p){ return p.jenjang === "SDS"; }).length;

    // Data dokumen
    var shDoc = getOrCreateSheetAdmPtk("Database_Dokumen");
    var dataDoc = shDoc ? shDoc.getDataRange().getDisplayValues() : [];

    // Bangun set periode
    var curYear = new Date().getFullYear();
    var curTapel = curYear + "/" + (curYear + 1);
    var prevTapel = (curYear - 1) + "/" + curYear;
    var periodsSet = new Set();

    if (jPeriode === "BULANAN") {
      var bulans = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      bulans.forEach(function(b) {
        periodsSet.add(JSON.stringify({tahun: String(curYear), periode: b}));
        periodsSet.add(JSON.stringify({tahun: String(curYear - 1), periode: b}));
      });
    } else if (jPeriode === "SEMESTER_TAPEL") {
      periodsSet.add(JSON.stringify({tahun: curTapel, periode: "Semester 1"}));
      periodsSet.add(JSON.stringify({tahun: curTapel, periode: "Semester 2"}));
      periodsSet.add(JSON.stringify({tahun: prevTapel, periode: "Semester 1"}));
      periodsSet.add(JSON.stringify({tahun: prevTapel, periode: "Semester 2"}));
    } else if (jPeriode === "SEMESTER_KALENDER") {
      periodsSet.add(JSON.stringify({tahun: String(curYear), periode: "Semester 1"}));
      periodsSet.add(JSON.stringify({tahun: String(curYear), periode: "Semester 2"}));
      periodsSet.add(JSON.stringify({tahun: String(curYear - 1), periode: "Semester 1"}));
      periodsSet.add(JSON.stringify({tahun: String(curYear - 1), periode: "Semester 2"}));
    } else if (jPeriode === "TRIWULAN") {
      [1,2,3,4].forEach(function(t) {
        periodsSet.add(JSON.stringify({tahun: String(curYear), periode: "Triwulan " + t}));
        periodsSet.add(JSON.stringify({tahun: String(curYear - 1), periode: "Triwulan " + t}));
      });
    } else if (jPeriode === "PERMANEN") {
      periodsSet.add(JSON.stringify({tahun: String(curYear), periode: "-"}));
    } else {
      periodsSet.add(JSON.stringify({tahun: String(curYear), periode: "-"}));
      periodsSet.add(JSON.stringify({tahun: String(curYear - 1), periode: "-"}));
      periodsSet.add(JSON.stringify({tahun: String(curYear - 2), periode: "-"}));
    }

    // Map dokumen per PTK per periode
    var docMap = {};
    for (var k = 1; k < dataDoc.length; k++) {
      var ePtkId = String(dataDoc[k][0]).trim();
      var eKat   = String(dataDoc[k][4]).trim();
      var eThn   = String(dataDoc[k][6]).trim();
      var ePer   = String(dataDoc[k][15] || "").trim();
      var eSt    = String(dataDoc[k][9]).trim();

      if (eKat === String(idKategori).trim() && ePtkId) {
        var tPer = (jPeriode === "PERMANEN" || jPeriode === "TAHUNAN" || jPeriode === "TMT") ? "-" : (ePer && ePer !== "-" ? ePer : "-");
        if (eThn) {
          var pKey = JSON.stringify({tahun: eThn, periode: tPer});
          periodsSet.add(pKey);
          if (!docMap[ePtkId]) docMap[ePtkId] = {};
          docMap[ePtkId][pKey] = eSt;
        }
      }
    }

    var sortedPeriods = Array.from(periodsSet).map(function(s) { return JSON.parse(s); });
    var mapBulan = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"Mei":5,"Jun":6,"Jul":7,"Agu":8,"Sep":9,"Okt":10,"Nov":11,"Des":12};
    sortedPeriods.sort(function(a, b) {
      var ta = String(a.tahun), tb = String(b.tahun);
      if (ta !== tb) return tb.localeCompare(ta);
      if (mapBulan[a.periode] && mapBulan[b.periode]) return mapBulan[b.periode] - mapBulan[a.periode];
      return String(b.periode).localeCompare(String(a.periode));
    });

    var arrRekap = [];
    var arrBelum = [];

    sortedPeriods.forEach(function(pObj) {
      var pKey = JSON.stringify(pObj);
      ptkList.forEach(function(p) {
        var status = docMap[p.id] ? docMap[p.id][pKey] : null;
        var isUploaded = false;
        if (status) {
          var stL = status.toLowerCase();
          if (stL.includes("setuju") || stL.includes("ok") || stL.includes("proses") || stL.includes("valid")) {
            isUploaded = true;
          }
        }
        if (isUploaded) {
          arrRekap.push({ id: p.id, unit: p.nama, nip: p.nip, npsn: p.npsn, jenjang: p.jenjang, status_peg: p.status_peg, tugas: p.tugas, tahun: pObj.tahun, periode: pObj.periode, jml: 1, sudah: 1, belum: 0, sekolah: p.unit, status_dokumen: status || "" });
        } else {
          arrRekap.push({ id: p.id, unit: p.nama, nip: p.nip, npsn: p.npsn, jenjang: p.jenjang, status_peg: p.status_peg, tugas: p.tugas, tahun: pObj.tahun, periode: pObj.periode, jml: 1, sudah: 0, belum: 1, sekolah: p.unit, status_dokumen: "" });
          arrBelum.push({ id: p.id, unit: p.nama, nip: p.nip, npsn: p.npsn, jenjang: p.jenjang, status_peg: p.status_peg, tugas: p.tugas, tahun: pObj.tahun, periode: pObj.periode, sekolah: p.unit });
        }
      });
    });

    var debugInfo = {
      rawCount: rawCount,
      sdsRawCount: sdsRawCount,
      postKlasifikasiCount: postKlasifikasiCount,
      sdsPostKlasifikasiCount: sdsPostKlasifikasiCount,
      postJenjangFilterCount: postJenjangFilterCount,
      sdsPostJenjangFilterCount: sdsPostJenjangFilterCount,
      rules: { rJenjang: rJenjang, rKepegawaian: rKepegawaian, rTugas: rTugas }
    };
    var responseString = JSON.stringify({ success: true, rekap: arrRekap, belum: arrBelum, jenisPeriode: jPeriode, debugInfo: debugInfo });
    try { CacheService.getScriptCache().put(cacheKey, responseString, 1800); } catch(ce) {}
    return responseString;
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function invalidateAdmPtkDashboardCache() {
  try {
    var cache = CacheService.getScriptCache();
    var shKat = getOrCreateSheetAdmPtk("Master_Kategori");
    if (shKat) {
      var dataKat = shKat.getDataRange().getDisplayValues();
      for (var i = 1; i < dataKat.length; i++) {
        var idKat = String(dataKat[i][0]).trim();
        if (idKat) {
          cache.remove("ADM_PTK_DASH_" + idKat + "_ALL_ALL");
          cache.remove("ADM_PTK_DASH_" + idKat + "_ALL_SD");
          cache.remove("ADM_PTK_DASH_" + idKat + "_ALL_PAUD");
        }
      }
    }
  } catch(e) {}
}


/* ----------------------------------------------------------------------
   4. VIEWER DOKUMEN PTK
   ---------------------------------------------------------------------- */
function getAdmPtkViewerInit(npsnFilter) {
  try {
    var shKat = getOrCreateSheetAdmPtk("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var categories = [];
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() !== "") {
        var isAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE";
        if (!isAktif) continue;
        categories.push({
          idKat:        dataKat[i][0],
          namaKat:      dataKat[i][1],
          jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "",
          klasifikasiJenjang: dataKat[i][8] || "SEMUA",
          klasifikasiKepegawaian: dataKat[i][9] || "SEMUA",
          klasifikasiTugas:   dataKat[i][10] || "SEMUA"
        });
      }
    }

    var ptkList = admPtk_getDaftarPtk(npsnFilter);

    return JSON.stringify({ success: true, categories: categories, ptk: ptkList });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getAdmPtkViewerData(idPtk, npsnFilter) {
  try {
    var targetId  = String(idPtk).trim();
    var cleanFilter = String(npsnFilter || "").trim().toUpperCase();

    // Cari data PTK
    var ptkAll = admPtk_getDaftarPtk(cleanFilter);
    var ptkInfo = null;
    for (var j = 0; j < ptkAll.length; j++) {
      if (String(ptkAll[j].id).trim() === targetId) { ptkInfo = ptkAll[j]; break; }
    }
    if (!ptkInfo) return JSON.stringify({ success: false, message: "Data PTK tidak ditemukan." });

    // Keamanan akses
    if (cleanFilter && cleanFilter !== "SEMUA" && String(ptkInfo.npsn || "").trim().toUpperCase() !== cleanFilter) {
      return JSON.stringify({ success: false, message: "Anda tidak memiliki akses ke data PTK tersebut." });
    }

    var shKat = getOrCreateSheetAdmPtk("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var categories = [];
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() !== "") {
        var isAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE";
        if (!isAktif) continue;

        // Filter: Hanya tampilkan kategori yang cocok dengan klasifikasi profil PTK tersebut
        var tempPtkObj = {
          jenjang: ptkInfo.jenjang,
          status_peg: ptkInfo.status_peg,
          tugas: ptkInfo.tugas
        };
        var rJ = dataKat[i][8] || "SEMUA";
        var rK = dataKat[i][9] || "SEMUA";
        var rT = dataKat[i][10] || "SEMUA";

        if (!admPtk_apakahPtkCocokKlasifikasi(tempPtkObj, rJ, rK, rT)) {
          continue; // Lewati kategori jika PTK tidak masuk sasaran
        }

        categories.push({ idKat: dataKat[i][0], namaKat: dataKat[i][1], jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "" });
      }
    }

    var shDoc = getOrCreateSheetAdmPtk("Database_Dokumen");
    var dataDoc = shDoc ? shDoc.getDataRange().getDisplayValues() : [];
    var files = [];

    for (var f = 1; f < dataDoc.length; f++) {
      if (String(dataDoc[f][0]).trim() !== targetId) continue;
      var docName   = dataDoc[f][7];
      var docUrl    = dataDoc[f][8];
      var docStatus = dataDoc[f][9] || "-";
      var docTahun  = dataDoc[f][6] || "";
      var docPer    = dataDoc[f][15] || "";

      var displayLabel = docName;
      if (docTahun) {
        displayLabel += " (" + docTahun + (docPer && docPer !== "-" ? " " + docPer : "") + ")";
      }

      files.push({ id_kategori: dataDoc[f][4], tahun: docTahun, periode: docPer, file_name: displayLabel, url: docUrl, status: docStatus });
    }

    files.sort(function(a, b) {
      if (a.tahun !== b.tahun) return parseInt(b.tahun || 0) - parseInt(a.tahun || 0);
      return String(b.periode).localeCompare(String(a.periode));
    });

    return JSON.stringify({ success: true, ptk: ptkInfo, categories: categories, files: files });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

/* Debug: Cek apakah data SDS berhasil dibaca dari sheet */
function admPtk_debugSdsCheck() {
  var results = [];
  var sdsSamples = [];
  var sheetsToCheck = [
    { dbKey: "PTK_DB", sheetName: "Master Data GTK" },
    { dbKey: "PTK_DB", sheetName: "Master Data GTK SDS" },
  ];
  sheetsToCheck.forEach(function(s) {
    try {
      var ss = getDB(s.dbKey);
      var sheet = ss.getSheetByName(s.sheetName);
      if (!sheet) { results.push({ sheet: s.sheetName, status: "NOT FOUND" }); return; }
      results.push({ sheet: s.sheetName, status: "OK", rows: sheet.getLastRow(), cols: sheet.getLastColumn() });
      
      if (s.sheetName === "Master Data GTK SDS") {
        var lastRow = sheet.getLastRow();
        var readRows = Math.min(lastRow - 1, 5);
        if (readRows > 0) {
          var data = sheet.getRange(2, 1, readRows, sheet.getLastColumn()).getValues();
          data.forEach(function(row) {
            sdsSamples.push({
              nama: row[6],
              npsn: row[1],
              unit: row[2],
              status_peg: row[19],
              tugas: row[25],
              tugas_col_25_raw: row[25]
            });
          });
        }
      }
    } catch(e) { results.push({ sheet: s.sheetName, status: "ERROR: " + e.message }); }
  });

  var shKat = getOrCreateSheetAdmPtk("Master_Kategori");
  var katInfo = [];
  if (shKat) {
    var dk = shKat.getDataRange().getDisplayValues();
    for (var i = 1; i < dk.length; i++) {
      if (String(dk[i][0]).trim()) katInfo.push({ id: dk[i][0], nama: dk[i][1], ruleJenjang: dk[i][8] || "(kosong)", ruleKepegawaian: dk[i][9] || "(kosong)", ruleTugas: dk[i][10] || "(kosong)" });
    }
  }
  return JSON.stringify({ sheets: results, sdsSamples: sdsSamples, kategori: katInfo });
}
