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

function perbaikiKategoriBpe() {
  try {
    var dbKey = KONFIG_EFILE.DB_KEY;
    
    // 1. Perbaiki di Master_Kategori_Efile
    var shKat = getSheet(dbKey, "Master_Kategori_Efile");
    if (shKat) {
      var dataKat = shKat.getDataRange().getValues();
      for (var i = 1; i < dataKat.length; i++) {
        if (String(dataKat[i][0]).trim().toUpperCase() === "K17") {
          shKat.getRange(i + 1, 2).setValue("Bukti Penerimaan Elektronik");
          Logger.log("Berhasil mengubah K17 di Master_Kategori_Efile menjadi Bukti Penerimaan Elektronik");
        }
      }
    }
    
    // 2. Perbaiki di Database_Efile
    var shEfile = getSheet(dbKey, "Database_Efile");
    var count = 0;
    if (shEfile) {
      var dataEfile = shEfile.getDataRange().getValues();
      for (var j = 1; j < dataEfile.length; j++) {
        if (String(dataEfile[j][2]).trim().toUpperCase() === "K17") {
          shEfile.getRange(j + 1, 4).setValue("Bukti Penerimaan Elektronik"); // Kolom 4 (D) adalah nama_kategori
          count++;
        }
      }
      Logger.log("Berhasil memperbarui " + count + " baris transaksi di Database_Efile");
    }
    
    // Invalidate Cache
    invalidateEfileDashboardCache();
    
    return "Perubahan selesai. Kategori K17 berhasil diubah menjadi 'Bukti Penerimaan Elektronik' di master dan " + count + " data transaksi.";
  } catch(e) {
    return "Gagal melakukan pembaruan: " + e.message;
  }
}

/**
 * Shared Helper: Mengambil daftar PTK/Pegawai secara real-time dari master GTK
 * (PTK_DB & PTK_PAUD_DB) untuk sinkronisasi 100% dengan Administrasi PTK.
 */
function efileGetSharedDaftarPtk(npsnFilter) {
  var sheets = [
    { dbKey: "PTK_DB",      sheetName: "Master Data GTK",      jenjang: "SD",   namaCol: 6,  nipCol: 7,  statusCol: 19, tugasCol: 25, colCount: 26 },
    { dbKey: "PTK_PAUD_DB", sheetName: "Master Data GTK PAUD", jenjang: "PAUD", namaCol: 7,  nipCol: 8,  statusCol: 20, tugasCol: -1, colCount: 26 },
    { dbKey: "PTK_DB",      sheetName: "Master Data GTK SDS",  jenjang: "SDS",  namaCol: 6,  nipCol: 7,  statusCol: 19, tugasCol: 20, colCount: 26 }
  ];
  var result = [];
  var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
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
          var matchNpsn = (rNpsn === targetNpsn);
          var matchUnit = (!filterIsNpsn && rUnit === targetNpsn);
          if (!matchNpsn && !matchUnit) return;
        }
        var nama = String(row[s.namaCol] || "").trim();
        var nip  = String(row[s.nipCol]  || "").trim();
        if (!nama) return;
        result.push({
          id_ptk:     String(row[0]).trim(),
          npsn:       rNpsn,
          unit:       String(row[2] || "").trim(),
          nama:       nama,
          nip:        nip,
          jenjang:    s.jenjang,
          status:     String(row[s.statusCol] || "").trim(),
          tugas:      (s.tugasCol !== -1 && s.tugasCol < readCol) ? String(row[s.tugasCol] || "").trim() : ""
        });
      });
    } catch(sheetErr) {
      Logger.log("efileGetSharedDaftarPtk skip sheet [" + s.sheetName + "]: " + sheetErr.message);
    }
  });
  return result;
}

