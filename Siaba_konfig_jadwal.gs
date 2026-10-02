/* ======================================================================
   SIABA_KONFIG_JADWAL.GS - MANAJEMEN JADWAL KERJA & KALENDER HARI LIBUR
   (Master Configuration Sheet: USER_DB / SPREADSHEET_IDS.USER_DB)
   ====================================================================== */

/**
 * Memastikan sheet SIABA_KONFIG_JAM_KERJA & SIABA_KALENDER_LIBUR tersedia.
 */
function initSiabaKonfigSheets() {
  try {
    const ss = getDB("USER_DB");
    
    // 1. Sheet Master Jam Kerja
    let sheetJadwal = ss.getSheetByName("SIABA_KONFIG_JAM_KERJA");
    if (!sheetJadwal) {
      sheetJadwal = ss.insertSheet("SIABA_KONFIG_JAM_KERJA");
      sheetJadwal.appendRow([
        "Tahun", "Bulan", "Jam_Datang", "Toleransi_Terlambat", 
        "Jam_Pulang", "Hari_Libur_Rutin", "Status", "Updated_At", "Updated_By"
      ]);
      // Baseline Default Tahun 2026
      const bulanArr = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      bulanArr.forEach(function(b) {
        sheetJadwal.appendRow(["2026", b, "07:30", "07:45", "16:00", "Sabtu, Minggu", "Aktif", "01-01-2026 00:00", "System"]);
      });
    }

    // 2. Sheet Kalender Hari Libur
    let sheetLibur = ss.getSheetByName("SIABA_KALENDER_LIBUR");
    if (!sheetLibur) {
      sheetLibur = ss.insertSheet("SIABA_KALENDER_LIBUR");
      sheetLibur.appendRow([
        "Tanggal", "Tahun", "Bulan", "Keterangan_Libur", 
        "Jenis_Libur", "Warna_Badge", "Updated_At", "Updated_By"
      ]);
      // Sampel Hari Libur Tahun 2026
      sheetLibur.appendRow(["2026-01-01", "2026", "Januari", "Tahun Baru 2026 Masehi", "Nasional", "#dc3545", "01-01-2026 00:00", "System"]);
      sheetLibur.appendRow(["2026-08-17", "2026", "Agustus", "Hari Kemerdekaan RI", "Nasional", "#dc3545", "01-01-2026 00:00", "System"]);
    }
  } catch (e) {
    Logger.log("initSiabaKonfigSheets Error: " + e.message);
  }
}

/**
 * Mengambil Konfigurasi Jam Kerja & Kalender Libur untuk Bulan & Tahun tertentu.
 * Dipanggil oleh Frontend Presensi Harian / API backend.
 */
function getSiabaKonfigJadwal(tahun, bulan) {
  try {
    initSiabaKonfigSheets();
    const ss = getDB("USER_DB");
    
    // A. Ambil Jam Kerja
    const sheetJadwal = ss.getSheetByName("SIABA_KONFIG_JAM_KERJA");
    const dataJadwal = sheetJadwal.getDataRange().getDisplayValues();
    
    let configJadwal = {
      tahun: tahun,
      bulan: bulan,
      jamDatang: "07:30",
      toleransiTerlambat: "07:45",
      jamPulang: "16:00",
      hariLiburRutin: ["Sabtu", "Minggu"],
      isDefault: true
    };

    for (let i = 1; i < dataJadwal.length; i++) {
      let r = dataJadwal[i];
      if (String(r[0]).trim() === String(tahun).trim() && String(r[1]).trim().toLowerCase() === String(bulan).trim().toLowerCase()) {
        let liburStr = String(r[5] || "").trim();
        let liburArr = liburStr ? liburStr.split(",").map(function(s){ return s.trim(); }) : ["Sabtu", "Minggu"];
        configJadwal = {
          tahun: r[0],
          bulan: r[1],
          jamDatang: r[2] || "07:30",
          toleransiTerlambat: r[3] || r[2] || "07:45",
          jamPulang: r[4] || "16:00",
          hariLiburRutin: liburArr,
          isDefault: false
        };
        break;
      }
    }

    // B. Ambil Kalender Hari Libur (Tanggal Merah / Cuti Bersama)
    const sheetLibur = ss.getSheetByName("SIABA_KALENDER_LIBUR");
    const dataLibur = sheetLibur.getDataRange().getDisplayValues();
    let daftarLibur = [];

    for (let j = 1; j < dataLibur.length; j++) {
      let r = dataLibur[j];
      let tgl = String(r[0] || "").trim();
      let thn = String(r[1] || "").trim();
      let bln = String(r[2] || "").trim();

      // Cocokkan berdasarkan Tahun & Bulan atau Tanggal
      if ((thn === String(tahun).trim() && bln.toLowerCase() === String(bulan).trim().toLowerCase()) || tgl.indexOf(tahun + "-") === 0) {
        daftarLibur.push({
          tanggal: tgl, // Format YYYY-MM-DD
          keterangan: r[3] || "Hari Libur",
          jenis: r[4] || "Nasional",
          warna: r[5] || "#dc3545"
        });
      }
    }

    return JSON.stringify({
      status: "success",
      jadwal: configJadwal,
      kalenderLibur: daftarLibur
    });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.message });
  }
}

