/* ======================================================================
   MODUL LAYANAN PENGADUAN (VERSI ENTERPRISE - SULTAN GLOBAL BLUEPRINT)
   ====================================================================== */

const KONFIG_ADUAN = {
  DB_KEY: "ADUAN_DB",
  SHEET_NAMA: "Daftar_Aduan",
  get FOLDER_ID() { return FOLDER_CONFIG.ADUAN_DOCS; }
};

/**
 * Mengambil daftar aduan berdasarkan filter Tahun dan Bulan
 */
function getDaftarAduan(tahun, bulan) {
  try {
    var sheet = getSheet(KONFIG_ADUAN.DB_KEY, KONFIG_ADUAN.SHEET_NAMA);
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];

    var fTahun = (tahun) ? String(tahun).trim() : "";
    var mapBulan = { "Januari": "01", "Februari": "02", "Maret": "03", "April": "04", "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08", "September": "09", "Oktober": "10", "November": "11", "Desember": "12" };
    var fBulanAngka = mapBulan[bulan] || "";

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (!row[1] && !row[2]) continue; // Skip jika baris kosong

      var txtTgl = String(row[8]).replace(/'/g, "").trim(); // Index 8: Tanggal Kirim
      if (fTahun !== "") {
        if (txtTgl.indexOf(fTahun) === -1) continue;
      }
      if (fBulanAngka !== "") {
        if (txtTgl.indexOf("-" + fBulanAngka + "-") === -1 && txtTgl.indexOf("/" + fBulanAngka + "/") === -1) continue;
      }

      result.push({
        rowBaris: i + 1,
        npsn: row[1],
        nama: row[2],
        nip: row[3],
        unit: row[4],
        kategori: row[5],
        detail: row[6],
        fileUrl: row[7],
        tglKirim: row[8],
        userInput: row[9],
        status: row[10],
        tindakLanjut: row[11],
        tglVerif: row[12],
        adminVerif: row[13],
        readBy: row[14] || ""
      });
    }
    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: "Error Server: " + e.message });
  }
}

/**
 * Menyimpan aduan baru beserta file lampiran
 */
