/* ======================================================================
   SIABA_KONFIG_JADWAL.GS - MANAJEMEN JADWAL KERJA PEKANAN & KALENDER HARI LIBUR
   (Master Configuration Sheet: USER_DB / SPREADSHEET_IDS.USER_DB)
   ====================================================================== */

function getOrCreateKonfigSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Pangkas kolom gantung & baris berlebih agar tidak menyedot limit 10 juta sel Google Sheets
    if (sheet.getMaxColumns() > 15) {
      sheet.deleteColumns(16, sheet.getMaxColumns() - 15);
    }
    if (sheet.getMaxRows() > 100) {
      sheet.deleteRows(101, sheet.getMaxRows() - 100);
    }
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

/**
 * Memastikan sheet SIABA_KONFIG_JAM_KERJA & SIABA_KALENDER_LIBUR tersedia dengan kolom fleksibel.
 */
function initSiabaKonfigSheets() {
  try {
    const ss = getDBById("177ZPhTuD5lXBDdAWWVpG6bfq6Lz0MDHNvvuwkQFKVYk");
    
    // 1. Sheet Master Jam Kerja
    const headersJadwal = [
      "Tahun", "Bulan", 
      "Jam_Datang_Senin_Kamis", "Toleransi_Terlambat_Senin_Kamis", "Jam_Pulang_Senin_Kamis",
      "Jam_Datang_Jumat", "Toleransi_Terlambat_Jumat", "Jam_Pulang_Jumat",
      "Hari_Libur_Rutin", "Status", "Updated_At", "Updated_By"
    ];
    let sheetJadwal = getOrCreateKonfigSheet(ss, "SIABA_KONFIG_JAM_KERJA", headersJadwal);
    
    if (sheetJadwal.getLastRow() < 2) {
      const bulanArr = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      bulanArr.forEach(function(b) {
        sheetJadwal.appendRow([
          "2026", b, 
          "07:00", "07:00", "15:30", // Senin - Kamis
          "07:00", "07:00", "16:00", // Jumat
          "Sabtu, Minggu", "Aktif", "01-01-2026 00:00", "System"
        ]);
      });
    }

    // 2. Sheet Kalender Hari Libur
    const headersLibur = [
      "Tanggal", "Tahun", "Bulan", "Keterangan_Libur", 
      "Jenis_Libur", "Warna_Badge", "Updated_At", "Updated_By"
    ];
    let sheetLibur = getOrCreateKonfigSheet(ss, "SIABA_KALENDER_LIBUR", headersLibur);
    if (sheetLibur.getLastRow() < 2) {
      sheetLibur.appendRow(["2026-01-01", "2026", "Januari", "Tahun Baru 2026 Masehi", "Nasional", "#dc3545", "01-01-2026 00:00", "System"]);
      sheetLibur.appendRow(["2026-08-17", "2026", "Agustus", "Hari Kemerdekaan RI", "Nasional", "#dc3545", "01-01-2026 00:00", "System"]);
    }
  } catch (e) {
    Logger.log("initSiabaKonfigSheets Error: " + e.message);
  }
}

/**
 * Mengambil Konfigurasi Jam Kerja Pekanan & Kalender Libur untuk Bulan & Tahun tertentu.
 */
