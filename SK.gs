/* ======================================================================
   SK.gs - LOGIKA BACKEND SIABA SK (BAB VIII COMPLIANT)
   Variabel Global (SPREADSHEET_IDS & FOLDER_CONFIG) diambil dari Code.gs
   ====================================================================== */

/* ======================================================================
   HELPER FUNCTIONS
   ====================================================================== */
function handleError(context, error) {
  Logger.log("ERROR [" + context + "]: " + error);
  rekamCCTV("ERROR " + context, error.toString()); 
  return { success: false, message: error.message || error.toString() };
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
}

/**
 * Mengambil mapping Nama Sekolah -> NPSN dari Spreadsheet Master Data User
 * Sheet ID: 1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA
 */
function getMappingMasterNpsn() {
  try {
    const sheet = getSheet("USER_DB", "Data User");
    const data = sheet.getDataRange().getValues();
    
    var mapping = {};
    // Kolom H (Index 7): NPSN, Kolom I (Index 8): Nama Sekolah
    for (var i = 1; i < data.length; i++) {
       var npsn = String(data[i][7] || "").trim();
       var sekolah = String(data[i][8] || "").trim().toUpperCase(); // Normalisasi ke Uppercase
       if (sekolah !== "" && npsn !== "") {
          mapping[sekolah] = npsn;
       }
    }
    return mapping;
  } catch (e) {
    Logger.log("Error getMappingMasterNpsn: " + e.message);
    return {};
  }
}

/* ======================================================================
   CORE: PROSES SIMPAN DATA BARU (INSERT)
   ====================================================================== */
function processManualForm(formData) {
  try {
    const sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    
    const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK);
    const folderTahun = getOrCreateFolder(mainFolder, formData.tahunAjaran.replace(/\//g, '-'));
    const targetFolder = getOrCreateFolder(folderTahun, formData.semester);
    
    const namaFile = `${formData.namaSd} - ${formData.tahunAjaran.replace(/\//g,'-')} - ${formData.semester} - ${formData.kriteriaSk} - ${formData.nomorSk}.pdf`;
    
    const blob = Utilities.newBlob(Utilities.base64Decode(formData.fileData.data), formData.fileData.mimeType, namaFile);
    const file = targetFolder.createFile(blob);
    
    // VAKSIN IFRAME PREVIEW: Wajib menggunakan ANYONE_WITH_LINK agar bisa di-embed di Iframe SPA
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    sheet.appendRow([
      "'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"), // A
      formData.namaSd,        
      formData.tahunAjaran,   
      formData.semester,      
      "'" + formData.nomorSk, 
      "'" + formData.tanggalSk, 
      formData.kriteriaSk,    
      file.getUrl(),          
      formData.userInput,     
      "Diproses",             
      "", "", "", "", "",     // K, L, M, N, O
      "", "",                 // P, Q
      "'" + formData.npsn     // R (Kolom ke-18)
    ]);
    
    invalidateNotifCache("User", formData.namaSd);
    try { CacheService.getScriptCache().remove("DAFTAR_SK_CACHE"); } catch(e) {}
    return { success: true, message: "Data SK berhasil disimpan." };
  } catch (e) { return handleError('processManualForm', e); }
}

/* ======================================================================
   CORE: UPDATE DATA (EDIT)
   ====================================================================== */