function getEfileMasterData(npsnFilter) {
  try {
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var resKat = [];
    for(var i=1; i<dataKat.length; i++) {
        if(String(dataKat[i][0]).trim() !== "") {
            // Hanya tampilkan kategori yang aktif (kolom G = TRUE atau kosong = default aktif)
            var isAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE";
            if (!isAktif) continue;
            resKat.push({ 
                idKat: dataKat[i][0], namaKat: dataKat[i][1], parent: dataKat[i][2],
                format: dataKat[i][3] ? String(dataKat[i][3]).trim().toUpperCase() : "PDF",
                jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "",
                statusPegawaiWajib: dataKat[i][5] ? String(dataKat[i][5]).trim() : "",
                keterangan: dataKat[i][7] ? String(dataKat[i][7]).trim() : "",
                ukuran_max: dataKat[i][9] ? parseInt(dataKat[i][9]) || 1 : 1,
                klasifikasi_jenjang: dataKat[i][10] || "",
                klasifikasi_kepeg: dataKat[i][11] || "",
                klasifikasi_tugas: dataKat[i][12] || ""
            });
        }
    }
    
    var resPtk = efileGetSharedDaftarPtk(npsnFilter);
    return JSON.stringify({ success: true, kategori: resKat, ptk: resPtk });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getEfileData(npsnFilter) {
  try {
    // 1. Ambil seluruh data PTK secara real-time dari master GTK
    var ptkList = efileGetSharedDaftarPtk("SEMUA");
    var ptkMap = {};
    ptkList.forEach(function(p) {
        var info = {
            npsn: p.npsn,
            unit: p.unit,
            status: p.status,
            nama: p.nama,
            nip: p.nip
        };
        ptkMap[p.id_ptk] = info;
        if (p.nip) ptkMap[p.nip] = info; // Fallback mapping NIP
        if (p.nama) ptkMap[p.nama.toUpperCase()] = info; // Fallback mapping nama
    });

    // Fallback cadangan dari Database_PTK lokal lama untuk ID lama
    try {
        var shPtkLama = getSheet(KONFIG_EFILE.DB_KEY, "Database_PTK");
        if (shPtkLama) {
            var dataPtkLama = shPtkLama.getDataRange().getDisplayValues();
            for (var j = 1; j < dataPtkLama.length; j++) {
                var idLama = String(dataPtkLama[j][0]).trim();
                if (idLama && !ptkMap[idLama]) {
                    ptkMap[idLama] = {
                        npsn: dataPtkLama[j][4],
                        unit: dataPtkLama[j][5],
                        status: dataPtkLama[j][2],
                        nama: dataPtkLama[j][1],
                        nip: dataPtkLama[j][3]
                    };
                }
            }
        }
    } catch(e) {}
    
    // 2. Load Database_Efile
    var sheet = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile");
    if(!sheet) return JSON.stringify({ success: false, message: "Sheet Database_Efile tidak ditemukan." });
    
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    for(var i=1; i<data.length; i++) {
        var idPtkEfile = String(data[i][0]).trim();
        var ptkInfo = ptkMap[idPtkEfile];
        
        // Filter NPSN dengan fallback komprehensif
        var rNpsn = ptkInfo ? String(ptkInfo.npsn || "").trim().toUpperCase() : "";
        var rUnit = ptkInfo ? String(ptkInfo.unit || "").trim().toUpperCase() : "";
        
        // Ambil data NPSN langsung dari Database_Efile kolom L (index 11) sebagai fallback
        var dbNpsn = String(data[i][11] || "").trim().toUpperCase();
        
        // Pencocokan:
        var matchesFilter = false;
        if (targetNpsn === "" || targetNpsn === "SEMUA") {
            matchesFilter = true;
        } else {
            // Cek apakah target filter cocok dengan NPSN (master GTK), Unit (master GTK), atau NPSN/Unit yang tertulis di Database_Efile
            if (rNpsn === targetNpsn || rUnit === targetNpsn || dbNpsn === targetNpsn) {
                matchesFilter = true;
            }
        }
        
        if (matchesFilter) {
            result.push({
                rowId: i + 1, 
                id_ptk: idPtkEfile, 
                nama: ptkInfo ? ptkInfo.nama : String(data[i][1] || "Pegawai Non-GTK").trim(), 
                id_kategori: data[i][2], 
                nama_kategori: data[i][3],
                tahun: data[i][4], 
                file_name: data[i][5], 
                url: data[i][6], 
                status: data[i][7], 
                catatan: data[i][8],
                tgl_upload: data[i][9], 
                uploader: data[i][10], 
                nip: ptkInfo ? ptkInfo.nip : "",
                npsn: ptkInfo ? ptkInfo.npsn : "", 
                unit: ptkInfo ? ptkInfo.unit : "", 
                statusPegawai: ptkInfo ? ptkInfo.status : "", 
                tgl_verif: data[i][12] || "-", 
                verifikator: data[i][13] || "-",
                periode: data[i][14] || "-",
                tgl_edit: data[i][15] || "-",
            });
        }
    }
    // Pengurutan berbasis Last Activity (Tanggal Unggah, Verifikasi, atau Edit yang paling baru)
    result.sort(function(a, b) {
      function parseDateTime(dStr) {
        if (!dStr || dStr === "-" || String(dStr).trim() === "") return 0;
        try {
          // Format standar aplikasi: "dd-MM-yyyy HH:mm:ss"
          var p = dStr.split(" ");
          var dateParts = p[0].split("-");
          var timeParts = p[1] ? p[1].split(":") : ["00", "00", "00"];
          // Date constructor: (year, monthIndex, day, hours, minutes, seconds)
          var d = new Date(
            parseInt(dateParts[2]), 
            parseInt(dateParts[1]) - 1, 
            parseInt(dateParts[0]), 
            parseInt(timeParts[0] || 0), 
            parseInt(timeParts[1] || 0), 
            parseInt(timeParts[2] || 0)
          );
          return d.getTime() || 0;
        } catch(e) {
          return 0;
        }
      }

      var actA = Math.max(parseDateTime(a.tgl_upload), parseDateTime(a.tgl_edit), parseDateTime(a.tgl_verif));
      var actB = Math.max(parseDateTime(b.tgl_upload), parseDateTime(b.tgl_edit), parseDateTime(b.tgl_verif));
      
      // Jika timestamp aktivitas sama, gunakan fallback ke rowId (baris fisik)
      if (actB === actA) {
        return b.rowId - a.rowId;
      }
      return actB - actA;
    });

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
    var laporan = [];
    var berhasilCount = 0;
    var skipCount = 0;

    for (var i = 0; i < batchData.length; i++) {
      var item = batchData[i];
      var periodeItem = String(item.periode || "-").trim();

      // ============================================================
      // PROTEKSI DUPLIKAT: Cek sebelum upload
      // ============================================================
      var duplikat = efileCheckDuplikat(sheet, item.id_ptk, item.id_kategori, item.tahun, periodeItem);
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
        var folderKatName = (item.nama_kategori || "Berkas") + " - " + (item.tahun || "Umum");
        var idFolderKat = pFolder.getFoldersByName(folderKatName);
        var fKat = idFolderKat.hasNext() ? idFolderKat.next() : pFolder.createFolder(folderKatName);
        var unitName = getUnitNameByPtkId(item.id_ptk);
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

      // Kolom A-O + P(Tgl_Edit kosong) + Q(User_Edit kosong) = 17 kolom
      rowsToAppend.push([
        item.id_ptk, item.nama_ptk, item.id_kategori, item.nama_kategori,
        item.tahun, item.nama_file, fileUrl, "Diproses", "", "'" + now,
        item.user_login, item.npsn, "", "", periodeItem, "", ""
      ]);
      laporan.push({ nama_kategori: item.nama_kategori, tahun: item.tahun, periode: periodeItem, result: "OK", alasan: "" });
      berhasilCount++;
    }

    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    }
    SpreadsheetApp.flush();

    try {
      var uniqueNpsns = {};
      batchData.forEach(function(item) { if (item.npsn) uniqueNpsns[item.npsn] = true; });
      Object.keys(uniqueNpsns).forEach(function(npsn) { onEfileDataChange(npsn); });
    } catch(err) {}

    var msg;
    if (berhasilCount > 0 && skipCount === 0) {
      msg = berhasilCount + " berkas berhasil diunggah.";
    } else if (berhasilCount > 0 && skipCount > 0) {
      msg = berhasilCount + " berkas berhasil, " + skipCount + " dilewati.";
    } else {
      msg = "Tidak ada berkas yang berhasil diunggah. " + skipCount + " berkas dilewati.";
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

    sheet.getRange(r, 5).setValue(payload.tahun);        // E: Tahun
    sheet.getRange(r, 6).setValue(payload.nama_file);    // F: Nama File
    sheet.getRange(r, 7).setValue(newFileUrl);           // G: URL Baru atau Lama
    sheet.getRange(r, 8).setValue("Diproses");           // H: Reset Status ke Diproses
    sheet.getRange(r, 9).setValue("");                   // I: Kosongkan Catatan
    sheet.getRange(r, 13).setValue("");                  // M: Kosongkan Tgl Verifikasi
    sheet.getRange(r, 14).setValue("");                  // N: Kosongkan User Verifikasi
    sheet.getRange(r, 15).setValue(payload.periode);     // O: Periode
    sheet.getRange(r, 16).setValue(now);                 // P: Tgl_Edit
    sheet.getRange(r, 17).setValue(payload.user_login);  // Q: User_Edit

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
            var readByList = String(row[17] || "").split(",");
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
        // Kolom R (18) = Notif_ReadMark (dipindahkan dari kolom P agar tidak bentrok dengan Tgl_Edit)
        var cur = String(sheet.getRange(r, 18).getDisplayValue() || "").trim();
        if (cur === "") sheet.getRange(r, 18).setValue(mark);
        else { var l = cur.split(","); if (l.indexOf(mark) === -1) { l.push(mark); sheet.getRange(r, 18).setValue(l.join(",")); } }
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
    var searchKey = String(keyword).trim();
    var searchKeyLower = searchKey.toLowerCase();
    
    // Gunakan sumber data yang sama dengan getEfileMasterData (efileGetSharedDaftarPtk)
    // agar id_ptk yang dikirim frontend selalu cocok dengan yang dicari di backend
    var cleanFilter = String(npsnFilter || "").trim();
    var targetFilter = (cleanFilter && cleanFilter.toUpperCase() !== "SEMUA") ? cleanFilter : "";
    
    var daftarPtk = efileGetSharedDaftarPtk(targetFilter || "SEMUA");
    var ptkFound = null;
    
    for (var i = 0; i < daftarPtk.length; i++) {
      var p = daftarPtk[i];
      var rId   = String(p.id_ptk || "").trim();
      var rNama = String(p.nama   || "").trim().toLowerCase();
      var rNip  = String(p.nip   || "").trim().toLowerCase();
      
      // Cek filter NPSN jika ada (keamanan akses sekolah)
      if (targetFilter) {
        var rNpsn = String(p.npsn || "").trim().toUpperCase();
        var rUnit = String(p.unit || "").trim().toUpperCase();
        var fUp   = targetFilter.toUpperCase();
        if (rNpsn !== fUp && rUnit !== fUp) continue;
      }
      
      // Cocokkan berdasarkan id_ptk (exact) atau nama / NIP (contains)
      if (rId === searchKey || rId === searchKeyLower ||
          rNama.includes(searchKeyLower) || rNip.includes(searchKeyLower)) {
        ptkFound = {
          id_ptk: p.id_ptk,
          nama:   p.nama,
          nip:    p.nip,
          npsn:   p.npsn,
          unit:   p.unit,
          status: p.status,
          jenjang: p.jenjang,
          tugas:  p.tugas
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
                statusPegawaiWajib: dataKat[k][5] ? String(dataKat[k][5]).trim() : "",
                klasifikasi_jenjang: dataKat[k][10] || "",
                klasifikasi_kepeg: dataKat[k][11] || "",
                klasifikasi_tugas: dataKat[k][12] || ""
            }); 
        }
    }
 
    var shFile = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile"); 
    var dataFile = shFile.getDataRange().getDisplayValues(); 
    var files = [];
    
    // Buat set ID dan NIP untuk fallback matching data lama
    var targetId  = String(ptkFound.id_ptk).trim();
    var targetNip = String(ptkFound.nip || "").trim();
    var targetNama = String(ptkFound.nama || "").trim().toUpperCase();
    
    for(var f = 1; f < dataFile.length; f++) {
        var fIdPtk = String(dataFile[f][0]).trim();
        var fNamaPtk = String(dataFile[f][1] || "").trim().toUpperCase();
        
        // Pencocokan: ID exact, atau NIP (jika ada), atau nama (fallback terakhir)
        var isMatch = (fIdPtk === targetId);
        if (!isMatch && targetNip && fIdPtk === targetNip) isMatch = true;
        if (!isMatch && targetNama && fNamaPtk === targetNama) isMatch = true;
        
        if (isMatch) { 
            // Tampilkan SEMUA status berkas (Diproses, Disetujui, Revisi, Ditolak)
            files.push({ 
              id_kategori: dataFile[f][2], 
              tahun: dataFile[f][4], 
              file_name: dataFile[f][5], 
              url: dataFile[f][6],
              status: dataFile[f][7],
              periode: dataFile[f][14] || ""
            }); 
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
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile");
    if(!shKat) return JSON.stringify({ success: false, message: "Sheet Master_Kategori_Efile tidak ditemukan." });
    
    var dataKat = shKat.getDataRange().getDisplayValues();
    var listKategori = [];
    for(var i=1; i<dataKat.length; i++) {
        if(String(dataKat[i][0]).trim() !== "") {
            var showDash = String(dataKat[i][8] || "TRUE").trim().toUpperCase() !== "FALSE";
            if (showDash) {
                listKategori.push({
                    sheetRekap: dataKat[i][0],
                    sheetLapor: dataKat[i][1],
                    namaKategori: dataKat[i][1]
                });
            }
        }
    }
    
    var ptkListRaw = efileGetSharedDaftarPtk(npsnFilter);
    var myUnit = "";
    if (npsnFilter && npsnFilter !== "SEMUA" && ptkListRaw.length > 0) {
        myUnit = ptkListRaw[0].unit;
    }

    return JSON.stringify({ success: true, kategori: listKategori, myUnit: myUnit });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getEfileDashboardData(idKategori, namaKategori, forceRefresh) {
  try {
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var jPeriode = "TAHUNAN";
    var statusFilterList = [];
    var targetJenjang = [];
    var targetKepeg = [];
    var targetTugas = [];

    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() === String(idKategori).trim()) {
        var w = String(dataKat[i][5] || "").trim();
        if (w) {
          statusFilterList = w.split(",").map(function(s) { return s.trim().toLowerCase(); });
        }
        var jpVal = String(dataKat[i][4] || "").toUpperCase();
        if (jpVal.includes("PERMANEN")) jPeriode = "PERMANEN";
        else if (jpVal.includes("PERIODE")) jPeriode = "PERIODE";
        else if (jpVal.includes("TMT")) jPeriode = "TMT";
        else if (jpVal.includes("TRIWULAN")) jPeriode = "TRIWULAN";
        else if (jpVal.includes("SKP")) jPeriode = "SKP";
        else if (jpVal.includes("SK_PPPK")) jPeriode = "SK_PPPK";
        else if (jpVal.includes("SK_KP")) jPeriode = "SK_KP";
        else if (jpVal.includes("SK_JF")) jPeriode = "SK_JF";
        else if (jpVal.includes("IJAZAH")) jPeriode = "IJAZAH";

        // Ambil filter klasifikasi
        var jg = String(dataKat[i][10] || "").trim();
        if (jg && jg !== "ALL") targetJenjang = jg.split(",").map(function(s) { return s.trim().toUpperCase(); });
        
        var kp = String(dataKat[i][11] || "").trim();
        if (kp && kp !== "ALL") targetKepeg = kp.split(",").map(function(s) { return s.trim().toUpperCase(); });
        
        var tg = String(dataKat[i][12] || "").trim();
        if (tg && tg !== "ALL") targetTugas = tg.split(",").map(function(s) { return s.trim().toUpperCase(); });
        
        break;
      }
    }
    
    var rawPtk = efileGetSharedDaftarPtk("SEMUA");
    var ptkList = [];
    var unitsMap = {}; 
    
    rawPtk.forEach(function(p) {
      // 1. Evaluasi Filter Klasifikasi Target Jenjang
      if (targetJenjang.length > 0) {
        if (targetJenjang.indexOf(String(p.jenjang || "").toUpperCase()) === -1) return;
      }
      
      // 2. Evaluasi Filter Klasifikasi Kepegawaian
      if (targetKepeg.length > 0) {
        if (targetKepeg.indexOf(String(p.status || "").toUpperCase()) === -1) return;
      }
      
      // 3. Evaluasi Filter Klasifikasi Tugas / Jabatan
      if (targetTugas.length > 0) {
        if (targetTugas.indexOf(String(p.tugas || "").toUpperCase()) === -1) return;
      }
      
      ptkList.push({ id: p.id_ptk, nama: p.nama, nip: p.nip, npsn: p.npsn, unit: p.unit, status: p.status });
      if (p.unit) {
        unitsMap[p.unit] = p.npsn;
      }
    });
    
    var shEfile = getSheet(KONFIG_EFILE.DB_KEY, "Database_Efile");
    var dataEfile = shEfile ? shEfile.getDataRange().getDisplayValues() : [];
    
    var efileMap = {};
    var periodsSet = new Set();
    
    var curYear = new Date().getFullYear();
    if (jPeriode === "PERIODE") {
      // Buat periode bulan default untuk tahun berjalan
      var bulans = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      bulans.forEach(function(b) {
        periodsSet.add(b + " " + curYear);
        periodsSet.add(b + " " + (curYear - 1));
      });
    } else if (jPeriode === "TRIWULAN") {
      var tws = ["Triwulan 1", "Triwulan 2", "Triwulan 3", "Triwulan 4"];
      tws.forEach(function(t) {
        periodsSet.add(t + " " + curYear);
        periodsSet.add(t + " " + (curYear - 1));
      });
    } else if (jPeriode === "SKP") {
      var skps = ["Triwulan 1", "Triwulan 2", "Triwulan 3", "Triwulan 4", "Tahunan"];
      skps.forEach(function(s) {
        periodsSet.add(s + " " + curYear);
        periodsSet.add(s + " " + (curYear - 1));
      });
    } else if (jPeriode === "SK_PPPK") {
      var skppk = ["SK Pertama", "SK Kedua", "SK Ketiga", "SK Keempat", "SK Kelima"];
      skppk.forEach(function(s) { periodsSet.add(s); });
    } else if (jPeriode === "SK_KP") {
      var skkp = ["II/a", "II/b", "II/c", "II/d", "III/a", "III/b", "III/c", "III/d", "IV/a", "IV/b", "IV/c", "IV/d"];
      skkp.forEach(function(s) { periodsSet.add(s); });
    } else if (jPeriode === "SK_JF") {
      var skjf = ["Guru Ahli Pertama", "Guru Ahli Muda", "Guru Ahli Madya"];
      skjf.forEach(function(s) { periodsSet.add(s); });
    } else if (jPeriode === "IJAZAH") {
      var ijazahs = ["SD", "SMP", "SMA", "D2", "D3", "D4", "S1", "S2", "S3"];
      ijazahs.forEach(function(s) { periodsSet.add(s); });
    } else if (jPeriode === "PERMANEN") {
      periodsSet.add("PERMANEN");
    } else {
      periodsSet.add(String(curYear));
      periodsSet.add(String(curYear - 1));
      periodsSet.add(String(curYear - 2));
    }
    
    for (var k = 1; k < dataEfile.length; k++) {
      var ePtk = String(dataEfile[k][0]).trim();
      var eKat = String(dataEfile[k][2]).trim();
      var eThn = String(dataEfile[k][4]).trim();
      var ePeriode = String(dataEfile[k][14] || "").trim();
      var eStatus = String(dataEfile[k][7]).trim();
      
      if (eKat === String(idKategori).trim() && ePtk) {
        if (jPeriode === "PERIODE") {
          var targetPer = ePeriode || eThn;
          if (targetPer && targetPer !== "-") {
            periodsSet.add(targetPer);
            if (!efileMap[ePtk]) efileMap[ePtk] = {};
            efileMap[ePtk][targetPer] = eStatus;
          }
        } else if (jPeriode === "TRIWULAN" || jPeriode === "SKP") {
          var targetTw = ePeriode;
          if (targetTw && targetTw !== "-") {
            var combinedTw = targetTw + " " + eThn;
            periodsSet.add(combinedTw);
            if (!efileMap[ePtk]) efileMap[ePtk] = {};
            efileMap[ePtk][combinedTw] = eStatus;
          }
        } else if (jPeriode === "SK_PPPK" || jPeriode === "SK_KP" || jPeriode === "SK_JF" || jPeriode === "IJAZAH") {
          var targetKarakteristik = ePeriode;
          if (targetKarakteristik && targetKarakteristik !== "-") {
            periodsSet.add(targetKarakteristik);
            if (!efileMap[ePtk]) efileMap[ePtk] = {};
            efileMap[ePtk][targetKarakteristik] = eStatus;
          }
        } else if (jPeriode === "PERMANEN") {
          if (!efileMap[ePtk]) efileMap[ePtk] = {};
          if (eStatus) {
            efileMap[ePtk]["PERMANEN"] = eStatus;
          }
        } else {
          if (eThn) {
            periodsSet.add(eThn);
            if (!efileMap[ePtk]) efileMap[ePtk] = {};
            efileMap[ePtk][eThn] = eStatus;
          }
        }
      }
    }
    
    // Urutkan periode
    var sortedPeriods = [];
    if (jPeriode === "PERIODE") {
      var mapBulan = {"Jan":1, "Feb":2, "Mar":3, "Apr":4, "Mei":5, "Jun":6, "Jul":7, "Agu":8, "Sep":9, "Okt":10, "Nov":11, "Des":12};
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) {
        var partsA = a.split(" ");
        var partsB = b.split(" ");
        var yA = parseInt(partsA[1] || partsA[0] || 0);
        var yB = parseInt(partsB[1] || partsB[0] || 0);
        if (yA !== yB) return yB - yA;
        var bA = mapBulan[partsA[0]] || 0;
        var bB = mapBulan[partsB[0]] || 0;
        return bB - bA;
      });
    } else if (jPeriode === "TRIWULAN") {
      var mapTw = {"Triwulan 1":1, "Triwulan 2":2, "Triwulan 3":3, "Triwulan 4":4};
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) {
        var partsA = a.split(" ");
        var partsB = b.split(" ");
        var yA = parseInt(partsA[2] || 0);
        var yB = parseInt(partsB[2] || 0);
        if (yA !== yB) return yB - yA;
        var twAStr = partsA[0] + " " + partsA[1];
        var twBStr = partsB[0] + " " + partsB[1];
        var twA = mapTw[twAStr] || 0;
        var twB = mapTw[twBStr] || 0;
        return twB - twA;
      });
    } else if (jPeriode === "SKP") {
      var mapSkp = {"Triwulan 1":1, "Triwulan 2":2, "Triwulan 3":3, "Triwulan 4":4, "Tahunan":5};
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) {
        var partsA = a.split(" ");
        var partsB = b.split(" ");
        var yA = parseInt(partsA[partsA.length - 1] || 0);
        var yB = parseInt(partsB[partsB.length - 1] || 0);
        if (yA !== yB) return yB - yA;
        
        var skpAStr = partsA.slice(0, partsA.length - 1).join(" ");
        var skpBStr = partsB.slice(0, partsB.length - 1).join(" ");
        var skpA = mapSkp[skpAStr] || 0;
        var skpB = mapSkp[skpBStr] || 0;
        return skpB - skpA;
      });
    } else if (jPeriode === "SK_PPPK") {
      var orderPppk = ["SK Pertama", "SK Kedua", "SK Ketiga", "SK Keempat", "SK Kelima"];
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) { return orderPppk.indexOf(a) - orderPppk.indexOf(b); });
    } else if (jPeriode === "SK_KP") {
      var orderKp = ["II/a", "II/b", "II/c", "II/d", "III/a", "III/b", "III/c", "III/d", "IV/a", "IV/b", "IV/c", "IV/d"];
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) { return orderKp.indexOf(a) - orderKp.indexOf(b); });
    } else if (jPeriode === "SK_JF") {
      var orderJf = ["Guru Ahli Pertama", "Guru Ahli Muda", "Guru Ahli Madya"];
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) { return orderJf.indexOf(a) - orderJf.indexOf(b); });
    } else if (jPeriode === "IJAZAH") {
      var orderEdu = ["SD", "SMP", "SMA", "D2", "D3", "D4", "S1", "S2", "S3"];
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) { return orderEdu.indexOf(a) - orderEdu.indexOf(b); });
    } else if (jPeriode === "PERMANEN") {
      sortedPeriods = ["PERMANEN"];
    } else {
      sortedPeriods = Array.from(periodsSet).sort(function(a, b) { return parseInt(b) - parseInt(a); });
    }
    
    var arrRekap = [];
    var arrSudah = [];
    var arrBelum = [];
    
    sortedPeriods.forEach(function(periodeKey) {
      var unitGroups = {};
      ptkList.forEach(function(ptk) {
        var u = ptk.unit || "Lainnya";
        if (!unitGroups[u]) unitGroups[u] = [];
        unitGroups[u].push(ptk);
      });
      
      Object.keys(unitGroups).forEach(function(unitName) {
        var group = unitGroups[unitName];
        var npsn = unitsMap[unitName] || "-";
        var totalUnit = group.length;
        var sudahUnit = 0;
        var belumUnit = 0;
        
        group.forEach(function(ptk) {
          var status = null;
          if (jPeriode === "PERMANEN") {
            status = efileMap[ptk.id] ? efileMap[ptk.id]["PERMANEN"] : null;
          } else {
            status = efileMap[ptk.id] ? efileMap[ptk.id][periodeKey] : null;
          }
          
          var isUploaded = false;
          if (status) {
            var stLower = status.toLowerCase();
            if (stLower.includes("setuju") || stLower.includes("ok") || stLower.includes("proses") || stLower.includes("valid")) {
              isUploaded = true;
            }
          }
          
          if (isUploaded) {
            sudahUnit++;
            arrSudah.push({
              nama: ptk.nama,
              nip: ptk.nip,
              unit: unitName,
              tahun: periodeKey,
              npsn: npsn
            });
          } else {
            belumUnit++;
            arrBelum.push({
              nama: ptk.nama,
              nip: ptk.nip,
              unit: unitName,
              tahun: periodeKey, // Key tahun kita samakan ke key periode terpilih
              npsn: npsn
            });
          }
        });
        
        arrRekap.push({
          npsn: npsn,
          unit: unitName,
          tahun: periodeKey,
          jml: totalUnit,
          sudah: sudahUnit,
          belum: belumUnit
        });
      });
    });
    
    return JSON.stringify({ success: true, rekap: arrRekap, sudah: arrSudah, belum: arrBelum, jenisPeriode: jPeriode });
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

