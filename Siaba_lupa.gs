/* ======================================================================
   MODUL LUPA PRESENSI (VERSI ENTERPRISE - FULL SCRIPT SULTAN)
   ====================================================================== */

// 1. PUSAT KONTROL DATABASE
const KONFIG_LUPA = {
  DB_KEY: "SIABA_LUPA_DB", 
  SHEET_NAMA: "Lupa_Presensi",
  FOLDER_ID: FOLDER_CONFIG.SIABA_LUPA
};

/* ======================================================================
   SISTEM KEAMANAN (MENGAMBIL DATA BERDASARKAN NPSN)
   ====================================================================== */
function getUnitKerjaByNPSN(npsn) {
  try {
    const sheet = getSheet(KONFIG_LUPA.DB_KEY, "Database_Sekolah");

    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(npsn).trim()) {
        return JSON.stringify({ unitKerja: data[i][2] });
      }
    }
    return JSON.stringify({ error: "NPSN (" + npsn + ") tidak terdaftar di Database Sekolah." });
  } catch (e) {
    return JSON.stringify({ error: "Error Server: " + e.message });
  }
}

// (Fungsi getDatabasePegawai dihapus karena sudah ada di Siaba_helper.gs)


/* ======================================================================
   FUNGSI BACA DATA (GET)
   ====================================================================== */
function getDaftarLupaPresensi(tahun, bulan) {
  try {
    var sheet = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);

    var data = sheet.getDataRange().getDisplayValues(); 
    var result = [];

    var fTahun = (tahun) ? String(tahun).trim() : "";
    var mapBulan = { "Januari": "01", "Februari": "02", "Maret": "03", "April": "04", "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08", "September": "09", "Oktober": "10", "November": "11", "Desember": "12" };
    var fBulanAngka = mapBulan[bulan] || ""; 

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i]; 
      if (!row[1] && !row[2]) continue; 
      
      var txtTgl = String(row[3]).replace(/'/g, "").trim(); 
      if (fTahun !== "") { if (txtTgl.indexOf(fTahun) === -1) continue; }
      if (fBulanAngka !== "") { if (txtTgl.indexOf("-" + fBulanAngka + "-") === -1 && txtTgl.indexOf("/" + fBulanAngka + "/") === -1) continue; }
      
      result.push({
        rowBaris: i + 1,       
        unit: row[0], nama: row[1], nip: row[2],           
        tanggal: row[3], jam: row[4], jenis: row[5], komulatif: row[6],     
        tglKirim: row[7], userInput: row[8], fileUrl: row[9], status: row[10],       
        tglEdit: row[11], userEdit: row[12], tglVerif: row[13], adminVerif: row[14], ket: row[15],
        npsn: row[16] || "",
        readBy: row[17] || "" 
      });
    }
    return JSON.stringify(result);
  } catch (e) { 
    return JSON.stringify({ error: "Error Server GAS: " + e.message }); 
  }
}

/* ======================================================================
   FUNGSI TULIS DATA (CREATE & UPDATE DENGAN ANTI-BENTROK)
   ====================================================================== */
function cekBentrokLupa(nipBaru, tglBaruStr, jenisBaru, rowIdPengecualian) {
  var sheet = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);
  var data = sheet.getDataRange().getValues();
  
  var tglBaruYMD = normalizeToYMD(tglBaruStr);
  var jenisBaruClean = String(jenisBaru).trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    if (rowIdPengecualian && (i + 1) == rowIdPengecualian) continue;
    var rowNip = String(data[i][2]).replace(/'/g, "").trim(); 
    var rowStatus = String(data[i][10]).toLowerCase();
    
    if (rowNip === String(nipBaru).trim() && !rowStatus.includes("tolak")) {
       var rowTglRaw = data[i][3];
       var rowTglYMD = normalizeToYMD(rowTglRaw);
       var rowJenis = String(data[i][5]).trim().toLowerCase();
       
       if (rowTglYMD === tglBaruYMD && rowJenis === jenisBaruClean) {
           return "Gagal: Data ganda! Anda sudah mengajukan Lupa Presensi (" + data[i][5] + ") pada tanggal " + String(rowTglRaw).replace(/'/g,"") + ".";
       }
    }
  }
  return null; 
}

