/* ======================================================================
   MODUL: ADMINISTRASI MURID - SERAGAM GRATIS
   DB Key    : SERAGAM_GRATIS_DB
   Folders   : SERAGAM_BA_DOCS, SERAGAM_DOKUMENTASI_DOCS, SERAGAM_LAPORAN_DOCS
   ====================================================================== */

const KONFIG_SERAGAM = {
  DB_KEY: "SERAGAM_GRATIS_DB"
};

/**
 * Helper to get or create sheet in Seragam database
 */
function getOrCreateSheetSeragam(sheetName) {
  var ss = getDB(KONFIG_SERAGAM.DB_KEY);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === "") {
    if (sheetName.indexOf("Tahap") !== -1 || sheetName.indexOf("Tambahan") !== -1) {
      sheet.getRange(1, 1, 1, 7).setValues([[
        "NPSN", "NAMA MURID", "NISN", "JENIS KELAMIN", "UKURAN SERAGAM", "ALAMAT", "NAMA ORANG TUA/WALI"
      ]]);
    } else if (sheetName === "Laporan_Penerimaan") {
      sheet.getRange(1, 1, 1, 11).setValues([[
        "NPSN", "Nama_Sekolah", "Tahun", "Nama_File_SP", "URL_File_SP", "ID_File_SP", 
        "Nama_File_Dok", "URL_File_Dok", "ID_File_Dok", "Tgl_Upload", "Uploader"
      ]]);
    } else if (sheetName === "Berita_Acara") {
      sheet.getRange(1, 1, 1, 8).setValues([[
        "NPSN", "Nama_Sekolah", "Tahun", "Nama_File_BA", "URL_File_BA", "ID_File_BA", "Tgl_Upload", "Uploader"
      ]]);
    }
  }
  return sheet;
}

/**
 * Get distinct years from sheet names
 */