/* ======================================================================
   MODUL E-FILE — FUNGSI HELPER & MASTER KATEGORI (CRUD ADMIN)
   ====================================================================== */

/**
 * Helper: Cek apakah kombinasi id_ptk + id_kategori + tahun + periode
 * sudah ada di Database_Efile. Digunakan untuk proteksi duplikat.
 * @returns {{ ada: boolean, status: string, rowId: number }}
 */
function efileCheckDuplikat(sheet, id_ptk, id_kategori, tahun, periode) {
  try {
    var data = sheet.getDataRange().getDisplayValues();
    var cleanPtk     = String(id_ptk     || "").trim();
    var cleanKat     = String(id_kategori || "").trim();
    var cleanThn     = String(tahun       || "").trim();
    var cleanPeriode = String(periode     || "-").trim();

    for (var i = 1; i < data.length; i++) {
      var rowPtk     = String(data[i][0]  || "").trim();  // A: ID_PTK
      var rowKat     = String(data[i][2]  || "").trim();  // C: ID_Kategori
      var rowThn     = String(data[i][4]  || "").trim();  // E: Tahun
      var rowPeriode = String(data[i][14] || "-").trim(); // O: Periode
      var rowStatus  = String(data[i][7]  || "").trim();  // H: Status

      if (rowPtk === cleanPtk && rowKat === cleanKat && rowThn === cleanThn && rowPeriode === cleanPeriode) {
        return { ada: true, status: rowStatus, rowId: i + 1 };
      }
    }
    return { ada: false, status: "", rowId: -1 };
  } catch(e) {
    return { ada: false, status: "", rowId: -1 };
  }
}