/**
 * Menyimpan / Perbarui Konfigurasi Jam Kerja Bulanan
 */
function simpanSiabaKonfigJadwal(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    initSiabaKonfigSheets();
    
    const tahun = String(payload.tahun || "").trim();
    const bulan = String(payload.bulan || "").trim();
    if (!tahun || !bulan) return JSON.stringify({ status: "error", message: "Tahun dan Bulan wajib diisi." });

    const ss = getDB("USER_DB");
    const sheet = ss.getSheetByName("SIABA_KONFIG_JAM_KERJA");
    const data = sheet.getDataRange().getValues();
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
    const userStr = String(payload.updatedBy || "Admin").trim();

    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === tahun && String(data[i][1]).trim().toLowerCase() === bulan.toLowerCase()) {
        existingRow = i + 1;
        break;
      }
    }

    let hariLiburStr = Array.isArray(payload.hariLiburRutin) ? payload.hariLiburRutin.join(", ") : String(payload.hariLiburRutin || "Sabtu, Minggu");

    let rowData = [
      tahun,
      bulan,
      String(payload.jamDatang || "07:30").trim(),
      String(payload.toleransiTerlambat || payload.jamDatang || "07:45").trim(),
      String(payload.jamPulang || "16:00").trim(),
      hariLiburStr,
      String(payload.status || "Aktif").trim(),
      nowStr,
      userStr
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    SpreadsheetApp.flush();
    // Invalidate cache jika ada
    invalidateCacheKeys(["SIABA_KONFIG_JADWAL_" + tahun + "_" + bulan]);

    return JSON.stringify({ status: "success", message: "Konfigurasi jam kerja berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menyimpan / Perbarui Hari Libur di Kalender
 */
function simpanSiabaHariLibur(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    initSiabaKonfigSheets();

    const tgl = String(payload.tanggal || "").trim(); // YYYY-MM-DD
    if (!tgl) return JSON.stringify({ status: "error", message: "Tanggal libur wajib diisi." });

    const parts = tgl.split("-");
    if (parts.length !== 3) return JSON.stringify({ status: "error", message: "Format tanggal tidak valid (Harus YYYY-MM-DD)." });

    const thn = parts[0];
    const blnNum = parseInt(parts[1], 10);
    const URUTAN_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const blnStr = URUTAN_BULAN[blnNum - 1] || "";

    const ss = getDB("USER_DB");
    const sheet = ss.getSheetByName("SIABA_KALENDER_LIBUR");
    const data = sheet.getDataRange().getValues();
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
    const userStr = String(payload.updatedBy || "Admin").trim();

    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      let rTgl = String(data[i][0] || "").trim();
      if (rTgl === tgl || rTgl.indexOf(tgl) === 0) {
        existingRow = i + 1;
        break;
      }
    }

    let rowData = [
      tgl,
      thn,
      blnStr,
      String(payload.keterangan || "Hari Libur").trim(),
      String(payload.jenis || "Nasional").trim(),
      String(payload.warna || "#dc3545").trim(),
      nowStr,
      userStr
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    SpreadsheetApp.flush();
    return JSON.stringify({ status: "success", message: "Hari libur berhasil disimpan." });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menghapus Hari Libur dari Kalender
 */
function hapusSiabaHariLibur(tanggal) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const tgl = String(tanggal || "").trim();
    if (!tgl) return JSON.stringify({ status: "error", message: "Tanggal tidak valid." });

    const ss = getDB("USER_DB");
    const sheet = ss.getSheetByName("SIABA_KALENDER_LIBUR");
    const data = sheet.getDataRange().getValues();

    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0] || "").trim() === tgl) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return JSON.stringify({ status: "success", message: "Hari libur berhasil dihapus." });
      }
    }
    return JSON.stringify({ status: "error", message: "Data hari libur tidak ditemukan." });
  } catch (e) {
    return JSON.stringify({ status: "error", message: e.message });
  } finally {
    lock.releaseLock();
  }
}
