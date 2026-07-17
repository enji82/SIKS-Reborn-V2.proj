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
      sheet.getRange(1, 1, 1, 21).setValues([[
        "NPSN", "Nama_Sekolah", "Tahun_Ajaran", 
        "Jumlah_Murid_L", "Jumlah_Murid_P", "Jumlah_Total", 
        "Nama_File_Ijazah", "URL_File_Ijazah", "ID_File_Ijazah", 
        "Nama_File_Transkrip", "URL_File_Transkrip", "ID_File_Transkrip", 
        "Status", "Catatan", "Tgl_Upload", "Uploader", "Tgl_Edit", "User_Edit", "Tgl_Verif", "Verifikator", "Read_by"
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

      if (!targetNpsn || targetNpsn === "SEMUA" || rNpsn === targetNpsn || rNama.toUpperCase() === targetNpsn) {
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
    
    // Set read_by dinas/admin
    sheet.getRange(row, 27).setValue(verifikator);

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

      if (!targetNpsn || targetNpsn === "SEMUA" || rNpsn === targetNpsn || rNama.toUpperCase() === targetNpsn) {
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
          read_by: values[i][20] || ""
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

    // Unggah PDF Ijazah
    if (payload.fileBase64_ijazah) {
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
      var blobIjazah = Utilities.newBlob(Utilities.base64Decode(payload.fileBase64_ijazah), payload.mimeType_ijazah, payload.nama_file_ijazah);
      var fileIjazah = schoolFolderIjazah.createFile(blobIjazah);
      fileIjazah.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlIjazah = fileIjazah.getUrl();
      idIjazah = fileIjazah.getId();
    }

    // Unggah PDF Transkrip
    if (payload.fileBase64_transkrip) {
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
      var blobTranskrip = Utilities.newBlob(Utilities.base64Decode(payload.fileBase64_transkrip), payload.mimeType_transkrip, payload.nama_file_transkrip);
      var fileTranskrip = schoolFolderTranskrip.createFile(blobTranskrip);
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
      if (currentStatus.toLowerCase() === "disetujui" && payload.user_login !== "admin") {
        return JSON.stringify({ success: false, message: "Dokumen yang telah disetujui tidak dapat diedit." });
      }

      sheet.getRange(row, 3, 1, 4).setValues([[payload.tahun_ajaran, jmlL, jmlP, jmlTotal]]);
      sheet.getRange(row, 7, 1, 6).setValues([[
        payload.nama_file_ijazah || "", urlIjazah, idIjazah,
        payload.nama_file_transkrip || "", urlTranskrip, idTranskrip
      ]]);
      sheet.getRange(row, 13).setValue("Diproses");
      sheet.getRange(row, 17, 1, 2).setValues([[now, payload.user_login]]);
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
        now, payload.user_login, "", "", "", "", ""
      ]);
    }

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

    sheet.getRange(row, 13, 1, 2).setValues([[status, catatan]]);
    sheet.getRange(row, 19, 1, 2).setValues([[now, verifikator]]);
    
    // Set read_by
    sheet.getRange(row, 21).setValue(verifikator);

    return JSON.stringify({ success: true, message: "Verifikasi Cetak Ijazah berhasil disimpan." });
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
    
    var spmbData = shSpmb.getDataRange().getDisplayValues();
    var ijazahData = shIjazah.getDataRange().getDisplayValues();
    
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
        ijazah: { status: "Belum Unggah", fileUrl: "", tglUpload: "", detail: null }
      };
    });
    
    for (var i = 1; i < spmbData.length; i++) {
      var npsn = spmbData[i][0];
      var thn = spmbData[i][2];
      var status = spmbData[i][18];
      
      if (targetTahun && targetTahun !== "SEMUA" && thn !== targetTahun) continue;
      
      if (schoolStatusMap[npsn]) {
        schoolStatusMap[npsn].spmb = {
          status: status,
          fileUrl: spmbData[i][16],
          tglUpload: spmbData[i][20],
          detail: {
            rombel: spmbData[i][3],
            muridL: spmbData[i][12],
            muridP: spmbData[i][13],
            total: spmbData[i][14]
          }
        };
        
        spmbStats.total++;
        var statKey = status.toLowerCase();
        if (statKey === "disetujui") {
          spmbStats.disetujui++;
          spmbStats.muridL += parseInt(spmbData[i][12] || 0);
          spmbStats.muridP += parseInt(spmbData[i][13] || 0);
          spmbStats.totalMurid += parseInt(spmbData[i][14] || 0);
        }
        else if (statKey === "diproses") spmbStats.diproses++;
        else if (statKey === "revisi") spmbStats.revisi++;
        else if (statKey === "ditolak") spmbStats.ditolak++;
      }
    }
    
    for (var i = 1; i < ijazahData.length; i++) {
      var npsn = ijazahData[i][0];
      var thn = ijazahData[i][2];
      var status = ijazahData[i][12];
      
      if (targetTahun && targetTahun !== "SEMUA" && thn !== targetTahun) continue;
      
      if (schoolStatusMap[npsn]) {
        schoolStatusMap[npsn].ijazah = {
          status: status,
          fileUrl: ijazahData[i][7], // Link Ijazah
          fileUrlTranskrip: ijazahData[i][10], // Link Transkrip
          tglUpload: ijazahData[i][14],
          detail: {
            muridL: ijazahData[i][3],
            muridP: ijazahData[i][4],
            total: ijazahData[i][5]
          }
        };
        
        ijazahStats.total++;
        var statKey = status.toLowerCase();
        if (statKey === "disetujui") {
          ijazahStats.disetujui++;
          ijazahStats.muridL += parseInt(ijazahData[i][3] || 0);
          ijazahStats.muridP += parseInt(ijazahData[i][4] || 0);
          ijazahStats.totalMurid += parseInt(ijazahData[i][5] || 0);
        }
        else if (statKey === "diproses") ijazahStats.diproses++;
        else if (statKey === "revisi") ijazahStats.revisi++;
        else if (statKey === "ditolak") ijazahStats.ditolak++;
      }
    }
    
    var finalSchoolList = Object.keys(schoolStatusMap).map(function(k) { return schoolStatusMap[k]; });
    
    return JSON.stringify({
      success: true,
      targetSD: countSD,
      spmbStats: spmbStats,
      ijazahStats: ijazahStats,
      detailSekolah: finalSchoolList
    });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
