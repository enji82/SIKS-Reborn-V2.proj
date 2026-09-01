/* ======================================================================
   MODUL: PPPK PW — PERJANJIAN KERJA PARUH WAKTU
   DB Key    : PPPK_PW_DB   (Spreadsheet: 1uIcRgqDbozFoI6_Lf24Ijlq0QbrQFwmcLTMYRzqTNrg)
   Folder PK : PPPK_PW_DOCS (Drive: 1u5tjw-muhroXrPGwlDyQvPmzAhviRpYT) — dikelompokkan per Tahun
   Folder EM : PPPK_PW_EMETERAI (Drive: 1rstky-J_TSuRiEbDWnHBUBFKei1qvlEy)

   Sumber Data Pegawai dari Sheet "Master Data GTK" (PTK_DB):
     - Unit Kerja : Kolom C (Index 2)
     - Nama       : Kolom E (Index 4)
     - NIP        : Kolom H (Index 7)
     - Status Peg : Kolom T (Index 19) — filter PPPK Paruh Waktu / PPPK PW
     - Jabatan    : Kolom Z (Index 25)

   Header Penyimpanan Sheet (PPPK_PW_DB):
     [ID, Unit_Kerja, Nama_Pegawai, NIP, Jabatan, Tahun, Nama_File, URL_File,
      Status, Catatan, Tgl_Unggah, Pengunggah, Tgl_Diubah, Pengubah,
      Tgl_Verifikasi, Verifikator, Read_By]
   ====================================================================== */

const KONFIG_PPPK_PW = {
  DB_KEY: "PPPK_PW_DB",
  get FOLDER_DOCS_ID() { return FOLDER_CONFIG.PPPK_PW_DOCS; },
  get FOLDER_EMETERAI_ID() { return FOLDER_CONFIG.PPPK_PW_EMETERAI; },
  SHEET_HEADER: ["ID", "Unit_Kerja", "Nama_Pegawai", "NIP", "Jabatan", "Tahun", "Nama_File",
                 "URL_File", "Status", "Catatan", "Tgl_Unggah", "Pengunggah",
                 "Tgl_Diubah", "Pengubah", "Tgl_Verifikasi", "Verifikator", "Read_By"],
  STATUS_PPPK_PW: ["PPPK PARUH WAKTU", "PPPK PW", "PPPKPW"]
};

/* -----------------------------------------------------------------------
   HELPER INTERNAL
   ----------------------------------------------------------------------- */

function pppkpw_getOrCreateSheet(tahun) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.PPPK_PW_DB);
  var sheetName = tahun || "Data";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(KONFIG_PPPK_PW.SHEET_HEADER);
    sheet.getRange(1, 1, 1, KONFIG_PPPK_PW.SHEET_HEADER.length).setFontWeight("bold");
  } else {
    // Sinkronisasi header jika kolom Jabatan / Read_By belum ada di sheet existing
    var headerCur = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    if (headerCur.indexOf("Jabatan") === -1 || headerCur.indexOf("Read_By") === -1) {
      sheet.getRange(1, 1, 1, KONFIG_PPPK_PW.SHEET_HEADER.length).setValues([KONFIG_PPPK_PW.SHEET_HEADER]).setFontWeight("bold");
    }
  }
  return sheet;
}

function pppkpw_getOrCreateYearFolder(tahun) {
  var root = DriveApp.getFolderById(KONFIG_PPPK_PW.FOLDER_DOCS_ID);
  var folderName = String(tahun || "Lainnya").replace(/\//g, "-");
  var iter = root.getFoldersByName(folderName);
  return iter.hasNext() ? iter.next() : root.createFolder(folderName);
}

function pppkpw_genId() {
  return "PW" + new Date().getTime() + Math.floor(Math.random() * 1000);
}

function pppkpw_getAvailableTahun() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.PPPK_PW_DB);
    return ss.getSheets().map(function(s) { return s.getName(); });
  } catch(e) { return []; }
}

