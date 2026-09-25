/* ======================================================================
   MODUL: KEMITRAAN & KERJA SAMA (KEMITRAAN)
   Penyimpanan dokumen & berkas Kemitraan & Kerja Sama per sekolah.
   ====================================================================== */

const KONFIG_KEMITRAAN = {
  DB_KEY: "KEMITRAAN_DB",
  get FOLDER_ID() { return FOLDER_CONFIG.KEMITRAAN_DOCS || FOLDER_CONFIG.KOMBEL_DOCS; }
};

function getOrCreateSheetKemitraan(sheetName) {
  var ss = getDB(KONFIG_KEMITRAAN.DB_KEY);
  var sName = "Kemitraan_" + sheetName;
  var sheet = ss.getSheetByName(sName);
  if (!sheet) {
    sheet = ss.insertSheet(sName);
    if (sheetName === "Master_Kategori") {
      sheet.appendRow([
        "ID_Kategori", "Nama_Dokumen", "Jenjang", "Jenis_Periode",
        "Format_File", "Ukuran_File", "Status", "Keterangan",
        "Integrasi_Dashboard"
      ]);
    } else if (sheetName === "Database_Dokumen") {
      sheet.appendRow([
        "Timestamp", "NPSN", "Nama_Sekolah", "ID_Kategori", "Nama_Kategori",
        "Tahun", "Nama_File", "URL_File", "ID_File",
        "Uploader", "Status_Verifikasi", "Catatan", "Tgl_Verif", "Verifikator",
        "Tgl_Edit", "User_Edit"
      ]);
    }
  }
  return sheet;
}

function invalidateKemitraanDashboardCache() {
  try { CacheService.getScriptCache().remove("KEMITRAAN_DASHBOARD_CACHE"); } catch(e) {}
}