/**
 * Admin: Baca seluruh Master_Kategori_Efile termasuk kolom aktif (G) & keterangan (H).
 */
function getEfileMasterKategoriAdmin() {
  try {
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile");
    if (!shKat) return JSON.stringify({ success: false, message: "Sheet Master_Kategori_Efile tidak ditemukan." });
    
    // Migrasi kolom otomatis jika diakses dan belum lengkap kolomnya
    if (shKat.getLastColumn() < 13) {
      var colHead = [["dashboard", "ukuran_max", "klasifikasi_jenjang", "klasifikasi_kepeg", "klasifikasi_tugas"]];
      shKat.getRange(1, 9, 1, 5).setValues(colHead);
      SpreadsheetApp.flush();
    }

    var dataKat = shKat.getDataRange().getDisplayValues();
    var result = [];
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() !== "") {
        result.push({
          rowId: i + 1,
          idKat: dataKat[i][0],
          namaKat: dataKat[i][1],
          parent: dataKat[i][2],
          format: dataKat[i][3] || "PDF",
          jenisPeriode: dataKat[i][4] || "",
          statusPegawaiWajib: dataKat[i][5] || "",
          aktif: String(dataKat[i][6] || "TRUE").trim().toUpperCase() !== "FALSE",
          keterangan: dataKat[i][7] || "",
          dashboard: String(dataKat[i][8] || "TRUE").trim().toUpperCase() !== "FALSE",
          ukuran_max: dataKat[i][9] ? parseInt(dataKat[i][9]) || 1 : 1,
          klasifikasi_jenjang: dataKat[i][10] || "",
          klasifikasi_kepeg: dataKat[i][11] || "",
          klasifikasi_tugas: dataKat[i][12] || ""
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/**
 * Admin: Tambah atau edit baris di Master_Kategori_Efile.
 * Jika payload.rowId ada → mode Edit. Jika tidak → mode Tambah.
 */
function simpanMasterKategori(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile");
    if (!shKat) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });

    // Cek migrasi kolom
    if (shKat.getLastColumn() < 13) {
      var colHead = [["dashboard", "ukuran_max", "klasifikasi_jenjang", "klasifikasi_kepeg", "klasifikasi_tugas"]];
      shKat.getRange(1, 9, 1, 5).setValues(colHead);
      SpreadsheetApp.flush();
    }

    var idKat   = String(payload.idKat   || "").trim();
    var namaKat = String(payload.namaKat || "").trim();
    if (!idKat)   return JSON.stringify({ success: false, message: "ID Kategori tidak boleh kosong." });
    if (!namaKat) return JSON.stringify({ success: false, message: "Nama Kategori tidak boleh kosong." });

    var rowData = [
      idKat,
      namaKat,
      String(payload.parent             || "").trim(),
      String(payload.format             || "PDF").trim().toUpperCase(),
      String(payload.jenisPeriode       || "").trim().toUpperCase(),
      String(payload.statusPegawaiWajib || "").trim(),
      payload.aktif !== false ? "TRUE" : "FALSE",
      String(payload.keterangan         || "").trim(),
      payload.dashboard !== false ? "TRUE" : "FALSE",
      payload.ukuran_max ? parseInt(payload.ukuran_max) || 1 : 1,
      String(payload.klasifikasi_jenjang || "").trim(),
      String(payload.klasifikasi_kepeg   || "").trim(),
      String(payload.klasifikasi_tugas   || "").trim()
    ];

    if (payload.rowId) {
      // Mode EDIT
      var r = parseInt(payload.rowId);
      shKat.getRange(r, 1, 1, rowData.length).setValues([rowData]);
      SpreadsheetApp.flush();
      invalidateEfileDashboardCache();
      return JSON.stringify({ success: true, message: "Kategori berhasil diperbarui." });
    } else {
      // Mode TAMBAH — validasi ID unik
      var dataAll = shKat.getDataRange().getDisplayValues();
      for (var i = 1; i < dataAll.length; i++) {
        if (String(dataAll[i][0]).trim().toUpperCase() === idKat.toUpperCase()) {
          return JSON.stringify({ success: false, message: "ID Kategori '" + idKat + "' sudah digunakan." });
        }
      }
      shKat.appendRow(rowData);
      SpreadsheetApp.flush();
      invalidateEfileDashboardCache();
      return JSON.stringify({ success: true, message: "Kategori baru berhasil ditambahkan." });
    }
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Admin: Toggle kolom aktif (G) di Master_Kategori_Efile.
 * Tidak menghapus data — kategori nonaktif tetap tersimpan untuk riwayat.
 */
function toggleAktifMasterKategori(idKat, aktifBaru) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var shKat = getSheet(KONFIG_EFILE.DB_KEY, "Master_Kategori_Efile");
    if (!shKat) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });
    var dataKat = shKat.getDataRange().getDisplayValues();
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim().toUpperCase() === String(idKat).trim().toUpperCase()) {
        shKat.getRange(i + 1, 7).setValue(aktifBaru ? "TRUE" : "FALSE");
        SpreadsheetApp.flush();
        invalidateEfileDashboardCache();
        return JSON.stringify({ success: true, message: "Status kategori berhasil diperbarui." });
      }
    }
    return JSON.stringify({ success: false, message: "ID Kategori tidak ditemukan." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}