function simpanLupaPresensi(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 

    var tglSimpan = dataKirim.tanggal; 
    var err = cekBentrokLupa(dataKirim.nip_asn, tglSimpan, dataKirim.jenis, null);
    if (err) return err; 
 
    var sheet = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);

    var jamSimpan = dataKirim.waktu;
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    var targetFolder = getFolderTahunBulan(KONFIG_LUPA.FOLDER_ID, tglSimpan);
    var fileExt = dataKirim.file.name.split('.').pop();
    var fileNameBaru = dataKirim.nip_asn + " - " + tglSimpan + " - " + dataKirim.jenis + "." + fileExt;
    
    var fileBlob = Utilities.newBlob(Utilities.base64Decode(dataKirim.file.data), dataKirim.file.mimeType, dataKirim.file.name);
    var newFile = targetFolder.createFile(fileBlob).setName(fileNameBaru);
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = newFile.getUrl();

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    
    var rowData = [
      dataKirim.unit_kerja, dataKirim.nama_asn, dataKirim.nip_asn,
      "'" + tglSimpan, "'" + jamSimpan, dataKirim.jenis, "'" + dataKirim.komulatif,
      timestamp, dataKirim.user_login, fileUrl, "Diproses", "", "", "", "", "",
      dataKirim.npsn, "" // Kolom 18: readBy (Index 17)
    ];
    sheet.appendRow(rowData);
    return "Sukses Data Berhasil Disimpan";
    
  } catch (e) { 
      return (e.message.includes("lock")) ? "Error: Sistem sedang memproses data user lain. Silakan coba lagi." : "Error: " + e.message; 
  } finally {
      lock.releaseLock(); 
  }
}

function updateLupaPresensi(form, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 

    var baris = parseInt(form.recId);
    var targetNip = form.nip_asn || form.nip_lama; 
    var tglSimpan = form.tanggal; 

    var err = cekBentrokLupa(targetNip, tglSimpan, form.jenis, baris);
    if (err) return err;
 
    var sheet = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);
    
    var rangeLama = sheet.getRange(baris, 1, 1, 17); 
    var valLama = rangeLama.getValues()[0];
    var finalUrl = valLama[9]; 
    
    var targetFolder = getFolderTahunBulan(KONFIG_LUPA.FOLDER_ID, tglSimpan);
    var fileNameBaru = targetNip + " - " + tglSimpan + " - " + form.jenis + ".pdf";

    if (fileData && fileData.data) {
       var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, fileNameBaru);
       var newFile = targetFolder.createFile(blob);
       newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       finalUrl = newFile.getUrl();
    } else {
       var tglLamaSheet = String(valLama[3]).replace(/'/g, "");
       if (tglSimpan !== tglLamaSheet || form.jenis !== valLama[5]) {
           try { 
             var idFile = finalUrl.match(/[-\w]{25,}/);
             if(idFile) {
                 var fileDrive = DriveApp.getFileById(idFile[0]);
                 fileDrive.setName(fileNameBaru);
                 if (tglSimpan !== tglLamaSheet) fileDrive.moveTo(targetFolder);
             }
           } catch(e) {}
       }
    }

    var jamSimpan = form.waktu; 
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    sheet.getRange(baris, 4).setValue("'" + tglSimpan);      
    sheet.getRange(baris, 5).setValue("'" + jamSimpan);      
    sheet.getRange(baris, 6).setValue(form.jenis);   
    sheet.getRange(baris, 7).setValue("'" + form.komulatif); 
    sheet.getRange(baris, 10).setValue(finalUrl);    
    
    sheet.getRange(baris, 11).setValue("Diproses"); 
    sheet.getRange(baris, 14).setValue("");         
    sheet.getRange(baris, 15).setValue("");         
    sheet.getRange(baris, 16).setValue("");         

    sheet.getRange(baris, 12).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"));        
    sheet.getRange(baris, 13).setValue(form.user_login);
    sheet.getRange(baris, 17).setValue(form.npsn); 

    return "Sukses Data Berhasil Diupdate";
  } catch(e) { 
      return (e.message.includes("lock")) ? "Error: Sistem sedang sibuk. Silakan coba lagi." : "Error: " + e.message; 
  } finally { lock.releaseLock(); }
}

function hapusLupaPresensi(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheetMain = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);

    var rowIdx = parseInt(dataKirim.recId);
    if (isNaN(rowIdx)) throw new Error("ID Baris tidak valid.");

    var now = new Date();
    var validCode = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
    if(String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH"); 

    var fileUrl = sheetMain.getRange(rowIdx, 10).getValue(); 
    
    // VAKSIN ERROR FILE: Dipisahkan agar jika file hilang, baris excel tetap dihapus
    if (fileUrl && String(fileUrl).includes("drive")) {
        try {
            var fid = fileUrl.match(/[-\w]{25,}/);
            if(fid) DriveApp.getFileById(fid[0]).setTrashed(true); 
        } catch(e) { 
            console.log("Abaikan: Gagal hapus file drive, mungkin sudah terhapus. " + e.message); 
        }
    }

    sheetMain.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if(e.message === "KODE_SALAH") return "KODE_SALAH";
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Error Server: " + e.message;
  } finally { lock.releaseLock(); }
}

function verifikasiLupaPresensi(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);
    
    var baris = parseInt(form.recId);
    if (isNaN(baris) || baris < 2) throw new Error("ID Baris tidak valid.");

    sheet.getRange(baris, 11).setValue(form.status);
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(baris, 14).setValue(now);
    sheet.getRange(baris, 15).setValue(form.user_verif);
    sheet.getRange(baris, 16).setValue(form.keterangan);

    return "Sukses";
  } catch (e) {
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Gagal Verifikasi: " + e.message;
  } finally { lock.releaseLock(); }
}

