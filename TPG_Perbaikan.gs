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
function tpg_getPerbaikanData() {
  try {
    var sheet = tpgPg_ensureSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: 'success', data: [] };
    
    var data = sheet.getRange(2, 1, lastRow - 1, 18).getValues();
    var result = [];
    var tz = Session.getScriptTimeZone();
    
    for (var i = 0; i < data.length; i++) {
      result.push({
        id: data[i][0],
        unitKerja: data[i][1],
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
    return { status: 'success', data: result };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// 4. Create
function tpg_savePerbaikan(formData) {
  try {
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
    
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Data berhasil disimpan.' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// 5. Update
function tpg_updatePerbaikan(formData) {
  try {
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
    
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Data berhasil diperbarui.' };
  } catch (e) {
    return { status: 'error', message: e.message };
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
    return { status: 'success', message: 'Status verifikasi berhasil disimpan.' };
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