function pppkpw_isPppkPw(statusRaw) {
  var s = String(statusRaw || "").trim().toUpperCase().replace(/\s+/g, " ");
  return s === "PPPK PARUH WAKTU" || s === "PPPK PW" || s === "PPPKPW" || s.indexOf("PARUH") !== -1;
}

/* -----------------------------------------------------------------------
   1. DATA INISIALISASI — Unit, Pegawai, NIP, Jabatan
   ----------------------------------------------------------------------- */

function pppkpw_getInitData(unitFilter) {
  try {
    var unitList = [];
    var pegawaiMap = {};
    var sheet = getSheet("PTK_DB", "Master Data GTK");
    if (sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        // Ambil sampai kolom Z (26 kolom): C=2, E=4, H=7, T=19, Z=25
        var data = sheet.getRange(2, 1, lastRow - 1, 26).getDisplayValues();
        data.forEach(function(row) {
          if (!row[0]) return;
          if (!pppkpw_isPppkPw(row[19])) return; // Kolom T
          var unit    = String(row[2] || "").trim(); // Kolom C
          var nama    = String(row[4] || "").trim(); // Kolom E
          var nip     = String(row[7] || "").trim(); // Kolom H
          var jabatan = String(row[25] || "").trim(); // Kolom Z
          if (!unit || !nama) return;

          var targetUnit = String(unitFilter || "").trim().toUpperCase();
          if (targetUnit && targetUnit !== "SEMUA" && unit.toUpperCase() !== targetUnit) return;

          if (unitList.indexOf(unit) === -1) unitList.push(unit);
          if (!pegawaiMap[unit]) pegawaiMap[unit] = [];
          pegawaiMap[unit].push({ nama: nama, nip: nip, jabatan: jabatan });
        });
      }
    }
    unitList.sort();
    Object.keys(pegawaiMap).forEach(function(u) {
      pegawaiMap[u].sort(function(a, b) { return a.nama.localeCompare(b.nama); });
    });
    var tahunList = pppkpw_getAvailableTahun();
    return JSON.stringify({ success: true, unitList: unitList, pegawaiMap: pegawaiMap, tahunList: tahunList });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function pppkpw_getDaftarPegawai(unitKerja) {
  try {
    var result = [];
    var sheet = getSheet("PTK_DB", "Master Data GTK");
    if (!sheet) return JSON.stringify({ success: true, data: [] });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ success: true, data: [] });
    var data = sheet.getRange(2, 1, lastRow - 1, 26).getDisplayValues();
    var targetUnit = String(unitKerja || "").trim().toUpperCase();
    data.forEach(function(row) {
      if (!row[0]) return;
      if (!pppkpw_isPppkPw(row[19])) return; // Kolom T
      var unit    = String(row[2] || "").trim(); // Kolom C
      if (unit.toUpperCase() !== targetUnit) return;
      var nama    = String(row[4] || "").trim(); // Kolom E
      var nip     = String(row[7] || "").trim(); // Kolom H
      var jabatan = String(row[25] || "").trim(); // Kolom Z
      if (!nama) return;
      result.push({ nama: nama, nip: nip, jabatan: jabatan });
    });
    result.sort(function(a, b) { return a.nama.localeCompare(b.nama); });
    return JSON.stringify({ success: true, data: result });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/* -----------------------------------------------------------------------
   2. GET DATA — Daftar Berkas
   ----------------------------------------------------------------------- */

function pppkpw_getData(unitFilter, tahun) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.PPPK_PW_DB);
    var sheets = ss.getSheets();
    var result = [];
    var targetUnit = String(unitFilter || "").trim().toUpperCase();
    var targetTahun = String(tahun || "").trim();

    sheets.forEach(function(sheet) {
      var sheetName = sheet.getName();
      if (targetTahun && targetTahun !== "SEMUA" && sheetName !== targetTahun) return;
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      var data = sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        var rUnit = String(data[i][1] || "").trim().toUpperCase();
        if (targetUnit && targetUnit !== "SEMUA" && rUnit !== targetUnit) continue;
        result.push({
          rowId: i + 1, sheetName: sheetName,
          id: data[i][0],
          unit_kerja:   data[i][1],
          nama_pegawai: data[i][2],
          nip:          data[i][3],
          jabatan:      data[i][4] || "-",
          tahun:        data[i][5],
          nama_file:    data[i][6],
          url_file:     data[i][7],
          status:       data[i][8] || "Diproses",
          catatan:      data[i][9] || "",
          tgl_unggah:   data[i][10] || "-",
          pengunggah:   data[i][11] || "-",
          tgl_diubah:   data[i][12] || "-",
          pengubah:     data[i][13] || "-",
          tgl_verifikasi: data[i][14] || "-",
          verifikator:  data[i][15] || "-",
          read_by:      data[i][16] || ""
        });
      }
    });
    result.sort(function(a, b) { return b.tgl_unggah.localeCompare(a.tgl_unggah); });
    return JSON.stringify({ success: true, data: result });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