/* ======================================================================
   SULTAN NOTIFIKASI ENGINE (LUPA PRESENSI)
   ====================================================================== */
function getNotifikasiLupa(role, unit) {
  try {
    var raw = getDaftarLupaPresensi();
    var semuaData = JSON.parse(raw);
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;
    
    semuaData.forEach(function(row) {
        var status = String(row.status || "").trim();
        var sLower = status.toLowerCase();
        var isDiproses = (sLower === "diproses" || sLower === "");
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isDiproses;
        } else {
            // User mendapat notifikasi jika status sudah berubah (Sudah di-verval)
            isTarget = (String(row.unit).trim().toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
        }
        
        if (isTarget) {
            var isRead = false;
            var readByList = String(row.readBy || "").split(",");
            if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
            if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;
            
            if (!isRead) {
                unreadCount++;
            }
            
            notifList.push({
                rowId: row.rowBaris,
                source: "LUPA",
                nama: row.nama,
                unit: row.unit,
                status: status || "Diproses",
                waktu: row.tglVerif && !isDiproses ? row.tglVerif : (row.tglEdit && isDiproses ? row.tglEdit : row.tglKirim),
                isRead: isRead
            });
        }
    });
    
    // Urutkan (Paling baru dulu, prioritaskan belum dibaca)
    notifList.sort(function(a, b) {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        var parseDate = function(str) {
            if (!str || str === "-") return new Date(0);
            var p = str.split(" ");
            var sep = p[0].includes("/") ? "/" : "-";
            var d = p[0].split(sep);
            var t = p[1] ? p[1].split(":") : [0,0,0];
            return new Date(d[2], d[1]-1, d[0], t[0], t[1], t[2]);
        };
        return parseDate(b.waktu) - parseDate(a.waktu);
    });
    
    return {
        count: unreadCount,
        recent: notifList.slice(0, 5)
    };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

function tandaiNotifLupaDibaca(rowId, role) {
  try {
    var sheet = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);
    var rIdx = parseInt(rowId);
    if (isNaN(rIdx)) return false;
    
    var currentReadBy = String(sheet.getRange(rIdx, 18).getDisplayValue() || "").trim();
    var readMark = (role === "Admin") ? "Admin" : "User";
    
    if (currentReadBy === "") {
        sheet.getRange(rIdx, 18).setValue(readMark);
    } else {
        var list = currentReadBy.split(",");
        if (list.indexOf(readMark) === -1) {
            list.push(readMark);
            sheet.getRange(rIdx, 18).setValue(list.join(","));
        }
    }
    return true;
  } catch (e) { return false; }
}

function tandaiSemuaNotifLupaDibaca(role, unit) {
  try {
    var sheet = getSheet(KONFIG_LUPA.DB_KEY, KONFIG_LUPA.SHEET_NAMA);
    var data = sheet.getDataRange().getDisplayValues();
    
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var readMark = isAdmin ? "Admin" : "User";
    
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[10] || "").trim();
        var isDiproses = (status === "Diproses" || status === "");
        var unitRow = String(row[0] || "").trim().toUpperCase();
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isDiproses;
        } else {
            isTarget = (unitRow === String(unit).trim().toUpperCase() && !isDiproses);
        }
        
        var currentReadBy = String(row[17] || "").trim();
        if (isTarget && currentReadBy.indexOf(readMark) === -1) {
            var newVal = currentReadBy === "" ? readMark : currentReadBy + "," + readMark;
            sheet.getRange(i + 1, 18).setValue(newVal);
        }
    }
    return true;
  } catch (e) { return false; }
}

/* ======================================================================
   HELPER UTILITIES (FUNGSI PENDUKUNG WAJIB)
   ====================================================================== */
function normalizeToYMD(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  var s = String(val).replace(/'/g, "").trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  var parts = s.split(/[-/]/); 
  if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      return parts[2] + "-" + parts[1].padStart(2, '0') + "-" + parts[0].padStart(2, '0');
  }
  return s; 
}

function getFolderTahunBulan(parentId, strTgl) {
  try {
      var parts = strTgl.split("-");
      var year = (parts[0].length === 4) ? parts[0] : parts[2]; 
      var monthIdx = parseInt(parts[1], 10) - 1; 
      var arrBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      var monthName = arrBulan[monthIdx] || "Unknown";
      
      var parentFolder = DriveApp.getFolderById(parentId);
      var yearFolder = (parentFolder.getFoldersByName(year).hasNext()) ? parentFolder.getFoldersByName(year).next() : parentFolder.createFolder(year);
      var targetFolder = (yearFolder.getFoldersByName(monthName).hasNext()) ? yearFolder.getFoldersByName(monthName).next() : yearFolder.createFolder(monthName);
      
      return targetFolder;
  } catch(e) { throw new Error("Gagal Akses Folder Drive! Detail: " + e.message); }
}