function simpanAduan(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var sheet = getSheet(KONFIG_ADUAN.DB_KEY, KONFIG_ADUAN.SHEET_NAMA);
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var fileUrl = "";

    if (dataKirim.file && dataKirim.file.data) {
      var targetFolder = DriveApp.getFolderById(KONFIG_ADUAN.FOLDER_ID);
      var fileExt = dataKirim.file.name.split('.').pop();
      var cleanNip = String(dataKirim.nip_asn || "ADUAN").replace(/[^a-zA-Z0-9]/g, "");
      var timeStampName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
      var fileNameBaru = cleanNip + "_" + timeStampName + "." + fileExt;

      var fileBlob = Utilities.newBlob(Utilities.base64Decode(dataKirim.file.data), dataKirim.file.mimeType, fileNameBaru);
      var newFile = targetFolder.createFile(fileBlob);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = newFile.getUrl();
    }

    var lastRow = sheet.getLastRow();
    var newId = lastRow === 1 ? 1 : lastRow; // Dummy sequential ID or rowBaris

    var rowData = [
      newId,
      dataKirim.npsn,
      dataKirim.nama_asn,
      "'" + dataKirim.nip_asn,
      dataKirim.unit_kerja,
      dataKirim.kategori,
      dataKirim.detail,
      fileUrl,
      timestamp,
      dataKirim.user_login,
      "Diproses", // Status awal
      "", // Tindak Lanjut Admin
      "", // Tanggal Verif
      "", // Admin Verifikator
      ""  // Read By
    ];

    sheet.appendRow(rowData);
    // Update Row ID sesungguhnya agar pas dengan barisnya
    var realRow = sheet.getLastRow();
    sheet.getRange(realRow, 1).setValue(realRow);

    return "Sukses Pengaduan Berhasil Disimpan";
  } catch (e) {
    return "Gagal menyimpan aduan: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update Pengaduan oleh Pengaju (Hanya bisa diubah jika status masih 'Diproses')
 */
function updateAduan(form, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheet(KONFIG_ADUAN.DB_KEY, KONFIG_ADUAN.SHEET_NAMA);
    var baris = parseInt(form.recId);

    var rangeLama = sheet.getRange(baris, 1, 1, 15);
    var valLama = rangeLama.getValues()[0];

    var statusLama = String(valLama[10]).trim();
    if (statusLama.toLowerCase() !== "diproses") {
      return "Gagal: Pengaduan sudah diproses atau ditindaklanjuti admin dan tidak dapat diubah.";
    }

    // Validasi Keamanan NPSN jika bukan admin
    var isAdmin = form.isAdmin === true || form.role === 'admin';
    if (!isAdmin) {
      var npsnLama = String(valLama[1]).trim();
      var userNpsn = String(form.npsn || "").trim();
      if (userNpsn !== "" && npsnLama !== "" && npsnLama !== userNpsn) {
        return "Gagal: Anda tidak memiliki otorisasi untuk mengubah data ini.";
      }
    }

    var finalUrl = valLama[7];

    if (fileData && fileData.data) {
      var targetFolder = DriveApp.getFolderById(KONFIG_ADUAN.FOLDER_ID);
      var fileExt = fileData.name.split('.').pop();
      var cleanNip = String(form.nip_asn || "ADUAN").replace(/[^a-zA-Z0-9]/g, "");
      var timeStampName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
      var fileNameBaru = cleanNip + "_" + timeStampName + "." + fileExt;

      var fileBlob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, fileNameBaru);
      var newFile = targetFolder.createFile(fileBlob);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      finalUrl = newFile.getUrl();

      // Hapus file lama jika ada
      try {
        var oldIdMatch = valLama[7].match(/[-\w]{25,}/);
        if (oldIdMatch) DriveApp.getFileById(oldIdMatch[0]).setTrashed(true);
      } catch (e) {
        Logger.log("Gagal menghapus file bukti lama: " + e.message);
      }
    }

    sheet.getRange(baris, 6).setValue(form.kategori);
    sheet.getRange(baris, 7).setValue(form.detail);
    sheet.getRange(baris, 8).setValue(finalUrl);
    sheet.getRange(baris, 15).setValue(""); // Reset status dibaca

    return "Sukses Pengaduan Berhasil Diperbarui";
  } catch (e) {
    return "Gagal memperbarui aduan: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Tindak Lanjut oleh Admin (Verifikasi status aduan)
 */
function verifikasiAduan(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheet(KONFIG_ADUAN.DB_KEY, KONFIG_ADUAN.SHEET_NAMA);
    var baris = parseInt(form.recId);

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(baris, 11).setValue(form.status);
    sheet.getRange(baris, 12).setValue(form.tindakLanjut);
    sheet.getRange(baris, 13).setValue(timestamp);
    sheet.getRange(baris, 14).setValue(form.admin_login);
    sheet.getRange(baris, 15).setValue(""); // Reset status dibaca

    return "Sukses Tindak Lanjut Berhasil Disimpan";
  } catch (e) {
    return "Gagal menyimpan tindak lanjut: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Hapus aduan (Hanya bisa dilakukan jika status masih 'Diproses')
 */
function hapusAduan(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheet(KONFIG_ADUAN.DB_KEY, KONFIG_ADUAN.SHEET_NAMA);
    var baris = parseInt(dataKirim.recId);

    var range = sheet.getRange(baris, 1, 1, 15);
    var values = range.getValues()[0];

    var status = String(values[10]).trim();
    if (status.toLowerCase() !== "diproses") {
      return "Gagal: Pengaduan sudah ditindaklanjuti admin dan tidak dapat dihapus.";
    }

    // Validasi Keamanan NPSN
    var isAdmin = dataKirim.isAdmin === true || dataKirim.role === 'admin';
    if (!isAdmin) {
      var npsnLama = String(values[1]).trim();
      var userNpsn = String(dataKirim.npsn || "").trim();
      if (userNpsn !== "" && npsnLama !== "" && npsnLama !== userNpsn) {
        return "Gagal: Anda tidak memiliki akses untuk menghapus data ini.";
      }
    }

    // Hapus berkas lampiran di Drive jika ada
    var fileUrl = values[7];
    if (fileUrl) {
      try {
        var fileIdMatch = fileUrl.match(/[-\w]{25,}/);
        if (fileIdMatch) {
          DriveApp.getFileById(fileIdMatch[0]).setTrashed(true);
        }
      } catch (e) {
        Logger.log("Gagal menghapus file di Drive: " + e.message);
      }
    }

    sheet.deleteRow(baris);

    // Tata ulang Row ID (Kolom A) agar sesuai urutan baris
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      for (var r = 2; r <= lastRow; r++) {
        sheet.getRange(r, 1).setValue(r);
      }
    }

    return "Sukses Pengaduan Berhasil Dihapus";
  } catch (e) {
    return "Gagal menghapus aduan: " + e.message;
  } finally {
    lock.releaseLock();
  }
}