function simpanPerubahanSK(form) {
  try {
    rekamCCTV("START EDIT", "No SK: " + form.nomorSk);
 
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var rowIdx = parseInt(form.editRowId);

    if (isNaN(rowIdx)) throw "Row ID Invalid";

    var KOLOM = {
      NAMA_SD:   2,  
      TAHUN:     3,  
      SEMESTER:  4,  
      NO_SK:     5,  
      TGL_SK:    6,  
      KRITERIA:  7,  
      FILE_URL:  8,  
      STATUS:    10, 
      TGL_UPD:   11, 
      USER_UPD:  12,
      NPSN:      18  
    };

    if (form.namaSd && form.namaSd !== "") sheet.getRange(rowIdx, KOLOM.NAMA_SD).setValue(form.namaSd);
    if (form.tahunAjaran && form.tahunAjaran !== "") sheet.getRange(rowIdx, KOLOM.TAHUN).setValue(form.tahunAjaran);
    if (form.semester && form.semester !== "") sheet.getRange(rowIdx, KOLOM.SEMESTER).setValue(form.semester);

    sheet.getRange(rowIdx, KOLOM.NO_SK).setValue("'" + form.nomorSk);
    sheet.getRange(rowIdx, KOLOM.TGL_SK).setValue("'" + form.tanggalSk); 
    sheet.getRange(rowIdx, KOLOM.KRITERIA).setValue(form.kriteriaSk);

    if (form.fileData && form.fileData.data) {
       const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK);
       
       var thn = (form.tahunAjaran && form.tahunAjaran !== "") ? form.tahunAjaran : sheet.getRange(rowIdx, KOLOM.TAHUN).getDisplayValue();
       var sem = (form.semester && form.semester !== "") ? form.semester : sheet.getRange(rowIdx, KOLOM.SEMESTER).getDisplayValue();
       
       const folderTahun = getOrCreateFolder(mainFolder, thn.toString().replace(/\//g, '-'));
       const targetFolder = getOrCreateFolder(folderTahun, sem);

       var namaSdFix = (form.namaSd && form.namaSd !== "") ? form.namaSd : sheet.getRange(rowIdx, KOLOM.NAMA_SD).getDisplayValue();
       const namaFile = `${namaSdFix} - ${thn.toString().replace(/\//g,'-')} - ${sem} - ${form.kriteriaSk} - ${form.nomorSk}.pdf`;

       var blob = Utilities.newBlob(Utilities.base64Decode(form.fileData.data), form.fileData.mimeType, namaFile);
       var file = targetFolder.createFile(blob);
       file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       
       sheet.getRange(rowIdx, KOLOM.FILE_URL).setValue(file.getUrl());
       rekamCCTV("UPLOAD", "File baru tersimpan: " + file.getUrl());
    }

    sheet.getRange(rowIdx, KOLOM.STATUS).setValue("Diproses");
    sheet.getRange(rowIdx, KOLOM.TGL_UPD).setValue("'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"));
    sheet.getRange(rowIdx, KOLOM.USER_UPD).setValue(form.userUpdate);
    sheet.getRange(rowIdx, KOLOM.NPSN).setValue("'" + form.npsn);
    sheet.getRange(rowIdx, 16).setValue(""); // Reset Telah Dibaca jika User Edit

    rekamCCTV("SUKSES", "Data baris " + rowIdx + " berhasil diupdate.");
    invalidateNotifCache("User", form.namaSd);
    try { CacheService.getScriptCache().remove("DAFTAR_SK_CACHE"); } catch(e) {}
    return { success: true, message: "Data berhasil diperbarui." };

  } catch (e) {
    rekamCCTV("ERROR", e.toString());
    return { success: false, message: "Error Server: " + e.toString() };
  }
}

/* ======================================================================
   CORE: GET DATA LIST 
   ====================================================================== */
function getDaftarSK() {
  var cacheKey = "DAFTAR_SK_CACHE";
  var cache = CacheService.getScriptCache();
  
  try {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}
  
  try {
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[1]) continue; 

      var tUnggah = parseSiabaDateTime(row[0]);
      var tUpdate = parseSiabaDateTime(row[10]);
      var tVerval = parseSiabaDateTime(row[12]);
      
      var lastActivity = Math.max(tUnggah, tUpdate, tVerval);

      result.push({
        rowBaris: i + 1,
        tglUnggah: row[0],
        namaSd: row[1], tahun: row[2], semester: row[3], noSk: row[4],
        tglSk: row[5], tglSkDisplay: row[5], 
        kriteria: row[6], fileUrl: row[7], userInput: row[8], status: row[9],
        tglUpdate: row[10], userUpdate: row[11],
        tglVerval: row[12], verifikator: row[13], keterangan: row[14],
        npsn: row[17] || "",
        readBy: row[15] || "",
        timestamp: lastActivity
      });
    }
    
    result.sort(function(a, b) { return b.timestamp - a.timestamp; });
    
    try {
      cache.put(cacheKey, JSON.stringify(result), 300);
    } catch (e) {}
    
    return result;
  } catch (e) { return []; }
}

/* ======================================================================
   HELPER: CEK DUPLIKAT, HAPUS, & VERIFIKASI 
   ====================================================================== */
function cekDuplikatSK(payload) {
  try {
    const sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var data = sheet.getDataRange().getDisplayValues();
    
    var tSd = String(payload.namaSd).trim().toUpperCase();
    var tTh = String(payload.tahunAjaran).trim().toUpperCase();
    var tSm = String(payload.semester).trim().toUpperCase();
    var tKr = String(payload.kriteria).trim().toUpperCase();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      var dbSd = String(row[1] || "").trim().toUpperCase(); 
      var dbTh = String(row[2] || "").trim().toUpperCase(); 
      var dbSm = String(row[3] || "").trim().toUpperCase(); 
      var dbKr = String(row[6] || "").trim().toUpperCase(); 
      
      if (dbSd === tSd && dbTh === tTh && dbSm === tSm && dbKr === tKr) {
        var status = String(row[9] || "").toLowerCase(); 
        var isLocked = (status.includes("ok") || status.includes("setuju"));
        
        return { 
          found: true, isLocked: isLocked,
          data: {
            rowId: i + 1, namaSd: row[1], tahun: row[2], semester: row[3],
            noSk: row[4], tglSk: row[5], kriteria: row[6], fileUrl: row[7], status: row[9]
          }
        };
      }
    }
    return { found: false };
  } catch (e) { return { found: false }; }
}