/* -----------------------------------------------------------------------
   3. SIMPAN
   ----------------------------------------------------------------------- */

function pppkpw_simpan(payload, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    if (!payload.unit_kerja) return JSON.stringify({ success: false, message: "Unit Kerja tidak boleh kosong." });
    if (!payload.nama_pegawai) return JSON.stringify({ success: false, message: "Nama Pegawai tidak boleh kosong." });
    if (!payload.tahun) return JSON.stringify({ success: false, message: "Tahun Kontrak tidak boleh kosong." });
    if (!fileData || !fileData.data) return JSON.stringify({ success: false, message: "File Draft PK wajib diunggah." });

    var estimatedSize = Math.round(fileData.data.length * 0.75);
    if (estimatedSize > 1100000) return JSON.stringify({ success: false, message: "Ukuran file melebihi batas maksimal 1 MB." });

    var sheet = pppkpw_getOrCreateSheet(payload.tahun);
    var existingData = sheet.getDataRange().getDisplayValues();
    for (var i = 1; i < existingData.length; i++) {
      if (String(existingData[i][2] || "").trim().toLowerCase() === String(payload.nama_pegawai).trim().toLowerCase() &&
          String(existingData[i][3] || "").trim() === String(payload.nip || "").trim() &&
          String(existingData[i][5] || "").trim() === String(payload.tahun).trim()) {
        var stDup = String(existingData[i][8] || "").toLowerCase();
        if (stDup === "diverifikasi") return JSON.stringify({ success: false, message: "Dokumen " + payload.nama_pegawai + " sudah Diverifikasi, tidak dapat ditambah ulang." });
        return JSON.stringify({ success: false, message: "Data untuk pegawai ini dan tahun ini sudah ada. Gunakan tombol Edit." });
      }
    }

    var yearFolder = pppkpw_getOrCreateYearFolder(payload.tahun);
    var namaFile = String(payload.nama_pegawai).trim() + " - " + String(payload.nip || "").trim() + ".pdf";
    var iterFile = yearFolder.getFilesByName(namaFile);
    while (iterFile.hasNext()) { try { iterFile.next().setTrashed(true); } catch(ex) {} }

    var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), "application/pdf", namaFile);
    var file = yearFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();

    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    sheet.appendRow([
      pppkpw_genId(),
      payload.unit_kerja,
      payload.nama_pegawai,
      payload.nip || "",
      payload.jabatan || "",
      payload.tahun,
      namaFile,
      fileUrl,
      "Diproses",
      "",
      now,
      payload.user_login || "",
      "", "", "", "",
      "User"
    ]);

    SpreadsheetApp.flush();
    pppkpw_invalidateCache(payload.tahun);
    return JSON.stringify({ success: true, message: "Draft PK berhasil diunggah dan disimpan." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally { lock.releaseLock(); }
}

/* -----------------------------------------------------------------------
   4. PERBAIKI
   ----------------------------------------------------------------------- */

function pppkpw_perbaiki(payload, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var sheet = pppkpw_getOrCreateSheet(payload.sheetName || payload.tahun);
    var r = parseInt(payload.rowId);
    var oldUrl = sheet.getRange(r, 8).getValue(); // Col H: URL_File
    var newFileUrl = oldUrl;
    var namaFile = sheet.getRange(r, 7).getValue(); // Col G: Nama_File

    var currentStatus = String(sheet.getRange(r, 9).getValue() || "").toLowerCase(); // Col I: Status
    if (currentStatus === "diverifikasi") return JSON.stringify({ success: false, message: "Dokumen sudah Diverifikasi, tidak dapat diubah." });

    if (fileData && fileData.data) {
      var estimatedSize = Math.round(fileData.data.length * 0.75);
      if (estimatedSize > 1100000) return JSON.stringify({ success: false, message: "Ukuran file melebihi batas maksimal 1 MB." });

      if (oldUrl && oldUrl.indexOf("drive.google.com") !== -1) {
        try {
          var match = oldUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || oldUrl.match(/id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true);
        } catch(ex) {}
      }
      var yearFolder = pppkpw_getOrCreateYearFolder(payload.tahun || payload.sheetName);
      namaFile = String(payload.nama_pegawai).trim() + " - " + String(payload.nip || "").trim() + ".pdf";
      var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), "application/pdf", namaFile);
      var newFile = yearFolder.createFile(blob);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      newFileUrl = newFile.getUrl();
    }

    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(r, 5).setValue(payload.jabatan || ""); // Col E: Jabatan
    sheet.getRange(r, 7).setValue(namaFile);              // Col G: Nama_File
    sheet.getRange(r, 8).setValue(newFileUrl);             // Col H: URL_File
    sheet.getRange(r, 9).setValue("Diproses");            // Col I: Status
    sheet.getRange(r, 10).setValue("");                   // Col J: Catatan
    sheet.getRange(r, 13).setValue(now);                  // Col M: Tgl_Diubah
    sheet.getRange(r, 14).setValue(payload.user_login || ""); // Col N: Pengubah
    sheet.getRange(r, 15).setValue("");                   // Col O: Tgl_Verif
    sheet.getRange(r, 16).setValue("");                   // Col P: Verifikator
    sheet.getRange(r, 17).setValue("User");               // Col Q: Read_By

    SpreadsheetApp.flush();
    pppkpw_invalidateCache(payload.sheetName || payload.tahun);
    return JSON.stringify({ success: true, message: "Data berhasil diperbarui." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally { lock.releaseLock(); }
}

/* -----------------------------------------------------------------------
   5. HAPUS
   ----------------------------------------------------------------------- */

function pppkpw_hapus(rowId, sheetName, securityCode) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = new Date();
    var kd = d.getFullYear() + "" + String(d.getMonth() + 1).padStart(2, "0") + "" + String(d.getDate()).padStart(2, "0");
    if (String(securityCode).trim() !== kd) return JSON.stringify({ success: false, message: "Kode Keamanan Salah!" });

    var sheet = pppkpw_getOrCreateSheet(sheetName);
    var r = parseInt(rowId);
    var urlDrive = sheet.getRange(r, 8).getValue(); // Col H: URL_File
    if (urlDrive && urlDrive.indexOf("drive.google.com") !== -1) {
      try {
        var match = urlDrive.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlDrive.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true);
      } catch(ex) {}
    }
    sheet.deleteRow(r);
    SpreadsheetApp.flush();
    pppkpw_invalidateCache(sheetName);
    return JSON.stringify({ success: true, message: "Data berhasil dihapus." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally { lock.releaseLock(); }
}

/* -----------------------------------------------------------------------
   6. VERIFIKASI
   ----------------------------------------------------------------------- */

function pppkpw_verifikasi(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = pppkpw_getOrCreateSheet(payload.sheetName);
    var r = parseInt(payload.rowId);
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(r, 9).setValue(payload.status);          // Col I: Status
    sheet.getRange(r, 10).setValue(payload.catatan || "");   // Col J: Catatan
    sheet.getRange(r, 15).setValue(now);                    // Col O: Tgl_Verif
    sheet.getRange(r, 16).setValue(payload.verifikator);    // Col P: Verifikator
    sheet.getRange(r, 17).setValue("Admin");                // Col Q: Read_By

    SpreadsheetApp.flush();
    pppkpw_invalidateCache(payload.sheetName);
    return JSON.stringify({ success: true, message: "Status berhasil diperbarui menjadi " + payload.status + "." });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  } finally { lock.releaseLock(); }
}

