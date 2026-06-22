/* ======================================================================
   MODUL: TATA NASKAH DINAS
   Spreadsheet ID: 1yvRXr-tyWv42nJfJLedELp-_R_WEo5gDxwCRIQTUVtk
   ====================================================================== */

/**
 * Mengambil data kode urut sekolah untuk penomoran surat dinas.
 */
function getKodeUrutSekolah() {
  try {
    var sheet = getSheet("TATA_NASKAH_DINAS_DB", "kode_urut_sekolah");
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    
    var data = sheet.getRange(2, 1, lastRow - 1, 5).getDisplayValues();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1]) continue;
      result.push({
        npsn: row[0],
        nama_sekolah: row[1],
        kode_disdikbud: row[2],
        kode_kecamatan: row[3],
        kode_sekolah: row[4]
      });
    }
    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * Mengambil data klasifikasi arsip tata naskah dinas.
 */
function getKlasifikasiArsip() {
  try {
    var sheet = getSheet("TATA_NASKAH_DINAS_DB", "klasifikasi_arsip");
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getDisplayValues();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1]) continue;
      result.push({
        kode_klasifikasi: row[0],
        uraian: row[1],
        level: row[2],
        parent_kode: row[3]
      });
    }
    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * Mengambil file template untuk tata naskah dinas dari Google Drive.
 */
function getTemplateNaskahDinasFiles() {
  try {
    var folderId = '1KIsSefm0xX-ZAskc2KphIgjRrekRzxdR';
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var fileList = [];
    
    while (files.hasNext()) {
      var file = files.next();
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl()
      });
    }
    
    fileList.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    
    return JSON.stringify({ status: 'success', data: fileList });
  } catch (e) {
    return JSON.stringify({ status: 'error', message: e.message });
  }
}

/**
 * Mengambil file Peraturan Perundang-Undangan untuk tata naskah dinas dari Google Drive.
 */
function getPeraturanTNDFiles() {
  try {
    var folderId = '1bLYKIIUIjpxHbKYJXhuxjBacXEMDwqbA';
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var fileList = [];
    
    while (files.hasNext()) {
      var file = files.next();
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl()
      });
    }
    
    fileList.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    
    return JSON.stringify({ status: 'success', data: fileList });
  } catch (e) {
    return JSON.stringify({ status: 'error', message: e.message });
  }
}
