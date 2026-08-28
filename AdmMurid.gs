/* ======================================================================
   MODUL: ADMINISTRASI MURID (CRUD SPMB & CETAK IJAZAH)
   DB Key    : ADM_MURID_DB
   Folder    : ADM_MURID_DOCS
   ====================================================================== */

const KONFIG_ADM_MURID = {
  DB_KEY: "ADM_MURID_DB",
  get FOLDER_ID() { return FOLDER_CONFIG.ADM_MURID_DOCS; }
};

function getOrCreateSheetAdmMurid(sheetName) {
  var ss = getDB(KONFIG_ADM_MURID.DB_KEY);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Proteksi pemulihan header otomatis jika baris 1 kosong
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === "") {
    if (sheetName === "Database_SPMB") {
      sheet.getRange(1, 1, 1, 27).setValues([[
        "NPSN", "Nama_Sekolah", "Tahun_Ajaran", "Jumlah_Rombel", 
        "SPMB_T1_Online_L", "SPMB_T1_Online_P", "SPMB_T2_Online_L", "SPMB_T2_Online_P", 
        "SPMB_Offline_L", "SPMB_Offline_P", "Tinggal_Kelas_1_L", "Tinggal_Kelas_1_P", 
        "Jumlah_Murid_L", "Jumlah_Murid_P", "Jumlah_Total", 
        "Nama_File", "URL_File", "ID_File", "Status", "Catatan", 
        "Tgl_Upload", "Uploader", "Tgl_Edit", "User_Edit", "Tgl_Verif", "Verifikator", "Read_by"
      ]]);
    } else if (sheetName === "Database_Ijazah") {
      sheet.getRange(1, 1, 1, 24).setValues([[
        "NPSN", "Nama_Sekolah", "Tahun_Ajaran", 
        "Jumlah_Murid_L", "Jumlah_Murid_P", "Jumlah_Total", 
        "Nama_File_Ijazah", "URL_File_Ijazah", "ID_File_Ijazah", 
        "Nama_File_Transkrip", "URL_File_Transkrip", "ID_File_Transkrip", 
        "Status", "Catatan", "Tgl_Upload", "Uploader", "Tgl_Edit", "User_Edit", "Tgl_Verif", "Verifikator", "Read_by",
        "Nama_File_Transkrip_Kolektif", "URL_File_Transkrip_Kolektif", "ID_File_Transkrip_Kolektif"
      ]]);
    } else if (sheetName === "Arsip_Ijazah") {
      sheet.getRange(1, 1, 1, 19).setValues([[
        "NPSN", "Nama_Sekolah", "Tahun_Ajaran",
        "Jumlah_Murid_L", "Jumlah_Murid_P", "Jumlah_Total",
        "Nama_File_Ijazah", "URL_File_Ijazah", "ID_File_Ijazah",
        "Nama_File_Transkrip", "URL_File_Transkrip", "ID_File_Transkrip",
        "Status", "Catatan", "Tgl_Upload", "Uploader", "Tgl_Edit", "User_Edit", "Read_by"
      ]]);
    } else if (sheetName === "Arsip_TKA") {
      sheet.getRange(1, 1, 1, 16).setValues([[
        "NPSN", "Nama_Sekolah", "Tahun_Ajaran",
        "Jumlah_Murid_L", "Jumlah_Murid_P", "Jumlah_Total",
        "Nama_File", "URL_File", "ID_File",
        "Status", "Catatan", "Tgl_Upload", "Uploader", "Tgl_Edit", "User_Edit", "Read_by"
      ]]);
    }
  }
  return sheet;
}

/* ==========================================
   1. CRUD: LAPORAN SPMB KELAS 1
   ========================================== */

