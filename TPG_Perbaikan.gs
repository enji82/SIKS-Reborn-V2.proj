/* ======================================================================
   MODUL: TPG - PERBAIKAN GAJI POKOK
   ====================================================================== */

const TPG_PG_CONFIG = {
  DB_KEY: "TPG_PERBAIKAN_DB",
  SHEET_NAME: "Perbaikan Gaji",
  FOLDER_KEY: "TPG_PERBAIKAN_DOCS"
};

// 1. Setup Sheet
function tpgPg_ensureSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS[TPG_PG_CONFIG.DB_KEY]);
  var sheet = ss.getSheetByName(TPG_PG_CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TPG_PG_CONFIG.SHEET_NAME);
    var headers = [
      "ID", "Unit Kerja", "Nama ASN", "NIP", "Status Pegawai", "NUPTK", 
      "Jenis SK", "TMT", "Gaji Pokok", "Dokumen", "Status", "Verifikasi Oleh", 
      "Waktu Verifikasi", "Keterangan", "Upload Oleh", "Waktu Upload", 
      "Edit Oleh", "Waktu Edit"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#d3d3d3");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// 2. Fetch ASN Data
function tpg_getGuruOptions(unitKerja) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.PTK_DB);
    var sheet = ss.getSheetByName("Master Data GTK");
    if (!sheet) return { status: 'error', message: 'Sheet Master Data GTK tidak ditemukan' };
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: 'success', data: [] };
    
    var data = sheet.getRange(2, 1, lastRow - 1, 30).getValues();
    var allowedStatus = ["CPNS", "PNS", "PPPK", "PPPK Paruh Waktu"];
    var result = [];
    
    for (var i = 0; i < data.length; i++) {
      var rowUnit = String(data[i][2]).trim();
      var rowStatus = String(data[i][19]).trim(); // T = 19
      
      if (rowUnit === unitKerja && allowedStatus.indexOf(rowStatus) !== -1) {
        result.push({
          nama: String(data[i][6]).trim(), // G = 6
          nip: String(data[i][7]).trim(),  // H = 7
          statusPegawai: rowStatus,
          nuptk: String(data[i][26]).trim() // AA = 26
        });
      }
    }
    
    result.sort(function(a, b) {
      if (a.nama < b.nama) return -1;
      if (a.nama > b.nama) return 1;
      return 0;
    });
    
    return { status: 'success', data: result };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// 3. Read Data