/* -----------------------------------------------------------------------
   7. DASHBOARD
   ----------------------------------------------------------------------- */

function pppkpw_getDashboardData(unitFilter, tahun, forceRefresh) {
  try {
    var cacheKey = "PPPKPW_DASH_" + (tahun || "ALL") + "_" + (unitFilter || "ALL");
    if (!forceRefresh) {
      var cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) return cached;
    }

    var sheet = getSheet("PTK_DB", "Master Data GTK");
    var allPegawai = [];
    if (sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        var ptkData = sheet.getRange(2, 1, lastRow - 1, 26).getDisplayValues();
        var targetUnit = String(unitFilter || "").trim().toUpperCase();
        ptkData.forEach(function(row) {
          if (!row[0]) return;
          if (!pppkpw_isPppkPw(row[19])) return; // Col T
          var unit    = String(row[2] || "").trim(); // Col C
          if (targetUnit && targetUnit !== "SEMUA" && unit.toUpperCase() !== targetUnit) return;
          var nama    = String(row[4] || "").trim(); // Col E
          var nip     = String(row[7] || "").trim(); // Col H
          var jabatan = String(row[25] || "").trim(); // Col Z
          if (!nama) return;
          allPegawai.push({ unit: unit, nama: nama, nip: nip, jabatan: jabatan });
        });
      }
    }

    var uploadedMap = {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.PPPK_PW_DB);
    var dbSheets = ss.getSheets();
    dbSheets.forEach(function(s) {
      var sName = s.getName();
      if (tahun && tahun !== "SEMUA" && sName !== tahun) return;
      var lr = s.getLastRow();
      if (lr < 2) return;
      var rows = s.getDataRange().getDisplayValues();
      for (var i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        // Key: nama|nip|tahun
        var key = String(rows[i][2] || "").trim().toLowerCase() + "|" + String(rows[i][3] || "").trim() + "|" + String(rows[i][5] || "").trim();
        uploadedMap[key] = { status: String(rows[i][8] || "Diproses").trim(), tahun: sName };
      }
    });

    var unitMap = {};
    allPegawai.forEach(function(p) {
      if (!unitMap[p.unit]) unitMap[p.unit] = { unit: p.unit, total: 0, sudah: 0, belum: 0, diverifikasi: 0, diproses: 0, ditolak: 0, listSudah: [], listBelum: [] };
      var key = p.nama.toLowerCase() + "|" + p.nip + "|" + (tahun && tahun !== "SEMUA" ? tahun : "");
      var foundEntry = uploadedMap[key] || null;

      if (!foundEntry && (!tahun || tahun === "SEMUA")) {
        var prefix = p.nama.toLowerCase() + "|" + p.nip + "|";
        var keys = Object.keys(uploadedMap);
        for (var ki = 0; ki < keys.length; ki++) {
          if (keys[ki].indexOf(prefix) === 0) { foundEntry = uploadedMap[keys[ki]]; break; }
        }
      }

      unitMap[p.unit].total++;
      if (foundEntry) {
        unitMap[p.unit].sudah++;
        if (stL === "disetujui" || stL === "diverifikasi") unitMap[p.unit].diverifikasi++;
        else if (stL === "revisi") unitMap[p.unit].revisi = (unitMap[p.unit].revisi || 0) + 1;
        else if (stL === "ditolak") unitMap[p.unit].ditolak++;
        else unitMap[p.unit].diproses++;
        unitMap[p.unit].listSudah.push({ nama: p.nama, nip: p.nip, jabatan: p.jabatan, status: foundEntry.status });
      } else {
        unitMap[p.unit].belum++;
        unitMap[p.unit].listBelum.push({ nama: p.nama, nip: p.nip, jabatan: p.jabatan });
      }
    });

    var detailUnit = [];
    Object.keys(unitMap).forEach(function(k) { detailUnit.push(unitMap[k]); });
    detailUnit.sort(function(a, b) { return a.unit.localeCompare(b.unit); });

    var totPegawai = 0, totSudah = 0, totBelum = 0, totDiverifikasi = 0, totDiproses = 0, totDitolak = 0;
    detailUnit.forEach(function(u) {
      totPegawai += u.total; totSudah += u.sudah; totBelum += u.belum;
      totDiverifikasi += u.diverifikasi; totDiproses += u.diproses; totDitolak += u.ditolak;
    });

    var result = JSON.stringify({
      success: true,
      totalPegawai: totPegawai, totalSudah: totSudah, totalBelum: totBelum,
      totalDiverifikasi: totDiverifikasi, totalDiproses: totDiproses, totalDitolak: totDitolak,
      detailUnit: detailUnit
    });
    try { CacheService.getScriptCache().put(cacheKey, result, 900); } catch(ce) {}
    return result;
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}

