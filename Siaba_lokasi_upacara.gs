/* ======================================================================
   SIABA_LOKASI_UPACARA.GS
   Modul CRUD & Verifikasi: Lokasi Upacara bagi PNS/PPPK/PPPK Paruh Waktu SDN
   Spreadsheet: SIABA_LOKASI_UPACARA_DB
   Sheet      : Lokasi_Upacara
   ====================================================================== */

const KONFIG_LOKASI_UPACARA = {
  DB_KEY    : "SIABA_LOKASI_UPACARA_DB",
  SHEET_NAMA: "Lokasi_Upacara"
};

/*
 * Struktur kolom sheet Lokasi_Upacara (1-based):
 *  A(1)  Unit Kerja
 *  B(2)  Nama ASN
 *  C(3)  NIP
 *  D(4)  Tanggal
 *  E(5)  Acara
 *  F(6)  Lokasi Upacara
 *  G(7)  Tanggal Kirim
 *  H(8)  User Input (username)
 *  I(9)  Status (Default: Diproses)
 *  J(10) Catatan / Keterangan
 *  K(11) Tanggal Edit
 *  L(12) User Edit
 *  M(13) Tanggal Verifikasi
 *  N(14) Admin Verifikator
 *  O(15) NPSN
 *  P(16) readBy (Status notifikasi dibaca)
 */

// =====================================================================
// 1. READ — Ambil daftar data Lokasi Upacara
// =====================================================================
function getDaftarLokasiUpacara(filterUnit, filterTahun, filterBulan) {
  try {
    var sheet = getSheet(KONFIG_LOKASI_UPACARA.DB_KEY, KONFIG_LOKASI_UPACARA.SHEET_NAMA);
    var data  = sheet.getDataRange().getDisplayValues();
    var result = [];

    var fUnit  = String(filterUnit  || "").trim().toUpperCase();
    var fTahun = String(filterTahun || "").trim();
    var fBulan = String(filterBulan || "").trim();

    Logger.log("getDaftarLokasiUpacara - Input: Unit=" + fUnit + ", Tahun=" + fTahun + ", Bulan=" + fBulan);
    Logger.log("getDaftarLokasiUpacara - Raw data rows count: " + data.length);

    var mapBulan = {
      "Januari":"01","Februari":"02","Maret":"03","April":"04",
      "Mei":"05","Juni":"06","Juli":"07","Agustus":"08",
      "September":"09","Oktober":"10","November":"11","Desember":"12"
    };
    var fBulanAngka = mapBulan[fBulan] || "";

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (!row[1] && !row[2]) continue;

      if (fUnit !== "" && fUnit !== "SEMUA") {
        if (String(row[0]).trim().toUpperCase() !== fUnit) continue;
      }

      var txtTgl = String(row[3]).replace(/'/g, "").trim();
      if (fTahun !== "") {
        var tTahunPendek = fTahun.length === 4 ? fTahun.substring(2) : fTahun;
        if (txtTgl.indexOf(fTahun) === -1 &&
            txtTgl.indexOf("/" + tTahunPendek) === -1 &&
            txtTgl.indexOf("-" + tTahunPendek) === -1) {
          continue;
        }
      }

      if (fBulanAngka !== "") {
        if (txtTgl.indexOf("-" + fBulanAngka + "-") === -1 &&
            txtTgl.indexOf("/" + fBulanAngka + "/") === -1) {
          continue;
        }
      }

      result.push({
        rowBaris : i + 1,
        unit     : row[0],
        nama     : row[1],
        nip      : row[2],
        tanggal  : row[3],
        acara    : row[4],
        lokasi   : row[5],
        tglKirim : row[6],
        userInput: row[7],
        status   : row[8] || "Diproses",
        ket      : row[9] || "",
        tglEdit  : row[10] || "",
        userEdit : row[11] || "",
        tglVerif : row[12] || "",
        adminVerif: row[13] || "",
        npsn     : row[14] || "",
        readBy   : row[15] || ""
      });
    }

    Logger.log("getDaftarLokasiUpacara - Found filtered rows count: " + result.length);
    return JSON.stringify(result);
  } catch (e) {
    Logger.log("getDaftarLokasiUpacara - Error: " + e.message);
    return JSON.stringify({ error: "Error Server: " + e.message });
  }
}