function tpg_getPerbaikanData(unitKerja, isAdmin) {
  try {
    var sheet = tpgPg_ensureSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: 'success', data: [] };
    
    var data = sheet.getRange(2, 1, lastRow - 1, 18).getValues();
    var result = [];
    var tz = Session.getScriptTimeZone();
    
    for (var i = 0; i < data.length; i++) {
      var rowUnit = data[i][1];
      
      // Jika bukan admin, hanya ambil data milik unit kerjanya saja
      if (!isAdmin && String(rowUnit).trim().toLowerCase() !== String(unitKerja).trim().toLowerCase()) {
        continue;
      }
      
      result.push({
        id: data[i][0],
        unitKerja: rowUnit,
        namaAsn: data[i][2],
        nip: data[i][3],
        statusPegawai: data[i][4],
        nuptk: data[i][5],
        jenisSK: data[i][6],
        tmt: data[i][7] ? Utilities.formatDate(new Date(data[i][7]), tz, "yyyy-MM-dd") : "",
        gajiPokok: data[i][8],
        dokumenUrl: data[i][9],
        status: data[i][10] || "Diproses",
        verifikasiOleh: data[i][11],
        waktuVerifikasi: data[i][12] ? Utilities.formatDate(new Date(data[i][12]), tz, "yyyy-MM-dd'T'HH:mm:ss") : "",
        keterangan: data[i][13],
        uploadOleh: data[i][14],
        waktuUpload: data[i][15] ? Utilities.formatDate(new Date(data[i][15]), tz, "yyyy-MM-dd'T'HH:mm:ss") : "",
        editOleh: data[i][16],
        waktuEdit: data[i][17] ? Utilities.formatDate(new Date(data[i][17]), tz, "yyyy-MM-dd'T'HH:mm:ss") : ""
      });
    }
    
    result.reverse();
    var isOpen = true;
    try {
      var props = PropertiesService.getScriptProperties();
      var status = props.getProperty('TPG_PG_IS_OPEN');
      isOpen = (status === null ? true : (status === 'true'));
    } catch(e) {}

    return { status: 'success', data: result, isOpen: isOpen };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function tpgPg_toggleOpenStatus(isAdmin, currentStatus) {
  if (!isAdmin) return { status: 'error', message: 'Akses ditolak.' };
  try {
    var props = PropertiesService.getScriptProperties();
    var newStatus = !currentStatus;
    props.setProperty('TPG_PG_IS_OPEN', newStatus.toString());
    return { status: 'success', isOpen: newStatus };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// 4. Create
function tpg_savePerbaikan(formData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    var props = PropertiesService.getScriptProperties();
    var status = props.getProperty('TPG_PG_IS_OPEN');
    var isOpen = (status === null ? true : (status === 'true'));
    if (!isOpen) {
       return { status: 'error', message: 'Penambahan data saat ini sedang ditutup oleh Admin.' };
    }

    var currentUser = formData.userLogin || "Unknown";
    
    var sheet = tpgPg_ensureSheet();
    var newId = "TPG-PG-" + new Date().getTime();
    var tmtDate = formData.tmt ? new Date(formData.tmt) : "";
    var now = new Date();
    
    var docUrl = "";
    if (formData.fileData) {
      var folder = DriveApp.getFolderById(FOLDER_CONFIG[TPG_PG_CONFIG.FOLDER_KEY]);
      var blob = Utilities.newBlob(Utilities.base64Decode(formData.fileData), formData.fileMimeType, formData.fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      docUrl = file.getUrl();
    }
    
    // Cek duplikasi data
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues(); // Ambil sampai kolom TMT (H=8)
      var tz = Session.getScriptTimeZone();
      for (var i = 0; i < data.length; i++) {
        var existingNip = String(data[i][3]).trim();
        var existingJenis = String(data[i][6]).trim();
        var existingTmt = data[i][7] ? Utilities.formatDate(new Date(data[i][7]), tz, "yyyy-MM-dd") : "";
        
        if (existingNip === String(formData.nip).trim() && 
            existingJenis.toLowerCase() === String(formData.jenisSK).trim().toLowerCase() && 
            existingTmt === String(formData.tmt).trim()) {
          return { status: 'error', message: 'Data Pengajuan Ganda: ASN ini sudah memiliki pengajuan untuk Jenis SK dan TMT yang sama.' };
        }
      }
    }
    
    sheet.appendRow([
      newId,
      formData.unitKerja,
      formData.namaAsn,
      formData.nip,
      formData.statusPegawai,
      formData.nuptk,
      formData.jenisSK,
      tmtDate,
      formData.gajiPokok,
      docUrl,
      "Diproses",
      "", "", "", // verifikasi
      currentUser,
      now,
      "", "" // edit
    ]);
    var savedData = {
      id: newId,
      unitKerja: formData.unitKerja,
      namaAsn: formData.namaAsn,
      nip: formData.nip,
      statusPegawai: formData.statusPegawai,
      nuptk: formData.nuptk,
      jenisSK: formData.jenisSK,
      tmt: formData.tmt || "",
      gajiPokok: formData.gajiPokok,
      dokumenUrl: docUrl,
      status: "Diproses",
      verifikasiOleh: "",
      waktuVerifikasi: "",
      keterangan: "",
      uploadOleh: currentUser,
      waktuUpload: now ? Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss") : "",
      editOleh: "",
      waktuEdit: ""
    };
    
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Data berhasil disimpan.', data: savedData };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

// 5. Update
function tpg_updatePerbaikan(formData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var currentUser = formData.userLogin || "Unknown";
    var now = new Date();
    
    var sheet = tpgPg_ensureSheet();
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == formData.id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return { status: 'error', message: 'Data tidak ditemukan.' };
    
    var docUrl = data[rowIndex - 1][9];
    if (formData.ubahDokumen && formData.fileData) {
      var folder = DriveApp.getFolderById(FOLDER_CONFIG[TPG_PG_CONFIG.FOLDER_KEY]);
      var blob = Utilities.newBlob(Utilities.base64Decode(formData.fileData), formData.fileMimeType, formData.fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      docUrl = file.getUrl();
    }
    
    var tmtDate = formData.tmt ? new Date(formData.tmt) : "";
    
    sheet.getRange(rowIndex, 2).setValue(formData.unitKerja);
    sheet.getRange(rowIndex, 3).setValue(formData.namaAsn);
    sheet.getRange(rowIndex, 4).setValue(formData.nip);
    sheet.getRange(rowIndex, 5).setValue(formData.statusPegawai);
    sheet.getRange(rowIndex, 6).setValue(formData.nuptk);
    sheet.getRange(rowIndex, 7).setValue(formData.jenisSK);
    sheet.getRange(rowIndex, 8).setValue(tmtDate);
    sheet.getRange(rowIndex, 9).setValue(formData.gajiPokok);
    sheet.getRange(rowIndex, 10).setValue(docUrl);
    
    // Status kembali ke diproses jika diedit user
    sheet.getRange(rowIndex, 11).setValue("Diproses");
    sheet.getRange(rowIndex, 17).setValue(currentUser); // edit oleh
    sheet.getRange(rowIndex, 18).setValue(now); // waktu edit
    
    var tz = Session.getScriptTimeZone();
    var updatedData = {
      id: formData.id,
      unitKerja: formData.unitKerja,
      namaAsn: formData.namaAsn,
      nip: formData.nip,
      statusPegawai: formData.statusPegawai,
      nuptk: formData.nuptk,
      jenisSK: formData.jenisSK,
      tmt: formData.tmt || "",
      gajiPokok: formData.gajiPokok,
      dokumenUrl: docUrl,
      status: "Diproses",
      verifikasiOleh: data[rowIndex - 1][10],
      waktuVerifikasi: data[rowIndex - 1][11] ? Utilities.formatDate(new Date(data[rowIndex - 1][11]), tz, "yyyy-MM-dd'T'HH:mm:ss") : "",
      keterangan: data[rowIndex - 1][12],
      uploadOleh: data[rowIndex - 1][13],
      waktuUpload: data[rowIndex - 1][14] ? Utilities.formatDate(new Date(data[rowIndex - 1][14]), tz, "yyyy-MM-dd'T'HH:mm:ss") : "",
      editOleh: currentUser,
      waktuEdit: now ? Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ss") : ""
    };

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Data berhasil diperbarui.', data: updatedData };
  } catch (e) {
    return { status: 'error', message: e.message };
  } finally {
    lock.releaseLock();
  }
}

// 6. Delete
function tpg_deletePerbaikan(id) {
  try {
    var sheet = tpgPg_ensureSheet();
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex);
      SpreadsheetApp.flush();
      return { status: 'success', message: 'Data berhasil dihapus.' };
    } else {
      return { status: 'error', message: 'Data tidak ditemukan.' };
    }
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// 7. Verify
function tpg_verifikasiPerbaikan(id, status, notes, userLogin) {
  try {
    var verifikator = userLogin || "Unknown";
    var now = new Date();
    
    var sheet = tpgPg_ensureSheet();
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return { status: 'error', message: 'Data tidak ditemukan.' };
    
    sheet.getRange(rowIndex, 11).setValue(status);
    sheet.getRange(rowIndex, 12).setValue(verifikator);
    sheet.getRange(rowIndex, 13).setValue(now);
    sheet.getRange(rowIndex, 14).setValue(notes);
    
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Verifikasi berhasil.', data: { status: status, keterangan: notes, verifikasiOleh: verifikator, waktuVerifikasi: Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss") } };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// Mendapatkan Daftar Unit Kerja (hanya untuk admin)
function tpg_getDaftarUnit() {
  try {
    return getAllSchoolsList(); // Menggunakan helper dari file Lapbul.gs atau Siaba_helper.gs
  } catch (e) {
    throw new Error("Gagal mengambil daftar unit: " + e.message);
  }
}



// ======================================================================
// NOTIFIKASI TPG PERBAIKAN GAJI
// ======================================================================
function getNotifikasiPerbaikanGaji(role, unit) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS[TPG_PG_CONFIG.DB_KEY]);
    var sheet = ss.getSheetByName(TPG_PG_CONFIG.SHEET_NAME);
    if (!sheet) return { count: 0, recent: [] };

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { count: 0, recent: [] };

    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1 || rLower.indexOf('tpg') > -1);
    
    var notifList = [];
    var unreadCount = 0;

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row[0]) continue;
        
        var id = row[0];
        var unitData = String(row[1] || "").trim();
        var namaData = String(row[2] || "").trim();
        var jenisSk = String(row[6] || "").trim();
        var status = String(row[10] || "").trim();
        var wktKirim = row[17] || row[15] || ""; // 15: Waktu Upload, 17: Waktu Edit
        var wktVerif = row[12] || ""; // 12: Waktu Verifikasi

        var isDiproses = (status === "Diproses" || status === "Menunggu" || status === "");
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isDiproses;
        } else {
            isTarget = (unitData.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
        }
        
        if (isTarget) {
            var isRead = false;
            var readBy = String(row[18] || ""); // Kolom ke-19 untuk Read By
            var readByList = readBy.split(",");
            if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
            if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;
            
            var stLower = status.toLowerCase();
            var isSelesai = stLower.includes("setuju") || stLower.includes("ok") || stLower.includes("valid") || stLower.includes("selesai");
            
            if (isAdmin) {
                unreadCount++;
            } else {
                if (isSelesai && isRead) {
                    // skip
                } else {
                    unreadCount++;
                }
            }
            
            if (!isAdmin && isSelesai && isRead) {
               // skip
            } else {
                notifList.push({
                    rowId: i + 1,
                    source: "TPG_PG",
                    nama: namaData,
                    jenis: jenisSk,
                    status: status || "Diproses",
                    waktu: wktVerif && !isDiproses ? wktVerif : (wktKirim || new Date()),
                    isRead: isRead
                });
            }
        }
    }
    
    // Sort
    notifList.sort(function(a, b) {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });
    
    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

function tandaiSemuaNotifPerbaikanGajiDibaca(role, unit) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS[TPG_PG_CONFIG.DB_KEY]);
    var sheet = ss.getSheetByName(TPG_PG_CONFIG.SHEET_NAME);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1 || rLower.indexOf('tpg') > -1);
    
    var updates = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var status = String(row[10] || "").trim();
      var unitData = String(row[1] || "").trim();
      var isDiproses = (status === "Diproses" || status === "Menunggu" || status === "");
      
      var isTarget = false;
      if (isAdmin) { isTarget = isDiproses; } 
      else { isTarget = (unitData.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses); }
      
      if (isTarget) {
        var readBy = String(row[18] || "");
        var readByList = readBy.split(",").filter(function(x){ return x; });
        var changed = false;
        if (isAdmin && readByList.indexOf("Admin") === -1) { readByList.push("Admin"); changed = true; }
        if (!isAdmin && readByList.indexOf("User") === -1) { readByList.push("User"); changed = true; }
        
        if (changed) {
          updates.push({ row: i + 1, val: readByList.join(",") });
        }
      }
    }
    
    if (updates.length > 0) {
      updates.forEach(function(u) {
        sheet.getRange(u.row, 19).setValue(u.val);
      });
      SpreadsheetApp.flush();
    }
  } catch (e) {
    Logger.log("SULTAN Error TPG Read: " + e.message);
  }
}

function tandaiNotifPerbaikanGajiDibaca(rowId, role) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS[TPG_PG_CONFIG.DB_KEY]);
    var sheet = ss.getSheetByName(TPG_PG_CONFIG.SHEET_NAME);
    if (!sheet) return;
    
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1 || rLower.indexOf('tpg') > -1);
    
    var readBy = String(sheet.getRange(rowId, 19).getValue() || "");
    var readByList = readBy.split(",").filter(function(x){ return x; });
    var targetRole = isAdmin ? "Admin" : "User";
    
    if (readByList.indexOf(targetRole) === -1) {
      readByList.push(targetRole);
      sheet.getRange(rowId, 19).setValue(readByList.join(","));
      SpreadsheetApp.flush();
    }
  } catch (e) {
    Logger.log("SULTAN Error tandaiNotifPerbaikanGajiDibaca: " + e.message);
  }
}