/* ---------------------------------------------------------------------- */
function getKemitraanMasterData(npsnFilter) {
  try {
    var shKat = getOrCreateSheetKemitraan("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var resKat = [];
    for (var i = 1; i < dataKat.length; i++) {
      if (String(dataKat[i][0]).trim() !== "") {
        var rawAktif = String(dataKat[i][6] || "TRUE").trim().toUpperCase();
        var isAktif  = (rawAktif !== "FALSE" && rawAktif !== "NONAKTIF" && rawAktif !== "0");
        resKat.push({
          idKat             : dataKat[i][0],
          namaKat           : dataKat[i][1],
          jenjang           : String(dataKat[i][2] || "SEMUA").trim().toUpperCase(),
          jenisPeriode      : dataKat[i][3] ? String(dataKat[i][3]).trim().toUpperCase() : "TAHUNAN_KALENDER",
          format            : dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "PDF",
          ukuran            : dataKat[i][5] ? String(dataKat[i][5]).trim() : "2",
          status            : isAktif ? "Aktif" : "Nonaktif",
          isAktif           : isAktif,
          keterangan        : dataKat[i][7] ? String(dataKat[i][7]).trim() : "",
          integrasiDashboard: dataKat[i][8] ? String(dataKat[i][8]).trim().toUpperCase() : "TRUE"
        });
      }
    }
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var resSekolah = [];
    for (var j = 1; j < dataSekolah.length; j++) {
      var rNpsn = String(dataSekolah[j][0]).trim();
      if (rNpsn !== "") {
        resSekolah.push({
          npsn: rNpsn, nama: String(dataSekolah[j][2]).trim(),
          jenjang: dataSekolah[j][1], status: dataSekolah[j][3], kecamatan: dataSekolah[j][4]
        });
      }
    }
    return JSON.stringify({ success: true, kategori: resKat, sekolah: resSekolah });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function simpanKemitraanMaster(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetKemitraan("Master_Kategori");
    var data  = sheet.getDataRange().getValues();
    var idKategori = String(payload.idKat || "").trim();
    if (!idKategori) return JSON.stringify({ success: false, message: "ID Dokumen tidak boleh kosong." });
    var valJenjang = String(payload.jenjang || "SEMUA").trim().toUpperCase();
    var isUpdate = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === idKategori.toUpperCase()) {
        sheet.getRange(i+1,2).setValue(payload.namaKat);
        sheet.getRange(i+1,3).setValue(valJenjang);
        sheet.getRange(i+1,4).setValue(payload.jenisPeriode);
        sheet.getRange(i+1,5).setValue(payload.format);
        sheet.getRange(i+1,6).setValue(payload.ukuran);
        sheet.getRange(i+1,7).setValue(payload.status);
        sheet.getRange(i+1,8).setValue(payload.keterangan);
        sheet.getRange(i+1,9).setValue(payload.integrasi);
        isUpdate = true; break;
      }
    }
    if (!isUpdate) {
      sheet.appendRow([idKategori, payload.namaKat, valJenjang, payload.jenisPeriode,
        payload.format, payload.ukuran, payload.status, payload.keterangan, payload.integrasi]);
    }
    SpreadsheetApp.flush();
    invalidateKemitraanDashboardCache();
    return JSON.stringify({ success: true, message: "Kategori Kemitraan berhasil disimpan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
  finally { lock.releaseLock(); }
}

function hapusKemitraanMaster(idKategori) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetKemitraan("Master_Kategori");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idKategori).trim()) {
        sheet.deleteRow(i+1); SpreadsheetApp.flush(); invalidateKemitraanDashboardCache();
        return JSON.stringify({ success: true, message: "Kategori berhasil dihapus." });
      }
    }
    return JSON.stringify({ success: false, message: "Kategori tidak ditemukan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
  finally { lock.releaseLock(); }
}

/* ---------------------------------------------------------------------- */
function getKemitraanData(npsnFilter) {
  try {
    var shSekolah = getSheet("USER_DB", "Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var sekolahMap = {}, nameToNpsnMap = {};
    for (var j = 1; j < dataSekolah.length; j++) {
      var npsn = String(dataSekolah[j][0]).trim();
      var sNama = String(dataSekolah[j][2]).trim();
      if (npsn) {
        sekolahMap[npsn] = { nama: sNama, jenjang: dataSekolah[j][1], status: dataSekolah[j][3] };
        if (sNama) nameToNpsnMap[sNama.toUpperCase()] = npsn;
      }
    }
    var sheet = getOrCreateSheetKemitraan("Database_Dokumen");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    var rawTarget = String(npsnFilter || "").trim().toUpperCase();
    var targetNpsn = "", targetNama = "";
    if (rawTarget && rawTarget !== "SEMUA") {
      if (sekolahMap[rawTarget]) { targetNpsn = rawTarget; targetNama = (sekolahMap[rawTarget].nama || "").toUpperCase(); }
      else if (nameToNpsnMap[rawTarget]) { targetNpsn = nameToNpsnMap[rawTarget]; targetNama = rawTarget; }
      else { targetNpsn = rawTarget; targetNama = rawTarget; }
    }
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === "") continue;
      var rNpsn = String(data[i][1]).trim().toUpperCase();
      var infoSekolah = sekolahMap[rNpsn] || { nama: data[i][2] || rNpsn, jenjang: "-", status: "-" };
      var rSekolahNama = (infoSekolah.nama || "").toUpperCase();
      var isMatch = (!targetNpsn || targetNpsn === "SEMUA") ||
        (rNpsn === targetNpsn || (targetNama && rSekolahNama === targetNama));
      if (isMatch) {
        result.push({
          rowId: i+1, timestamp: data[i][0], npsn: rNpsn,
          nama_sekolah: infoSekolah.nama, id_kategori: data[i][3],
          nama_kategori: data[i][4], tahun: data[i][5],
          file_name: data[i][6], url: data[i][7],
          status: data[i][10] || "Diproses", catatan: data[i][11] || "",
          tgl_upload: data[i][0], uploader: data[i][9] || "-",
          tgl_verif: data[i][12] || "-", verifikator: data[i][13] || "-",
          tgl_edit: data[i][14] || "-", user_edit: data[i][15] || "-"
        });
      }
    }
    result.sort(function(a,b){return b.rowId-a.rowId;});
    return JSON.stringify({ success: true, data: result });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function uploadKemitraanDokumen(payload, fileDataBase64, fileName, mimeType) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetKemitraan("Database_Dokumen");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });
    var cek = kemitraanCheckDuplikat(sheet, payload.npsn, payload.idKat, payload.tahun||"");
    if (cek.ada && cek.status === "Diproses") return JSON.stringify({ success: false, message: "Dokumen sudah ada dan sedang Diproses. Tunggu verifikasi atau hubungi admin." });
    var folder = DriveApp.getFolderById(KONFIG_KEMITRAAN.FOLDER_ID);
    var blob = Utilities.newBlob(Utilities.base64Decode(fileDataBase64), mimeType, fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var now = new Date();
    var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var user = payload.uploader || Session.getActiveUser().getEmail() || "Anonim";
    var namaSekolah = "";
    try {
      var shSek = getSheet("USER_DB","Data_Sekolah"); var dSek = shSek ? shSek.getDataRange().getDisplayValues() : [];
      for (var s=1;s<dSek.length;s++) { if (String(dSek[s][0]).trim()===String(payload.npsn).trim()) { namaSekolah=String(dSek[s][2]).trim(); break; } }
    } catch(e2) {}
    sheet.appendRow([timestamp, payload.npsn, namaSekolah, payload.idKat, payload.namaKat,
      payload.tahun||"",
      file.getName(), file.getUrl(), file.getId(), user,
      "Diproses", "", "", "", "", ""]);
    SpreadsheetApp.flush(); invalidateKemitraanDashboardCache();
    return JSON.stringify({ success: true, message: "Dokumen Kemitraan berhasil diunggah." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
  finally { lock.releaseLock(); }
}

function kemitraanCheckDuplikat(sheet, npsn, idKategori, tahun) {
  var data = sheet.getDataRange().getDisplayValues();
  for (var i=1;i<data.length;i++) {
    if (String(data[i][1]).trim()===String(npsn).trim() && String(data[i][3]).trim()===String(idKategori).trim() &&
        String(data[i][5]).trim()===String(tahun).trim()) {
      return { ada: true, status: String(data[i][10]).trim() };
    }
  }
  return { ada: false };
}

function verifikasiKemitraanDokumen(rowId, statusBaru, catatan) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetKemitraan("Database_Dokumen");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var verif = Session.getActiveUser().getEmail() || "Admin";
    sheet.getRange(rowId,11).setValue(statusBaru); sheet.getRange(rowId,12).setValue(catatan||"");
    sheet.getRange(rowId,13).setValue(timestamp); sheet.getRange(rowId,14).setValue(verif);
    SpreadsheetApp.flush(); invalidateKemitraanDashboardCache();
    return JSON.stringify({ success: true, message: "Verifikasi berhasil." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
  finally { lock.releaseLock(); }
}

function perbaikiKemitraanDokumen(rowId, tahun, fileDataBase64, fileName, mimeType, userEdit) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var sheet = getOrCreateSheetKemitraan("Database_Dokumen");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });
    var row = sheet.getRange(rowId,1,1,16).getValues()[0];
    var tNow = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var user = userEdit || Session.getActiveUser().getEmail() || "User";
    if (tahun) sheet.getRange(rowId,6).setValue(tahun);
    if (fileDataBase64 && fileName && mimeType) {
      try { var oldId=String(row[8]||"").trim(); if(oldId) DriveApp.getFileById(oldId).setTrashed(true); } catch(e2) {}
      var folder=DriveApp.getFolderById(KONFIG_KEMITRAAN.FOLDER_ID);
      var blob=Utilities.newBlob(Utilities.base64Decode(fileDataBase64),mimeType,fileName);
      var nf=folder.createFile(blob); nf.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
      sheet.getRange(rowId,7).setValue(nf.getName()); sheet.getRange(rowId,8).setValue(nf.getUrl()); sheet.getRange(rowId,9).setValue(nf.getId());
    }
    sheet.getRange(rowId,11).setValue("Diproses"); sheet.getRange(rowId,12).setValue(""); sheet.getRange(rowId,13).setValue(""); sheet.getRange(rowId,14).setValue("");
    sheet.getRange(rowId,15).setValue(tNow); sheet.getRange(rowId,16).setValue(user);
    SpreadsheetApp.flush(); invalidateKemitraanDashboardCache();
    return JSON.stringify({ success: true, message: "Dokumen berhasil diperbarui." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
  finally { lock.releaseLock(); }
}

function hapusKemitraanDokumen(rowId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getOrCreateSheetKemitraan("Database_Dokumen");
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet tidak ditemukan." });
    var row = sheet.getRange(rowId,1,1,16).getValues()[0];
    try { var fid=String(row[8]||"").trim(); if(fid) DriveApp.getFileById(fid).setTrashed(true); } catch(e2) {}
    sheet.deleteRow(rowId); SpreadsheetApp.flush(); invalidateKemitraanDashboardCache();
    return JSON.stringify({ success: true, message: "Dokumen berhasil dihapus." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
  finally { lock.releaseLock(); }
}

function getKemitraanDashboardData(idKategori, forceRefresh) {
  try {
    var shSekolah = getSheet("USER_DB","Data_Sekolah");
    var dataSekolah = shSekolah ? shSekolah.getDataRange().getDisplayValues() : [];
    var sekolahMap = {}, allSekolah = [];
    for (var j=1;j<dataSekolah.length;j++) {
      var npsn=String(dataSekolah[j][0]).trim(); var sNama=String(dataSekolah[j][2]).trim(); var jjg=String(dataSekolah[j][1]).trim().toUpperCase();
      if (npsn) { sekolahMap[npsn]={nama:sNama,jenjang:jjg}; allSekolah.push({npsn:npsn,nama:sNama,jenjang:jjg}); }
    }
    var shKat = getOrCreateSheetKemitraan("Master_Kategori");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var katMap={}, katDashboard=[];
    for (var k=1;k<dataKat.length;k++) {
      if (String(dataKat[k][0]).trim()==="") continue;
      var rawInteg=String(dataKat[k][8]||"TRUE").trim().toUpperCase();
      var rawAkt2=String(dataKat[k][6]||"TRUE").trim().toUpperCase();
      var isAkt2=(rawAkt2!=="FALSE"&&rawAkt2!=="NONAKTIF"&&rawAkt2!=="0");
      katMap[dataKat[k][0]]={namaKat:dataKat[k][1],jenjang:dataKat[k][2],jenisPeriode:String(dataKat[k][3]||"TAHUNAN_KALENDER").trim().toUpperCase(),integrasiDashboard:(rawInteg!=="FALSE"),isAktif:isAkt2};
      if (rawInteg!=="FALSE"&&isAkt2) katDashboard.push({idKat:dataKat[k][0],namaKat:dataKat[k][1],jenisPeriode:String(dataKat[k][3]||"TAHUNAN_KALENDER").trim().toUpperCase()});
    }
    if (!idKategori||!katMap[idKategori]) return JSON.stringify({success:false,message:"Kategori tidak ditemukan."});
    var katInfo=katMap[idKategori];
    var sheet=getOrCreateSheetKemitraan("Database_Dokumen");
    var dataDok=sheet?sheet.getDataRange().getDisplayValues():[];
    var rekap=[], belum=[], npsnHadUpload={};
    for (var i=1;i<dataDok.length;i++) {
      if (String(dataDok[i][3]).trim()!==idKategori) continue;
      var rNpsn=String(dataDok[i][1]).trim(); var info=sekolahMap[rNpsn]||{nama:rNpsn,jenjang:"-"};
      rekap.push({npsn:rNpsn,nama:info.nama,jenjang:info.jenjang,tahun:String(dataDok[i][5]||"").trim(),status:String(dataDok[i][10]||"Diproses").trim()});
      if (!npsnHadUpload[rNpsn]) npsnHadUpload[rNpsn]=[];
      npsnHadUpload[rNpsn].push(String(dataDok[i][10]||"Diproses").trim());
    }
    var jenjangKat=String(katInfo.jenjang||"SEMUA").toUpperCase();
    allSekolah.forEach(function(sk){
      if (jenjangKat!=="SEMUA"&&sk.jenjang.indexOf(jenjangKat)===-1&&jenjangKat!==sk.jenjang) return;
      if (!npsnHadUpload[sk.npsn]) belum.push({npsn:sk.npsn,nama:sk.nama,jenjang:sk.jenjang});
    });
    return JSON.stringify({success:true,rekap:rekap,belum:belum,jenisPeriode:katInfo.jenisPeriode,kategori:katDashboard,sekolah:allSekolah});
  } catch(e) { return JSON.stringify({success:false,message:e.message}); }
}