function hapusDataSK(form) {
  try {
    var KODE_RAHASIA = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(form.hapusKode).trim() !== KODE_RAHASIA) {
      return { success: false, message: "KODE_SALAH" };
    }
 
    const sheetSource = getSheet("SK_DATA_DB", "Unggah_SK");
    
    var sheetTrash = getSheet("SK_DATA_DB", "Trash_SK");
    if (!sheetTrash) {
       var ss = getDB("SK_DATA_DB");
       sheetTrash = ss.insertSheet("Trash_SK");
       var headers = sheetSource.getRange("A1:Q1").getDisplayValues();
       headers[0].push("TGL HAPUS", "USER HAPUS", "ALASAN");
       sheetTrash.appendRow(headers[0]); 
    }

    var rowIdx = parseInt(form.hapusRowId);
    if (isNaN(rowIdx)) return { success: false, message: "Row ID Invalid" };

    var rangeData = sheetSource.getRange(rowIdx, 1, 1, sheetSource.getLastColumn());
    var values = rangeData.getDisplayValues()[0]; 
    
    var tahun = values[2];   
    var semester = values[3]; 
    var fileUrl = values[7];  

    if (fileUrl && fileUrl.indexOf("drive.google.com") !== -1) {
        try {
          var fileIdMatch = fileUrl.match(/[-\w]{25,}/);
          if (fileIdMatch) {
             var file = DriveApp.getFileById(fileIdMatch[0]);
             var trashRoot = DriveApp.getFolderById(FOLDER_CONFIG.TRASH_SK);
             var folderTahun = getOrCreateFolder(trashRoot, String(tahun).replace(/\//g, '-'));
             var folderSmt = getOrCreateFolder(folderTahun, String(semester));
             file.moveTo(folderSmt); 
          }
        } catch (errFile) {
          rekamCCTV("ERROR HAPUS FILE", errFile.toString());
        }
    }

    var trashValues = values.slice(); 
    trashValues.push("'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"));        
    trashValues.push(form.userDelete);   
    trashValues.push(form.hapusAlasan || "-");  

    sheetTrash.appendRow(trashValues);
    sheetSource.deleteRow(rowIdx);

    rekamCCTV("HAPUS DATA", "Menghapus Baris " + rowIdx + " oleh " + form.userDelete);
    invalidateNotifCache("User", values[1]);
    try { CacheService.getScriptCache().remove("DAFTAR_SK_CACHE"); } catch(e) {}
    return { success: true, message: "Data berhasil dihapus." };

  } catch (e) {
    rekamCCTV("ERROR HAPUS", e.toString());
    return { success: false, message: "Gagal menghapus: " + e.toString() };
  }
}

function verifikasiDataSK(form) {
  try {
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var rowIdx = parseInt(form.verifRowId);

    if (isNaN(rowIdx) || rowIdx < 2) return { success: false, message: "ID Baris tidak valid!" };

    sheet.getRange(rowIdx, 10).setValue(form.verifStatus);
    sheet.getRange(rowIdx, 13).setValue("'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss")); 
    sheet.getRange(rowIdx, 14).setValue(form.verifikator); 
    sheet.getRange(rowIdx, 15).setValue("'" + form.verifKeterangan);
    sheet.getRange(rowIdx, 16).setValue(""); // Reset Telah Dibaca jika Admin Verifikasi

    var schoolName = sheet.getRange(rowIdx, 2).getDisplayValue();
    invalidateNotifCache("User", schoolName);
    try { CacheService.getScriptCache().remove("DAFTAR_SK_CACHE"); } catch(e) {}

    SpreadsheetApp.flush();
    return { success: true, message: "Data diverifikasi: " + form.verifStatus };
  } catch (e) { 
    Logger.log("SK Verification error: " + e.message);
    return { success: false, message: "Terjadi kesalahan saat verifikasi. Silakan coba lagi." }; 
  }
}

/* ======================================================================
   HELPER: REKAM JEJAK CCTV
   ====================================================================== */
function rekamCCTV(aktivitas, data) {
  try {
    var sheet = getSheet("SK_DATA_DB", "Log_CCTV");
    if (!sheet) {
      var ss = getDB("SK_DATA_DB");
      sheet = ss.insertSheet("Log_CCTV");
      sheet.appendRow(["TIMESTAMP", "AKTIVITAS", "DATA MENTAH"]);
    }
    var dataString = (typeof data === 'object') ? JSON.stringify(data) : data;
    sheet.appendRow(["'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"), aktivitas, dataString]);
  } catch (e) { Logger.log("CCTV Error"); }
}

/* ======================================================================
   CORE: GET DATA SAMPAH (TRASH)
   ====================================================================== */
function getTrashSK() {
  const sheet = getSheet("SK_DATA_DB", "Trash_SK");
  if (!sheet) return [];

  var data = sheet.getDataRange().getDisplayValues();
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[1]) continue; 

    result.push({
      rowBaris: i + 1,
      namaSd: row[1], 
      noSk: row[4],   
      tglHapus: row[15],  
      userHapus: row[16],      
      alasanHapus: row[17]     
    });
  }
  return result;
}

/* ======================================================================
   CORE: RESTORE DATA (PULIHKAN DARI TRASH)
   ====================================================================== */
