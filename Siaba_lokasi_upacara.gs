/* ======================================================================
   SIABA_LOKASI_UPACARA.GS
   Modul CRUD: Lokasi Upacara bagi PNS/PPPK/PPPK Paruh Waktu SDN
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
 *  I(9)  NPSN
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
        npsn     : row[8] || ""
      });
    }

    return JSON.stringify(result);
  } catch (e) {
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
      var rowNip = String(data[i][2]).replace(/'/g, "").trim();
      if (rowNip === nipBaru) {
        var rowTgl = normalizeToYMD(String(data[i][3]));
        if (rowTgl === normalizeToYMD(tglBaru)) {
          return "Gagal: Data sudah ada! Satu orang hanya dapat input satu tanggal yang sama.";
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
      form.npsn || ""
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
    var baris = parseInt(form.recId);
    if (isNaN(baris) || baris < 2) throw new Error("ID Baris tidak valid.");

    var valLama = sheet.getRange(baris, 1, 1, 9).getValues()[0];
    var isAdmin = form.isAdmin === true || form.role === "admin";

    if (!isAdmin) {
      var npsnLama = String(valLama[8] || "").trim();
      var userNpsn = String(form.npsn  || "").trim();
      if (userNpsn !== "" && npsnLama !== "" && npsnLama !== userNpsn) {
        return "Gagal: Anda tidak memiliki akses untuk mengubah data dari sekolah lain.";
      }
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
      var rowNip = String(data[i][2]).replace(/'/g, "").trim();
      if (rowNip === nipBaru) {
        var rowTgl = normalizeToYMD(String(data[i][3]));
        if (rowTgl === normalizeToYMD(tglBaru)) {
          return "Gagal: Data sudah ada! Satu orang hanya dapat input satu tanggal yang sama.";
        }
      }
    }

    sheet.getRange(baris, 2).setValue(form.nama_asn);
    sheet.getRange(baris, 3).setValue("'" + nipBaru);
    sheet.getRange(baris, 4).setValue("'" + tglBaru);
    sheet.getRange(baris, 5).setValue(form.acara);
    sheet.getRange(baris, 6).setValue(form.lokasi_upacara);
    sheet.getRange(baris, 9).setValue(form.npsn || "");

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
    var rowIdx = parseInt(dataKirim.recId);
    if (isNaN(rowIdx) || rowIdx < 2) throw new Error("ID Baris tidak valid.");

    var validCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH");

    var isAdmin = dataKirim.isAdmin === true || dataKirim.role === "admin";
    if (!isAdmin) {
      var valLama  = sheet.getRange(rowIdx, 1, 1, 9).getValues()[0];
      var npsnLama = String(valLama[8] || "").trim();
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
// 5. HELPER — Ambil daftar ASN SDN berdasarkan NPSN sekolah user
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