function pppkpw_invalidateCache(tahun) {
  try {
    var cache = CacheService.getScriptCache();
    ["ALL", "SEMUA"].forEach(function(u) {
      cache.remove("PPPKPW_DASH_" + (tahun || "ALL") + "_" + u);
      cache.remove("PPPKPW_DASH_ALL_" + u);
    });
  } catch(e) {}
}

/* -----------------------------------------------------------------------
   8. NOTIFIKASI
   ----------------------------------------------------------------------- */

function getNotifikasiPPPKPW(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;

    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.PPPK_PW_DB);
    var sheets = ss.getSheets();

    sheets.forEach(function(sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      var data = sheet.getDataRange().getDisplayValues();

      for (var i = 1; i < data.length; i++) {
        var rowNum = i + 1;
        var rUnit   = String(data[i][1] || "").trim(); // Col B: Unit_Kerja
        var rNama   = String(data[i][2] || "").trim(); // Col C: Nama_Pegawai
        var rTahun  = String(data[i][5] || "").trim(); // Col F: Tahun
        var status  = String(data[i][8] || "Diproses").trim(); // Col I: Status
        var isDiproses = (status === "Diproses" || status === "");
        var isTarget = false;

        if (isAdmin) {
          isTarget = isDiproses;
        } else {
          isTarget = (rUnit.toUpperCase() === String(unit || "").trim().toUpperCase() && !isDiproses);
        }

        if (isTarget) {
          var isRead = false;
          var readBy = String(data[i][16] || "").trim(); // Col Q: Read_By
          var readByList = readBy === "" ? [] : readBy.split(",");
          if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
          if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;

          var stLower = status.toLowerCase();
          var isDisetujui = stLower.includes("ok") || stLower.includes("setuju") || stLower.includes("valid") || stLower.includes("verifikasi");

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
              sheetName: sheet.getName(),
              source: "PPPK PW",
              nama: rNama,
              namaSd: rUnit,
              kriteria: "Draft PK " + rTahun,
              status: status,
              waktu: (data[i][14] && !isDiproses) ? data[i][14] : data[i][10],
              isRead: isRead
            });
          }
        }
      }
    });

    return {
      count: unreadCount,
      recent: notifList.slice(0, 5)
    };
  } catch(e) {
    Logger.log("Error getNotifikasiPPPKPW: " + e.message);
    return { count: 0, recent: [] };
  }
}

