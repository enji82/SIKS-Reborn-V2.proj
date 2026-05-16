// ======================================================================
// BACKEND: ARSIP SIABA (CRUD & DASHBOARD)
// ======================================================================

const KONFIG_ARSIP_SIABA = {
  DB_UNIT: "USER_DB",
  DB_ARSIP: "ARSIP_SIABA_DB",
  FOLDER_ROOT_ID: FOLDER_CONFIG.ARSIP_SIABA || "1D0rwRT_tIj9QZTPPG3cRk4NRcbhMzDHm"
};

// 0. Dapatkan Daftar Master Sekolah + Status per Periode
function arsipsiaba_getMasterDanStatus(tahun, bulan) {
  try {
    var sheetMaster = getSheet(KONFIG_ARSIP_SIABA.DB_ARSIP, "master_sekolah");
    if (!sheetMaster) return { error: "Sheet master_sekolah tidak ditemukan di spreadsheet arsip." };

    var lastRow = sheetMaster.getLastRow();
    if (lastRow < 2) return { data: [] };

    // Kolom A = Unit Kerja, Kolom B = NPSN
    var masterData = sheetMaster.getRange(2, 1, lastRow - 1, 2).getDisplayValues();

    // Ambil data arsip yang sudah ada untuk periode ini
    var arsipResult = arsipsiaba_getDataArsip(tahun, bulan);
    var existingMap = {};
    if (!arsipResult.error && arsipResult.data) {
      arsipResult.data.forEach(function(row) {
        var key = row.unitKerja.trim().toUpperCase();
        existingMap[key] = { rowId: row.rowId, fileUrl: row.fileUrl };
      });
    }

    var result = [];
    masterData.forEach(function(row) {
      var unitKerja = row[0] ? row[0].trim() : "";
      var npsn      = row[1] ? row[1].trim() : "";
      if (!unitKerja) return;

      var key        = unitKerja.toUpperCase();
      var sudahLapor = existingMap.hasOwnProperty(key);
      result.push({
        unitKerja:  unitKerja,
        npsn:       npsn,
        sudahLapor: sudahLapor,
        rowId:      sudahLapor ? existingMap[key].rowId  : null,
        fileUrl:    sudahLapor ? existingMap[key].fileUrl : null
      });
    });

    var sudah = result.filter(function(r) { return r.sudahLapor; }).length;
    return { data: result, sudah: sudah, total: result.length };
  } catch(e) {
    return { error: e.message };
  }
}

// 1. Dapatkan Daftar Unit Kerja
function arsipsiaba_getDaftarUnit() {
  try {
    var sheet = getSheet(KONFIG_ARSIP_SIABA.DB_UNIT, "Unit_Siaba");
    if (!sheet) return { error: "Sheet Unit_Siaba tidak ditemukan." };
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { data: [] };
    
    // Kolom A = NPSN, Kolom B = Jenjang, Kolom C = Unit Kerja
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
    var units = [];
    var seen = new Set();
    
    for (var i = 0; i < data.length; i++) {
      var npsn    = data[i][0] ? data[i][0].trim() : "";
      var namaUnit = data[i][2] ? data[i][2].trim() : (data[i][1] ? data[i][1].trim() : "");
      
      if (namaUnit && !seen.has(namaUnit)) {
        seen.add(namaUnit);
        units.push({ npsn: npsn, nama: namaUnit });
      }
    }
    
    // Urutkan abjad berdasarkan nama
    units.sort(function(a, b) { return a.nama.localeCompare(b.nama); });
    return { data: units };
  } catch (e) {
    return { error: e.message };
  }
}

// 2. Dapatkan Data Arsip yang sudah diunggah
function arsipsiaba_getDataArsip(tahunFilter, bulanFilter) {
  try {
    var sheet = getSheet(KONFIG_ARSIP_SIABA.DB_ARSIP, "arsip_siaba");
    if (!sheet) return { error: "Sheet arsip_siaba tidak ditemukan." };
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { data: [] };
    
    // Kolom A-H: data lama, Kolom I: NPSN (baru)
    var lastCol = sheet.getLastColumn();
    var numCols = Math.max(9, lastCol);
    var data = sheet.getRange(2, 1, lastRow - 1, numCols).getDisplayValues();
    var result = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      
      if (tahunFilter && tahunFilter !== "" && row[2] !== tahunFilter) continue;
      if (bulanFilter && bulanFilter !== "" && row[1] !== bulanFilter) continue;
      
      result.push({
        rowId:      i + 2,
        unitKerja:  row[0],
        bulan:      row[1],
        tahun:      row[2],
        fileUrl:    row[3],
        tglUnggah:  row[4],
        userUnggah: row[5],
        tglEdit:    row[6],
        userEdit:   row[7],
        npsn:       row[8] || ""
      });
    }
    
    return { data: result };
  } catch (e) {
    return { error: e.message };
  }
}

// 3. Helper untuk membuat Folder Bersarang (Nested Folder)
function arsipsiaba_getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
}

