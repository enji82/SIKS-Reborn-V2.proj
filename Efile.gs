/* ======================================================================
   MODUL: E-FILE (ARSIP DIGITAL ELEKTRONIK)
   ====================================================================== */

const KONFIG_EFILE = {
  DB_KEY: "EFILE_DB",
  get FOLDER_ID() { return FOLDER_CONFIG.EFILE_DOCS; }
};

function migrasiStrukturFolderEfile() {
  var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile");
  if (!sheet) return "Sheet Database_Efile tidak ditemukan.";
  
  var data = sheet.getDataRange().getValues();
  var pFolder = DriveApp.getFolderById(KONFIG_EFILE.FOLDER_ID);
  var count = 0;
  
  for (var i = 1; i < data.length; i++) {
    var idPtk = String(data[i][0]).trim();
    var namaKategori = String(data[i][3]).trim() || "Berkas";
    var tahun = String(data[i][4]).trim() || "Umum";
    var urlDrive = String(data[i][6]).trim();
    
    if (!urlDrive || !urlDrive.includes("drive.google.com")) continue;
    
    try {
      var match = urlDrive.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlDrive.match(/id=([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) continue;
      var fileId = match[1];
      var file = DriveApp.getFileById(fileId);
      
      // Folder: Kategori berkas - Tahun
      var folderKatName = namaKategori + " - " + tahun;
      var idFolderKat = pFolder.getFoldersByName(folderKatName);
      var fKat = idFolderKat.hasNext() ? idFolderKat.next() : pFolder.createFolder(folderKatName);
      
      // Subfolder: Nama Sekolah
      var unitName = getUnitNameByPtkId(idPtk);
      var idFolderUnit = fKat.getFoldersByName(unitName);
      var fUnit = idFolderUnit.hasNext() ? idFolderUnit.next() : fKat.createFolder(unitName);
      
      // Check if file is already in the target subfolder
      var parents = file.getParents();
      var alreadyMoved = false;
      while (parents.hasNext()) {
        var p = parents.next();
        if (p.getId() === fUnit.getId()) {
          alreadyMoved = true;
          break;
        }
      }
      
      if (!alreadyMoved) {
        file.moveTo(fUnit);
        count++;
      }
    } catch(e) {
      Logger.log("Gagal memindahkan file baris ke-" + (i+1) + ": " + e.message);
    }
  }
  
  // Cleanup empty PTK folders
  try {
    var folders = pFolder.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      var folderName = folder.getName();
      if (!folderName.includes(" - ")) {
        if (!folder.getFiles().hasNext() && !folder.getFolders().hasNext()) {
          folder.setTrashed(true);
        }
      }
    }
  } catch(e) {
    Logger.log("Gagal merapikan folder lama: " + e.message);
  }
  
  return "Migrasi selesai. Berhasil memindahkan " + count + " file ke struktur folder baru.";
}

function getEfileMasterData(npsnFilter) {
  try {
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var resKat = [];
    for(var i=1; i<dataKat.length; i++) {
        if(String(dataKat[i][0]).trim() !== "") {
            resKat.push({ 
                idKat: dataKat[i][0], namaKat: dataKat[i][1], parent: dataKat[i][2],
                format: dataKat[i][3] ? String(dataKat[i][3]).trim().toUpperCase() : "PDF",
                jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "",
                statusPegawaiWajib: dataKat[i][5] ? String(dataKat[i][5]).trim() : ""
            });
        }
    }
    
    var shPtk = getSheet(KONFIG_EFILE.DB_KEY, "Database_PTK");
    var dataPtk = shPtk ? shPtk.getDataRange().getDisplayValues() : [];
    var resPtk = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    for(var j=1; j<dataPtk.length; j++) {
        var rNpsn = String(dataPtk[j][4]).trim().toUpperCase(); 
        var rUnit = String(dataPtk[j][5]).trim().toUpperCase(); 
        if (targetNpsn === "" || targetNpsn === "SEMUA" || rNpsn === targetNpsn || rUnit === targetNpsn) {
            if(String(dataPtk[j][0]).trim() !== "") {
                resPtk.push({ id_ptk: dataPtk[j][0], nama: dataPtk[j][1], status: dataPtk[j][2], nip: dataPtk[j][3], npsn: dataPtk[j][4], unit: dataPtk[j][5] });
            }
        }
    }
    return JSON.stringify({ success: true, kategori: resKat, ptk: resPtk });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getEfileData(npsnFilter) {
  try {
    // 1. Load Database_PTK dan buat map untuk lookup cepat
    var shPtk = getSheet(KONFIG_EFILE.DB_KEY, "Database_PTK");
    var dataPtk = shPtk ? shPtk.getDataRange().getDisplayValues() : [];
    var ptkMap = {}; // key: id_ptk, value: {npsn, unit, status, nama, nip}
    for(var j=1; j<dataPtk.length; j++) {
        var idPtk = String(dataPtk[j][0]).trim();
        if(idPtk) {
            ptkMap[idPtk] = {
                npsn: dataPtk[j][4],
                unit: dataPtk[j][5],
                status: dataPtk[j][2],
                nama: dataPtk[j][1],
                nip: dataPtk[j][3]
            };
        }
    }
    
    // 2. Load Database_Efile
    var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile");
    if(!sheet) return JSON.stringify({ success: false, message: "Sheet Database_Efile tidak ditemukan." });
    
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    for(var i=1; i<data.length; i++) {
        var idPtkEfile = String(data[i][0]).trim();
        var ptkInfo = ptkMap[idPtkEfile];
        
        // Skip jika PTK tidak ditemukan di Database_PTK
        if(!ptkInfo) continue;
        
        // Filter berdasarkan NPSN dari Database_PTK (bukan dari Database_Efile)
        var rNpsn = String(ptkInfo.npsn || "").trim().toUpperCase();
        if (targetNpsn === "" || targetNpsn === "SEMUA" || rNpsn === targetNpsn) {
            result.push({
                rowId: i + 1, 
                id_ptk: idPtkEfile, 
                nama: ptkInfo.nama, // Gunakan nama dari Database_PTK
                id_kategori: data[i][2], 
                nama_kategori: data[i][3],
                tahun: data[i][4], 
                file_name: data[i][5], 
                url: data[i][6], 
                status: data[i][7], 
                catatan: data[i][8],
                tgl_upload: data[i][9], 
                uploader: data[i][10], 
                npsn: ptkInfo.npsn, // Gunakan NPSN dari Database_PTK
                unit: ptkInfo.unit, // Tambahkan unit dari Database_PTK
                statusPegawai: ptkInfo.status, // Tambahkan status pegawai dari Database_PTK
                tgl_verif: data[i][12] || "-", 
                verifikator: data[i][13] || "-",
                periode: data[i][14] || "-" 
            });
        }
    }
    result.sort(function(a,b) { return b.rowId - a.rowId; });
    return JSON.stringify({ success: true, data: result });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function simpanEfileBatch(batchData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    var pFolder = DriveApp.getFolderById(KONFIG_EFILE.FOLDER_ID);
    var rowsToAppend = [];
    
    for(var i = 0; i < batchData.length; i++) {
        var item = batchData[i]; var fileUrl = "";
        if (item.fileBase64) {
            // Folder: Kategori berkas - Tahun
            var folderKatName = (item.nama_kategori || "Berkas") + " - " + (item.tahun || "Umum");
            var idFolderKat = pFolder.getFoldersByName(folderKatName);
            var fKat = idFolderKat.hasNext() ? idFolderKat.next() : pFolder.createFolder(folderKatName);
            
            // Subfolder: Nama Sekolah (Unit Kerja)
            var unitName = getUnitNameByPtkId(item.id_ptk);
            var idFolderUnit = fKat.getFoldersByName(unitName);
            var fUnit = idFolderUnit.hasNext() ? idFolderUnit.next() : fKat.createFolder(unitName);

            var blob = Utilities.newBlob(Utilities.base64Decode(item.fileBase64), item.mimeType, item.nama_file);
            var file = fUnit.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileUrl = file.getUrl();
        } else { throw new Error("File tidak valid."); }
        
        rowsToAppend.push([
            item.id_ptk, item.nama_ptk, item.id_kategori, item.nama_kategori, 
            item.tahun, item.nama_file, fileUrl, "Diproses", "", "'" + now, item.user_login, item.npsn,
            "", "", item.periode
        ]);
    }
    if(rowsToAppend.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    SpreadsheetApp.flush();

    try {
        var uniqueNpsns = {};
        batchData.forEach(function(item) {
            if (item.npsn) uniqueNpsns[item.npsn] = true;
        });
        Object.keys(uniqueNpsns).forEach(function(npsn) {
            onEfileDataChange(npsn);
        });
    } catch(err) {}

    return JSON.stringify({ success: true, message: batchData.length + " Berkas berhasil diunggah." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function verifikasiEfileData(rowId, status, catatan, adminName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile"); var r = parseInt(rowId);
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(r, 8).setValue(status); sheet.getRange(r, 9).setValue(catatan);
    sheet.getRange(r, 13).setValue(now); sheet.getRange(r, 14).setValue(adminName); 
    SpreadsheetApp.flush();
    
    try {
        var npsn = sheet.getRange(r, 12).getDisplayValue();
        onEfileDataChange(npsn);
    } catch(err) {}

    return JSON.stringify({ success: true, message: "Berkas berhasil di-" + status });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function hapusEfileData(rowId, securityCode) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = new Date(); var kd = d.getFullYear()+""+String(d.getMonth()+1).padStart(2,'0')+""+String(d.getDate()).padStart(2,'0');
    if (String(securityCode).trim() !== kd) return JSON.stringify({ success: false, message: "Kode Keamanan Salah!" });
    var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile"); var r = parseInt(rowId);
    var npsn = "";
    try {
        npsn = sheet.getRange(r, 12).getDisplayValue();
    } catch(err) {}
    var urlDrive = sheet.getRange(r, 7).getValue();
    if(urlDrive && urlDrive.includes('drive.google.com')) {
        try { var match = urlDrive.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlDrive.match(/id=([a-zA-Z0-9_-]+)/); if(match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true); } catch(ex){}
    }
    sheet.deleteRow(r); SpreadsheetApp.flush();
    
    if (npsn) {
        try { onEfileDataChange(npsn); } catch(err) {}
    }

    return JSON.stringify({ success: true, message: "Berkas berhasil dihapus permanen." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

// VAKSIN NON-DESTRUCTIVE EDIT: fileData bisa kosong (null)
function perbaikiEfileData(payload, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile"); var r = parseInt(payload.rowId);
    var oldUrl = sheet.getRange(r, 7).getValue(); var newFileUrl = oldUrl; 

    // Jika user mengunggah file baru
    if (fileData && fileData.data) {
        if(oldUrl && oldUrl.includes('drive.google.com')) {
            try { var match = oldUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || oldUrl.match(/id=([a-zA-Z0-9_-]+)/); if(match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true); } catch(ex){} 
        }
        var pFolder = DriveApp.getFolderById(KONFIG_EFILE.FOLDER_ID);
        var namaKategori = sheet.getRange(r, 4).getValue() || "Berkas";
        
        // Folder: Kategori berkas - Tahun
        var folderKatName = namaKategori + " - " + (payload.tahun || "Umum");
        var idFolderKat = pFolder.getFoldersByName(folderKatName);
        var fKat = idFolderKat.hasNext() ? idFolderKat.next() : pFolder.createFolder(folderKatName);
        
        // Subfolder: Nama Sekolah (Unit Kerja)
        var unitName = getUnitNameByPtkId(payload.id_ptk);
        var idFolderUnit = fKat.getFoldersByName(unitName);
        var fUnit = idFolderUnit.hasNext() ? idFolderUnit.next() : fKat.createFolder(unitName);

        var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, payload.nama_file);
        var file = fUnit.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        newFileUrl = file.getUrl();
    }
    
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(r, 5).setValue(payload.tahun);        // E: Edit Tahun
    sheet.getRange(r, 6).setValue(payload.nama_file);    // F: Edit Nama File
    sheet.getRange(r, 7).setValue(newFileUrl);           // G: URL Baru atau Lama
    sheet.getRange(r, 8).setValue("Diproses");           // H: Reset Status
    sheet.getRange(r, 9).setValue("");                   // I: Kosongkan Catatan
    sheet.getRange(r, 10).setValue(now);                 // J: Tgl Edit
    sheet.getRange(r, 11).setValue(payload.user_login);  // K: Uploader
    sheet.getRange(r, 13).setValue("");                  // M: Kosongkan Verif
    sheet.getRange(r, 14).setValue("");                  // N: Kosongkan Verif
    sheet.getRange(r, 15).setValue(payload.periode);     // O: Edit Periode             

    SpreadsheetApp.flush();
    
    try {
        var npsn = sheet.getRange(r, 12).getDisplayValue();
        onEfileDataChange(npsn);
    } catch(err) {}

    return JSON.stringify({ success: true, message: "Perbaikan data berhasil disimpan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

/* ----------------------------------------------------------------------
   11. NOTIFIKASI E-FILE (BAB VIII COMPLIANT)
   ---------------------------------------------------------------------- */
function getNotifikasiEfile(role, unit) {
  try {
    var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile");
    if (!sheet) return { count: 0, recent: [] };
    var data = sheet.getDataRange().getDisplayValues();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = []; var unreadCount = 0;

    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[7] || "").trim(); 
        var isDiproses = (status === "Diproses");
        var isTarget = isAdmin ? isDiproses : (String(row[11]).trim().toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
        
        if (isTarget) {
            var readByList = String(row[15] || "").split(","); 
            var isRead = (isAdmin && readByList.indexOf("Admin") > -1) || (!isAdmin && readByList.indexOf("User") > -1);
            
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
                notifList.push({ rowId: i + 1, source: "Efile", nama: row[1], berkas: row[3], status: status, waktu: row[12] && !isDiproses ? row[12] : row[9], isRead: isRead });
            }
        }
    }
    
    notifList.sort(function(a, b) { if (a.isRead !== b.isRead) return a.isRead ? 1 : -1; return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu); });
    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) { return { count: 0, recent: [] }; }
}

function tandaiNotifEfileDibaca(rowId, role) {
    try {
        var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile");
        var r = parseInt(rowId); var mark = (role === "Admin") ? "Admin" : "User";
        var cur = String(sheet.getRange(r, 16).getDisplayValue() || "").trim();
        if (cur === "") sheet.getRange(r, 16).setValue(mark);
        else { var l = cur.split(","); if (l.indexOf(mark) === -1) { l.push(mark); sheet.getRange(r, 16).setValue(l.join(",")); } }
        return true;
    } catch (e) { return false; }
}

function getUnitNameByPtkId(idPtk) {
  try {
    var shPtk = getSheet(KONFIG_EFILE.DB_KEY, "Database_PTK");
    if (!shPtk) return "Lainnya";
    var dataPtk = shPtk.getDataRange().getValues();
    for (var j = 1; j < dataPtk.length; j++) {
      if (String(dataPtk[j][0]).trim() === String(idPtk).trim()) {
        return String(dataPtk[j][5]).trim() || "Lainnya";
      }
    }
  } catch(e) {}
  return "Lainnya";
}

function getEfileViewerData(keyword, npsnFilter) {
  try {
    var searchKey = String(keyword).trim().toLowerCase();
    
    // VAKSIN ANTI CASE-SENSITIVE: Bersihkan dan besarkan huruf dari frontend
    var cleanFilter = String(npsnFilter || "").trim().toUpperCase();
 
    var shPtk = getSheet(KONFIG_EFILE.DB_KEY, "Database_PTK"); 
    var dataPtk = shPtk.getDataRange().getDisplayValues(); 
    var ptkFound = null;

    for(var i=1; i<dataPtk.length; i++) {
        var rNpsn = String(dataPtk[i][4]).trim().toUpperCase(); 
        var rUnit = String(dataPtk[i][5]).trim().toUpperCase(); 
        var rId   = String(dataPtk[i][0]).toLowerCase(); 
        var rNama = String(dataPtk[i][1]).toLowerCase();
        
        // Cek Keamanan Akses menggunakan cleanFilter
        if(cleanFilter && cleanFilter !== "SEMUA" && cleanFilter !== "" && rNpsn !== cleanFilter && rUnit !== cleanFilter) continue;
        
        // Pencarian Nama / ID
        if(rId === searchKey || rNama.includes(searchKey)) { 
            ptkFound = { 
                id_ptk: dataPtk[i][0], 
                nama: dataPtk[i][1], 
                nip: dataPtk[i][3], 
                npsn: dataPtk[i][4], 
                unit: dataPtk[i][5],
                status: dataPtk[i][2] // Tambahkan status pegawai
            }; 
            break; 
        }
    }

    if(!ptkFound) return JSON.stringify({ success: false, message: "PTK tidak ditemukan atau Anda tidak memiliki akses ke data tersebut." });
 
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile"); 
    var dataKat = shKat.getDataRange().getDisplayValues(); 
    var categories = [];
    for(var k = 1; k < dataKat.length; k++) { 
        if(String(dataKat[k][0]).trim() !== "") {
            categories.push({ 
                idKat: dataKat[k][0], 
                namaKat: dataKat[k][1], 
                parent: dataKat[k][2],
                statusPegawaiWajib: dataKat[k][5] ? String(dataKat[k][5]).trim() : ""
            }); 
        }
    }
 
    var shFile = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile"); 
    var dataFile = shFile.getDataRange().getDisplayValues(); 
    var files = [];
    for(var f = 1; f < dataFile.length; f++) {
        var st = String(dataFile[f][7]).toLowerCase();
        // Hanya tampilkan file yang Disetujui/Ok
        if(String(dataFile[f][0]) === ptkFound.id_ptk && (st.includes('setuju') || st.includes('ok'))) { 
            files.push({ id_kategori: dataFile[f][2], tahun: dataFile[f][4], file_name: dataFile[f][5], url: dataFile[f][6] }); 
        }
    }
    
    // Urutkan file dari tahun terbaru ke terlama
    files.sort(function(a,b){ return parseInt(b.tahun||0) - parseInt(a.tahun||0); });

    return JSON.stringify({ success: true, ptk: ptkFound, categories: categories, files: files });
  } catch(e) { 
    return JSON.stringify({ success: false, message: e.message }); 
  }
}

// ======================================================================
// 9. INIT DASHBOARD E-FILE (TARIK MENU KATEGORI)
// ======================================================================
function getEfileDashboardInit(npsnFilter) {
  try {
    // 1. Tarik Menu dari Sheet "Dashboard" (A:Rekap, B:Lapor, C:Nama_Kategori)
    var shDash = getSheet(KONFIG_EFILE.DB_KEY, "Dashboard");
    if(!shDash) return JSON.stringify({ success: false, message: "Sheet 'Dashboard' tidak ditemukan." });
    
    var dataDash = shDash.getDataRange().getDisplayValues();
    var listKategori = [];
    for(var i=1; i<dataDash.length; i++) {
        if(String(dataDash[i][0]).trim() !== "") {
            listKategori.push({
                sheetRekap: dataDash[i][0],
                sheetLapor: dataDash[i][1],
                namaKategori: dataDash[i][2] || "Kategori " + i // Fallback jika Kolom C kosong
            });
        }
    }
    
    // 2. Evaluasi Akses Unit (Jika Admin, beri opsi semua unit)
    var shPtk = getSheet(KONFIG_EFILE.DB_KEY, "Database_PTK");
    var dataPtk = shPtk ? shPtk.getDataRange().getDisplayValues() : [];
    var myUnit = "";
    
    if (npsnFilter && npsnFilter !== "SEMUA") {
        for(var j=1; j<dataPtk.length; j++) {
            var rNpsn = String(dataPtk[j][4]).trim().toUpperCase(); 
            var rUnit = String(dataPtk[j][5]).trim().toUpperCase(); 
            var filterRaw = String(npsnFilter).trim().toUpperCase();
            if (rNpsn === filterRaw || rUnit === filterRaw) { myUnit = dataPtk[j][5]; break; }
        }
    }

    return JSON.stringify({ success: true, kategori: listKategori, myUnit: myUnit });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

/** Hapus cache satu pasangan sheet (untuk refresh kategori aktif). */
function invalidateEfileDashboardCacheOne(sheetRekapName, sheetLaporName) {
  try {
    var cacheKey = "EFILE_DASHBOARD_" + String(sheetRekapName).replace(/\s/g, "_") + "_" + String(sheetLaporName).replace(/\s/g, "_");
    CacheService.getScriptCache().remove(cacheKey);
  } catch(e) {}
}

// ======================================================================
// 10. GET DATA DASHBOARD SPESIFIK (BERDASARKAN PILIHAN KATEGORI)
// ======================================================================
function getEfileDashboardData(sheetRekapName, sheetLaporName, forceRefresh) {
  var cacheKey = "EFILE_DASHBOARD_" + String(sheetRekapName).replace(/\s/g, "_") + "_" + String(sheetLaporName).replace(/\s/g, "_");
  var cache = CacheService.getScriptCache();
  if (forceRefresh) {
    invalidateEfileDashboardCacheOne(sheetRekapName, sheetLaporName);
  } else {
    try {
      var cached = cache.get(cacheKey);
      if (cached) return cached;
    } catch(e) {}
  }

  try {
    // 1. Tarik Data Rekapitulasi Tabel (A:NPSN, B:Unit, C:Tahun, D:Jml, E:Sudah, F:Belum)
    var shRekap = getSheet(KONFIG_EFILE.DB_KEY, sheetRekapName);
    if(!shRekap) throw new Error("Sheet Rekap (" + sheetRekapName + ") tidak ditemukan.");
    var dataRekapRaw = shRekap.getDataRange().getDisplayValues();
    var arrRekap = [];
    for(var i=1; i<dataRekapRaw.length; i++) {
        if(String(dataRekapRaw[i][1]).trim() !== "") {
            arrRekap.push({
                npsn: dataRekapRaw[i][0], unit: dataRekapRaw[i][1], tahun: dataRekapRaw[i][2],
                jml: dataRekapRaw[i][3], sudah: dataRekapRaw[i][4], belum: dataRekapRaw[i][5]
            });
        }
    }

    // 2. Tarik Data Lapor (A:ID, B:Nama, C:NIP, E:Unit, F dst: Tahun dinamis)
    var shLapor = getSheet(KONFIG_EFILE.DB_KEY, sheetLaporName);
    if(!shLapor) throw new Error("Sheet Lapor (" + sheetLaporName + ") tidak ditemukan.");
    var dataLaporRaw = shLapor.getDataRange().getDisplayValues();
    
    var arrBelum = [];
    var headerTahun = dataLaporRaw[0]; // Baris 1 berisi judul Tahun
    
    for(var r=1; r<dataLaporRaw.length; r++) {
        // VAKSIN 1: Gunakan Nama sebagai patokan validasi baris, bukan Unit. 
        // Jika nama ada, tarik datanya meskipun unitnya kosong.
        var namaPtk = String(dataLaporRaw[r][1]).trim(); 
        if(namaPtk === "") continue; 
        
        var nipPtk = String(dataLaporRaw[r][2]).trim() || "-"; // Kolom C
        var unitLapor = String(dataLaporRaw[r][4]).trim() || "Unit Belum Ditentukan"; // Kolom E
        
        // Loop dinamis ke samping membaca setiap kolom tahun
        for(var c=5; c<headerTahun.length; c++) {
            var tahunStr = String(headerTahun[c]).trim();
            var statusStr = String(dataLaporRaw[r][c]).trim().toLowerCase();
            
            // VAKSIN 2: Parser Agresif. Anggap sel Kosong ("") atau Strip ("-") sebagai Belum!
            if(tahunStr !== "") {
                if(statusStr === "" || statusStr === "-" || statusStr.includes("belum")) {
                    arrBelum.push({
                        nama: namaPtk, nip: nipPtk, unit: unitLapor, tahun: tahunStr
                    });
                }
            }
        }
    }

    var jsonResult = JSON.stringify({ success: true, rekap: arrRekap, belum: arrBelum });
    try {
      cache.put(cacheKey, jsonResult, 300);
    } catch(e) {}
    return jsonResult;
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function invalidateEfileDashboardCache() {
  try {
    var cache = CacheService.getScriptCache();
    var shDash = getSheet(KONFIG_EFILE.DB_KEY, "Dashboard");
    if (shDash) {
      var dataDash = shDash.getDataRange().getDisplayValues();
      for(var i=1; i<dataDash.length; i++) {
        if(String(dataDash[i][0]).trim() !== "") {
          var rekapName = String(dataDash[i][0]).replace(/\s/g, "_");
          var laporName = String(dataDash[i][1]).replace(/\s/g, "_");
          cache.remove("EFILE_DASHBOARD_" + rekapName + "_" + laporName);
        }
      }
    }
  } catch(e) {}
}

function onEfileDataChange(npsn) {
  try {
    invalidateEfileDashboardCache();
    if (typeof invalidateNotifCache === 'function') {
      invalidateNotifCache("User", npsn);
    }
  } catch(e) {}
}