function pppkpw_tandaiSemuaNotifDibaca(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var readMark = isAdmin ? "Admin" : "User";

    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.PPPK_PW_DB);
    var sheets = ss.getSheets();

    sheets.forEach(function(sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      var data = sheet.getDataRange().getDisplayValues();

      for (var i = 1; i < data.length; i++) {
        var rUnit  = String(data[i][1] || "").trim();
        var status = String(data[i][8] || "Diproses").trim();
        var isDiproses = (status === "Diproses" || status === "");
        var shouldMark = false;

        if (isAdmin && isDiproses) shouldMark = true;
        if (!isAdmin && rUnit.toUpperCase() === String(unit || "").trim().toUpperCase() && !isDiproses) shouldMark = true;

        if (shouldMark) {
          var currentReadBy = String(data[i][16] || "").trim();
          var list = currentReadBy === "" ? [] : currentReadBy.split(",");
          if (list.indexOf(readMark) === -1) {
            list.push(readMark);
            sheet.getRange(i + 1, 17).setValue(list.join(","));
          }
        }
      }
    });
    SpreadsheetApp.flush();
    return true;
  } catch(e) {
    return false;
  }
}

/* -----------------------------------------------------------------------
   9. E-METERAI (FILE EXPLORER)
   ----------------------------------------------------------------------- */