// 4. Proses Upload File & Simpan Database
function arsipsiaba_simpanArsip(payload) {
  try {
    var isEdit = payload.mode === "edit";
    var sheet = getSheet(KONFIG_ARSIP_SIABA.DB_ARSIP, "arsip_siaba");
    if (!sheet) return { error: "Sheet arsip_siaba tidak ditemukan." };
    
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var fileUrl = payload.existingUrl || "";
    
    // VAKSIN 1: Normalisasi Payload (Hapus spasi tersembunyi & jadikan kapital)
    var pUnit  = String(payload.unitKerja).trim().toUpperCase();
    var pBulan = String(payload.bulan).trim().toUpperCase();
    var pTahun = String(payload.tahun).trim().toUpperCase();
    
    // Cek Duplikat Jika Insert
    if (!isEdit) {
      var existData = sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < existData.length; i++) {
        // Normalisasi data dari sheet ke UPPERCASE untuk perbandingan yang akurat
        var dbUnit  = String(existData[i][0] || "").trim().toUpperCase();
        var dbBulan = String(existData[i][1] || "").trim().toUpperCase();
        var dbTahun = String(existData[i][2] || "").trim().toUpperCase();

        if (dbUnit === pUnit && dbBulan === pBulan && dbTahun === pTahun) {
          return { error: "Arsip untuk " + payload.unitKerja + " bulan " + payload.bulan + " " + payload.tahun + " sudah ada. Silakan gunakan tombol Edit pada tabel." };
        }
      }
    }
    
    // Proses File Baru Jika Ada
    if (payload.fileData && payload.fileData.data) {
      var rootFolder = DriveApp.getFolderById(KONFIG_ARSIP_SIABA.FOLDER_ROOT_ID);
      var folderTahun = arsipsiaba_getOrCreateFolder(rootFolder, payload.tahun);
      var folderBulan = arsipsiaba_getOrCreateFolder(folderTahun, payload.bulan);
      
      var fileName = "Siaba " + payload.bulan + " " + payload.tahun + " " + payload.unitKerja + ".pdf";
      var blob = Utilities.newBlob(Utilities.base64Decode(payload.fileData.data), payload.fileData.mimeType, fileName);
      
      var file = folderBulan.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }
    
    if (isEdit) {
      var rowIdx = parseInt(payload.rowId);
      sheet.getRange(rowIdx, 4).setValue(fileUrl);
      sheet.getRange(rowIdx, 7).setValue(timestamp);
      sheet.getRange(rowIdx, 8).setValue(payload.userLogin);
      if (payload.npsn) sheet.getRange(rowIdx, 9).setValue(payload.npsn);
    } else {
      var newRow = [
        payload.unitKerja, // A
        payload.bulan,     // B
        payload.tahun,     // C
        fileUrl,           // D
        timestamp,         // E
        payload.userLogin, // F
        "",               // G
        "",               // H
        payload.npsn || "" // I (NPSN)
      ];
      sheet.appendRow(newRow);
    }
    
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// 5. Data Dashboard (Belum Lapor)
function arsipsiaba_getDashboardBelumLapor(tahun, bulan) {
  try {
    // Ambil Semua Unit dari master (array objek {npsn, nama})
    var refUnits = arsipsiaba_getDaftarUnit();
    if (refUnits.error) return { error: refUnits.error };
    var allUnits = refUnits.data; // [{npsn, nama}, ...]

    // Ambil Data Arsip yg Sudah Unggah periode ini
    var dataArsip = arsipsiaba_getDataArsip(tahun, bulan);
    if (dataArsip.error) return { error: dataArsip.error };

    // Buat Set nama unit yang sudah unggah (UPPERCASE untuk pencocokan case-insensitive)
    var unitSudahLapor = new Set();
    dataArsip.data.forEach(function(row) {
      unitSudahLapor.add(String(row.unitKerja || "").trim().toUpperCase());
    });

    // Kumpulkan nama unit yang BELUM ada di set sudah
    var belumLapor = [];
    allUnits.forEach(function(u) {
      var namaUnit = String(u.nama || "").trim();
      if (namaUnit && !unitSudahLapor.has(namaUnit.toUpperCase())) {
        belumLapor.push(namaUnit); // simpan nama asli (bukan objek)
      }
    });

    return {
      data: {
        sudah: unitSudahLapor.size,
        belum: belumLapor.length,
        total: allUnits.length,
        listBelum: belumLapor
      }
    };
  } catch (e) {
    return { error: e.message };
  }
}

// 6. Proses Hapus Arsip (Soft Delete)
function arsipsiaba_hapusArsip(rowId, userLogin) {
  try {
    var sheet = getSheet(KONFIG_ARSIP_SIABA.DB_ARSIP, "arsip_siaba");
    var sheetTrash = getSheet(KONFIG_ARSIP_SIABA.DB_ARSIP, "arsip_siaba_trash");
    
    // Auto-create sheet trash jika belum ada
    if (!sheetTrash) {
      var ss = getDB(KONFIG_ARSIP_SIABA.DB_ARSIP);
      sheetTrash = ss.insertSheet("arsip_siaba_trash");
      sheetTrash.appendRow(["Unit Kerja", "Bulan", "Tahun", "File URL", "Tgl Unggah", "User Unggah", "Tgl Edit", "User Edit", "Tgl Hapus", "User Hapus"]);
    }
    
    var rowIdx = parseInt(rowId);
    if (isNaN(rowIdx) || rowIdx < 2) return { error: "ID Baris tidak valid." };
    
    var rowData = sheet.getRange(rowIdx, 1, 1, 8).getDisplayValues()[0];
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    
    // Tambahkan info waktu hapus dan eksekutor
    rowData.push(timestamp, userLogin);
    
    // Pindah ke Trash lalu hapus dari Utama
    sheetTrash.appendRow(rowData);
    sheet.deleteRow(rowIdx);
    
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}