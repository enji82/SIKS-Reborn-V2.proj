/* ======================================================================
   MODUL: ADMINISTRASI SEKOLAH (ARSIP DIGITAL ELEKTRONIK SEKOLAH)
   ====================================================================== */

const KONFIG_ADM_SEKOLAH = {
  DB_KEY: "ADM_SEKOLAH_DB",
  get FOLDER_ID() { return FOLDER_CONFIG.ADM_SEKOLAH_DOCS; }
};

function getOrCreateSheetAdmSekolah(sheetName) {
  var ss = getDB(KONFIG_ADM_SEKOLAH.DB_KEY);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "Master_Kategori") {
      sheet.appendRow(["ID_Kategori", "Nama_Dokumen", "Format_File", "Ukuran_File", "Jenis_Periode", "Keterangan", "Status", "Integrasi_Dashboard"]);
    } else if (sheetName === "Database_Dokumen") {
      sheet.appendRow(["ID_Dokumen", "Timestamp", "ID_Kategori", "Bulan", "Tahun", "TMT", "Nama_File", "URL_File", "ID_File", "Uploader", "Status_Verifikasi", "Catatan"]);
    }
  }
  return sheet;
}


/* ----------------------------------------------------------------------
   1. MASTER KATEGORI
   ---------------------------------------------------------------------- */