function pppkpw_getEMeteraiFiles(folderId) {
  return pppkpw_getEMeteraiExplorer(folderId);
}

function pppkpw_getEMeteraiExplorer(targetFolderId) {
  try {
    var rootId = KONFIG_PPPK_PW.FOLDER_EMETERAI_ID;
    var currentId = (targetFolderId && String(targetFolderId).trim() !== "" && targetFolderId !== "ROOT") ? targetFolderId : rootId;
    var currentFolder = DriveApp.getFolderById(currentId);
    var isRoot = (currentId === rootId);

    // Ambil daftar folder tahun di root (untuk shortcut dropdown)
    var rootFolder = isRoot ? currentFolder : DriveApp.getFolderById(rootId);
    var rootSubfolders = rootFolder.getFolders();
    var yearFolders = [];
    while (rootSubfolders.hasNext()) {
      var yf = rootSubfolders.next();
      yearFolders.push({
        id: yf.getId(),
        name: yf.getName()
      });
    }
    yearFolders.sort(function(a, b) { return b.name.localeCompare(a.name); });

    // Ambil subfolder di current folder
    var subfolderIter = currentFolder.getFolders();
    var folders = [];
    while (subfolderIter.hasNext()) {
      var sub = subfolderIter.next();
      var fileCount = 0;
      var subFIter = sub.getFiles();
      while (subFIter.hasNext()) { subFIter.next(); fileCount++; }
      folders.push({
        id: sub.getId(),
        name: sub.getName(),
        count: fileCount,
        url: sub.getUrl()
      });
    }
    folders.sort(function(a, b) { return b.name.localeCompare(a.name); });

    // Ambil files di current folder
    var fileIter = currentFolder.getFiles();
    var files = [];
    while (fileIter.hasNext()) {
      var f = fileIter.next();
      files.push({
        id: f.getId(),
        nama: f.getName(),
        url: f.getUrl(),
        downloadUrl: "https://drive.google.com/uc?export=download&id=" + f.getId(),
        ukuran: f.getSize(),
        tanggal: Utilities.formatDate(f.getLastUpdated(), "Asia/Jakarta", "dd-MM-yyyy HH:mm")
      });
    }
    files.sort(function(a, b) { return a.nama.localeCompare(b.nama); });

    // Parent ID jika bukan root
    var parentId = null;
    var parentName = null;
    if (!isRoot) {
      var parents = currentFolder.getParents();
      if (parents.hasNext()) {
        var p = parents.next();
        parentId = p.getId();
        parentName = p.getName();
      }
    }

    return JSON.stringify({
      success: true,
      currentFolder: {
        id: currentId,
        name: isRoot ? "Draft E-meterai" : currentFolder.getName(),
        isRoot: isRoot,
        parentId: parentId,
        parentName: parentName
      },
      yearFolders: yearFolders,
      folders: folders,
      files: files
    });
  } catch(e) {
    return JSON.stringify({ success: false, message: e.message });
  }
}