function getSiabaKonfigJadwal(tahun, bulan) {
  try {
    initSiabaKonfigSheets();
    const ss = getDBById("177ZPhTuD5lXBDdAWWVpG6bfq6Lz0MDHNvvuwkQFKVYk");
    
    // A. Ambil Jam Kerja
    const sheetJadwal = ss.getSheetByName("SIABA_KONFIG_JAM_KERJA");
    const dataJadwal = (sheetJadwal && sheetJadwal.getLastRow() > 0) ? sheetJadwal.getDataRange().getDisplayValues() : [];
    
    let configJadwal = {
      tahun: tahun,
      bulan: bulan,
      jamDatangSeninKamis: "07:00",
      toleransiTerlambatSeninKamis: "07:00",
      jamPulangSeninKamis: "15:30",
      jamDatangJumat: "07:00",
      toleransiTerlambatJumat: "07:00",
      jamPulangJumat: "16:00",
      hariLiburRutin: ["Sabtu", "Minggu"],
      isDefault: true
    };

    if (dataJadwal.length > 1) {
      for (let i = 1; i < dataJadwal.length; i++) {
        let r = dataJadwal[i];
        if (String(r[0]).trim() === String(tahun).trim() && String(r[1]).trim().toLowerCase() === String(bulan).trim().toLowerCase()) {
          let liburStr = String(r[8] || r[5] || "").trim();
          let liburArr = liburStr ? liburStr.split(",").map(function(s){ return s.trim(); }) : ["Sabtu", "Minggu"];
          
          configJadwal = {
            tahun: r[0],
            bulan: r[1],
            jamDatangSeninKamis: r[2] || "07:00",
            toleransiTerlambatSeninKamis: r[3] || r[2] || "07:00",
            jamPulangSeninKamis: r[4] || "15:30",
            jamDatangJumat: r[5] || "07:00",
            toleransiTerlambatJumat: r[6] || r[5] || "07:00",
            jamPulangJumat: r[7] || "16:00",
            hariLiburRutin: liburArr,
            isDefault: false
          };
          break;
        }
      }
    }

    // B. Ambil Kalender Hari Libur (Tanggal Merah / Cuti Bersama)
    const sheetLibur = ss.getSheetByName("SIABA_KALENDER_LIBUR");
    const dataLibur = (sheetLibur && sheetLibur.getLastRow() > 0) ? sheetLibur.getDataRange().getDisplayValues() : [];
    let daftarLibur = [];

    if (dataLibur.length > 1) {
      for (let j = 1; j < dataLibur.length; j++) {
        let r = dataLibur[j];
        let tgl = String(r[0] || "").trim();
        let thn = String(r[1] || "").trim();
        let bln = String(r[2] || "").trim();

        // Jika bulan tidak difilter (kosong/Semua Bulan) atau bulan cocok dengan filter
        const matchesBulan = !bulan || bln.toLowerCase() === String(bulan).trim().toLowerCase();
        const matchesTahun = !tahun || thn === String(tahun).trim() || tgl.indexOf(tahun + "-") === 0;

        if (matchesTahun && matchesBulan) {
          daftarLibur.push({
            tanggal: tgl, // Format YYYY-MM-DD
            tahun: thn,
            bulan: bln,
            keterangan: r[3] || "Hari Libur",
            jenis: r[4] || "Nasional",
            warna: r[5] || "#dc3545"
          });
        }
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
 * Menyimpan / Perbarui Konfigurasi Jam Kerja Pekanan Bulanan
 */
function simpanSiabaKonfigJadwal(payloadStr) {
  // Terima JSON string dari frontend untuk menghindari masalah serialisasi object/array
  let payload;
  try {
    payload = (typeof payloadStr === "string") ? JSON.parse(payloadStr) : payloadStr;
  } catch (parseErr) {
    return JSON.stringify({ status: "error", message: "Payload tidak valid (JSON parse error): " + parseErr.message });
  }

  // Inisialisasi sheet SEBELUM lock untuk hindari deadlock
  try { initSiabaKonfigSheets(); } catch (initErr) {
    Logger.log("initSiabaKonfigSheets error: " + initErr.message);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const tahun = String(payload.tahun || "").trim();
    const bulan = String(payload.bulan || "").trim();
    if (!tahun || !bulan) return JSON.stringify({ status: "error", message: "Tahun dan Bulan wajib diisi." });

    const ss = getDBById("177ZPhTuD5lXBDdAWWVpG6bfq6Lz0MDHNvvuwkQFKVYk");
    const headersJadwal = [
      "Tahun", "Bulan",
      "Jam_Datang_Senin_Kamis", "Toleransi_Terlambat_Senin_Kamis", "Jam_Pulang_Senin_Kamis",
      "Jam_Datang_Jumat", "Toleransi_Terlambat_Jumat", "Jam_Pulang_Jumat",
      "Hari_Libur_Rutin", "Status", "Updated_At", "Updated_By"
    ];
    const sheet = getOrCreateKonfigSheet(ss, "SIABA_KONFIG_JAM_KERJA", headersJadwal);

    const lastRow = sheet.getLastRow();
    const data = (lastRow > 0) ? sheet.getDataRange().getValues() : [];
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
    const userStr = String(payload.updatedBy || "Admin").trim();

    let existingRow = -1;
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === tahun && String(data[i][1]).trim().toLowerCase() === bulan.toLowerCase()) {
          existingRow = i + 1;
          break;
        }
      }
    }

    let hariLiburArr = payload.hariLiburRutin;
    if (!Array.isArray(hariLiburArr)) {
      hariLiburArr = String(hariLiburArr || "Sabtu, Minggu").split(",").map(function(s){ return s.trim(); });
    }
    let hariLiburStr = hariLiburArr.join(", ");

    let rowData = [
      tahun,
      bulan,
      String(payload.jamDatangSeninKamis || "07:30").trim(),
      String(payload.toleransiTerlambatSeninKamis || payload.jamDatangSeninKamis || "07:45").trim(),
      String(payload.jamPulangSeninKamis || "16:00").trim(),
      String(payload.jamDatangJumat || "07:30").trim(),
      String(payload.toleransiTerlambatJumat || payload.jamDatangJumat || "07:45").trim(),
      String(payload.jamPulangJumat || "16:30").trim(),
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
    try { invalidateCacheKeys(["SIABA_KONFIG_JADWAL_" + tahun + "_" + bulan]); } catch(e2) {}

    return JSON.stringify({ status: "success", message: "Konfigurasi jam kerja pekanan berhasil disimpan." });
  } catch (e) {
    Logger.log("simpanSiabaKonfigJadwal ERROR: " + e.message + " | stack: " + e.stack);
    return JSON.stringify({ status: "error", message: e.message });
  } finally {
    try { lock.releaseLock(); } catch(le) {}
  }
}

/**
 * Menyimpan / Perbarui Hari Libur di Kalender
 */
function simpanSiabaHariLibur(payloadStr) {
  // Terima JSON string dari frontend untuk menghindari masalah serialisasi
  let payload;
  try {
    payload = (typeof payloadStr === "string") ? JSON.parse(payloadStr) : payloadStr;
  } catch (parseErr) {
    return JSON.stringify({ status: "error", message: "Payload tidak valid: " + parseErr.message });
  }

  // Inisialisasi SEBELUM lock
  try { initSiabaKonfigSheets(); } catch (initErr) {
    Logger.log("initSiabaKonfigSheets error: " + initErr.message);
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const tgl = String(payload.tanggal || "").trim(); // YYYY-MM-DD
    if (!tgl) return JSON.stringify({ status: "error", message: "Tanggal libur wajib diisi." });

    const parts = tgl.split("-");
    if (parts.length !== 3) return JSON.stringify({ status: "error", message: "Format tanggal tidak valid (Harus YYYY-MM-DD)." });

    const thn = parts[0];
    const blnNum = parseInt(parts[1], 10);
    const URUTAN_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const blnStr = URUTAN_BULAN[blnNum - 1] || "";

    const ss = getDBById("177ZPhTuD5lXBDdAWWVpG6bfq6Lz0MDHNvvuwkQFKVYk");
    const headersLibur = [
      "Tanggal", "Tahun", "Bulan", "Keterangan_Libur",
      "Jenis_Libur", "Warna_Badge", "Updated_At", "Updated_By"
    ];
    const sheet = getOrCreateKonfigSheet(ss, "SIABA_KALENDER_LIBUR", headersLibur);

    const data = (sheet.getLastRow() > 0) ? sheet.getDataRange().getValues() : [];
    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
    const userStr = String(payload.updatedBy || "Admin").trim();

    let existingRow = -1;
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        let rTgl = String(data[i][0] || "").trim();
        if (rTgl === tgl || rTgl.indexOf(tgl) === 0) {
          existingRow = i + 1;
          break;
        }
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
    Logger.log("simpanSiabaHariLibur ERROR: " + e.message + " | stack: " + e.stack);
    return JSON.stringify({ status: "error", message: e.message });
  } finally {
    try { lock.releaseLock(); } catch(le) {}
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

    const ss = getDBById("177ZPhTuD5lXBDdAWWVpG6bfq6Lz0MDHNvvuwkQFKVYk");
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