function restoreDataSK(form) {
  try {
    const sheetTrash = getSheet("SK_DATA_DB", "Trash_SK");
    const sheetActive = getSheet("SK_DATA_DB", "Unggah_SK");
    
    var rowIdx = parseInt(form.rowId);
    var values = sheetTrash.getRange(rowIdx, 1, 1, sheetTrash.getLastColumn()).getDisplayValues()[0];
    
    var cleanValues = values.slice(0, 15);
    
    var fileUrl = cleanValues[7];
    if (fileUrl && fileUrl.indexOf("drive.google.com") !== -1) {
        try {
          var fileIdMatch = fileUrl.match(/[-\w]{25,}/);
          if (fileIdMatch) DriveApp.getFileById(fileIdMatch[0]).moveTo(DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK));
        } catch (e) {}
    }

    sheetActive.appendRow(cleanValues);
    sheetTrash.deleteRow(rowIdx);
    
    return { success: true, message: "Data berhasil dipulihkan." };
    
  } catch (e) {
    return { success: false, message: "Gagal Restore: " + e.toString() };
  }
}

/* ======================================================================
   MODULE: STATUS PENGIRIMAN SK (BAB VIII & MULTI-LEVEL HEADER FIX)
   ====================================================================== */
function getSiabaStatusData() {
  try {
    const sheet = getSheet("SK_DATA_DB", "Status_SK");
    
    // BAB VIII: getDisplayValues Validated
    var rawData = sheet.getDataRange().getDisplayValues();
    
    // Karena Baris 1 dan 2 sekarang adalah Header Bertingkat, 
    // minimal harus ada 3 baris jika ada datanya.
    if (rawData.length < 3) return { error: "Data Status SK belum tersedia." };

    // Potong 2 baris pertama, ambil dari indeks 2 (baris ke-3) sampai habis
    var rows = rawData.slice(2); 

    // Ambil list nama sekolah dari Kolom 1 (Index 0) untuk dropdown filter
    var listSekolah = [];
    rows.forEach(r => {
      if(r[0] && r[0] !== "") {
         listSekolah.push(r[0]);
      }
    });
    
    listSekolah = [...new Set(listSekolah)].sort();

    return {
       rows: rows,
       schools: listSekolah
    };

  } catch (e) {
    return { error: "Gagal ambil data: " + e.toString() };
  }
}

/* ======================================================================
   MODULE: DASHBOARD SK (LOGIKA KEPATUHAN AWAL SEMESTER)
   ====================================================================== */
