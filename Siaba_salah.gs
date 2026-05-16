/* ======================================================================
   MODUL SALAH PRESENSI (VERSI ENTERPRISE - PURE SULTAN BLUEPRINT)
   ====================================================================== */

// 1. PUSAT KONTROL DATABASE
const KONFIG_SALAH = {
  DB_KEY: "SIABA_SALAH_DB", 
  SHEET_NAMA: "Salah_Presensi"
};

// =================================================================
// 2. FUNGSI BACA DATA (DENGAN VAKSIN TANGGAL & KOLOM O/NPSN)
// =================================================================
function getDaftarSalahPresensi(tahun, bulan) {
  try {
    var sheet = getSheet(KONFIG_SALAH.DB_KEY, KONFIG_SALAH.SHEET_NAMA);

    var data = sheet.getDataRange().getDisplayValues(); 
    var result = [];

    var fTahun  = (tahun) ? String(tahun).trim() : "";
    var fTahunPendek = fTahun.length === 4 ? fTahun.substring(2) : fTahun; 

    var mapBulan = { "Januari": "01", "Februari": "02", "Maret": "03", "April": "04", "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08", "September": "09", "Oktober": "10", "November": "11", "Desember": "12" };
    var fBulanAngka = mapBulan[bulan] || ""; 

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (!row[1] && !row[2]) continue; 

      var txtTgl = String(row[3]).replace(/'/g, "").trim(); 
      
      if (fTahun !== "") {
          if (txtTgl.indexOf(fTahun) === -1 && txtTgl.indexOf("/" + fTahunPendek) === -1 && txtTgl.indexOf("-" + fTahunPendek) === -1) {
              continue; 
          }
      }

      if (fBulanAngka !== "") {
          if (txtTgl.indexOf("-" + fBulanAngka + "-") === -1 && txtTgl.indexOf("/" + fBulanAngka + "/") === -1) continue;
      }

      result.push({
        rowBaris: i + 1,
        unit:     row[0],  
        nama:     row[1],  
        nip:      row[2],  
        tanggal:  row[3],  
        jam:      row[4],  
        jenis:    row[5],  
        tglKirim: row[6],  
        userInput:row[7],  
        status:   row[8],  
        ket:      row[9],  
        tglEdit:  row[10], 
        userEdit: row[11], 
        tglVerif: row[12], 
        adminVerif: row[13],
        npsn:     row[14] || "",
        readBy:   row[15] || "" 
      });
    }
    return JSON.stringify(result);
  } catch (e) { 
      return JSON.stringify({ error: "Error Server: " + e.message }); 
  }
}

// =================================================================
// 3. FUNGSI TULIS DATA (SIMPAN KOLOM O & RESET STATUS)
// =================================================================

function simpanSalahAbsen(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
    
    var sheet = getSheet(KONFIG_SALAH.DB_KEY, KONFIG_SALAH.SHEET_NAMA);
    
    var tglSimpan = form.tanggal; 
    var jamSimpan = String(form.waktu); 
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    var namaUser = form.user_login || "Guest";
    var tglKirim = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        var rowStatus = String(data[i][8]).toLowerCase();
        if(String(data[i][2]).replace(/'/g,"").trim() === form.nip_asn && !rowStatus.includes("tolak")) {
            var rowTglRaw = String(data[i][3]).replace(/'/g,"").trim();
            var normalizeToYMD = function(s) {
                var c = s.trim(); if (c.match(/^\d{4}-\d{2}-\d{2}$/)) return c;
                var p = c.split(/[-/]/);
                if (p.length === 3 && p[0].length <= 2 && p[2].length === 4) return p[2] + "-" + p[1].padStart(2, '0') + "-" + p[0].padStart(2, '0');
                return c;
            };
            if (normalizeToYMD(rowTglRaw) === normalizeToYMD(tglSimpan) && String(data[i][5]).trim() === form.jenis) {
                return "Gagal: Data ganda! Anda sudah mengajukan untuk tanggal dan jenis presensi tersebut.";
            }
        }
    }

    var barisBaru = [
      form.unit_kerja, 
      form.nama_asn, 
      "'"+form.nip_asn, 
      "'" + tglSimpan, 
      "'" + jamSimpan, 
      form.jenis,      
      tglKirim, 
      namaUser, 
      "Diproses", 
      "",  
      "",  
      "",  
      "",  
      "",  
      form.npsn,
      "" // Kolom 16: readBy (Wajib Kosong untuk data baru)
    ];

    sheet.appendRow(barisBaru);
    return "Sukses Data Berhasil Disimpan";
    
  } catch (e) {
    return (e.message.includes("lock")) ? "Error: Sistem sedang sibuk. Coba lagi." : "Gagal simpan: " + e.message;
  } finally { lock.releaseLock(); }
}