function seragam_getAvailableYears() {
  try {
    var ss = getDB(KONFIG_SERAGAM.DB_KEY);
    var sheets = ss.getSheets();
    var years = [];
    sheets.forEach(function(sh) {
      var name = sh.getName();
      var match = name.match(/^(\d{4})\s+(Tahap\s+\d+|Tambahan)$/);
      if (match) {
        var yr = match[1];
        if (years.indexOf(yr) === -1) {
          years.push(yr);
        }
      }
    });
    
    years.sort(function(a, b) { return b - a; });
    if (years.length === 0) {
      years.push(new Date().getFullYear().toString());
    }
    return JSON.stringify({ success: true, data: years });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/**
 * Add a new year (creates 3 sheets: Tahap 1, Tahap 2, Tambahan)
 */
function seragam_tambahTahun(tahun) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var t = String(tahun).trim();
    if (!/^\d{4}$/.test(t)) {
      return JSON.stringify({ success: false, message: "Format tahun tidak valid (harus 4 digit)." });
    }
    getOrCreateSheetSeragam(t + " Tahap 1");
    getOrCreateSheetSeragam(t + " Tahap 2");
    getOrCreateSheetSeragam(t + " Tambahan");
    return JSON.stringify({ success: true, message: "Tahun " + t + " berhasil ditambahkan." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get recipient list
 */
function seragam_getDataPenerima(tahun, tahap, npsnFilter) {
  try {
    var sheetName = tahun + " " + tahap;
    var sheet = getOrCreateSheetSeragam(sheetName);
    var values = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();

    // Map NPSN to School Name
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var sekolahData = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var npsnToName = {};
    for (var j = 1; j < sekolahData.length; j++) {
      npsnToName[String(sekolahData[j][0]).trim()] = String(sekolahData[j][2]).trim();
    }

    for (var i = 1; i < values.length; i++) {
      var rNpsn = String(values[i][0]).trim();
      if (!rNpsn) continue;

      if (!targetNpsn || targetNpsn === "SEMUA" || rNpsn === targetNpsn) {
        result.push({
          rowId: i + 1,
          npsn: values[i][0],
          nama_sekolah: npsnToName[values[i][0]] || "Sekolah Tidak Dikenal",
          nama_murid: values[i][1],
          nisn: values[i][2],
          jenis_kelamin: values[i][3],
          ukuran_seragam: values[i][4],
          alamat: values[i][5],
          nama_wali: values[i][6]
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/**
 * Save / Edit Recipient
 */
function seragam_saveRecipient(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheetName = payload.tahun + " " + payload.tahap;
    var sheet = getOrCreateSheetSeragam(sheetName);
    var isEdit = payload.rowId ? true : false;

    var npsn = String(payload.npsn || "").trim();
    var namaMurid = String(payload.nama_murid || "").trim();
    var nisn = String(payload.nisn || "").trim();
    var jk = String(payload.jenis_kelamin || "").trim();
    var ukuran = String(payload.ukuran_seragam || "").trim();
    var alamat = String(payload.alamat || "").trim();
    var wali = String(payload.nama_wali || "").trim();

    if (isEdit) {
      var row = parseInt(payload.rowId);
      sheet.getRange(row, 1, 1, 7).setValues([[
        npsn, namaMurid, nisn, jk, ukuran, alamat, wali
      ]]);
    } else {
      sheet.appendRow([
        npsn, namaMurid, nisn, jk, ukuran, alamat, wali
      ]);
    }
    return JSON.stringify({ success: true, message: "Data penerima berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete Recipient
 */
function seragam_deleteRecipient(tahun, tahap, rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheetName = tahun + " " + tahap;
    var sheet = getOrCreateSheetSeragam(sheetName);
    var row = parseInt(rowId);
    sheet.deleteRow(row);
    return JSON.stringify({ success: true, message: "Data penerima berhasil dihapus." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Recipient aggregation per size and gender
 */
function seragam_getRekap(tahun, tahap) {
  try {
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var sekolahData = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    
    var schoolMap = {};
    for (var j = 1; j < sekolahData.length; j++) {
      schoolMap[String(sekolahData[j][0]).trim()] = String(sekolahData[j][2]).trim();
    }

    var targetSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
    var matrix = {};

    var stages = (!tahap || tahap === "SEMUA") ? ["Tahap 1", "Tahap 2", "Tambahan"] : [tahap];
    stages.forEach(function(stg) {
      try {
        var sheetName = tahun + " " + stg;
        var ss = getDB(KONFIG_SERAGAM.DB_KEY);
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) return;
        var values = sheet.getDataRange().getDisplayValues();
        for (var i = 1; i < values.length; i++) {
          var npsn = String(values[i][0]).trim();
          if (!npsn) continue;
          
          var jk = String(values[i][3]).trim().toUpperCase();
          var size = String(values[i][4]).trim().toUpperCase();
          
          if (!matrix[npsn]) {
            matrix[npsn] = {};
            targetSizes.forEach(function(sz) {
              matrix[npsn][sz] = { L: 0, P: 0, JML: 0 };
            });
            matrix[npsn]["TOTAL"] = { L: 0, P: 0, JML: 0 };
          }

          var genderKey = (jk === "L" || jk === "LAKI-LAKI" || jk === "LAKI - LAKI") ? "L" : "P";
          
          var matchedSize = null;
          for (var k = 0; k < targetSizes.length; k++) {
            if (size === targetSizes[k] || size === targetSizes[k].toUpperCase()) {
              matchedSize = targetSizes[k];
              break;
            }
          }
          
          if (matchedSize) {
            matrix[npsn][matchedSize][genderKey]++;
            matrix[npsn][matchedSize]["JML"]++;
            matrix[npsn]["TOTAL"][genderKey]++;
            matrix[npsn]["TOTAL"]["JML"]++;
          }
        }
      } catch (err) {
        // Skip missing sheets
      }
    });

    var rekapData = [];
    Object.keys(matrix).forEach(function(npsn) {
      var row = {
        npsn: npsn,
        nama_sekolah: schoolMap[npsn] || npsn,
        sizes: matrix[npsn]
      };
      rekapData.push(row);
    });

    rekapData.sort(function(a, b) {
      return a.nama_sekolah.localeCompare(b.nama_sekolah);
    });

    return JSON.stringify({ success: true, data: rekapData });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

// ==========================================
// LAPORAN PENERIMAAN CRUD
// ==========================================
function seragam_getLaporan(tahun, npsnFilter) {
  try {
    var sheet = getOrCreateSheetSeragam("Laporan_Penerimaan");
    var values = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    var targetTahun = String(tahun || "").trim();

    for (var i = 1; i < values.length; i++) {
      var rNpsn = String(values[i][0]).trim();
      var rTahun = String(values[i][2]).trim();
      if (!rNpsn) continue;

      if ((!targetNpsn || targetNpsn === "SEMUA" || rNpsn === targetNpsn) && (!targetTahun || rTahun === targetTahun)) {
        result.push({
          rowId: i + 1,
          npsn: values[i][0],
          nama_sekolah: values[i][1],
          tahun: values[i][2],
          nama_file_sp: values[i][3],
          url_file_sp: values[i][4],
          id_file_sp: values[i][5],
          nama_file_dok: values[i][6],
          url_file_dok: values[i][7],
          id_file_dok: values[i][8],
          tgl_upload: values[i][9],
          uploader: values[i][10],
          tahap: values[i][11] || "Laporan 1",
          jenis_seragam: values[i][12] || "Merah Putih",
          jml_l: parseInt(values[i][13]) || 0,
          jml_p: parseInt(values[i][14]) || 0,
          jml_total: parseInt(values[i][15]) || 0,
          nama_file_video: values[i][16] || "",
          url_file_video: values[i][17] || "",
          id_file_video: values[i][18] || "",
          tgl_edit: values[i][19] || "",
          user_edit: values[i][20] || "",
          status: values[i][21] || "DIPROSES",
          catatan: values[i][22] || "",
          user_verif: values[i][23] || "",
          tgl_verif: values[i][24] || "",
          detail_json: values[i][25] || ""
        });
      }
    }
    // Robust parser to get the latest activity timestamp
    var getLatestTimestamp = function(row) {
      var parseTime = function(dtStr) {
        if (!dtStr) return 0;
        var s = String(dtStr).trim();
        if (s === "-" || s === "") return 0;
        var parts = s.split(' ');
        if (parts.length < 2) return 0;
        var dateParts = parts[0].split('-');
        var timeParts = parts[1].split(':');
        if (dateParts.length < 3 || timeParts.length < 3) return 0;
        return new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]).getTime();
      };
      
      var t1 = parseTime(row.tgl_upload);
      var t2 = parseTime(row.tgl_edit);
      var t3 = parseTime(row.tgl_verif);
      
      return Math.max(t1, t2, t3);
    };

    // Sort by last activity descending
    result.sort(function(a, b) {
      return getLatestTimestamp(b) - getLatestTimestamp(a);
    });

    return JSON.stringify({ success: true, data: result });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function seragam_saveLaporan(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetSeragam("Laporan_Penerimaan");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    payload.nama_sekolah = String(payload.nama_sekolah || "").toUpperCase().trim();
    var isEdit = payload.rowId ? true : false;
    var fileUrlSp = payload.url_file_sp || "";
    var fileIdSp = payload.id_file_sp || "";
    
    var fileNamesDok = payload.nama_file_dok || "";
    var fileUrlsDok = payload.url_file_dok || "";
    var fileIdsDok = payload.id_file_dok || "";

    var fileNameVideo = payload.nama_file_video || "";
    var fileUrlVideo = payload.url_file_video || "";
    var fileIdVideo = payload.id_file_video || "";

    // If new SP file was uploaded, trash the old one
    if (isEdit && payload.newSpUploaded && payload.oldIdSp) {
      try { DriveApp.getFileById(payload.oldIdSp).setTrashed(true); } catch(err) {}
    }

    // If new Dok photos were uploaded, trash the old ones
    if (isEdit && payload.newDokUploaded && payload.oldIdsDok) {
      var oldIds = String(payload.oldIdsDok).split(', ');
      oldIds.forEach(function(oid) {
        if (oid) {
          try { DriveApp.getFileById(oid.trim()).setTrashed(true); } catch(err) {}
        }
      });
    }

    // If new Video was uploaded, trash the old one
    if (isEdit && payload.newVideoUploaded && payload.oldIdVideo) {
      try { DriveApp.getFileById(payload.oldIdVideo).setTrashed(true); } catch(err) {}
    }

    // Check duplicates if it is a new record
    if (!isEdit) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var existingNpsn = String(data[i][0]).trim();
        var existingTahun = String(data[i][2]).trim();
        var existingTahap = String(data[i][11]).trim();
        var existingJenis = String(data[i][12]).trim();
        
        if (existingNpsn === String(payload.npsn).trim() &&
            existingTahun === String(payload.tahun).trim() &&
            existingTahap === String(payload.tahap).trim() &&
            existingJenis === String(payload.jenis_seragam).trim()) {
          throw new Error("Laporan untuk sekolah, tahun, tahap, dan jenis seragam ini sudah pernah diunggah. Silakan lakukan EDIT pada laporan yang sudah ada.");
        }
      }
    }

    if (isEdit) {
      var row = parseInt(payload.rowId);
      // Retrieve previous upload date and uploader if not supplied to preserve original info
      var currentValues = sheet.getRange(row, 1, 1, 11).getValues()[0];
      var originalTglUpload = currentValues[9] ? Utilities.formatDate(new Date(currentValues[9]), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss") : now;
      var originalUploader = currentValues[10] || payload.user_login;

      sheet.getRange(row, 1, 1, 19).setValues([[
        payload.npsn, payload.nama_sekolah, payload.tahun,
        payload.nama_file_sp, fileUrlSp, fileIdSp,
        fileNamesDok, fileUrlsDok, fileIdsDok,
        originalTglUpload, originalUploader,
        payload.tahap, payload.jenis_seragam,
        payload.jml_l, payload.jml_p, payload.jml_total,
        fileNameVideo, fileUrlVideo, fileIdVideo
      ]]);
      
      sheet.getRange(row, 20).setValue(now);
      sheet.getRange(row, 21).setValue(payload.user_login);
      sheet.getRange(row, 22).setValue("DIPROSES");
      sheet.getRange(row, 23).setValue("");
      
      // Compute jml totals from detail_json and write col 14-16 + 26
      var detailObj = {};
      try { detailObj = JSON.parse(payload.detail_json || "{}" ); } catch(ex) {}
      var totL = 0, totP = 0;
      var ukuranList = ["S","M","L","XL","2XL","3XL","4XL","5XL"];
      Object.keys(detailObj).forEach(function(jns) {
        ukuranList.forEach(function(ukr) {
          if (detailObj[jns][ukr]) {
            totL += parseInt(detailObj[jns][ukr].terima_l) || 0;
            totP += parseInt(detailObj[jns][ukr].terima_p) || 0;
          }
        });
      });
      sheet.getRange(row, 14).setValue(totL);
      sheet.getRange(row, 15).setValue(totP);
      sheet.getRange(row, 16).setValue(totL + totP);
      sheet.getRange(row, 26).setValue(payload.detail_json || "");
    } else {
      sheet.appendRow([
        payload.npsn, payload.nama_sekolah, payload.tahun,
        payload.nama_file_sp, fileUrlSp, fileIdSp,
        fileNamesDok, fileUrlsDok, fileIdsDok,
        now, payload.user_login,
        payload.tahap, payload.jenis_seragam,
        payload.jml_l, payload.jml_p, payload.jml_total,
        fileNameVideo, fileUrlVideo, fileIdVideo,
        "", "", // tgl_edit, user_edit
        "DIPROSES", "", "", "", // status, catatan, user_verif, tgl_verif
        (function() {
          var dj = {};
          try { dj = JSON.parse(payload.detail_json || "{}"); } catch(ex) {}
          var tL = 0, tP = 0;
          var ukl = ["S","M","L","XL","2XL","3XL","4XL","5XL"];
          Object.keys(dj).forEach(function(jns) {
            ukl.forEach(function(ukr) {
              if (dj[jns][ukr]) {
                tL += parseInt(dj[jns][ukr].terima_l) || 0;
                tP += parseInt(dj[jns][ukr].terima_p) || 0;
              }
            });
          });
          // patch jml cols inline via closure — appendRow needs all at once, handled below
          payload._totL = tL; payload._totP = tP;
          return payload.detail_json || "";
        })()
      ]);
      // Fix computed jml cols after appendRow
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 14).setValue(payload._totL || 0);
      sheet.getRange(lastRow, 15).setValue(payload._totP || 0);
      sheet.getRange(lastRow, 16).setValue((payload._totL || 0) + (payload._totP || 0));
    }

    return JSON.stringify({ success: true, message: "Laporan Penerimaan berhasil disimpan." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function seragam_saveVerifikasi(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetSeragam("Laporan_Penerimaan");
    var row = parseInt(payload.rowId);
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    // Column 22: status, Column 23: catatan, Column 24: user_verif, Column 25: tgl_verif
    sheet.getRange(row, 22).setValue(payload.status);
    sheet.getRange(row, 23).setValue(payload.catatan || "");
    sheet.getRange(row, 24).setValue(payload.user_verif);
    sheet.getRange(row, 25).setValue(now);

    return JSON.stringify({ success: true, message: "Verifikasi Laporan Penerimaan berhasil disimpan." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function seragam_deleteLaporan(rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetSeragam("Laporan_Penerimaan");
    var row = parseInt(rowId);
    var fileIdSp = sheet.getRange(row, 6).getValue();
    var fileIdDokStr = sheet.getRange(row, 9).getValue();
    var fileIdVideo = sheet.getRange(row, 19).getValue();

    if (fileIdSp) {
      try { DriveApp.getFileById(fileIdSp).setTrashed(true); } catch(err) {}
    }
    if (fileIdDokStr) {
      var ids = String(fileIdDokStr).split(', ');
      ids.forEach(function(id) {
        if (id) {
          try { DriveApp.getFileById(id.trim()).setTrashed(true); } catch(err) {}
        }
      });
    }
    if (fileIdVideo) {
      try { DriveApp.getFileById(fileIdVideo).setTrashed(true); } catch(err) {}
    }

    sheet.deleteRow(row);
    return JSON.stringify({ success: true, message: "Laporan Penerimaan berhasil dihapus." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// BERITA ACARA CRUD
// ==========================================
function seragam_getBeritaAcara(tahun, npsnFilter) {
  try {
    var sheet = getOrCreateSheetSeragam("Berita_Acara");
    var values = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    var targetTahun = String(tahun || "").trim();

    for (var i = 1; i < values.length; i++) {
      var rNpsn = String(values[i][0]).trim();
      var rTahun = String(values[i][2]).trim();
      if (!rNpsn) continue;

      if ((!targetNpsn || targetNpsn === "SEMUA" || rNpsn === targetNpsn) && (!targetTahun || rTahun === targetTahun)) {
        result.push({
          rowId: i + 1,
          npsn: values[i][0],
          nama_sekolah: values[i][1],
          tahun: values[i][2],
          nama_file_ba: values[i][3],
          url_file_ba: values[i][4],
          id_file_ba: values[i][5],
          tgl_upload: values[i][6],
          uploader: values[i][7]
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function seragam_saveBeritaAcara(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetSeragam("Berita_Acara");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    var isEdit = payload.rowId ? true : false;
    var fileUrlBa = payload.url_file_ba || "";
    var fileIdBa = payload.id_file_ba || "";

    if (payload.fileBaBase64) {
      if (isEdit && fileIdBa) {
        try { DriveApp.getFileById(fileIdBa).setTrashed(true); } catch(err) {}
      }
      var folderBa = DriveApp.getFolderById(FOLDER_CONFIG.SERAGAM_BA_DOCS);
      var blob = Utilities.newBlob(Utilities.base64Decode(payload.fileBaBase64), payload.mimeTypeBa, payload.nama_file_ba);
      var file = folderBa.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrlBa = file.getUrl();
      fileIdBa = file.getId();
    }

    if (isEdit) {
      var row = parseInt(payload.rowId);
      sheet.getRange(row, 1, 1, 8).setValues([[
        payload.npsn, payload.nama_sekolah, payload.tahun,
        payload.nama_file_ba, fileUrlBa, fileIdBa,
        now, payload.user_login
      ]]);
    } else {
      sheet.appendRow([
        payload.npsn, payload.nama_sekolah, payload.tahun,
        payload.nama_file_ba, fileUrlBa, fileIdBa,
        now, payload.user_login
      ]);
    }

    return JSON.stringify({ success: true, message: "Berita Acara berhasil disimpan." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function seragam_deleteBeritaAcara(rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetSeragam("Berita_Acara");
    var row = parseInt(rowId);
    var fileIdBa = sheet.getRange(row, 6).getValue();

    if (fileIdBa) {
      try { DriveApp.getFileById(fileIdBa).setTrashed(true); } catch(err) {}
    }

    sheet.deleteRow(row);
    return JSON.stringify({ success: true, message: "Berita Acara berhasil dihapus." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fetch schools list directly from Data_Sekolah sheet in USER_DB
 */
function seragam_getSekolahList() {
  try {
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var sekolahData = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var schools = [];
    for (var j = 1; j < sekolahData.length; j++) {
      var rNpsn = String(sekolahData[j][0]).trim();
      var rNama = String(sekolahData[j][2]).trim();
      var rJenjang = String(sekolahData[j][1]).trim().toUpperCase();
      var rStatus = String(sekolahData[j][3]).trim().toUpperCase();
      if (rNpsn !== "") {
        schools.push({ 
          npsn: rNpsn, 
          nama: rNama, 
          jenjang: rJenjang,
          status: rStatus
        });
      }
    }
    return schools;
  } catch (e) {
    return [];
  }
}

function seragam_uploadSingleFile(base64Data, mimeType, fileName, fileType) {
  try {
    var folderId = (fileType === "sp") ? FOLDER_CONFIG.SERAGAM_LAPORAN_DOCS : FOLDER_CONFIG.SERAGAM_DOKUMENTASI_DOCS;
    var folder = DriveApp.getFolderById(folderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return JSON.stringify({
      success: true,
      id: file.getId(),
      url: file.getUrl()
    });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/**
 * Get Dashboard Data for Seragam Gratis Laporan Penerimaan
 */
function seragam_getDashboardData(tahun) {
  try {
    var ss = getDB(KONFIG_SERAGAM.DB_KEY);
    var sheets = ss.getSheets();
    
    // Ambil daftar sekolah resmi SD Negeri untuk filter utama
    var masterSekolah = {}; // NPSN -> namaSekolah
    var sdNegeriNpsn = {};  // NPSN -> true
    try {
      var schools = seragam_getSekolahList();
      schools.forEach(function(s) {
        if (s.jenjang === "SD" && s.status === "NEGERI") {
          masterSekolah[s.npsn] = s.nama;
          sdNegeriNpsn[s.npsn] = true;
        }
      });
    } catch(e) {}
    
    var mapSekolahSasaran = {}; // NPSN -> {nama: String, jmlPenerima: Number}
    
    // Ambil semua data penerima tahun tersebut
    sheets.forEach(function(sh) {
      var name = sh.getName();
      if (name.indexOf(tahun) === 0 && (name.indexOf("Tahap") !== -1 || name.indexOf("Tambahan") !== -1)) {
        var data = sh.getDataRange().getDisplayValues();
        for (var i = 1; i < data.length; i++) {
          var npsn = String(data[i][0] || "").trim();
          if (!npsn || !sdNegeriNpsn[npsn]) continue; // Saring hanya SD Negeri
          
          var namaSek = masterSekolah[npsn] || "SDN " + npsn;
          if (!mapSekolahSasaran[npsn]) {
            mapSekolahSasaran[npsn] = { npsn: npsn, nama: namaSek, jmlPenerima: 0 };
          }
          mapSekolahSasaran[npsn].jmlPenerima++;
        }
      }
    });
    
    // Ambil data Laporan_Penerimaan beserta Jenis Seragam-nya
    var shLap = getOrCreateSheetSeragam("Laporan_Penerimaan");
    var dataLap = shLap.getDataRange().getDisplayValues();
    var listLaporan = []; // Array of {npsn, jenis, sp, dok, tgl, status}
    
    for (var i = 1; i < dataLap.length; i++) {
      var npsn = String(dataLap[i][0] || "").trim();
      var thn = String(dataLap[i][2] || "").trim();
      if (thn === tahun && sdNegeriNpsn[npsn]) {
        var hasSp = String(dataLap[i][4] || "").trim() !== ""; // URL_File_SP
        var hasDok = String(dataLap[i][7] || "").trim() !== ""; // URL_File_Dok
        var tgl = dataLap[i][9];
        var jenis = String(dataLap[i][12] || "").trim(); // Col 13 (index 12)
        var statusLapor = String(dataLap[i][21] || "DIPROSES").trim().toUpperCase(); // Col 22 (index 21)
        listLaporan.push({
          npsn: npsn,
          jenis: jenis,
          sp: hasSp,
          dok: hasDok,
          tgl: tgl,
          status: statusLapor
        });
      }
    }
    
    // Rekapitulasi awal (default global)
    var rekap = [];
    var listNpsn = Object.keys(mapSekolahSasaran);
    listNpsn.forEach(function(npsn) {
      var sasaran = mapSekolahSasaran[npsn];
      rekap.push({
        npsn: npsn,
        namaSekolah: sasaran.nama,
        jmlPenerima: sasaran.jmlPenerima
      });
    });
    
    return JSON.stringify({
      success: true,
      rekap: rekap,
      laporan: listLaporan
    });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