function admMurid_getSpmbData(npsnFilter) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_SPMB");
    var values = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();

    for (var i = 1; i < values.length; i++) {
      var rNpsn = String(values[i][0]).trim();
      var rNama = String(values[i][1]).trim();
      if (!rNpsn) continue;

      if (!targetNpsn || targetNpsn === "SEMUA" || String(rNpsn).trim() === targetNpsn || rNama.toUpperCase() === targetNpsn) {
        result.push({
          rowId: i + 1,
          npsn: values[i][0],
          nama_sekolah: values[i][1],
          tahun_ajaran: values[i][2],
          jumlah_rombel: values[i][3],
          spmb_t1_online_l: values[i][4],
          spmb_t1_online_p: values[i][5],
          spmb_t2_online_l: values[i][6],
          spmb_t2_online_p: values[i][7],
          spmb_offline_l: values[i][8],
          spmb_offline_p: values[i][9],
          tinggal_kelas_1_l: values[i][10],
          tinggal_kelas_1_p: values[i][11],
          jumlah_murid_l: values[i][12],
          jumlah_murid_p: values[i][13],
          jumlah_total: values[i][14],
          nama_file: values[i][15],
          url_file: values[i][16],
          id_file: values[i][17],
          status: values[i][18],
          catatan: values[i][19],
          tgl_upload: values[i][20],
          uploader: values[i][21],
          tgl_edit: values[i][22],
          user_edit: values[i][23],
          tgl_verif: values[i][24],
          verifikator: values[i][25],
          read_by: values[i][26] || ""
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function admMurid_simpanSpmb(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Database_SPMB");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    var isEdit = payload.rowId ? true : false;
    var fileUrl = payload.url_file || "";
    var fileId = payload.id_file || "";

    if (payload.fileBase64) {
      if (isEdit && fileId) {
        try { DriveApp.getFileById(fileId).setTrashed(true); } catch(err) {}
      }

      var pFolder = DriveApp.getFolderById(FOLDER_CONFIG.ADM_MURID_SPMB_DOCS);
      var schoolFolder;
      var schoolFolders = pFolder.getFoldersByName(payload.nama_sekolah);
      if (schoolFolders.hasNext()) {
        schoolFolder = schoolFolders.next();
      } else {
        schoolFolder = pFolder.createFolder(payload.nama_sekolah);
      }

      var blob = Utilities.newBlob(Utilities.base64Decode(payload.fileBase64), payload.mimeType, payload.nama_file);
      var file = schoolFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
      fileId = file.getId();
    }

    var t1l = parseInt(payload.spmb_t1_online_l || 0);
    var t1p = parseInt(payload.spmb_t1_online_p || 0);
    var t2l = parseInt(payload.spmb_t2_online_l || 0);
    var t2p = parseInt(payload.spmb_t2_online_p || 0);
    var offl = parseInt(payload.spmb_offline_l || 0);
    var offp = parseInt(payload.spmb_offline_p || 0);
    var tkl = parseInt(payload.tinggal_kelas_1_l || 0);
    var tkp = parseInt(payload.tinggal_kelas_1_p || 0);

    var jmlL = t1l + t2l + offl + tkl;
    var jmlP = t1p + t2p + offp + tkp;
    var jmlTotal = jmlL + jmlP;

    if (isEdit) {
      var row = parseInt(payload.rowId);
      var currentStatus = String(sheet.getRange(row, 19).getValue()).trim();
      if (currentStatus.toLowerCase() === "disetujui" && payload.user_login !== "admin") {
        return JSON.stringify({ success: false, message: "Dokumen yang telah disetujui tidak dapat diedit." });
      }

      sheet.getRange(row, 3, 1, 13).setValues([[
        payload.tahun_ajaran, payload.jumlah_rombel,
        t1l, t1p, t2l, t2p, offl, offp, tkl, tkp,
        jmlL, jmlP, jmlTotal
      ]]);
      sheet.getRange(row, 16, 1, 3).setValues([[payload.nama_file, fileUrl, fileId]]);
      sheet.getRange(row, 19).setValue("Diproses");
      sheet.getRange(row, 23, 1, 2).setValues([[now, payload.user_login]]);
    } else {
      var existingData = sheet.getDataRange().getDisplayValues();
      var targetNpsn = String(payload.npsn || "").trim();
      var targetTa = String(payload.tahun_ajaran || "").trim();
      
      for (var i = 1; i < existingData.length; i++) {
        var rowNpsn = String(existingData[i][0] || "").trim();
        var rowTa = String(existingData[i][2] || "").trim();
        if (!rowNpsn || !rowTa) continue; // Abaikan baris kosong
        if (rowNpsn === targetNpsn && rowTa === targetTa) {
          return JSON.stringify({ success: false, message: "Laporan SPMB untuk Tahun Ajaran " + payload.tahun_ajaran + " sudah ada." });
        }
      }

      sheet.appendRow([
        payload.npsn, payload.nama_sekolah, payload.tahun_ajaran, payload.jumlah_rombel,
        t1l, t1p, t2l, t2p, offl, offp, tkl, tkp,
        jmlL, jmlP, jmlTotal,
        payload.nama_file, fileUrl, fileId,
        "Diproses", "",
        now, payload.user_login, "", "", "", "", ""
      ]);
    }

    // Hapus cache notifikasi hanya modul SPMB agar badge Admin langsung muncul
    try { invalidateNotifCacheForModule("spmb", "admin", ""); } catch(ce) {}

    return JSON.stringify({ success: true, message: "Data SPMB berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_hapusSpmb(rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Database_SPMB");
    var row = parseInt(rowId);
    var fileId = sheet.getRange(row, 18).getValue();

    if (fileId) {
      try { DriveApp.getFileById(fileId).setTrashed(true); } catch(err) {}
    }

    sheet.deleteRow(row);
    return JSON.stringify({ success: true, message: "Data SPMB berhasil dihapus." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_verifikasiSpmb(rowId, status, catatan, verifikator) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_SPMB");
    var row = parseInt(rowId);
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(row, 19, 1, 2).setValues([[status, catatan]]);
    sheet.getRange(row, 25, 1, 2).setValues([[now, verifikator]]);
    
    // Set read_by: tandai sebagai sudah dibaca oleh Admin
    var currentReadBySpmb = String(sheet.getRange(row, 27).getDisplayValue() || "").trim();
    var listSpmb = currentReadBySpmb === "" ? [] : currentReadBySpmb.split(",");
    if (listSpmb.indexOf("Admin") === -1) {
      listSpmb.push("Admin");
      sheet.getRange(row, 27).setValue(listSpmb.join(","));
    }

    // Hapus cache notifikasi hanya modul SPMB agar badge sidebar terupdate
    try { invalidateNotifCacheForModule("spmb", verifikator, ""); } catch(ce) {}

    return JSON.stringify({ success: true, message: "Verifikasi SPMB berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/* ==========================================
   2. CRUD: PERMOHONAN CETAK IJAZAH KELAS 6
   ========================================== */

function admMurid_getIjazahData(npsnFilter) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    var values = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();

    for (var i = 1; i < values.length; i++) {
      var rNpsn = String(values[i][0]).trim();
      var rNama = String(values[i][1]).trim();
      if (!rNpsn) continue;

      if (!targetNpsn || targetNpsn === "SEMUA" || String(rNpsn).trim() === targetNpsn || rNama.toUpperCase() === targetNpsn) {
        result.push({
          rowId: i + 1,
          npsn: values[i][0],
          nama_sekolah: values[i][1],
          tahun_ajaran: values[i][2],
          jumlah_murid_l: values[i][3],
          jumlah_murid_p: values[i][4],
          jumlah_total: values[i][5],
          nama_file_ijazah: values[i][6],
          url_file_ijazah: values[i][7],
          id_file_ijazah: values[i][8],
          nama_file_transkrip: values[i][9],
          url_file_transkrip: values[i][10],
          id_file_transkrip: values[i][11],
          status: values[i][12],
          catatan: values[i][13],
          tgl_upload: values[i][14],
          uploader: values[i][15],
          tgl_edit: values[i][16],
          user_edit: values[i][17],
          tgl_verif: values[i][18],
          verifikator: values[i][19],
          read_by: values[i][20] || "",
          nama_file_transkrip_kolektif: values[i][21] || "",
          url_file_transkrip_kolektif: values[i][22] || "",
          id_file_transkrip_kolektif: values[i][23] || ""
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function admMurid_simpanIjazah(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    var isEdit = payload.rowId ? true : false;
    var urlIjazah = payload.url_file_ijazah || "";
    var idIjazah = payload.id_file_ijazah || "";
    var urlTranskrip = payload.url_file_transkrip || "";
    var idTranskrip = payload.id_file_transkrip || "";
    var urlTranskripKolektif = payload.url_file_transkrip_kolektif || "";
    var idTranskripKolektif = payload.id_file_transkrip_kolektif || "";

    // Unggah PDF Ijazah
    if (payload.fileIjazahBase64 || payload.fileBase64_ijazah) {
      var base64Ijazah = payload.fileIjazahBase64 || payload.fileBase64_ijazah;
      if (isEdit && idIjazah) {
        try { DriveApp.getFileById(idIjazah).setTrashed(true); } catch(err) {}
      }
      var pFolderIjazah = DriveApp.getFolderById(FOLDER_CONFIG.ADM_MURID_IJAZAH_DOCS);
      var schoolFolderIjazah;
      var schoolFoldersIjazah = pFolderIjazah.getFoldersByName(payload.nama_sekolah);
      if (schoolFoldersIjazah.hasNext()) {
        schoolFolderIjazah = schoolFoldersIjazah.next();
      } else {
        schoolFolderIjazah = pFolderIjazah.createFolder(payload.nama_sekolah);
      }
      var blobIjazah = Utilities.newBlob(Utilities.base64Decode(base64Ijazah), payload.mimeType_ijazah || "application/pdf", payload.nama_file_ijazah);
      var fileIjazah = schoolFolderIjazah.createFile(blobIjazah);
      fileIjazah.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlIjazah = fileIjazah.getUrl();
      idIjazah = fileIjazah.getId();
    }

    // Unggah Word KOP Surat
    if (payload.fileTranskripBase64 || payload.fileBase64_transkrip) {
      var base64Transkrip = payload.fileTranskripBase64 || payload.fileBase64_transkrip;
      if (isEdit && idTranskrip) {
        try { DriveApp.getFileById(idTranskrip).setTrashed(true); } catch(err) {}
      }
      var pFolderTranskrip = DriveApp.getFolderById(FOLDER_CONFIG.ADM_MURID_TRANSKRIP_DOCS);
      var schoolFolderTranskrip;
      var schoolFoldersTranskrip = pFolderTranskrip.getFoldersByName(payload.nama_sekolah);
      if (schoolFoldersTranskrip.hasNext()) {
        schoolFolderTranskrip = schoolFoldersTranskrip.next();
      } else {
        schoolFolderTranskrip = pFolderTranskrip.createFolder(payload.nama_sekolah);
      }
      var blobTranskrip = Utilities.newBlob(Utilities.base64Decode(base64Transkrip), payload.mimeType_transkrip || "application/octet-stream", payload.nama_file_transkrip);
      var fileTranskrip = schoolFolderTranskrip.createFile(blobTranskrip);
      fileTranskrip.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlTranskrip = fileTranskrip.getUrl();
      idTranskrip = fileTranskrip.getId();
    }

    // Unggah PDF Transkrip Kolektif
    if (payload.fileTranskripKolektifBase64 || payload.fileBase64_transkrip_kolektif) {
      var base64TranskripKolektif = payload.fileTranskripKolektifBase64 || payload.fileBase64_transkrip_kolektif;
      if (isEdit && idTranskripKolektif) {
        try { DriveApp.getFileById(idTranskripKolektif).setTrashed(true); } catch(err) {}
      }
      var pFolderTranskripKolektif = DriveApp.getFolderById(FOLDER_CONFIG.ADM_MURID_TRANSKRIP_DOCS);
      var schoolFolderTranskripKolektif;
      var schoolFoldersTranskripKolektif = pFolderTranskripKolektif.getFoldersByName(payload.nama_sekolah);
      if (schoolFoldersTranskripKolektif.hasNext()) {
        schoolFolderTranskripKolektif = schoolFoldersTranskripKolektif.next();
      } else {
        schoolFolderTranskripKolektif = pFolderTranskripKolektif.createFolder(payload.nama_sekolah);
      }
      var blobTranskripKolektif = Utilities.newBlob(Utilities.base64Decode(base64TranskripKolektif), payload.mimeType_transkrip_kolektif || "application/pdf", payload.nama_file_transkrip_kolektif);
      var fileTranskripKolektif = schoolFolderTranskripKolektif.createFile(blobTranskripKolektif);
      fileTranskripKolektif.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlTranskripKolektif = fileTranskripKolektif.getUrl();
      idTranskripKolektif = fileTranskripKolektif.getId();
    }

    var jmlL = parseInt(payload.jumlah_murid_l || 0);
    var jmlP = parseInt(payload.jumlah_murid_p || 0);
    var jmlTotal = jmlL + jmlP;

    if (isEdit) {
      var row = parseInt(payload.rowId);
      var currentStatus = String(sheet.getRange(row, 13).getValue()).trim();
      if (currentStatus.toLowerCase() === "disetujui" && payload.user_login !== "admin") {
        return JSON.stringify({ success: false, message: "Dokumen yang telah disetujui tidak dapat diedit." });
      }

      sheet.getRange(row, 3, 1, 4).setValues([[payload.tahun_ajaran, jmlL, jmlP, jmlTotal]]);
      sheet.getRange(row, 7, 1, 6).setValues([[
        payload.nama_file_ijazah || "", urlIjazah, idIjazah,
        payload.nama_file_transkrip || "", urlTranskrip, idTranskrip
      ]]);
      sheet.getRange(row, 22, 1, 3).setValues([[
        payload.nama_file_transkrip_kolektif || "", urlTranskripKolektif, idTranskripKolektif
      ]]);
      sheet.getRange(row, 13).setValue("Diproses");
      sheet.getRange(row, 17, 1, 2).setValues([[now, payload.user_login]]);
      // Reset read_by saat status kembali menjadi Diproses agar notifikasi Admin muncul kembali
      sheet.getRange(row, 21).setValue("");
    } else {
      var existingData = sheet.getDataRange().getDisplayValues();
      var targetNpsn = String(payload.npsn || "").trim();
      var targetTa = String(payload.tahun_ajaran || "").trim();
      
      for (var i = 1; i < existingData.length; i++) {
        var rowNpsn = String(existingData[i][0] || "").trim();
        var rowTa = String(existingData[i][2] || "").trim();
        if (!rowNpsn || !rowTa) continue; // Abaikan baris kosong
        if (rowNpsn === targetNpsn && rowTa === targetTa) {
          return JSON.stringify({ success: false, message: "Permohonan Cetak Ijazah untuk Tahun Ajaran " + payload.tahun_ajaran + " sudah ada." });
        }
      }

      sheet.appendRow([
        payload.npsn, payload.nama_sekolah, payload.tahun_ajaran,
        jmlL, jmlP, jmlTotal,
        payload.nama_file_ijazah || "", urlIjazah, idIjazah,
        payload.nama_file_transkrip || "", urlTranskrip, idTranskrip,
        "Diproses", "",
        now, payload.user_login, "", "", "", "", "",
        payload.nama_file_transkrip_kolektif || "", urlTranskripKolektif, idTranskripKolektif
      ]);
    }

    // Hapus cache notifikasi global agar badge Admin langsung muncul
    // Hapus cache notifikasi hanya modul Ijazah agar badge Admin langsung muncul
    try { invalidateNotifCacheForModule("ijazah", "admin", ""); } catch(ce) {}

    return JSON.stringify({ success: true, message: "Data Cetak Ijazah berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_hapusIjazah(rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    var row = parseInt(rowId);
    
    var fileIdIjazah = sheet.getRange(row, 9).getValue();
    var fileIdTranskrip = sheet.getRange(row, 12).getValue();

    if (fileIdIjazah) {
      try { DriveApp.getFileById(fileIdIjazah).setTrashed(true); } catch(err) {}
    }
    if (fileIdTranskrip) {
      try { DriveApp.getFileById(fileIdTranskrip).setTrashed(true); } catch(err) {}
    }

    sheet.deleteRow(row);
    return JSON.stringify({ success: true, message: "Data Cetak Ijazah berhasil dihapus." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_verifikasiIjazah(rowId, status, catatan, verifikator) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    var row = parseInt(rowId);
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    // Dapatkan catatan lama
    var oldCatatan = String(sheet.getRange(row, 14).getValue() || "").trim();
    var newCatatan = "";
    var dateLabel = now.split(" ")[0]; // Ambil dd-MM-yyyy saja
    
    if (catatan) {
      var entry = "[" + dateLabel + " Admin]: " + catatan;
      if (oldCatatan === "" || oldCatatan === "-") {
        newCatatan = entry;
      } else {
        newCatatan = entry + "\n--------------------------------------------------\n" + oldCatatan;
      }
    } else {
      newCatatan = oldCatatan;
    }

    sheet.getRange(row, 13).setValue(status);
    sheet.getRange(row, 14).setValue(newCatatan);
    sheet.getRange(row, 19, 1, 2).setValues([[now, verifikator]]);
    
    // Set read_by: tandai sebagai sudah dibaca oleh Admin
    // (verifikator adalah Admin/Korwil, sehingga badge sidebar Admin akan hilang)
    var currentReadBy = String(sheet.getRange(row, 21).getDisplayValue() || "").trim();
    var list = currentReadBy === "" ? [] : currentReadBy.split(",");
    
    var stLower = status.toLowerCase();
    if (stLower === "diproses" || stLower === "") {
      // Jika status dikembalikan ke Diproses, hapus "Admin" dari read_by agar Admin mendapatkan notifikasi lagi
      var idxAdmin = list.indexOf("Admin");
      if (idxAdmin > -1) {
        list.splice(idxAdmin, 1);
      }
    } else {
      // Jika diverifikasi (Disetujui, Dicetak, dll.), tandai sudah dibaca Admin
      if (list.indexOf("Admin") === -1) {
        list.push("Admin");
      }
      
      // Hapus "User" dari read_by jika status berubah dari diproses menjadi status verifikasi (Disetujui/Dicetak dll.) agar User mendapat notifikasi
      var idxUser = list.indexOf("User");
      if (idxUser > -1) {
        list.splice(idxUser, 1);
      }
    }
    sheet.getRange(row, 21).setValue(list.join(","));

    // Hapus cache notifikasi global agar badge sidebar langsung terupdate
    // Hapus cache notifikasi hanya modul Ijazah agar badge sidebar terupdate
    try { invalidateNotifCacheForModule("ijazah", verifikator, ""); } catch(ce) {}

    return JSON.stringify({ success: true, message: "Verifikasi Cetak Ijazah berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function admMurid_ajukanKoreksiIjazah(rowId, alasan, pengaju) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    var row = parseInt(rowId);
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    // Dapatkan catatan lama
    var oldCatatan = String(sheet.getRange(row, 14).getValue() || "").trim();
    var dateLabel = now.split(" ")[0]; // Ambil dd-MM-yyyy saja
    var entry = "[" + dateLabel + " Sekolah]: Mengajukan Koreksi - " + alasan;
    
    var newCatatan = "";
    if (oldCatatan === "" || oldCatatan === "-") {
      newCatatan = entry;
    } else {
      newCatatan = entry + "\n--------------------------------------------------\n" + oldCatatan;
    }

    sheet.getRange(row, 13).setValue("Pengajuan Koreksi");
    sheet.getRange(row, 14).setValue(newCatatan);
    sheet.getRange(row, 17, 1, 2).setValues([[now, pengaju]]);
    
    // Reset read_by Admin agar notifikasi baru langsung terkirim ke Admin
    var currentReadBy = String(sheet.getRange(row, 21).getDisplayValue() || "").trim();
    var list = currentReadBy === "" ? [] : currentReadBy.split(",");
    var idxAdmin = list.indexOf("Admin");
    if (idxAdmin > -1) {
      list.splice(idxAdmin, 1);
    }
    
    // User dianggap sudah membaca karena dialah pengaju perbaikan
    if (list.indexOf("User") === -1) {
      list.push("User");
    }
    
    sheet.getRange(row, 21).setValue(list.join(","));

    // Hapus cache notifikasi agar instan
    try { invalidateNotifCacheForModule("ijazah", "admin", ""); } catch(ce) {}

    return JSON.stringify({ success: true, message: "Permohonan koreksi data berhasil diajukan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}


/* ==========================================
   3. DASHBOARD REKAPITULASI ADMINISTRASI MURID
   ========================================== */

function admMurid_getDashboardData(npsnFilter, tahunFilter) {
  try {
    var shSpmb = getOrCreateSheetAdmMurid("Database_SPMB");
    var shIjazah = getOrCreateSheetAdmMurid("Database_Ijazah");
    var shArsip = getOrCreateSheetAdmMurid("Arsip_Ijazah");
    var shArsipTka = getOrCreateSheetAdmMurid("Arsip_TKA");
    
    var spmbData = shSpmb.getDataRange().getDisplayValues();
    var ijazahData = shIjazah.getDataRange().getDisplayValues();
    var arsipData = shArsip.getDataRange().getDisplayValues();
    var arsipTkaData = shArsipTka.getDataRange().getDisplayValues();
    
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var sekolahData = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    var targetTahun = String(tahunFilter || "").trim().toUpperCase();
    
    var listSekolah = [];
    var countSD = 0;
    
    for(var j=1; j<sekolahData.length; j++) {
      var rNpsn = String(sekolahData[j][0]).trim();
      var rJenjang = String(sekolahData[j][1]).trim().toUpperCase();
      var rNama = String(sekolahData[j][2]).trim();
      
      if (rJenjang === "SD") {
        countSD++;
        if (!targetNpsn || targetNpsn === "SEMUA" || rNpsn === targetNpsn || rNama.toUpperCase() === targetNpsn) {
          listSekolah.push({
            npsn: rNpsn,
            nama: rNama,
            kecamatan: sekolahData[j][4] || "-"
          });
        }
      }
    }
    
    var spmbStats = { total: 0, disetujui: 0, diproses: 0, revisi: 0, ditolak: 0, muridL: 0, muridP: 0, totalMurid: 0 };
    var ijazahStats = { total: 0, disetujui: 0, diproses: 0, revisi: 0, ditolak: 0, muridL: 0, muridP: 0, totalMurid: 0 };
    var schoolStatusMap = {};
    
    listSekolah.forEach(function(s) {
      schoolStatusMap[s.npsn] = {
        npsn: s.npsn,
        nama: s.nama,
        kecamatan: s.kecamatan,
        spmb: { status: "Belum Unggah", fileUrl: "", tglUpload: "", detail: null },
        ijazah: { status: "Belum Unggah", fileUrl: "", tglUpload: "", detail: null },
        arsip_ijazah: { status: "Belum Unggah", fileUrl: "", tglUpload: "", detail: null },
        arsip_tka: { status: "Belum Unggah", fileUrl: "", tglUpload: "", detail: null }
      };
    });
    
    for (var i = 1; i < spmbData.length; i++) {
      var npsn = String(spmbData[i][0] || "").trim();
      var thn = String(spmbData[i][2] || "").trim();
      var status = String(spmbData[i][18] || "Diproses").trim();
      
      if (targetTahun && targetTahun !== "SEMUA" && thn !== targetTahun) continue;
      
      if (schoolStatusMap[npsn]) {
        schoolStatusMap[npsn].spmb = {
          status: status,
          fileUrl: spmbData[i][16],
          tglUpload: spmbData[i][20],
          detail: {
            rombel: spmbData[i][3],
            muridL: parseInt(spmbData[i][12] || 0),
            muridP: parseInt(spmbData[i][13] || 0),
            total: parseInt(spmbData[i][14] || 0)
          }
        };
      }
    }
    
    for (var i = 1; i < ijazahData.length; i++) {
      var npsn = String(ijazahData[i][0] || "").trim();
      var thn = String(ijazahData[i][2] || "").trim();
      var status = String(ijazahData[i][12] || "Diproses").trim();
      
      if (targetTahun && targetTahun !== "SEMUA" && thn !== targetTahun) continue;
      
      if (schoolStatusMap[npsn]) {
        schoolStatusMap[npsn].ijazah = {
          status: status,
          fileUrl: ijazahData[i][7],
          fileUrlTranskrip: ijazahData[i][10],
          fileUrlTranskripKolektif: ijazahData[i][22],
          tglUpload: ijazahData[i][14],
          detail: {
            muridL: parseInt(ijazahData[i][3] || 0),
            muridP: parseInt(ijazahData[i][4] || 0),
            total: parseInt(ijazahData[i][5] || 0)
          }
        };
      }
    }

    for (var i = 1; i < arsipData.length; i++) {
      var npsn = String(arsipData[i][0] || "").trim();
      var thn = String(arsipData[i][2] || "").trim();
      var status = String(arsipData[i][12] || "Diproses").trim();
      
      if (targetTahun && targetTahun !== "SEMUA" && thn !== targetTahun) continue;
      
      if (schoolStatusMap[npsn]) {
        schoolStatusMap[npsn].arsip_ijazah = {
          status: status,
          fileUrl: arsipData[i][7],
          fileUrlTranskrip: arsipData[i][10],
          tglUpload: arsipData[i][14],
          detail: {
            muridL: parseInt(arsipData[i][3] || 0),
            muridP: parseInt(arsipData[i][4] || 0),
            total: parseInt(arsipData[i][5] || 0)
          }
        };
      }
    }

    for (var i = 1; i < arsipTkaData.length; i++) {
      var npsn = String(arsipTkaData[i][0] || "").trim();
      var thn = String(arsipTkaData[i][2] || "").trim();
      var status = String(arsipTkaData[i][9] || "Diproses").trim();
      
      if (targetTahun && targetTahun !== "SEMUA" && thn !== targetTahun) continue;
      
      if (schoolStatusMap[npsn]) {
        schoolStatusMap[npsn].arsip_tka = {
          status: status,
          fileUrl: arsipTkaData[i][7],
          tglUpload: arsipTkaData[i][11],
          detail: {
            muridL: parseInt(arsipTkaData[i][3] || 0),
            muridP: parseInt(arsipTkaData[i][4] || 0),
            total: parseInt(arsipTkaData[i][5] || 0)
          }
        };
      }
    }
    
    var spmbStats = { jumlahSekolah: listSekolah.length, sudahUnggah: 0, belumUnggah: 0, diproses: 0, disetujui: 0, revisi: 0, ditolak: 0, muridL: 0, muridP: 0, totalMurid: 0 };
    var ijazahStats = { jumlahSekolah: listSekolah.length, sudahUnggah: 0, belumUnggah: 0, diproses: 0, disetujui: 0, revisi: 0, ditolak: 0, muridL: 0, muridP: 0, totalMurid: 0 };
    var arsipStats = { jumlahSekolah: listSekolah.length, sudahUnggah: 0, belumUnggah: 0, diproses: 0, disetujui: 0, revisi: 0, ditolak: 0, muridL: 0, muridP: 0, totalMurid: 0 };
    var arsipTkaStats = { jumlahSekolah: listSekolah.length, sudahUnggah: 0, belumUnggah: 0, diproses: 0, disetujui: 0, revisi: 0, ditolak: 0, muridL: 0, muridP: 0, totalMurid: 0 };
    
    Object.keys(schoolStatusMap).forEach(function(npsn) {
      var school = schoolStatusMap[npsn];
      
      // SPMB Stats
      var spmb = school.spmb;
      if (spmb.status === "Belum Unggah") {
        spmbStats.belumUnggah++;
      } else {
        spmbStats.sudahUnggah++;
        var statKey = spmb.status.toLowerCase();
        if (statKey === "disetujui") spmbStats.disetujui++;
        else if (statKey === "diproses") spmbStats.diproses++;
        else if (statKey === "revisi") spmbStats.revisi++;
        else if (statKey === "ditolak") spmbStats.ditolak++;
        
        if (spmb.detail) {
          spmbStats.muridL += spmb.detail.muridL;
          spmbStats.muridP += spmb.detail.muridP;
          spmbStats.totalMurid += spmb.detail.total;
        }
      }
      
      // Ijazah Stats
      var ijazah = school.ijazah;
      if (ijazah.status === "Belum Unggah") {
        ijazahStats.belumUnggah++;
      } else {
        ijazahStats.sudahUnggah++;
        var statKey = ijazah.status.toLowerCase();
        if (statKey === "disetujui") ijazahStats.disetujui++;
        else if (statKey === "diproses" || statKey === "dicetak") ijazahStats.diproses++;
        else if (statKey === "revisi") ijazahStats.revisi++;
        else if (statKey === "ditolak") ijazahStats.ditolak++;
        
        if (ijazah.detail) {
          ijazahStats.muridL += ijazah.detail.muridL;
          ijazahStats.muridP += ijazah.detail.muridP;
          ijazahStats.totalMurid += ijazah.detail.total;
        }
      }

      // Arsip Stats
      var arsip = school.arsip_ijazah;
      if (arsip.status === "Belum Unggah") {
        arsipStats.belumUnggah++;
      } else {
        arsipStats.sudahUnggah++;
        var statKey = arsip.status.toLowerCase();
        if (statKey === "disetujui") arsipStats.disetujui++;
        else if (statKey === "diproses" || statKey === "dicetak") arsipStats.diproses++;
        else if (statKey === "revisi") arsipStats.revisi++;
        else if (statKey === "ditolak") arsipStats.ditolak++;
        
        if (arsip.detail) {
          arsipStats.muridL += arsip.detail.muridL;
          arsipStats.muridP += arsip.detail.muridP;
          arsipStats.totalMurid += arsip.detail.total;
        }
      }

      // Arsip TKA Stats
      var arsipTka = school.arsip_tka;
      if (arsipTka.status === "Belum Unggah") {
        arsipTkaStats.belumUnggah++;
      } else {
        arsipTkaStats.sudahUnggah++;
        var statKey = arsipTka.status.toLowerCase();
        if (statKey === "disetujui") arsipTkaStats.disetujui++;
        else if (statKey === "diproses" || statKey === "dicetak") arsipTkaStats.diproses++;
        else if (statKey === "revisi") arsipTkaStats.revisi++;
        else if (statKey === "ditolak") arsipTkaStats.ditolak++;
        
        if (arsipTka.detail) {
          arsipTkaStats.muridL += arsipTka.detail.muridL;
          arsipTkaStats.muridP += arsipTka.detail.muridP;
          arsipTkaStats.totalMurid += arsipTka.detail.total;
        }
      }
    });
    
    var finalSchoolList = Object.keys(schoolStatusMap).map(function(k) { return schoolStatusMap[k]; });
    
    return JSON.stringify({
      success: true,
      targetSD: countSD,
      spmbStats: spmbStats,
      ijazahStats: ijazahStats,
      arsipStats: arsipStats,
      arsipTkaStats: arsipTkaStats,
      detailSekolah: finalSchoolList
    });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/* ==========================================
   4. NOTIFIKASI MODUL (SPMB & IJAZAH)
   ========================================== */
function getNotifikasiSPMB(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;

    var sheet = getOrCreateSheetAdmMurid("Database_SPMB");
    if (!sheet) return { count: 0, recent: [] };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { count: 0, recent: [] };

    var data = sheet.getDataRange().getDisplayValues();

    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1;
      var status = String(data[i][18] || "Diproses").trim();
      var isDiproses = (status === "Diproses" || status === "");
      var isTarget = false;
      var rNama = String(data[i][1] || "").trim();

      if (isAdmin) {
        isTarget = isDiproses;
      } else {
        isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
      }

      if (isTarget) {
        var isRead = false;
        var readBy = String(data[i][26] || "").trim();
        var readByList = readBy === "" ? [] : readBy.split(",");
        if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
        if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;

        var stLower = status.toLowerCase();
        var isDisetujui = stLower.includes("ok") || stLower.includes("setuju") || stLower.includes("valid") || stLower.includes("selesai");

        if (isAdmin) {
          if (!isRead) unreadCount++;
        } else {
          if (!(isDisetujui && isRead)) {
            unreadCount++;
          }
        }

        if (!(!isAdmin && isDisetujui && isRead)) {
          notifList.push({
            rowId: rowNum,
            source: "SPMB",
            namaSd: rNama,
            kriteria: "Laporan SPMB " + data[i][2],
            status: status,
            waktu: (data[i][24] && !isDiproses) ? data[i][24] : data[i][20],
            isRead: isRead
          });
        }
      }
    }

    return {
      count: unreadCount,
      recent: notifList.slice(0, 5)
    };
  } catch (e) {
    Logger.log("Error getNotifikasiSPMB: " + e.message);
    return { count: 0, recent: [] };
  }
}

function getNotifikasiIjazah(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;

    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    if (!sheet) return { count: 0, recent: [] };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { count: 0, recent: [] };

    var data = sheet.getDataRange().getDisplayValues();

    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1;
      var status = String(data[i][12] || "Diproses").trim();
      var isDiproses = (status === "Diproses" || status === "");
      var isTarget = false;
      var rNama = String(data[i][1] || "").trim();

      var isKoreksi = status.toLowerCase().includes("koreksi");

      if (isAdmin) {
        isTarget = isDiproses || isKoreksi;
      } else {
        isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses && !isKoreksi);
      }

      if (isTarget) {
        var isRead = false;
        var readBy = String(data[i][20] || "").trim();
        var readByList = readBy === "" ? [] : readBy.split(",");
        if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
        if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;

        var stLower = status.toLowerCase();
        var isDisetujui = stLower.includes("ok") || stLower.includes("setuju") || stLower.includes("valid") || stLower.includes("selesai");

        if (isAdmin) {
          if (!isRead) {
            unreadCount++;
          }
        } else {
          if (!(isDisetujui && isRead)) {
            unreadCount++;
          }
        }

        if (!(!isAdmin && isDisetujui && isRead)) {
          notifList.push({
            rowId: rowNum,
            source: "Ijazah",
            namaSd: rNama,
            kriteria: "Cetak Ijazah " + data[i][2],
            status: status,
            waktu: (data[i][18] && !isDiproses) ? data[i][18] : data[i][14],
            isRead: isRead
          });
        }
      }
    }

    return {
      count: unreadCount,
      recent: notifList.slice(0, 5)
    };
  } catch (e) {
    Logger.log("Error getNotifikasiIjazah: " + e.message);
    return { count: 0, recent: [] };
  }
}

function admMurid_tandaiNotifSpmbDibaca(rowId, role) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_SPMB");
    var rIdx = parseInt(rowId);
    if (isNaN(rIdx)) return false;

    var currentReadBy = String(sheet.getRange(rIdx, 27).getDisplayValue() || "").trim();
    var readMark = (role === "Admin") ? "Admin" : "User";

    if (currentReadBy === "") {
      sheet.getRange(rIdx, 27).setValue(readMark);
    } else {
      var list = currentReadBy.split(",");
      if (list.indexOf(readMark) === -1) {
        list.push(readMark);
        sheet.getRange(rIdx, 27).setValue(list.join(","));
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function admMurid_tandaiNotifIjazahDibaca(rowId, role) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    var rIdx = parseInt(rowId);
    if (isNaN(rIdx)) return false;

    var currentReadBy = String(sheet.getRange(rIdx, 21).getDisplayValue() || "").trim();
    var readMark = (role === "Admin") ? "Admin" : "User";

    if (currentReadBy === "") {
      sheet.getRange(rIdx, 21).setValue(readMark);
    } else {
      var list = currentReadBy.split(",");
      if (list.indexOf(readMark) === -1) {
        list.push(readMark);
        sheet.getRange(rIdx, 21).setValue(list.join(","));
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function admMurid_tandaiSemuaNotifSpmbDibaca(role, unit) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_SPMB");
    var data = sheet.getDataRange().getDisplayValues();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var readMark = isAdmin ? "Admin" : "User";

    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][18] || "Diproses").trim();
      var isDiproses = (status === "Diproses" || status === "");
      var isTarget = false;
      var rNama = String(data[i][1] || "").trim();

      if (isAdmin) {
        isTarget = isDiproses;
      } else {
        isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
      }

      if (isTarget) {
        var currentReadBy = String(data[i][26] || "").trim();
        var list = currentReadBy === "" ? [] : currentReadBy.split(",");
        if (list.indexOf(readMark) === -1) {
          list.push(readMark);
          sheet.getRange(i + 1, 27).setValue(list.join(","));
        }
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function admMurid_tandaiSemuaNotifIjazahDibaca(role, unit) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Database_Ijazah");
    var data = sheet.getDataRange().getDisplayValues();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var readMark = isAdmin ? "Admin" : "User";

    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][12] || "Diproses").trim();
      var isDiproses = (status === "Diproses" || status === "");
      var isTarget = false;
      var rNama = String(data[i][1] || "").trim();

      if (isAdmin) {
        isTarget = isDiproses;
      } else {
        isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
      }

      if (isTarget) {
        var currentReadBy = String(data[i][20] || "").trim();
        var list = currentReadBy === "" ? [] : currentReadBy.split(",");
        if (list.indexOf(readMark) === -1) {
          list.push(readMark);
          sheet.getRange(i + 1, 21).setValue(list.join(","));
        }
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}


/* ==========================================
   5. CRUD: ARSIP IJAZAH (SCAN FISIK)
   ========================================== */

function admMurid_getArsipIjazahData(npsnFilter) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Arsip_Ijazah");
    var values = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();

    for (var i = 1; i < values.length; i++) {
      var rNpsn = String(values[i][0]).trim();
      var rNama = String(values[i][1]).trim();
      if (!rNpsn) continue;

      if (!targetNpsn || targetNpsn === "SEMUA" || String(rNpsn).trim() === targetNpsn || rNama.toUpperCase() === targetNpsn) {
        result.push({
          rowId: i + 1,
          npsn: values[i][0],
          nama_sekolah: values[i][1],
          tahun_ajaran: values[i][2],
          jumlah_murid_l: values[i][3],
          jumlah_murid_p: values[i][4],
          jumlah_total: values[i][5],
          nama_file_ijazah: values[i][6],
          url_file_ijazah: values[i][7],
          id_file_ijazah: values[i][8],
          nama_file_transkrip: values[i][9],
          url_file_transkrip: values[i][10],
          id_file_transkrip: values[i][11],
          status: values[i][12],
          catatan: values[i][13],
          tgl_upload: values[i][14],
          uploader: values[i][15],
          tgl_edit: values[i][16],
          user_edit: values[i][17],
          read_by: values[i][18] || ""
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/**
 * Mengambil atau membuat subfolder berdasarkan Tahun Ajaran di dalam folder induk Arsip.
 * Nama folder: "TA 2025-2026" (tanda "/" diganti "-" agar valid sebagai nama folder Drive).
 * @param {string} parentFolderId ID folder induk (ARSIP_IJAZAH_DOCS atau ARSIP_TRANSKRIP_DOCS)
 * @param {string} tahunAjaran Tahun ajaran, misal "2025/2026"
 * @return {Folder} Folder Google Drive untuk tahun ajaran tersebut
 */
function getOrCreateArsipSubFolder(parentFolderId, tahunAjaran) {
  var parent = DriveApp.getFolderById(parentFolderId);
  // Nama subfolder: "TA 2025-2026"
  var folderName = "TA " + String(tahunAjaran).replace(/\//g, "-");
  var existing = parent.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parent.createFolder(folderName);
}

function admMurid_simpanArsipIjazah(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Arsip_Ijazah");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    var isEdit = payload.rowId ? true : false;
    var urlIjazah = payload.url_file_ijazah || "";
    var idIjazah = payload.id_file_ijazah || "";
    var urlTranskrip = payload.url_file_transkrip || "";
    var idTranskrip = payload.id_file_transkrip || "";

    // Unggah Scan Ijazah ke subfolder tahun ajaran
    if (payload.fileIjazahBase64) {
      if (isEdit && idIjazah) {
        try { DriveApp.getFileById(idIjazah).setTrashed(true); } catch(err) {}
      }
      var subFolderIjazah = getOrCreateArsipSubFolder(FOLDER_CONFIG.ARSIP_IJAZAH_DOCS, payload.tahun_ajaran);
      var blobIjazah = Utilities.newBlob(Utilities.base64Decode(payload.fileIjazahBase64), payload.mimeType_ijazah || "application/pdf", payload.nama_file_ijazah);
      var fileIjazah = subFolderIjazah.createFile(blobIjazah);
      fileIjazah.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlIjazah = fileIjazah.getUrl();
      idIjazah = fileIjazah.getId();
    }

    // Unggah Scan Transkrip ke subfolder tahun ajaran
    if (payload.fileTranskripBase64) {
      if (isEdit && idTranskrip) {
        try { DriveApp.getFileById(idTranskrip).setTrashed(true); } catch(err) {}
      }
      var subFolderTranskrip = getOrCreateArsipSubFolder(FOLDER_CONFIG.ARSIP_TRANSKRIP_DOCS, payload.tahun_ajaran);
      var blobTranskrip = Utilities.newBlob(Utilities.base64Decode(payload.fileTranskripBase64), payload.mimeType_transkrip || "application/pdf", payload.nama_file_transkrip);
      var fileTranskrip = subFolderTranskrip.createFile(blobTranskrip);
      fileTranskrip.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlTranskrip = fileTranskrip.getUrl();
      idTranskrip = fileTranskrip.getId();
    }

    var jmlL = parseInt(payload.jumlah_murid_l || 0);
    var jmlP = parseInt(payload.jumlah_murid_p || 0);
    var jmlTotal = jmlL + jmlP;

    if (isEdit) {
      var row = parseInt(payload.rowId);
      var currentStatus = String(sheet.getRange(row, 13).getValue()).trim();
      if (currentStatus.toLowerCase() === "disetujui" && (payload.user_login || "").toLowerCase() !== "admin") {
        return JSON.stringify({ success: false, message: "Arsip yang telah disetujui tidak dapat diedit." });
      }
      sheet.getRange(row, 3, 1, 4).setValues([[payload.tahun_ajaran, jmlL, jmlP, jmlTotal]]);
      sheet.getRange(row, 7, 1, 6).setValues([[payload.nama_file_ijazah || "", urlIjazah, idIjazah, payload.nama_file_transkrip || "", urlTranskrip, idTranskrip]]);
      sheet.getRange(row, 13).setValue("Diproses");
      sheet.getRange(row, 17, 1, 2).setValues([[now, payload.user_login]]);
    } else {
      // Cek duplikat
      var existingData = sheet.getDataRange().getDisplayValues();
      var targetNpsn = String(payload.npsn || "").trim();
      var targetTa = String(payload.tahun_ajaran || "").trim();
      for (var i = 1; i < existingData.length; i++) {
        var rowNpsn = String(existingData[i][0] || "").trim();
        var rowTa = String(existingData[i][2] || "").trim();
        if (!rowNpsn || !rowTa) continue;
        if (rowNpsn === targetNpsn && rowTa === targetTa) {
          return JSON.stringify({ success: false, message: "Arsip Ijazah untuk Tahun Ajaran " + payload.tahun_ajaran + " sudah ada." });
        }
      }
      sheet.appendRow([
        payload.npsn, payload.nama_sekolah, payload.tahun_ajaran,
        jmlL, jmlP, jmlTotal,
        payload.nama_file_ijazah || "", urlIjazah, idIjazah,
        payload.nama_file_transkrip || "", urlTranskrip, idTranskrip,
        "Diproses", "",
        now, payload.user_login, "", "", ""
      ]);
    }

    try { invalidateNotifCacheForModule("arsip_ijazah", "admin", ""); } catch(ce) {}
    return JSON.stringify({ success: true, message: "Arsip Ijazah berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_hapusArsipIjazah(rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Arsip_Ijazah");
    var row = parseInt(rowId);
    var idIjazah = sheet.getRange(row, 9).getValue();
    var idTranskrip = sheet.getRange(row, 12).getValue();

    if (idIjazah) {
      try { DriveApp.getFileById(idIjazah).setTrashed(true); } catch(err) {}
    }
    if (idTranskrip) {
      try { DriveApp.getFileById(idTranskrip).setTrashed(true); } catch(err) {}
    }
    sheet.deleteRow(row);
    try { invalidateNotifCacheForModule("arsip_ijazah", "admin", ""); } catch(ce) {}
    return JSON.stringify({ success: true, message: "Arsip Ijazah berhasil dihapus." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_verifikasiArsipIjazah(rowId, status, catatan, verifikator) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Arsip_Ijazah");
    var row = parseInt(rowId);

    // Kolom 13=Status, 14=Catatan
    sheet.getRange(row, 13, 1, 2).setValues([[status, catatan]]);

    // Tandai Read_by Admin (kolom 19)
    var currentReadBy = String(sheet.getRange(row, 19).getDisplayValue() || "").trim();
    var list = currentReadBy === "" ? [] : currentReadBy.split(",");
    if (list.indexOf("Admin") === -1) {
      list.push("Admin");
      sheet.getRange(row, 19).setValue(list.join(","));
    }

    try { invalidateNotifCacheForModule("arsip_ijazah", verifikator, ""); } catch(ce) {}
    return JSON.stringify({ success: true, message: "Verifikasi Arsip Ijazah berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function getNotifikasiArsipIjazah(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;

    var sheet = getOrCreateSheetAdmMurid("Arsip_Ijazah");
    if (!sheet) return { count: 0, recent: [] };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { count: 0, recent: [] };

    var data = sheet.getDataRange().getDisplayValues();

    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1;
      var status = String(data[i][12] || "Diproses").trim();
      var isDiproses = (status === "Diproses" || status === "");
      var isTarget = false;
      var rNama = String(data[i][1] || "").trim();

      if (isAdmin) {
        isTarget = isDiproses;
      } else {
        isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
      }

      if (isTarget) {
        var isRead = false;
        var readBy = String(data[i][18] || "").trim();
        var readByList = readBy === "" ? [] : readBy.split(",");
        if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
        if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;

        var stLower = status.toLowerCase();
        var isDisetujui = stLower.includes("ok") || stLower.includes("setuju") || stLower.includes("valid") || stLower.includes("selesai");

        if (isAdmin) {
          if (!isRead) unreadCount++;
        } else {
          if (!(isDisetujui && isRead)) unreadCount++;
        }

        if (!(!isAdmin && isDisetujui && isRead)) {
          notifList.push({
            rowId: rowNum,
            source: "ArsipIjazah",
            namaSd: rNama,
            kriteria: "Arsip Ijazah " + data[i][2],
            status: status,
            waktu: data[i][14],
            isRead: isRead
          });
        }
      }
    }

    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) {
    Logger.log("Error getNotifikasiArsipIjazah: " + e.message);
    return { count: 0, recent: [] };
  }
}

function admMurid_tandaiNotifArsipIjazahDibaca(rowId, role) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Arsip_Ijazah");
    var rIdx = parseInt(rowId);
    if (isNaN(rIdx)) return false;

    var currentReadBy = String(sheet.getRange(rIdx, 19).getDisplayValue() || "").trim();
    var readMark = (role === "Admin") ? "Admin" : "User";

    if (currentReadBy === "") {
      sheet.getRange(rIdx, 19).setValue(readMark);
    } else {
      var list = currentReadBy.split(",");
      if (list.indexOf(readMark) === -1) {
        list.push(readMark);
        sheet.getRange(rIdx, 19).setValue(list.join(","));
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

function admMurid_getArsipTkaData(npsnFilter) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Arsip_TKA");
    var values = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();

    for (var i = 1; i < values.length; i++) {
      var rNpsn = String(values[i][0]).trim();
      var rNama = String(values[i][1]).trim();
      if (!rNpsn) continue;

      if (!targetNpsn || targetNpsn === "SEMUA" || String(rNpsn).trim() === targetNpsn || rNama.toUpperCase() === targetNpsn) {
        result.push({
          rowId: i + 1,
          npsn: values[i][0],
          nama_sekolah: values[i][1],
          tahun_ajaran: values[i][2],
          jumlah_murid_l: values[i][3],
          jumlah_murid_p: values[i][4],
          jumlah_total: values[i][5],
          nama_file: values[i][6],
          url_file: values[i][7],
          id_file: values[i][8],
          status: values[i][9],
          catatan: values[i][10],
          tgl_upload: values[i][11],
          uploader: values[i][12],
          tgl_edit: values[i][13],
          user_edit: values[i][14],
          read_by: values[i][15] || ""
        });
      }
    }
    return JSON.stringify({ success: true, data: result });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function admMurid_simpanArsipTka(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Arsip_TKA");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    var isEdit = payload.rowId ? true : false;
    var urlFile = payload.url_file || "";
    var idFile = payload.id_file || "";

    // Unggah Scan TKA ke subfolder tahun ajaran
    if (payload.fileBase64) {
      if (isEdit && idFile) {
        try { DriveApp.getFileById(idFile).setTrashed(true); } catch(err) {}
      }
      var subFolder = getOrCreateArsipSubFolder(FOLDER_CONFIG.ARSIP_TKA_DOCS, payload.tahun_ajaran);
      var blob = Utilities.newBlob(Utilities.base64Decode(payload.fileBase64), payload.mimeType || "application/pdf", payload.nama_file);
      var file = subFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlFile = file.getUrl();
      idFile = file.getId();
    }

    var jmlL = parseInt(payload.jumlah_murid_l || 0);
    var jmlP = parseInt(payload.jumlah_murid_p || 0);
    var jmlTotal = jmlL + jmlP;

    if (isEdit) {
      var row = parseInt(payload.rowId);
      var currentStatus = String(sheet.getRange(row, 10).getValue()).trim();
      if (currentStatus.toLowerCase() === "disetujui" && (payload.user_login || "").toLowerCase() !== "admin") {
        return JSON.stringify({ success: false, message: "Arsip yang telah disetujui tidak dapat diedit." });
      }
      sheet.getRange(row, 3, 1, 4).setValues([[payload.tahun_ajaran, jmlL, jmlP, jmlTotal]]);
      sheet.getRange(row, 7, 1, 3).setValues([[payload.nama_file || "", urlFile, idFile]]);
      sheet.getRange(row, 10).setValue("Diproses");
      sheet.getRange(row, 14, 1, 2).setValues([[now, payload.user_login]]);
    } else {
      // Cek duplikat
      var existingData = sheet.getDataRange().getDisplayValues();
      var targetNpsn = String(payload.npsn || "").trim();
      var targetTa = String(payload.tahun_ajaran || "").trim();
      for (var i = 1; i < existingData.length; i++) {
        var rowNpsn = String(existingData[i][0] || "").trim();
        var rowTa = String(existingData[i][2] || "").trim();
        if (!rowNpsn || !rowTa) continue;
        if (rowNpsn === targetNpsn && rowTa === targetTa) {
          return JSON.stringify({ success: false, message: "Arsip TKA untuk Tahun Ajaran " + payload.tahun_ajaran + " sudah ada." });
        }
      }
      sheet.appendRow([
        payload.npsn, payload.nama_sekolah, payload.tahun_ajaran,
        jmlL, jmlP, jmlTotal,
        payload.nama_file || "", urlFile, idFile,
        "Diproses", "",
        now, payload.user_login, "", "", ""
      ]);
    }

    try { invalidateNotifCacheForModule("arsip_tka", "admin", ""); } catch(ce) {}
    return JSON.stringify({ success: true, message: "Arsip TKA berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_hapusArsipTka(rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetAdmMurid("Arsip_TKA");
    var row = parseInt(rowId);
    var idFile = sheet.getRange(row, 9).getValue();

    if (idFile) {
      try { DriveApp.getFileById(idFile).setTrashed(true); } catch(err) {}
    }
    sheet.deleteRow(row);
    try { invalidateNotifCacheForModule("arsip_tka", "admin", ""); } catch(ce) {}
    return JSON.stringify({ success: true, message: "Arsip TKA berhasil dihapus." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally {
    lock.releaseLock();
  }
}

function admMurid_verifikasiArsipTka(rowId, status, catatan, verifikator) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Arsip_TKA");
    var row = parseInt(rowId);

    // Kolom 10=Status, 11=Catatan
    sheet.getRange(row, 10, 1, 2).setValues([[status, catatan]]);

    // Tandai Read_by Admin (kolom 16)
    var currentReadBy = String(sheet.getRange(row, 16).getDisplayValue() || "").trim();
    var list = currentReadBy === "" ? [] : currentReadBy.split(",");
    if (list.indexOf("Admin") === -1) {
      list.push("Admin");
      sheet.getRange(row, 16).setValue(list.join(","));
    }

    try { invalidateNotifCacheForModule("arsip_tka", verifikator, ""); } catch(ce) {}
    return JSON.stringify({ success: true, message: "Verifikasi Arsip TKA berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function getNotifikasiArsipTka(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;

    var sheet = getOrCreateSheetAdmMurid("Arsip_TKA");
    if (!sheet) return { count: 0, recent: [] };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { count: 0, recent: [] };

    var data = sheet.getDataRange().getDisplayValues();

    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1;
      var status = String(data[i][9] || "Diproses").trim();
      var isDiproses = (status === "Diproses" || status === "");
      var isTarget = false;
      var rNama = String(data[i][1] || "").trim();

      if (isAdmin) {
        isTarget = isDiproses;
      } else {
        isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
      }

      if (isTarget) {
        var isRead = false;
        var readBy = String(data[i][15] || "").trim();
        var readByList = readBy === "" ? [] : readBy.split(",");
        if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
        if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;

        var stLower = status.toLowerCase();
        var isDisetujui = stLower.includes("ok") || stLower.includes("setuju") || stLower.includes("valid") || stLower.includes("selesai");

        if (isAdmin) {
          if (!isRead) unreadCount++;
        } else {
          if (!(isDisetujui && isRead)) unreadCount++;
        }

        if (!(!isAdmin && isDisetujui && isRead)) {
          notifList.push({
            rowId: rowNum,
            source: "ArsipTKA",
            namaSd: rNama,
            kriteria: "Arsip TKA " + data[i][2],
            status: status,
            waktu: data[i][11],
            isRead: isRead
          });
        }
      }
    }

    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) {
    Logger.log("Error getNotifikasiArsipTka: " + e.message);
    return { count: 0, recent: [] };
  }
}

function admMurid_tandaiNotifArsipTKADibaca(rowId, role) {
  try {
    var sheet = getOrCreateSheetAdmMurid("Arsip_TKA");
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