function updateSalahAbsen(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
 
    var sheet = getSheet(KONFIG_SALAH.DB_KEY, KONFIG_SALAH.SHEET_NAMA);
    var barisKetemu = parseInt(form.recId);

    var targetNip = String(form.nip_lama).trim();
    var statusLama = String(sheet.getRange(barisKetemu, 9).getValue()).trim();

    if (statusLama.toLowerCase().includes("ok") || statusLama.toLowerCase().includes("setuju")) {
        return "Gagal: Data sudah Disetujui dan tidak bisa diedit.";
    }

    var jamSimpan = String(form.waktu); 
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    var tglEdit = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(barisKetemu, 4).setValue("'" + form.tanggal);      
    sheet.getRange(barisKetemu, 5).setValue("'" + jamSimpan);     
    sheet.getRange(barisKetemu, 6).setValue(form.jenis);           

    sheet.getRange(barisKetemu, 9).setValue("Diproses"); 
    sheet.getRange(barisKetemu, 10).setValue("");        
    sheet.getRange(barisKetemu, 13).setValue("");        
    sheet.getRange(barisKetemu, 14).setValue("");        

    sheet.getRange(barisKetemu, 11).setValue("'" + tglEdit);       
    sheet.getRange(barisKetemu, 12).setValue(form.user_login); 
    sheet.getRange(barisKetemu, 15).setValue(form.npsn); 
    sheet.getRange(barisKetemu, 16).setValue(""); // Wajib Reset Read Status agar notif muncul kembali

    return "Sukses Data Berhasil Diupdate";
  } catch (e) {
    return (e.message.includes("lock")) ? "Error: Sistem sibuk." : "Error: " + e.message;
  } finally { lock.releaseLock(); }
}

function hapusSalahAbsen(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
 
    var sheetMain = getSheet(KONFIG_SALAH.DB_KEY, KONFIG_SALAH.SHEET_NAMA);

    var rowIdx = parseInt(dataKirim.recId);
    if (isNaN(rowIdx)) throw new Error("ID Baris tidak valid.");

    var now = new Date();
    var validCode = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
    if(String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH"); 

    sheetMain.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if(e.message === "KODE_SALAH") return "KODE_SALAH";
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Error Server: " + e.message;
  } finally { lock.releaseLock(); }
}

function verifikasiSalahAbsen(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
 
    var sheet = getSheet(KONFIG_SALAH.DB_KEY, KONFIG_SALAH.SHEET_NAMA);
    
    var baris = parseInt(form.recId);
    if (isNaN(baris) || baris < 2) throw new Error("ID Baris tidak valid.");

    sheet.getRange(baris, 9).setValue(form.status);
    sheet.getRange(baris, 10).setValue("'" + form.keterangan);
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(baris, 13).setValue("'" + now);
    sheet.getRange(baris, 14).setValue(form.user_verif);

    return "Sukses";
  } catch (e) {
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Gagal Verifikasi: " + e.message;
  } finally { lock.releaseLock(); }
}

/* ======================================================================
   SULTAN NOTIFIKASI ENGINE (SALAH PRESENSI)
   ====================================================================== */
function getNotifikasiSalah(role, unit) {
  try {
    var raw = getDaftarSalahPresensi();
    var semuaData = JSON.parse(raw);
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;
    
    if (!Array.isArray(semuaData)) return { count: 0, recent: [] };
    
    semuaData.forEach(function(row) {
        var status = String(row.status || "").trim();
        var sLower = status.toLowerCase();
        var isDiproses = (sLower === "diproses" || sLower === "");
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isDiproses;
        } else {
            var uRow = String(row.unit || "").trim().toUpperCase();
            var uTarget = String(unit || "").trim().toUpperCase();
            isTarget = (uRow === uTarget && !isDiproses);
        }
        
        if (isTarget) {
            var readBy = String(row.readBy || "").trim().toLowerCase();
            var isRead = (readBy.indexOf("admin") > -1); // Jika ada tulisan admin, berarti sudah dibaca
            
            if (!isRead) {
                unreadCount++;
            }
            
            notifList.push({
                rowId: row.rowBaris,
                source: "SALAH",
                nama: row.nama,
                unit: row.unit,
                status: status || "Diproses",
                waktu: row.tglVerif && !isDiproses ? row.tglVerif : (row.tglEdit && isDiproses ? row.tglEdit : row.tglKirim),
                isRead: isRead
            });
        }
    });
    
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

function tandaiNotifSalahDibaca(rowId, role) {
  try {
    var sheet = getSheet(KONFIG_SALAH.DB_KEY, KONFIG_SALAH.SHEET_NAMA);
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
  } catch (e) { return false; }
}

function tandaiSemuaNotifSalahDibaca(role, unit) {
  try {
    var sheet = getSheet(KONFIG_SALAH.DB_KEY, KONFIG_SALAH.SHEET_NAMA);
    var data = sheet.getDataRange().getDisplayValues();
    
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var readMark = isAdmin ? "Admin" : "User";
    
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[8] || "").trim();
        var isDiproses = (status === "Diproses" || status === "");
        var unitRow = String(row[0] || "").trim().toUpperCase();
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isDiproses;
        } else {
            isTarget = (unitRow === String(unit).trim().toUpperCase() && !isDiproses);
        }
        
        var currentReadBy = String(row[15] || "").trim();
        if (isTarget && currentReadBy.indexOf(readMark) === -1) {
            var newVal = currentReadBy === "" ? readMark : currentReadBy + "," + readMark;
            sheet.getRange(i + 1, 16).setValue(newVal);
        }
    }
    return true;
  } catch (e) { return false; }
}