function getAdmSekolahMasterData(npsnFilter) {
  try {
    var shKat = getOrCreateSheetAdmSekolah("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var resKat = [];
    for(var i=1; i<dataKat.length; i++) {
        if(String(dataKat[i][0]).trim() !== "") {
            var isAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE";
            if (!isAktif) continue;
            resKat.push({ 
                idKat: dataKat[i][0], 
                namaKat: dataKat[i][1], 
                format: dataKat[i][2] ? String(dataKat[i][2]).trim().toUpperCase() : "PDF",
                ukuran: dataKat[i][3] ? String(dataKat[i][3]).trim() : "2",
                jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "",
                keterangan: dataKat[i][5] ? String(dataKat[i][5]).trim() : "",
                integrasiDashboard: dataKat[i][7] ? String(dataKat[i][7]).trim().toUpperCase() : "TRUE"
            });
        }
    }
    
    // Ambil Data Sekolah dari USER_DB -> Data_Sekolah (Sesuai kesepakatan menggunakan database sekolah Lapbul)
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var resSekolah = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    // Kolom di Data_Sekolah: [0] NPSN, [1] Jenjang, [2] Nama Sekolah, [3] Status, [4] Kecamatan
    for(var j=1; j<dataSekolah.length; j++) {
        var rNpsn = String(dataSekolah[j][0]).trim().toUpperCase(); 
        var rNama = String(dataSekolah[j][2]).trim().toUpperCase(); 
        if (targetNpsn === "" || targetNpsn === "SEMUA" || rNpsn === targetNpsn || rNama === targetNpsn) {
            if(rNpsn !== "") {
                resSekolah.push({ 
                    npsn: dataSekolah[j][0], 
                    nama: dataSekolah[j][2], 
                    jenjang: dataSekolah[j][1], 
                    status: dataSekolah[j][3],
                    kecamatan: dataSekolah[j][4]
                });
            }
        }
    }
    return JSON.stringify({ success: true, kategori: resKat, sekolah: resSekolah });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function simpanAdmSekolahMaster(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetAdmSekolah("Master_Kategori");
    
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
        isUpdate = true;
        break;
      }
    }
    
    if (!isUpdate) {
      sheet.appendRow([
        idKategori, 
        payload.namaKat, 
        payload.format, 
        payload.ukuran, 
        payload.jenisPeriode, 
        payload.keterangan, 
        payload.status,
        payload.integrasi
      ]);
    }
    
    SpreadsheetApp.flush();
    invalidateAdmSekolahDashboardCache();
    return JSON.stringify({ success: true, message: "Kategori berhasil disimpan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function hapusAdmSekolahMaster(idKategori) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetAdmSekolah("Master_Kategori");
    if(!sheet) return JSON.stringify({ success: false, message: "Sheet Master_Kategori tidak ditemukan." });
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idKategori).trim()) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        invalidateAdmSekolahDashboardCache();
        return JSON.stringify({ success: true, message: "Kategori berhasil dihapus." });
      }
    }
    return JSON.stringify({ success: false, message: "Kategori tidak ditemukan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}


/* ----------------------------------------------------------------------
   2. KELOLA DOKUMEN (CRUD)
   ---------------------------------------------------------------------- */
function getAdmSekolahData(npsnFilter) {
  try {
    // 1. Load Data_Sekolah untuk lookup
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var sekolahMap = {}; 
    for(var j=1; j<dataSekolah.length; j++) {
        var npsn = String(dataSekolah[j][0]).trim();
        if(npsn) {
            sekolahMap[npsn] = {
                nama: dataSekolah[j][2],
                jenjang: dataSekolah[j][1],
                status: dataSekolah[j][3]
            };
        }
    }
    
    // 2. Load Database_Dokumen
    var sheet = getOrCreateSheetAdmSekolah("Database_Dokumen");
    if(!sheet) return JSON.stringify({ success: false, message: "Sheet Database_Dokumen tidak ditemukan." });
    
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    // Asumsi header: [0] NPSN, [1] ID_Kategori, [2] Nama_Kategori, [3] Tahun, [4] File_Name, [5] URL, [6] Status, [7] Catatan, [8] Tgl_Upload, [9] Uploader, [10] Tgl_Verif, [11] Verifikator, [12] Periode
    for(var i=1; i<data.length; i++) {
        var rNpsn = String(data[i][0]).trim().toUpperCase();
        var infoSekolah = sekolahMap[rNpsn] || { nama: "Unknown", jenjang: "-", status: "-" };
        
        if (targetNpsn === "" || targetNpsn === "SEMUA" || rNpsn === targetNpsn) {
            result.push({
                rowId: i + 1, 
                npsn: rNpsn,
                nama_sekolah: infoSekolah.nama,
                id_kategori: data[i][1], 
                nama_kategori: data[i][2],
                tahun: data[i][3], 
                file_name: data[i][4], 
                url: data[i][5], 
                status: data[i][6], 
                catatan: data[i][7],
                tgl_upload: data[i][8], 
                uploader: data[i][9], 
                tgl_verif: data[i][10] || "-", 
                verifikator: data[i][11] || "-",
                periode: data[i][12] || "-",
                tgl_edit: data[i][13] || "-",
                user_edit: data[i][14] || "-"
            });
        }
    }
    result.sort(function(a,b) { return b.rowId - a.rowId; });
    return JSON.stringify({ success: true, data: result });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function admSekolahCheckDuplikat(sheet, npsn, idKategori, tahun, periode) {
  var data = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < data.length; i++) {
    var rNpsn = String(data[i][0]).trim();
    var rKat = String(data[i][1]).trim();
    var rTahun = String(data[i][3]).trim();
    var rPeriode = String(data[i][12] || "-").trim();
    
    if (rNpsn === String(npsn).trim() && rKat === String(idKategori).trim() && rTahun === String(tahun).trim() && rPeriode === String(periode).trim()) {
      return { ada: true, status: String(data[i][6]).trim() };
    }
  }
  return { ada: false };
}

function simpanAdmSekolahBatch(batchData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = getDB(KONFIG_ADM_SEKOLAH.DB_KEY);
    var sheet = ss.getSheetByName("Database_Dokumen");
    if (!sheet) {
      sheet = ss.insertSheet("Database_Dokumen");
      sheet.appendRow(["NPSN", "ID_Kategori", "Nama_Kategori", "Tahun", "File_Name", "URL", "Status", "Catatan", "Tgl_Upload", "Uploader", "Tgl_Verif", "Verifikator", "Periode", "Tgl_Edit", "User_Edit"]);
    }

    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    var pFolder = DriveApp.getFolderById(KONFIG_ADM_SEKOLAH.FOLDER_ID);
    var rowsToAppend = [];
    var laporan = [];
    var berhasilCount = 0;
    var skipCount = 0;

    for (var i = 0; i < batchData.length; i++) {
      var item = batchData[i];
      var periodeItem = String(item.periode || "-").trim();

      // PROTEKSI DUPLIKAT
      var duplikat = admSekolahCheckDuplikat(sheet, item.npsn, item.id_kategori, item.tahun, periodeItem);
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
        var folderKatName = (item.nama_kategori || "Dokumen") + " - " + (item.tahun || "Umum");
        var idFolderKat = pFolder.getFoldersByName(folderKatName);
        var fKat = idFolderKat.hasNext() ? idFolderKat.next() : pFolder.createFolder(folderKatName);
        
        var unitName = item.nama_sekolah || item.npsn;
        var idFolderUnit = fKat.getFoldersByName(unitName);
        var fUnit = idFolderUnit.hasNext() ? idFolderUnit.next() : fKat.createFolder(unitName);
        
        var blob = Utilities.newBlob(Utilities.base64Decode(item.fileBase64), item.mimeType, item.nama_file);
        var file = fUnit.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } else {
        laporan.push({ nama_kategori: item.nama_kategori, tahun: item.tahun, periode: periodeItem, result: "ERROR", alasan: "File tidak valid atau kosong." });
        skipCount++;
        continue;
      }

      rowsToAppend.push([
        item.npsn, item.id_kategori, item.nama_kategori,
        item.tahun, item.nama_file, fileUrl, "Diproses", "", "'" + now,
        item.user_login, "", "", periodeItem, "", ""
      ]);
      laporan.push({ nama_kategori: item.nama_kategori, tahun: item.tahun, periode: periodeItem, result: "OK", alasan: "" });
      berhasilCount++;
    }

    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    }
    SpreadsheetApp.flush();
    invalidateAdmSekolahDashboardCache();

    var msg;
    if (berhasilCount > 0 && skipCount === 0) {
      msg = berhasilCount + " dokumen berhasil diunggah.";
    } else if (berhasilCount > 0 && skipCount > 0) {
      msg = berhasilCount + " dokumen berhasil, " + skipCount + " dilewati.";
    } else {
      msg = "Tidak ada dokumen yang berhasil diunggah. " + skipCount + " dokumen dilewati.";
    }

    return JSON.stringify({
      success: berhasilCount > 0,
      message: msg,
      berhasil: berhasilCount,
      skip: skipCount,
      laporan: laporan
    });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function perbaikiAdmSekolahData(payload, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var sheet = getOrCreateSheetAdmSekolah("Database_Dokumen"); var r = parseInt(payload.rowId);
    var oldUrl = sheet.getRange(r, 6).getValue(); var newFileUrl = oldUrl; 

    // Jika user mengunggah file baru
    if (fileData && fileData.data) {
        if(oldUrl && oldUrl.includes('drive.google.com')) {
            try { var match = oldUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || oldUrl.match(/id=([a-zA-Z0-9_-]+)/); if(match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true); } catch(ex){} 
        }
        var pFolder = DriveApp.getFolderById(KONFIG_ADM_SEKOLAH.FOLDER_ID);
        var namaKategori = sheet.getRange(r, 3).getValue() || "Dokumen";
        
        var folderKatName = namaKategori + " - " + (payload.tahun || "Umum");
        var idFolderKat = pFolder.getFoldersByName(folderKatName);
        var fKat = idFolderKat.hasNext() ? idFolderKat.next() : pFolder.createFolder(folderKatName);
        
        var unitName = payload.nama_sekolah || payload.npsn;
        var idFolderUnit = fKat.getFoldersByName(unitName);
        var fUnit = idFolderUnit.hasNext() ? idFolderUnit.next() : fKat.createFolder(unitName);

        var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, payload.nama_file);
        var file = fUnit.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        newFileUrl = file.getUrl();
    }
    
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(r, 4).setValue(payload.tahun);        // Tahun
    sheet.getRange(r, 5).setValue(payload.nama_file);    // Nama File
    sheet.getRange(r, 6).setValue(newFileUrl);           // URL
    sheet.getRange(r, 7).setValue("Diproses");           // Status
    sheet.getRange(r, 8).setValue("");                   // Catatan
    sheet.getRange(r, 11).setValue("");                  // Tgl Verifikasi
    sheet.getRange(r, 12).setValue("");                  // User Verifikasi
    sheet.getRange(r, 13).setValue(payload.periode);     // Periode
    sheet.getRange(r, 14).setValue(now);                 // Tgl_Edit
    sheet.getRange(r, 15).setValue(payload.user_login);  // User_Edit

    SpreadsheetApp.flush();
    invalidateAdmSekolahDashboardCache();

    return JSON.stringify({ success: true, message: "Perbaikan dokumen berhasil disimpan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function hapusAdmSekolahData(rowId, securityCode) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = new Date(); var kd = d.getFullYear()+""+String(d.getMonth()+1).padStart(2,'0')+""+String(d.getDate()).padStart(2,'0');
    if (String(securityCode).trim() !== kd) return JSON.stringify({ success: false, message: "Kode Keamanan Salah!" });
    var sheet = getOrCreateSheetAdmSekolah("Database_Dokumen"); var r = parseInt(rowId);
    var urlDrive = sheet.getRange(r, 6).getValue();
    if(urlDrive && urlDrive.includes('drive.google.com')) {
        try { var match = urlDrive.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlDrive.match(/id=([a-zA-Z0-9_-]+)/); if(match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true); } catch(ex){}
    }
    sheet.deleteRow(r); 
    SpreadsheetApp.flush();
    invalidateAdmSekolahDashboardCache();

    return JSON.stringify({ success: true, message: "Dokumen berhasil dihapus permanen." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function verifikasiAdmSekolahData(rowId, status, catatan, adminName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetAdmSekolah("Database_Dokumen"); var r = parseInt(rowId);
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(r, 7).setValue(status); sheet.getRange(r, 8).setValue(catatan);
    sheet.getRange(r, 11).setValue(now); sheet.getRange(r, 12).setValue(adminName); 
    SpreadsheetApp.flush();
    invalidateAdmSekolahDashboardCache();

    return JSON.stringify({ success: true, message: "Dokumen berhasil di-" + status });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}


/* ----------------------------------------------------------------------
   3. DASHBOARD ADMINISTRASI SEKOLAH
   ---------------------------------------------------------------------- */
function getAdmSekolahDashboardInit(npsnFilter) {
  try {
    var shKat = getOrCreateSheetAdmSekolah("Master_Kategori");
    if(!shKat) return JSON.stringify({ success: false, message: "Sheet Master_Kategori tidak ditemukan." });
    
    var dataKat = shKat.getDataRange().getDisplayValues();
    var listKategori = [];
    for(var i=1; i<dataKat.length; i++) {
        if(String(dataKat[i][0]).trim() !== "") {
            var showDash = String(dataKat[i][7] || "TRUE").trim().toUpperCase() !== "FALSE";
            if (showDash) {
                listKategori.push({
                    idKat: dataKat[i][0],
                    namaKategori: dataKat[i][1]
                });
            }
        }
    }
    
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var myUnit = "";
    
    if (npsnFilter && npsnFilter !== "SEMUA") {
        for(var j=1; j<dataSekolah.length; j++) {
            var rNpsn = String(dataSekolah[j][0]).trim().toUpperCase(); 
            if (rNpsn === String(npsnFilter).trim().toUpperCase()) { myUnit = dataSekolah[j][1]; break; }
        }
    }

    return JSON.stringify({ success: true, kategori: listKategori, myUnit: myUnit });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getAdmSekolahDashboardData(idKategori, forceRefresh) {
  try {
    var cacheKey = "ADM_SEKOLAH_DASH_" + idKategori;
    if (!forceRefresh) {
        var cached = CacheService.getScriptCache().get(cacheKey);
        if (cached) return cached;
    }

    var shKat = getOrCreateSheetAdmSekolah("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var jPeriode = "TAHUNAN";
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
        break;
      }
    }
    
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var sekolahList = [];
    
    for (var j = 1; j < dataSekolah.length; j++) {
      var npsn = String(dataSekolah[j][0]).trim();
      var jenjang = String(dataSekolah[j][1]).trim();
      var nama = String(dataSekolah[j][2]).trim();
      if (!npsn || !nama) continue;
      sekolahList.push({ npsn: npsn, nama: nama, jenjang: jenjang });
    }
    
    var shDoc = getOrCreateSheetAdmSekolah("Database_Dokumen");
    var dataDoc = shDoc ? shDoc.getDataRange().getDisplayValues() : [];
    
    var docMap = {};
    var periodsSet = new Set();
    
    var curYear = new Date().getFullYear();
    var curTapel = curYear + "/" + (curYear + 1);
    var prevTapel = (curYear - 1) + "/" + curYear;
    
    // We will store stringified JSON objects in periodsSet to keep tahun and periode separated
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
      [1, 2, 3, 4].forEach(function(t) {
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
    
    for (var k = 1; k < dataDoc.length; k++) {
      var eNpsn = String(dataDoc[k][0]).trim();
      var eKat = String(dataDoc[k][1]).trim();
      var eThn = String(dataDoc[k][3]).trim(); 
      var ePeriode = String(dataDoc[k][12] || "").trim(); 
      var eStatus = String(dataDoc[k][6]).trim();
      
      if (eKat === String(idKategori).trim() && eNpsn) {
        var targetTahun = eThn;
        var targetPeriode = ePeriode && ePeriode !== "-" ? ePeriode : "-";
        
        if (jPeriode === "PERMANEN" || jPeriode === "TAHUNAN" || jPeriode === "TMT") {
          targetPeriode = "-";
        }
        
        if (targetTahun) {
          var pKey = JSON.stringify({tahun: targetTahun, periode: targetPeriode});
          periodsSet.add(pKey);
          if (!docMap[eNpsn]) docMap[eNpsn] = {};
          docMap[eNpsn][pKey] = eStatus;
        }
      }
    }
    
    var sortedPeriods = Array.from(periodsSet).map(function(s) { return JSON.parse(s); });
    
    // Sort primarily by tahun, then by periode
    var mapBulan = {"Jan":1, "Feb":2, "Mar":3, "Apr":4, "Mei":5, "Jun":6, "Jul":7, "Agu":8, "Sep":9, "Okt":10, "Nov":11, "Des":12};
    sortedPeriods.sort(function(a, b) {
      var ta = String(a.tahun), tb = String(b.tahun);
      var pa = String(a.periode), pb = String(b.periode);
      if (ta !== tb) return tb.localeCompare(ta); // descending year
      
      if (mapBulan[pa] && mapBulan[pb]) {
        return mapBulan[pb] - mapBulan[pa]; // descending month
      }
      return pb.localeCompare(pa); // descending period (e.g. Semester 2 before Semester 1)
    });
    
    var arrRekap = [];
    var arrBelum = [];
    
    sortedPeriods.forEach(function(pObj) {
      var pKey = JSON.stringify(pObj);
      sekolahList.forEach(function(sek) {
        var npsn = sek.npsn;
        var unitName = sek.nama;
        
        var status = docMap[npsn] ? docMap[npsn][pKey] : null;
        var statusVal = status ? String(status).trim() : "";
        
        var isUploaded = false;
        if (statusVal) {
          var stLower = statusVal.toLowerCase();
          if (stLower.includes("setuju") || stLower.includes("ok") || stLower.includes("proses") || stLower.includes("valid")) {
            isUploaded = true;
          }
        }
        
        if (isUploaded) {
          arrRekap.push({ npsn: npsn, unit: unitName, tahun: pObj.tahun, periode: pObj.periode, jml: 1, sudah: 1, belum: 0, jenjang: sek.jenjang, status: statusVal });
        } else {
          arrRekap.push({ npsn: npsn, unit: unitName, tahun: pObj.tahun, periode: pObj.periode, jml: 1, sudah: 0, belum: 1, jenjang: sek.jenjang, status: statusVal });
          arrBelum.push({ npsn: npsn, unit: unitName, tahun: pObj.tahun, periode: pObj.periode, jenjang: sek.jenjang });
        }
      });
    });
    
    var responseString = JSON.stringify({ success: true, rekap: arrRekap, belum: arrBelum, jenisPeriode: jPeriode });
    try { CacheService.getScriptCache().put(cacheKey, responseString, 1800); } catch(ce) { Logger.log("Cache error: " + ce.message); }
    return responseString;
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function invalidateAdmSekolahDashboardCache() {
  try {
    var cache = CacheService.getScriptCache();
    var shKat = getOrCreateSheetAdmSekolah("Master_Kategori");
    if (shKat) {
      var dataKat = shKat.getDataRange().getDisplayValues();
      for(var i=1; i<dataKat.length; i++) {
        if(String(dataKat[i][0]).trim() !== "") {
          cache.remove("ADM_SEKOLAH_DASH_" + dataKat[i][0]);
        }
      }
    }
  } catch(e) {}
}

/**
 * DEBUG: Jalankan fungsi ini dari Apps Script Editor untuk melihat 
 * nilai aktual Jenis_Periode di spreadsheet dan membersihkan cache.
 * Hasilnya akan muncul di Logs (Ctrl+Enter / View > Logs).
 */
function debugAdmSekolahKategori() {
  try {
    var cache = CacheService.getScriptCache();
    var shKat = getOrCreateSheetAdmSekolah("Master_Kategori");
    if (!shKat) { Logger.log("ERROR: Sheet Master_Kategori tidak ditemukan!"); return; }
    
    var dataKat = shKat.getDataRange().getDisplayValues();
    Logger.log("=== DEBUG Master_Kategori ===");
    Logger.log("Total baris (termasuk header): " + dataKat.length);
    Logger.log("Header: " + JSON.stringify(dataKat[0]));
    
    for (var i = 1; i < dataKat.length; i++) {
      var idKat    = String(dataKat[i][0]).trim();
      var namaKat  = String(dataKat[i][1]).trim();
      var jpRaw    = String(dataKat[i][4] || "").trim();
      var jpUpper  = jpRaw.toUpperCase();
      var cacheKey = "ADM_SEKOLAH_DASH_" + idKat;
      var hasCached = cache.get(cacheKey) ? "YA (cache ada)" : "TIDAK (tidak ada cache)";
      
      // Parsing jenis periode
      var jPeriode;
      if (jpUpper.includes("PERMANEN")) jPeriode = "PERMANEN";
      else if (jpUpper.includes("BULANAN")) jPeriode = "BULANAN";
      else if (jpUpper.includes("SEMESTER (TAHUN PELAJARAN)") || jpUpper.includes("SEMESTER_TAPEL") || jpUpper === "SEMESTER TAPEL") jPeriode = "SEMESTER_TAPEL";
      else if (jpUpper.includes("SEMESTER (TAHUN KALENDER)") || jpUpper.includes("SEMESTER_KALENDER") || jpUpper === "SEMESTER") jPeriode = "SEMESTER_KALENDER";
      else if (jpUpper.includes("TRIWULAN")) jPeriode = "TRIWULAN";
      else if (jpUpper.includes("PERIODE") || jpUpper.includes("BEBAS")) jPeriode = "PERIODE";
      else if (jpUpper.includes("TMT")) jPeriode = "TMT";
      else jPeriode = "TAHUNAN";
      
      Logger.log("Baris " + i + " | ID: " + idKat + " | Nama: " + namaKat + " | Jenis_Periode RAW: [" + jpRaw + "] | Parsed: " + jPeriode + " | Cache: " + hasCached);
      
      // Hapus cache agar bersih
      if (idKat) cache.remove(cacheKey);
    }
    Logger.log("=== Semua cache sudah dihapus ===");
    } catch(e) {
    Logger.log("ERROR: " + e.message);
  }
}

function getAdmSekolahViewerInit(npsnFilter) {
  try {
    var shKat = getOrCreateSheetAdmSekolah("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var categories = [];
    for(var i=1; i<dataKat.length; i++) {
      if(String(dataKat[i][0]).trim() !== "") {
        var isAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE";
        if (!isAktif) continue;
        categories.push({ 
          idKat: dataKat[i][0], 
          namaKat: dataKat[i][1],
          jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : ""
        });
      }
    }
    
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var schools = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    for(var j=1; j<dataSekolah.length; j++) {
      var rNpsn = String(dataSekolah[j][0]).trim().toUpperCase();
      var rNama = String(dataSekolah[j][2]).trim();
      var rJenjang = String(dataSekolah[j][1]).trim().toUpperCase();
      if (rNpsn !== "") {
        if (targetNpsn === "" || targetNpsn === "SEMUA" || rNpsn === targetNpsn) {
          schools.push({ 
            npsn: dataSekolah[j][0], 
            nama: rNama, 
            jenjang: rJenjang 
          });
        }
      }
    }
    return JSON.stringify({ success: true, categories: categories, schools: schools });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getAdmSekolahViewerData(npsn, npsnFilter) {
  try {
    var targetNpsn = String(npsn).trim().toUpperCase();
    var cleanFilter = String(npsnFilter || "").trim().toUpperCase();
    
    // Keamanan Akses
    if (cleanFilter && cleanFilter !== "SEMUA" && cleanFilter !== "" && targetNpsn !== cleanFilter) {
      return JSON.stringify({ success: false, message: "Anda tidak memiliki akses ke data sekolah tersebut." });
    }
    
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var schoolInfo = null;
    for (var j = 1; j < dataSekolah.length; j++) {
      if (String(dataSekolah[j][0]).trim().toUpperCase() === targetNpsn) {
        schoolInfo = {
          npsn: dataSekolah[j][0],
          nama: dataSekolah[j][2],
          jenjang: dataSekolah[j][1]
        };
        break;
      }
    }
    if (!schoolInfo) return JSON.stringify({ success: false, message: "Sekolah dengan NPSN " + npsn + " tidak ditemukan." });

    var shKat = getOrCreateSheetAdmSekolah("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var categories = [];
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() !== "") {
        var isAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE";
        if (!isAktif) continue;
        categories.push({ 
          idKat: dataKat[i][0], 
          namaKat: dataKat[i][1],
          jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : ""
        });
      }
    }

    var shDoc = getOrCreateSheetAdmSekolah("Database_Dokumen");
    var dataDoc = shDoc ? shDoc.getDataRange().getDisplayValues() : [];
    var files = [];
    
    for (var f = 1; f < dataDoc.length; f++) {
      var docNpsn = String(dataDoc[f][0]).trim().toUpperCase();
      if (docNpsn === targetNpsn) {
        var docName = dataDoc[f][4];
        var docUrl = dataDoc[f][5];
        var docStatus = dataDoc[f][6] || "-";
        var docTahun = dataDoc[f][3] || "";
        var docPeriode = dataDoc[f][12] || "";
        
        var displayLabel = docName;
        if (docTahun) {
          displayLabel += " (" + docTahun + (docPeriode && docPeriode !== "-" ? " " + docPeriode : "") + ")";
        }
        
        files.push({
          id_kategori: dataDoc[f][1],
          tahun: docTahun,
          periode: docPeriode,
          file_name: displayLabel,
          url: docUrl,
          status: docStatus
        });
      }
    }
    
    // Sort files by year descending, then period descending
    files.sort(function(a, b) {
      if (a.tahun !== b.tahun) return parseInt(b.tahun || 0) - parseInt(a.tahun || 0);
      return String(b.periode).localeCompare(String(a.periode));
    });

    return JSON.stringify({ success: true, school: schoolInfo, categories: categories, files: files });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}