// =====================================================================
// 2. CREATE — Simpan data baru dengan proteksi duplikat NIP+Tanggal
// =====================================================================
function simpanLokasiUpacara(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet(KONFIG_LOKASI_UPACARA.DB_KEY, KONFIG_LOKASI_UPACARA.SHEET_NAMA);
    var data  = sheet.getDataRange().getValues();

    var nipBaru = String(form.nip_asn).replace(/'/g, "").trim();
    var tglBaru = String(form.tanggal).trim();

    var normalizeToYMD = function(s) {
      var c = String(s).replace(/'/g, "").trim();
      if (c.match(/^\d{4}-\d{2}-\d{2}$/)) return c;
      var p = c.split(/[-\/]/);
      if (p.length === 3 && p[0].length <= 2 && p[2].length === 4) {
        return p[2] + "-" + p[1].padStart(2, "0") + "-" + p[0].padStart(2, "0");
      }
      return c;
    };

    for (var i = 1; i < data.length; i++) {
      var rowStatus = String(data[i][8] || "").toLowerCase();
      // Duplikasi dicek jika data belum ditolak
      if (!rowStatus.includes("tolak")) {
        var rowNip = String(data[i][2]).replace(/'/g, "").trim();
        if (rowNip === nipBaru) {
          var rowTgl = normalizeToYMD(String(data[i][3]));
          if (rowTgl === normalizeToYMD(tglBaru)) {
            return "Gagal: Data sudah ada! Satu orang hanya dapat input satu tanggal yang sama.";
          }
        }
      }
    }

    var tglKirim = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var namaUser = form.user_login || "Guest";

    var barisBaru = [
      form.unit_kerja,
      form.nama_asn,
      "'" + nipBaru,
      "'" + tglBaru,
      form.acara,
      form.lokasi_upacara,
      tglKirim,
      namaUser,
      "Diproses", // Status
      "",         // Catatan
      "",         // Tgl Edit
      "",         // User Edit
      "",         // Tgl Verif
      "",         // Admin Verif
      form.npsn || "", // NPSN
      ""          // readBy
    ];

    sheet.appendRow(barisBaru);
    return "Sukses: Data Lokasi Upacara berhasil disimpan.";

  } catch (e) {
    return e.message.includes("lock")
      ? "Error: Sistem sedang sibuk, coba lagi."
      : "Gagal simpan: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// 3. UPDATE — Perbarui data yang sudah ada
// =====================================================================
function updateLokasiUpacara(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet(KONFIG_LOKASI_UPACARA.DB_KEY, KONFIG_LOKASI_UPACARA.SHEET_NAMA);
    var baris = cariBarisLokasiUpacara(sheet, form.recId, form.tglKirim);
    if (baris === -1) throw new Error("Data tidak ditemukan atau sudah dihapus oleh user lain.");

    var valLama = sheet.getRange(baris, 1, 1, 16).getValues()[0];
    var isAdmin = form.isAdmin === true || form.role === "admin";

    if (!isAdmin) {
      var npsnLama = String(valLama[14] || "").trim();
      var userNpsn = String(form.npsn  || "").trim();
      if (userNpsn !== "" && npsnLama !== "" && npsnLama !== userNpsn) {
        return "Gagal: Anda tidak memiliki akses untuk mengubah data dari sekolah lain.";
      }
    }

    var statusLama = String(valLama[8]).trim();
    if (statusLama.toLowerCase().includes("setuju") || statusLama.toLowerCase().includes("ok")) {
      return "Gagal: Data sudah Disetujui dan tidak bisa diedit.";
    }

    var nipBaru = String(form.nip_asn).replace(/'/g, "").trim();
    var tglBaru = String(form.tanggal).trim();
    var data    = sheet.getDataRange().getValues();

    var normalizeToYMD = function(s) {
      var c = String(s).replace(/'/g, "").trim();
      if (c.match(/^\d{4}-\d{2}-\d{2}$/)) return c;
      var p = c.split(/[-\/]/);
      if (p.length === 3 && p[0].length <= 2 && p[2].length === 4) {
        return p[2] + "-" + p[1].padStart(2, "0") + "-" + p[0].padStart(2, "0");
      }
      return c;
    };

    for (var i = 1; i < data.length; i++) {
      if ((i + 1) === baris) continue;
      var rowStatus = String(data[i][8] || "").toLowerCase();
      if (!rowStatus.includes("tolak")) {
        var rowNip = String(data[i][2]).replace(/'/g, "").trim();
        if (rowNip === nipBaru) {
          var rowTgl = normalizeToYMD(String(data[i][3]));
          if (rowTgl === normalizeToYMD(tglBaru)) {
            return "Gagal: Data sudah ada! Satu orang hanya dapat input satu tanggal yang sama.";
          }
        }
      }
    }

    var tglEdit = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(baris, 2).setValue(form.nama_asn);
    sheet.getRange(baris, 3).setValue("'" + nipBaru);
    sheet.getRange(baris, 4).setValue("'" + tglBaru);
    sheet.getRange(baris, 5).setValue(form.acara);
    sheet.getRange(baris, 6).setValue(form.lokasi_upacara);
    
    sheet.getRange(baris, 9).setValue("Diproses"); // Reset status saat edit
    sheet.getRange(baris, 10).setValue("");        // Reset catatan
    sheet.getRange(baris, 11).setValue("'" + tglEdit);
    sheet.getRange(baris, 12).setValue(form.user_login || "Guest");
    sheet.getRange(baris, 13).setValue("");        // Reset tgl verif
    sheet.getRange(baris, 14).setValue("");        // Reset admin verif
    sheet.getRange(baris, 15).setValue(form.npsn || "");
    sheet.getRange(baris, 16).setValue("");        // Reset read status

    return "Sukses: Data Lokasi Upacara berhasil diperbarui.";

  } catch (e) {
    return e.message.includes("lock")
      ? "Error: Sistem sibuk, coba lagi."
      : "Error: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// 4. DELETE — Hapus data dengan kode konfirmasi tanggal hari ini
// =====================================================================
function hapusLokasiUpacara(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet  = getSheet(KONFIG_LOKASI_UPACARA.DB_KEY, KONFIG_LOKASI_UPACARA.SHEET_NAMA);
    var rowIdx = cariBarisLokasiUpacara(sheet, dataKirim.recId, dataKirim.tglKirim);
    if (rowIdx === -1) throw new Error("Data tidak ditemukan atau sudah dihapus oleh user lain.");

    var validCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH");

    var isAdmin = dataKirim.isAdmin === true || dataKirim.role === "admin";
    if (!isAdmin) {
      var valLama  = sheet.getRange(rowIdx, 1, 1, 16).getValues()[0];
      var npsnLama = String(valLama[14] || "").trim();
      var userNpsn = String(dataKirim.npsn || "").trim();
      if (userNpsn !== "" && npsnLama !== "" && npsnLama !== userNpsn) {
        throw new Error("Anda tidak memiliki akses untuk menghapus data dari sekolah lain.");
      }
    }

    sheet.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if (e.message === "KODE_SALAH") return "KODE_SALAH";
    return e.message.includes("lock")
      ? "Sistem sibuk, coba lagi."
      : "Error Server: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// 5. VERIFIKASI — Verifikasi ajuan Lokasi Upacara oleh Admin
// =====================================================================
function verifikasiLokasiUpacara(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet(KONFIG_LOKASI_UPACARA.DB_KEY, KONFIG_LOKASI_UPACARA.SHEET_NAMA);
    var baris = cariBarisLokasiUpacara(sheet, form.recId, form.tglKirim);
    if (baris === -1) throw new Error("Data tidak ditemukan atau sudah dihapus oleh user lain.");

    sheet.getRange(baris, 9).setValue(form.status);
    sheet.getRange(baris, 10).setValue("'" + form.keterangan);
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(baris, 13).setValue("'" + now);
    sheet.getRange(baris, 14).setValue(form.user_verif);

    return "Sukses";
  } catch (e) {
    return e.message.includes("lock") ? "Sistem sibuk, coba lagi." : "Gagal Verifikasi: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// 5a. SEARCH HELPER — Cari baris data secara dinamis (kebal pergeseran baris)
// =====================================================================
function cariBarisLokasiUpacara(sheet, recIdHint, tglKirimTarget) {
  var data = sheet.getDataRange().getDisplayValues();
  var hintIdx = parseInt(recIdHint);
  if (!isNaN(hintIdx) && hintIdx >= 2 && hintIdx <= data.length) {
    var row = data[hintIdx - 1];
    if (String(row[6]).trim() === String(tglKirimTarget).trim()) {
      return hintIdx;
    }
  }
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[6]).trim() === String(tglKirimTarget).trim()) {
      return i + 1;
    }
  }
  return -1;
}

// =====================================================================
// 6. HELPER — Ambil daftar ASN SDN berdasarkan NPSN sekolah user
// =====================================================================
function getDatabasePegawaiSDN(npsn) {
  try {
    var allPegawai = getDatabasePegawai();
    if (!Array.isArray(allPegawai)) return JSON.stringify([]);

    var filtered = allPegawai.filter(function(p) {
      if (!npsn || npsn === "" || npsn === "SEMUA") return true;
      return String(p.npsn || "").trim() === String(npsn).trim();
    });

    if (filtered.length === 0 && npsn && npsn !== "" && npsn !== "SEMUA") {
      filtered = allPegawai;
    }

    return JSON.stringify(filtered);
  } catch (e) {
    Logger.log("getDatabasePegawaiSDN Error: " + e.message);
    return JSON.stringify([]);
  }
}

// =====================================================================
// 7. NOTIFIKASI — Engine Notifikasi Lokasi Upacara
// =====================================================================
function getNotifikasiLokasi(role, unit) {
  try {
    var raw = getDaftarLokasiUpacara();
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
        var isRead = false;
        var readByList = String(row.readBy || "").split(",");
        if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
        if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;

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
          notifList.push({
            rowId: row.rowBaris,
            source: "LOKUPA",
            nama: row.nama,
            unit: row.unit,
            status: status || "Diproses",
            waktu: row.tglVerif && !isDiproses ? row.tglVerif : (row.tglEdit && isDiproses ? row.tglEdit : row.tglKirim),
            isRead: isRead,
            kriteria: row.tanggal + " " + row.acara + " (" + row.lokasi + ")"
          });
        }
      }
    });

    notifList.sort(function(a, b) {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });

    return {
      count: unreadCount,
      recent: notifList.slice(0, 5)
    };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

function tandaiNotifLokasiDibaca(rowId, role) {
  try {
    var sheet = getSheet(KONFIG_LOKASI_UPACARA.DB_KEY, KONFIG_LOKASI_UPACARA.SHEET_NAMA);
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

function tandaiSemuaNotifLokasiDibaca(role, unit) {
  try {
    var sheet = getSheet(KONFIG_LOKASI_UPACARA.DB_KEY, KONFIG_LOKASI_UPACARA.SHEET_NAMA);
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