function getDashboardSK(filterTahun, filterSemester) {
  var cacheKey = "DASHBOARD_SK_" + String(filterTahun || "") + "_" + String(filterSemester || "");
  var cache = CacheService.getScriptCache();
  try {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  try {
    const sheetData = getSheet("SK_DATA_DB", "Unggah_SK");
    if (!sheetData) return { error: "Sheet 'Unggah_SK' tidak ditemukan!" };
    var rawData = sheetData.getDataRange().getDisplayValues();
    var rows = rawData.slice(1); 

    var masterSekolah = [];
    var sheetMaster = getSheet("SK_DATA_DB", "Master_Sekolah");
    if (sheetMaster) {
        var rawMaster = sheetMaster.getDataRange().getDisplayValues();
        for (var i = 1; i < rawMaster.length; i++) {
            if(rawMaster[i][0]) masterSekolah.push(String(rawMaster[i][0]).trim());
        }
    }

    var stats = {
      totalMasuk: 0, diproses: 0, revisi: 0, disetujui: 0, ditolak: 0,
      progress: 0, belumLaporCount: 0, belumLaporList: [], recent: [],
      totalAwal: 0, totalPerubahan: 0, validAwal: 0, validPerubahan: 0 
    };

    var sekolahSudahLaporAwal = new Set();

    // 1. Filter Tahun & Semester Saja
    var filteredRows = rows.filter(function(r) {
      if (!r[1]) return false;
      var rTahun = String(r[2] || "").trim();
      var rSmt = String(r[3] || "").trim();
      var matchTahun = (filterTahun === "" || rTahun === String(filterTahun));
      var matchSmt = (filterSemester === "" || rSmt === String(filterSemester));
      return matchTahun && matchSmt;
    });

    stats.totalMasuk = filteredRows.length;

    // 2. Hitung Agregat Rinci
    filteredRows.forEach(function(r) {
      var s = String(r[9] || "").toLowerCase(); 
      var kriteria = String(r[6] || "").toLowerCase();
      var isAwal = kriteria.includes("awal");

      // Hitung Total Masuk (Awal vs Perubahan)
      if (isAwal) stats.totalAwal++;
      else stats.totalPerubahan++;

      var isValid = s.includes("ok") || s.includes("setuju") || s.includes("valid");

      if (isValid) {
          stats.disetujui++;
          // Hitung Valid (Awal vs Perubahan)
          if (isAwal) stats.validAwal++;
          else stats.validPerubahan++;
      }
      else if (s.includes("revisi")) stats.revisi++;
      else if (s.includes("tolak")) stats.ditolak++;
      else stats.diproses++;

      // LOGIKA MUTLAK BELUM LAPOR: HANYA berdasarkan SEKOLAH UNIK "Awal Semester" yang TIDAK Ditolak
      if (isAwal && !s.includes("tolak")) {
          sekolahSudahLaporAwal.add(String(r[1]).trim());
      }
    });

    // 3. Kalkulasi Persentase Realisasi yang Akurat
    if (masterSekolah.length > 0) {
        stats.belumLaporList = masterSekolah.filter(function(x) { return !sekolahSudahLaporAwal.has(x); }).sort();
        stats.belumLaporCount = stats.belumLaporList.length;
        
        // VAKSIN LOGIKA: Progress = (Total Sekolah - Belum Lapor) / Total Sekolah
        // Ini memastikan hitungan murni berdasarkan JUMLAH SEKOLAH, bukan jumlah file ganda
        var jmlSekolahSudahLapor = masterSekolah.length - stats.belumLaporCount;
        stats.progress = Math.round((jmlSekolahSudahLapor / masterSekolah.length) * 100);
        
        if(stats.progress > 100) stats.progress = 100; // Pengaman visual
        if(stats.progress < 0) stats.progress = 0;
    }

    // 4. Sortir Aktivitas Terbaru
    var sorted = filteredRows.sort(function(a, b) {
      var timeA = Math.max(parseSiabaDateTime(a[0]), parseSiabaDateTime(a[10]), parseSiabaDateTime(a[12]));
      var timeB = Math.max(parseSiabaDateTime(b[0]), parseSiabaDateTime(b[10]), parseSiabaDateTime(b[12]));
      return timeB - timeA; 
    }).slice(0, 7); 

    stats.recent = sorted.map(function(r) {
        var tKirim = parseSiabaDateTime(r[0]);
        var tEdit = parseSiabaDateTime(r[10]);
        var tVerif = parseSiabaDateTime(r[12]);
        var maxTime = Math.max(tKirim, tEdit, tVerif);
        
        var displayTime = String(r[0]);
        if (maxTime === tEdit && tEdit > 0) displayTime = String(r[10]);
        if (maxTime === tVerif && tVerif > 0) displayTime = String(r[12]);
        
        return { sekolah: r[1], status: r[9], waktu: displayTime.replace(/['"]/g, "").trim().substring(0, 16) };
    });

    try {
      cache.put(cacheKey, JSON.stringify(stats), 300);
    } catch(e) {}
    return stats;

  } catch (e) { return { error: "Terjadi kesalahan statistik." }; }
}

/* ======================================================================
   MODULE: NOTIFIKASI GLOBAL SK
   ====================================================================== */
function getNotifikasiSK(role, unit) {
  try {
    var semuaData = getDaftarSK();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;
    
    semuaData.forEach(function(row) {
        var status = String(row.status || "").trim();
        var isDiproses = (status === "Diproses" || status === "");
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isDiproses;
        } else {
            isTarget = (String(row.namaSd).trim().toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
        }
        
        if (isTarget) {
            var isRead = false;
            var readByList = String(row.readBy || "").split(",");
            if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
            if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;
            
            
            var stLower = String(status || "").toLowerCase();
            var isDisetujui = stLower.includes("ok") || stLower.includes("setuju") || stLower.includes("valid") || stLower.includes("selesai");
            
            if (isAdmin) {
                unreadCount++;
            } else {
                if (isDisetujui && isRead) {
                    // Hilang hitungannya
                } else {
                    unreadCount++;
                }
            }
            
            if (!isAdmin && isDisetujui && isRead) {
                // Jangan dimasukkan ke daftar untuk user jika sudah disetujui dan dibaca
            } else {
                notifList.push({
                    rowId: row.rowBaris,
                    source: "SK",
                    namaSd: row.namaSd,
                    kriteria: row.kriteria,
                    status: status || "Diproses",
                    waktu: row.tglVerval && !isDiproses ? row.tglVerval : (row.tglUpdate && isDiproses ? row.tglUpdate : row.tglUnggah),
                    isRead: isRead
                });
            }
        }
    });
    
    // Urutkan (Paling baru dulu, prioritaskan belum dibaca)
    notifList.sort(function(a, b) {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });
    
    // Ambil 5 notifikasi teratas untuk ditampilkan di dropdown
    var recentNotif = notifList.slice(0, 5);
    
    return {
        count: unreadCount,
        recent: recentNotif
    };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

/* ======================================================================
   NEW: NOTIFIKASI GLOBAL (SK + LAPBUL)
   ====================================================================== */
function getNotifikasiGlobal(role, unit) {
  // Cache strategy: simpan hasil selama 90 detik agar tidak berat saat berulang kali dipanggil
  var cacheKey = "NOTIF_GLOBAL_" + String(role || "").toLowerCase() + "_" + String(unit || "").toUpperCase();
  var cache = CacheService.getScriptCache();
  
  try {
    var cached = cache.get(cacheKey);
    if (cached) return cached; // Sudah berupa JSON string
  } catch (e) { /* ignore cache errors */ }

  var modules = {};
  var totalCount = 0;
  
  function callSafe(key, fn, r, u) {
    try {
      var res = getCachedNotifModule(key, r, u, fn, 60);
      if (res && typeof res.count !== 'undefined') {
        modules[key] = res;
        totalCount += (parseInt(res.count) || 0);
      } else {
        modules[key] = { count: 0, recent: [] };
      }
    } catch (e) {
      Logger.log("SULTAN Error [" + key + "]: " + e.message);
      modules[key] = { count: 0, recent: [] };
    }
  }

  try {
    callSafe('sk', getNotifikasiSK, role, unit);
    callSafe('lapbul', getNotifikasiLapbul, role, unit);
    callSafe('lupa', getNotifikasiLupa, role, unit);
    callSafe('salah', getNotifikasiSalah, role, unit);
    callSafe('perdin', getNotifikasiPerdin, role, unit);
    callSafe('cuti', getNotifikasiCuti, role, unit);
    callSafe('surat_cuti', getNotifikasiSuratCuti, role, unit);
    callSafe('efile', getNotifikasiEfile, role, unit);
    callSafe('mutasi_paud', getNotifikasiMutasiPAUD, role, unit);
    callSafe('mutasi_sdn', getNotifikasiMutasiSDN, role, unit);
    callSafe('mutasi_sds', getNotifikasiMutasiSDS, role, unit);
  } catch (err) {
    Logger.log("SULTAN Critical Error: " + err.message);
  }

  var result = JSON.stringify({
    count: totalCount,
    modules: modules
  });
  
  try {
    if (result.length < 100000) {
      cache.put(cacheKey, result, 90);
    }
  } catch (e) { /* ignore cache put errors */ }
  
  return result;
}

function tandaiSemuaNotifGlobalDibaca(role, unit) {
  try {
    tandaiSemuaNotifDibaca(role, unit);
    tandaiSemuaNotifLapbulDibaca(role, unit);
    tandaiSemuaNotifLupaDibaca(role, unit);
    tandaiSemuaNotifSalahDibaca(role, unit);
    tandaiSemuaNotifPerdinDibaca(role, unit);
    tandaiSemuaNotifCutiDibaca_Global(role, unit); 
    tandaiSemuaNotifEfileDibaca_Global(role, unit);
    tandaiSemuaNotifMutasiDibaca_Global(role, unit);
    // Hapus cache agar fetch berikutnya mengambil data segar
    invalidateNotifCache(role, unit);
    return true;
  } catch (e) { return false; }
}

/**
 * Menghapus cache notifikasi global agar fetch berikutnya mengambil data segar dari spreadsheet.
 * Dipanggil setelah perubahan status (Setujui, Tolak, dll) agar sidebar badge terupdate cepat.
 */
function invalidateNotifCache(role, unit) {
  try {
    if (typeof invalidateNotifCachesFor === "function") {
      invalidateNotifCachesFor(role, unit);
    }
    var cache = CacheService.getScriptCache();

    // Bersihkan cache dashboard SK untuk filter yang umum digunakan
    var years = ["", "2023/2024", "2024/2025", "2025/2026", "2026/2027"];
    var semesters = ["", "Gganjil", "Genap", "Ganjil"]; // Beberapa format semester
    years.forEach(function(y) {
      semesters.forEach(function(s) {
        cache.remove("DASHBOARD_SK_" + y + "_" + s);
      });
    });
  } catch (e) { /* ignore */ }
}

// Helper untuk Tandai Semua yang belum ada mass-update-nya
function tandaiSemuaNotifCutiDibaca_Global(role, unit) {
    try {
        var res = getNotifikasiCuti(role, unit);
        res.recent.forEach(function(item) { if(!item.isRead) tandaiNotifCutiDibaca(item.rowId, role); });
        var res2 = getNotifikasiSuratCuti(role, unit);
        res2.recent.forEach(function(item) { if(!item.isRead) tandaiNotifSuratCutiDibaca(item.rowId, role); });
    } catch(e){}
}

function tandaiSemuaNotifEfileDibaca_Global(role, unit) {
    try {
        var res = getNotifikasiEfile(role, unit);
        res.recent.forEach(function(item) { if(!item.isRead) tandaiNotifEfileDibaca(item.rowId, role); });
    } catch(e){}
}

function tandaiSemuaNotifMutasiDibaca_Global(role, unit) {
    try {
        var resPAUD = getNotifikasiMutasiPAUD(role, unit);
        resPAUD.recent.forEach(function(item) { if(!item.isRead) tandaiNotifMutasiPAUDDibaca(item.rowId, role); });
        
        var resSDN = getNotifikasiMutasiSDN(role, unit);
        resSDN.recent.forEach(function(item) { if(!item.isRead) tandaiNotifMutasiSDNDibaca(item.rowId, role); });
        
        var resSDS = getNotifikasiMutasiSDS(role, unit);
        resSDS.recent.forEach(function(item) { if(!item.isRead) tandaiNotifMutasiSDSDibaca(item.rowId, role); });
    } catch(e){}
}

function tandaiNotifDibaca(rowId, role) {
  try {
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var rIdx = parseInt(rowId);
    if (isNaN(rIdx)) return false;
    
    var currentReadBy = String(sheet.getRange(rIdx, 16).getDisplayValue() || "").trim();
    var readMark = (role === "Admin") ? "Admin" : "User";
    
    if (currentReadBy === "") {
        sheet.getRange(rIdx, 16).setValue(readMark);
    } else {
        var list = currentReadBy.split(",");
        if (list.indexOf(readMark) === -1) {
            list.push(readMark);
            sheet.getRange(rIdx, 16).setValue(list.join(","));
        }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function tandaiSemuaNotifDibaca(role, unit) {
  try {
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var data = sheet.getDataRange().getDisplayValues();
    
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var readMark = isAdmin ? "Admin" : "User";
    
    // Siapkan array untuk update sekaligus agar performa cepat
    var valuesToUpdate = [];
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[9] || "").trim();
        var isDiproses = (status === "Diproses" || status === "");
        var namaSd = String(row[1] || "").trim().toUpperCase();
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isDiproses;
        } else {
            isTarget = (namaSd === String(unit).trim().toUpperCase() && !isDiproses);
        }
        
        var currentReadBy = String(row[15] || "").trim();
        if (isTarget && currentReadBy.indexOf(readMark) === -1) {
            var newVal = currentReadBy === "" ? readMark : currentReadBy + "," + readMark;
            valuesToUpdate.push({row: i + 1, val: newVal});
        }
    }
    
    if (valuesToUpdate.length > 0) {
        // Tulis kembali ke sheet
        valuesToUpdate.forEach(function(item) {
            sheet.getRange(item.row, 16).setValue(item.val);
        });
        SpreadsheetApp.flush();
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

/* ======================================================================
   ONE-TIME MIGRATION SCRIPT (MIGRASI FILE BELAJAR.ID KE AKUN UTAMA)
   ====================================================================== */
function migrateBelajarIdFilesToMain() {
  try {
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var targetFolderId = FOLDER_CONFIG.MAIN_SK; // Folder utama SK
    var targetFolder = DriveApp.getFolderById(targetFolderId);
    var data = sheet.getDataRange().getValues();
    
    // Kolom link file adalah H (indeks 7) 
    var KOLOM_LINK = 7; 
    
    for (var i = 1; i < data.length; i++) {
      var link = String(data[i][KOLOM_LINK] || "");
      
      // Deteksi jika link adalah URL Google Drive
      if (link.includes("drive.google.com")) {
        // Ekstrak ID File dari URL
        var match = link.match(/[-\w]{25,}/);
        if (match) {
          var fileId = match[0];
          try {
            var oldFile = DriveApp.getFileById(fileId);
            
            // Cek apakah file ini sudah menjadi milik akun SIKS-Reborn (sudah termigrasi)
            var isAlreadyOwned = false;
            try {
              if (oldFile.getOwner() && oldFile.getOwner().getEmail() === Session.getActiveUser().getEmail()) {
                isAlreadyOwned = true;
              }
            } catch(e) {}

            if (isAlreadyOwned) {
               Logger.log("Baris " + (i + 1) + " dilewati (Sudah termigrasi sebelumnya).");
               continue; 
            }
            
            // Lakukan duplikasi ke folder target. 
            // Karena dijalankan oleh akun ini, file baru akan menjadi milik akun ini.
            var newFile = oldFile.makeCopy(oldFile.getName(), targetFolder);
            
            // Set agar bisa di-embed di iframe SPA
            newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            
            // Tulis link baru ke spreadsheet (i + 1 karena array 0-indexed, baris Google Sheet 1-indexed)
            sheet.getRange(i + 1, KOLOM_LINK + 1).setValue(newFile.getUrl());
            Logger.log("Berhasil migrasi baris " + (i + 1) + ": " + newFile.getName());
            
          } catch (e) {
            Logger.log("Gagal migrasi baris " + (i + 1) + " (Akses ditolak / Error): " + e.message);
          }
        }
      }
    }
    return "Migrasi Selesai! Silakan cek Logs (Eksekusi) untuk detailnya.";
  } catch (error) {
    Logger.log("Error utama: " + error.message);
    return "Error: " + error.message;
  }
}

/* ======================================================================
   SCRIPT AUTO-MATCH FILE (UNDUH-UNGGAH MASSAL)
   ====================================================================== */
function autoMatchUploadedFiles() {
  try {
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var targetFolderId = FOLDER_CONFIG.MAIN_SK; // Folder utama SK
    var targetFolder = DriveApp.getFolderById(targetFolderId);
    var data = sheet.getDataRange().getValues();
    
    var KOLOM_LINK = 7; // H (indeks 7)
    var KOLOM_NAMA_FILE = 19; // T (indeks 19)
    
    // 1. Dapatkan semua file di folder target dan simpan dalam memory (Dictionary/Object)
    // agar pencarian sangat cepat
    var fileIterator = targetFolder.getFiles();
    var mapFiles = {};
    while (fileIterator.hasNext()) {
      var file = fileIterator.next();
      var nama = file.getName();
      // Simpan file teratas (jika ada nama ganda, akan ditimpa)
      mapFiles[nama] = file;
    }
    
    // 2. Looping baris di spreadsheet
    var counterBerhasil = 0;
    for (var i = 1; i <= 258; i++) {
      if (!data[i]) continue;
      
      var namaDiSheet = String(data[i][KOLOM_NAMA_FILE] || "").trim();
      
      // Jika kolom T berisi nama file yang valid (bukan pesan error dan bukan kosong)
      if (namaDiSheet !== "" && namaDiSheet.indexOf("Gagal:") === -1) {
        
        // Cek apakah file dengan nama tersebut ada di folder SIKS-Reborn
        var matchedFile = mapFiles[namaDiSheet];
        if (matchedFile) {
          // Set agar publik supaya bisa dibuka di tabel (berjaga-jaga)
          matchedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          var urlBaru = matchedFile.getUrl();
          
          // Timpa link lama dengan link baru di Kolom H
          sheet.getRange(i + 1, KOLOM_LINK + 1).setValue(urlBaru);
          
          // Beri tanda bahwa sudah berhasil di kolom U
          sheet.getRange(i + 1, KOLOM_NAMA_FILE + 2).setValue("Berhasil Dicocokkan");
          
          counterBerhasil++;
        } else {
          sheet.getRange(i + 1, KOLOM_NAMA_FILE + 2).setValue("Gagal: File tidak diupload");
        }
      }
    }
    
    SpreadsheetApp.flush();
    Logger.log("Proses selesai! " + counterBerhasil + " file berhasil dicocokkan dan diperbarui.");
    return "Selesai";
    
  } catch (error) {
    Logger.log("Error utama: " + error.message);
    return "Error: " + error.message;
  }
}

/* ======================================================================
   SCRIPT MERAPIKAN DAN RENAME FILE KE FOLDER TAHUN & SEMESTER
   ====================================================================== */
function organizeAndRenameFiles() {
  try {
    var sheet = getSheet("SK_DATA_DB", "Unggah_SK");
    var mainFolderId = FOLDER_CONFIG.MAIN_SK; 
    var mainFolder = DriveApp.getFolderById(mainFolderId);
    var data = sheet.getDataRange().getValues();
    
    // Index Kolom Google Sheets (0-indexed)
    var KOLOM_NAMA_SD = 1; // B
    var KOLOM_TAHUN = 2; // C
    var KOLOM_SEMESTER = 3; // D
    var KOLOM_NO_SK = 4; // E
    var KOLOM_KRITERIA = 6; // G
    var KOLOM_LINK = 7; // H
    
    var counter = 0;
    
    // Looping semua baris dari baris 2 sampai akhir
    for (var i = 1; i < data.length; i++) {
      if (!data[i]) continue;
      
      var link = String(data[i][KOLOM_LINK] || "").trim();
      var namaSd = String(data[i][KOLOM_NAMA_SD] || "").trim();
      var tahunAjaran = String(data[i][KOLOM_TAHUN] || "").trim();
      var semester = String(data[i][KOLOM_SEMESTER] || "").trim();
      var kriteria = String(data[i][KOLOM_KRITERIA] || "").trim();
      var nomorSk = String(data[i][KOLOM_NO_SK] || "").trim().replace(/^'/, ""); // hapus tanda petik satu jika terbawa
      
      // Jika ada link dan tahun ajaran
      if (link.includes("drive.google.com") && tahunAjaran !== "") {
        var match = link.match(/[-\w]{25,}/);
        if (match) {
          var fileId = match[0];
          try {
            var file = DriveApp.getFileById(fileId);
            
            // 1. Rename File sesuai format standar sistem:
            // SD MUH PAYAMAN - 2024-2025 - Semester 1 - Pembagian Tugas - 421.2/01.pdf
            var namaFileBaru = namaSd + " - " + tahunAjaran.replace(/\//g,'-') + " - " + semester + " - " + kriteria + " - " + nomorSk + ".pdf";
            
            if (file.getName() !== namaFileBaru) {
               file.setName(namaFileBaru);
            }
            
            // 2. Tentukan & Buat Folder Target
            var namaFolderTahun = tahunAjaran.replace(/\//g, '-');
            var folderTahun = getOrCreateFolder(mainFolder, namaFolderTahun);
            var folderSemester = getOrCreateFolder(folderTahun, semester);
            
            // 3. Pindahkan file jika belum berada di folder target
            var parents = file.getParents();
            var currentParentId = parents.hasNext() ? parents.next().getId() : null;
            
            if (currentParentId !== folderSemester.getId()) {
               file.moveTo(folderSemester);
            }
            
            counter++;
          } catch (e) {
            Logger.log("Gagal memproses baris " + (i+1) + " (File mungkin tidak ditemukan): " + e.message);
          }
        }
      }
    }
    
    Logger.log("Selesai! " + counter + " file berhasil di-rename dan dipindahkan ke folder.");
    return "Selesai!";
    
  } catch (error) {
    Logger.log("Error utama: " + error.message);
  }
}