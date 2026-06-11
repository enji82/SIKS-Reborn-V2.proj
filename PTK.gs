/* ======================================================================
   MODUL: KELOLA PTK SD
   Spreadsheet ID: 1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE
   Sheet: Master Data GTK
   ====================================================================== */

const KONFIG_PTK = {
  DB_KEY: "PTK_DB",
  SHEET_PTK: "Master Data GTK"
};

// 1. AMBIL OPSI FILTER (UNIT & STATUS)
function getFilterOptionsPTK() {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = "ptk_filter_options";
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    if (!sheet) return JSON.stringify({ units: [], statuses: [] });
    
    var lastRow = sheet.getLastRow();
    if(lastRow < 2) return JSON.stringify({ units: [], statuses: [] });

    var data = sheet.getRange(2, 1, lastRow - 1, 20).getValues(); // Diperlebar
    var unitSet = new Set();
    var statusSet = new Set();
    
    for(var i=0; i<data.length; i++){
        if(data[i][2]) unitSet.add(String(data[i][2]).trim());
        if(data[i][19]) statusSet.add(String(data[i][19]).trim()); // Status Pegawai bergeser ke T (19)
    }
    
    const result = JSON.stringify({ units: Array.from(unitSet).sort(), statuses: Array.from(statusSet).sort() });
    cache.put(cacheKey, result, 3600);
    return result;
  } catch(e) { return JSON.stringify({ error: "Terjadi kesalahan saat mengambil filter." }); }
}

function invalidatePtkSdnDataCache_() {
  if (typeof invalidatePtkSdnCache === "function") invalidatePtkSdnCache();
}

// 2. AMBIL DATA UTAMA (cache + baca kolom terbatas)
function buildPtkListSdn_() {
  var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 37).getValues();
  var sheetUsulan = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
  var usulanData = sheetUsulan ? sheetUsulan.getDataRange().getValues() : [];
  var pendingPtkIds = {};
  for (var j = 1; j < usulanData.length; j++) {
    if (usulanData[j][7] === "Pending" && String(usulanData[j][3]).indexOf("PTK Baru") === 0) {
      pendingPtkIds[String(usulanData[j][1])] = true;
    }
  }

  var result = [];
  var tz = Session.getScriptTimeZone();
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    result.push({
      id: row[0],
      npsn: row[1],
      unit: row[2],
      gelar_depan: row[3],
      nama_no_gelar: row[4],
      gelar_belakang: row[5],
      nama_lengkap: row[6],
      nip: row[7],
      tmp_lahir: row[8],
      tgl_lahir: parseIndoDate(row[9]),
      nik: row[10],
      lp: row[11],
      agama: row[12],
      pendidikan: row[13],
      jurusan: row[14],
      thn_lulus: row[15],
      alamat_ktp: row[16],
      alamat_domisili: row[17],
      hp: row[18],
      status_peg: row[19],
      jabatan: row[20],
      tmt_jabatan: parseIndoDate(row[21]),
      pangkat: row[22],
      tmt_gol: parseIndoDate(row[23]),
      mkg: row[24],
      tugas: row[25],
      nuptk: row[26],
      serdik: row[27],
      dapodik: row[28],
      tugtam: row[29],
      email: row[30],
      diinput: row[31] ? Utilities.formatDate(new Date(row[31]), tz, "dd/MM/yy HH:mm") : "",
      user_input: row[32],
      diedit: row[33] ? Utilities.formatDate(new Date(row[33]), tz, "dd/MM/yy HH:mm") : "",
      user_edit: row[34],
      jenis_dok: row[35] || "",
      file_url: row[36] || "",
      is_pending_baru: !!pendingPtkIds[String(row[0])]
    });
  }
  return result;
}

function getDataPTKSD(filterUnit, filterStatus) {
  try {
    var all = getCachedData("PTK_LIST_SDN", buildPtkListSdn_, 300);
    var fu = String(filterUnit || "").trim();
    var fs = String(filterStatus || "").trim();
    if (!fu && !fs) return JSON.stringify(all);

    var filtered = all.filter(function(item) {
      var okUnit = !fu || fu === "SEMUA" || String(item.unit).trim() === fu;
      var okStatus = !fs || fs === "SEMUA" || String(item.status_peg).trim() === fs;
      return okUnit && okStatus;
    });
    return JSON.stringify(filtered);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * RIWAYAT PEMBARUAN: Ambil data lengkap untuk monitoring pembaruan data PTK SDN.
 * Membaca kolom A, B, C, G, H, T, U, AF, AG, AH, AI dari sheet Master Data GTK.
 * Kalkulasi Sudah/Belum dilakukan di frontend berdasarkan cutoff date yang disimpan admin.
 */
function getDataRiwayatPembaruan() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    if (!sheet) return JSON.stringify({ data: [], lapbulMap: {} });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ data: [], lapbulMap: {} });

    // Baca A (1) s.d. AI (35) → 35 kolom, indeks 0–34
    var data = sheet.getRange(2, 1, lastRow - 1, 35).getValues();
    var tz = Session.getScriptTimeZone();
    var result = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; // Lewati baris kosong

      // Helper: format date object → string DD/MM/YYYY HH:mm, atau "" jika kosong
      var fmtDate = function(val) {
        if (!val || val === "") return "";
        try {
          var d = (val instanceof Date) ? val : new Date(val);
          if (isNaN(d.getTime())) return "";
          return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm");
        } catch(e) { return ""; }
      };

      // Tanggal input baru (kolom AF = index 31) dan tanggal diperbarui (kolom AH = index 33)
      var tglInputBaru  = fmtDate(row[31]); // AF
      var tglDiperbarui = fmtDate(row[33]); // AH

      // Timestamp mentah (ms) untuk kalkulasi MAX di frontend
      var tsInputBaru  = (row[31] && row[31] instanceof Date) ? row[31].getTime() : 0;
      var tsDiperbarui = (row[33] && row[33] instanceof Date) ? row[33].getTime() : 0;
      var tsEfektif    = Math.max(tsInputBaru, tsDiperbarui);

      result.push({
        id          : row[0],
        npsn        : row[1],
        unit        : row[2],
        nama_lengkap: row[6],
        nip         : row[7],
        status_peg  : row[19],
        jabatan     : row[20],
        tgl_input_baru  : tglInputBaru,
        user_input_baru : row[32] || "",      // AG
        tgl_diperbarui  : tglDiperbarui,
        user_diperbarui : row[34] || "",      // AI
        ts_efektif      : tsEfektif           // ms, untuk perbandingan di frontend
      });
    }
    var lapbulMap = getJumlahLapbulSdnMap_();
    return JSON.stringify({
      data: result,
      lapbulMap: lapbulMap
    });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * RIWAYAT PEMBARUAN: Simpan tanggal cutoff (batas pembaruan) yang ditetapkan Admin.
 * Disimpan di Script Properties sehingga persisten lintas sesi.
 * @param {string} dateStr  Format "YYYY-MM-DD" (dari input type="date" HTML)
 * @returns {string} JSON { success: true } atau { error: "..." }
 */
function saveTanggalCutoffPembaruan(dateStr) {
  try {
    if (!dateStr) return JSON.stringify({ error: "Tanggal tidak boleh kosong." });
    PropertiesService.getScriptProperties().setProperty("PEMBARUAN_CUTOFF_DATE", String(dateStr).trim());
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * RIWAYAT PEMBARUAN: Ambil tanggal cutoff yang telah disimpan.
 * @returns {string} JSON { date: "YYYY-MM-DD" } atau { date: "" } jika belum pernah diset
 */
function getTanggalCutoffPembaruan() {
  try {
    var d = PropertiesService.getScriptProperties().getProperty("PEMBARUAN_CUTOFF_DATE") || "";
    return JSON.stringify({ date: d });
  } catch (e) {
    return JSON.stringify({ date: "" });
  }
}

/**
 * SDS RIWAYAT PEMBARUAN: Ambil data lengkap untuk monitoring pembaruan data PTK SDS.
 */
function getDataRiwayatPembaruanSds() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS");
    if (!sheet) return JSON.stringify({ data: [], lapbulMap: {} });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ data: [], lapbulMap: {} });

    var data = sheet.getRange(2, 1, lastRow - 1, 32).getValues();
    var tz = Session.getScriptTimeZone();
    var result = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; 

      var fmtDate = function(val) {
        if (!val || val === "") return "";
        try {
          var d = (val instanceof Date) ? val : new Date(val);
          if (isNaN(d.getTime())) return "";
          return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm");
        } catch(e) { return ""; }
      };

      var tglInputBaru  = fmtDate(row[28]); // AC
      var tglDiperbarui = fmtDate(row[30]); // AE

      var tsInputBaru  = (row[28] && row[28] instanceof Date) ? row[28].getTime() : 0;
      var tsDiperbarui = (row[30] && row[30] instanceof Date) ? row[30].getTime() : 0;
      var tsEfektif    = Math.max(tsInputBaru, tsDiperbarui);

      result.push({
        id          : row[0],
        npsn        : row[1],
        unit        : row[2],
        nama_lengkap: row[6],
        niy         : row[7],
        status_peg  : row[19],
        jabatan     : row[20],
        tgl_input_baru  : tglInputBaru,
        user_input_baru : row[29] || "",      // AD
        tgl_diperbarui  : tglDiperbarui,
        user_diperbarui : row[31] || "",      // AF
        ts_efektif      : tsEfektif
      });
    }
    var lapbulMap = getJumlahLapbulSdsMap_();
    return JSON.stringify({
      data: result,
      lapbulMap: lapbulMap
    });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function saveTanggalCutoffPembaruanSds(dateStr) {
  try {
    if (!dateStr) return JSON.stringify({ error: "Tanggal tidak boleh kosong." });
    PropertiesService.getScriptProperties().setProperty("PEMBARUAN_CUTOFF_DATE_SDS", String(dateStr).trim());
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function getTanggalCutoffPembaruanSds() {
  try {
    var d = PropertiesService.getScriptProperties().getProperty("PEMBARUAN_CUTOFF_DATE_SDS") || "";
    return JSON.stringify({ date: d });
  } catch (e) {
    return JSON.stringify({ date: "" });
  }
}

/**
 * PAUD RIWAYAT PEMBARUAN: Ambil data lengkap untuk monitoring pembaruan data PTK PAUD.
 */
function getDataRiwayatPembaruanPaud() {
  try {
    var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK);
    if (!sheet) return JSON.stringify({ data: [], lapbulMap: {} });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ data: [], lapbulMap: {} });

    var data = sheet.getRange(2, 1, lastRow - 1, 33).getValues();
    var tz = Session.getScriptTimeZone();
    var result = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue; 

      var fmtDate = function(val) {
        if (!val || val === "") return "";
        try {
          var d = (val instanceof Date) ? val : new Date(val);
          if (isNaN(d.getTime())) return "";
          return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm");
        } catch(e) { return ""; }
      };

      var tglInputBaru  = fmtDate(row[29]); // AD
      var tglDiperbarui = fmtDate(row[31]); // AF

      var tsInputBaru  = (row[29] && row[29] instanceof Date) ? row[29].getTime() : 0;
      var tsDiperbarui = (row[31] && row[31] instanceof Date) ? row[31].getTime() : 0;
      var tsEfektif    = Math.max(tsInputBaru, tsDiperbarui);

      result.push({
        id          : row[0],
        npsn        : row[1],
        unit        : row[2], // C
        jenjang     : row[3], // D
        nama_lengkap: row[7], // H
        niy         : row[8], // I
        status_peg  : row[20], // U
        jabatan     : row[21], // V
        tgl_input_baru  : tglInputBaru,
        user_input_baru : row[30] || "",      // AE
        tgl_diperbarui  : tglDiperbarui,
        user_diperbarui : row[32] || "",      // AG
        ts_efektif      : tsEfektif
      });
    }
    var lapbulMap = getJumlahLapbulPaudMap_();
    return JSON.stringify({
      data: result,
      lapbulMap: lapbulMap
    });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function saveTanggalCutoffPembaruanPaud(dateStr) {
  try {
    if (!dateStr) return JSON.stringify({ error: "Tanggal tidak boleh kosong." });
    PropertiesService.getScriptProperties().setProperty("PEMBARUAN_CUTOFF_DATE_PAUD", String(dateStr).trim());
    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function getTanggalCutoffPembaruanPaud() {
  try {
    var d = PropertiesService.getScriptProperties().getProperty("PEMBARUAN_CUTOFF_DATE_PAUD") || "";
    return JSON.stringify({ date: d });
  } catch (e) {
    return JSON.stringify({ date: "" });
  }
}

/**
 * API Ringan: Ambil data proyeksi pensiun SDN
 * Hanya mengambil kolom yang diperlukan untuk perhitungan pensiun.
 * Filter: PNS, PPPK, PPPK Paruh Waktu
 */
function getDataProyeksiPensiunSDN() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    if (!sheet) return JSON.stringify([]);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);

    // Ambil kolom: A(id), B(npsn), C(unit), G(nama_lengkap), H(nip), J(tgl_lahir), T(status_peg), U(jabatan)
    var data = sheet.getRange(2, 1, lastRow - 1, 21).getValues();
    var statusValid = ["PNS", "CPNS", "PPPK", "PPPK PARUH WAKTU"];
    var result = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;

      var statusRaw = String(row[19] || "").trim().toUpperCase();
      if (statusValid.indexOf(statusRaw) === -1) continue;

      var tglLahir = parseIndoDate(row[9]);
      if (!tglLahir) continue; // Lewati jika tanggal lahir kosong

      result.push({
        nama: row[6] || "",
        nip: row[7] || "",
        unit: row[2] || "",
        tgl_lahir: tglLahir,
        status_peg: row[19] || "",
        jabatan: row[20] || ""
      });
    }
    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify([]);
  }
}

/**
 * Tulis ulang kolom D-AL (4-38) satu baris Master PTK dalam satu setValues.
 */
function applyPtkMasterRowUpdate_(sheet, rowIndex, form, extras) {
  extras = extras || {};
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var mkg = "";
  if (form.mkg_thn || form.mkg_bln) {
    mkg = (form.mkg_thn || "0") + " Tahun " + (form.mkg_bln || "0") + " Bulan";
  }
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
  var user = form.user_login || "Admin";

  if (form.npsn_baru && form.unit_kerja) {
    var npsnVal = parseInt(String(form.npsn_baru).replace(/[^0-9]/g, ''), 10);
    sheet.getRange(rowIndex, 2, 1, 2).setValues([[
      isNaN(npsnVal) ? form.npsn_baru : npsnVal,
      form.unit_kerja
    ]]);
  }

  var rowSlice = sheet.getRange(rowIndex, 4, 1, 35).getValues()[0];
  rowSlice[0] = form.gelar_depan || "";
  rowSlice[1] = form.nama_lengkap || "";
  rowSlice[2] = form.gelar_belakang || "";
  rowSlice[3] = namaFull;
  rowSlice[4] = "'" + (form.nip || "");
  rowSlice[5] = form.tmp_lahir || "";
  rowSlice[6] = convertStringToDate_(form.tgl_lahir);
  rowSlice[7] = "'" + (form.nik || "");
  rowSlice[8] = form.lp || "";
  rowSlice[9] = form.agama || "";
  rowSlice[10] = form.pendidikan || "";
  rowSlice[11] = form.jurusan || "";
  rowSlice[12] = form.thn_lulus || "";
  rowSlice[13] = form.alamat_ktp || "";
  rowSlice[14] = form.alamat_domisili || "";
  rowSlice[15] = "'" + (form.hp || "");
  rowSlice[16] = form.status_peg || "";
  rowSlice[17] = form.jabatan || "";
  rowSlice[18] = convertStringToDate_(form.tmt_jabatan);
  rowSlice[19] = form.pangkat || "";
  rowSlice[20] = convertStringToDate_(form.tmt_gol);
  rowSlice[21] = mkg;
  rowSlice[22] = form.tugas || "";
  rowSlice[23] = "'" + (form.nuptk || "");
  rowSlice[24] = form.serdik || "";
  rowSlice[25] = form.dapodik || "";
  rowSlice[26] = form.tugtam || "";
  rowSlice[27] = form.email || "";
  // rowSlice[28-29] = AG/AH diinput (timestamp, user_input) - pertahankan
  rowSlice[30] = now;
  rowSlice[31] = user;
  if (extras.jenisDokumen) rowSlice[32] = extras.jenisDokumen;
  if (extras.fileUrl) rowSlice[33] = extras.fileUrl;
  
  if (extras.newArchive) {
    rowSlice[34] = extras.newArchive;
  } else {
    rowSlice[34] = rowSlice[34] || "";
  }

  sheet.getRange(rowIndex, 4, 1, 35).setValues([rowSlice]);
}

// 3. UPDATE DATA PTK
function updateDataPTK(form, base64Data, fileName, jenisDokumen) {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for(var i=1; i<data.length; i++){ if(String(data[i][0]) === String(form.id)){ rowIndex = i + 1; break; } }
    if(rowIndex === -1) return "Error: ID PTK tidak ditemukan.";

    var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, '');
    if (inputNip !== "" && inputNip !== "-") {
        for (var i = 1; i < data.length; i++) {
            var rowNip = String(data[i][7]).replace(/[^0-9]/g, ''); 
            var rowId = String(data[i][0]);
            if (rowNip === inputNip && rowId !== String(form.id)) return "Gagal: NIP " + inputNip + " sudah dipakai oleh " + data[i][6];
        }
    }

    var extras = {};
    if (jenisDokumen) extras.jenisDokumen = jenisDokumen;

    if (base64Data && fileName) {
      try {
        var oldFileUrl = data[rowIndex - 1][36];
        var oldJenisDok = data[rowIndex - 1][35];
        if (oldFileUrl && oldFileUrl !== "-" && oldFileUrl !== "") {
          var oldArchive = data[rowIndex - 1].length > 37 ? String(data[rowIndex - 1][37] || "").trim() : "";
          var newDocInfo = (oldJenisDok || "Dokumen") + ": " + oldFileUrl + " (Diubah oleh " + (form.user_login || "Admin") + " pada " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm") + ")";
          extras.newArchive = oldArchive ? oldArchive + "\n" + newDocInfo : newDocInfo;
        }

        var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB";
        var folder = DriveApp.getFolderById(folderId);
        var fileBytes = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName || "dokumen_ptk_edit.pdf");
        extras.fileUrl = folder.createFile(blob).getUrl();
      } catch(uploadErr) {
        Logger.log("Upload edit gagal: " + uploadErr.message);
      }
    }

    applyPtkMasterRowUpdate_(sheet, rowIndex, form, extras);
    invalidatePtkSdnDataCache_();

    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
}

// 4. INSERT DATA PTK (AUTO FILL LOGIC)
function insertDataPTK(form, base64Data, fileName, jenisDokumen, userPengusul) {
  var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
  if (!sheet) return "Error: Sheet 'Master Data GTK' tidak ditemukan.";

  // Deteksi Ganda NIP
  var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, ''); 
  if (inputNip !== "" && inputNip !== "-") {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var rowNip = String(data[i][7]).replace(/[^0-9]/g, ''); 
        if (rowNip === inputNip) return "Gagal: NIP " + inputNip + " sudah terdaftar atas nama " + data[i][6];
      }
  }

  // Deteksi Ganda NIK
  var inputNik = String(form.nik || "").trim().replace(/[^0-9]/g, ''); 
  if (inputNik !== "" && inputNik !== "-") {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var rowNik = String(data[i][10]).replace(/[^0-9]/g, ''); // Kolom K (10)
        if (rowNik === inputNik) return "Gagal: NIK " + inputNik + " sudah terdaftar atas nama " + data[i][6];
      }
  }

  var newId = "GTK-" + new Date().getTime();
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var mkg = ""; if (form.mkg_thn || form.mkg_bln) { mkg = (form.mkg_thn || "0") + " Tahun " + (form.mkg_bln || "0") + " Bulan"; }
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  var fileUrl = "-";
  var jenisDok = jenisDokumen || "-";

  // Upload dokumen ke Google Drive jika ada
  if (base64Data && fileName) {
    try {
      var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB";
      var folder = DriveApp.getFolderById(folderId);
      var fileBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName || "dokumen_ptk_baru.pdf");
      var file = folder.createFile(blob);
      fileUrl = file.getUrl();
    } catch(uploadErr) {
      Logger.log("Upload dokumen gagal: " + uploadErr.message);
      // Tetap lanjutkan proses simpan data meskipun upload gagal
    }
  }

  var rawNpsn = form.npsn_baru || form.npsn_login || "";
  var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
  var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;

  var rowData = [
      newId,                  // A (0)
      finalNpsn,              // B (1)
      form.unit_kerja || form.unit_login || "", // C (2)
      form.gelar_depan || "", // D (3)
      form.nama_lengkap || "",// E (4)
      form.gelar_belakang || "",// F (5)
      namaFull || "",         // G (6)
      "'" + (form.nip || ""), // H (7)
      form.tmp_lahir || "",   // I (8)
      convertStringToDate_(form.tgl_lahir),   // J (9)
      "'" + (form.nik || ""), // K (10)
      form.lp || "",          // L (11)
      form.agama || "",       // M (12)
      form.pendidikan || "",  // N (13)
      form.jurusan || "",     // O (14)
      form.thn_lulus || "",   // P (15)
      form.alamat_ktp || "",  // Q (16)
      form.alamat_domisili || "", // R (17)
      "'" + (form.hp || ""),  // S (18)
      form.status_peg || "",  // T (19)
      form.jabatan || "",     // U (20)
      convertStringToDate_(form.tmt_jabatan), // V (21)
      form.pangkat || "",     // W (22)
      convertStringToDate_(form.tmt_gol),     // X (23)
      mkg,                    // Y (24) 
      form.tugas || "",       // Z (25)
      "'" + (form.nuptk || ""),// AA (26)
      form.serdik || "",      // AB (27)
      form.dapodik || "",     // AC (28)
      form.tugtam || "",      // AD (29)
      form.email || "",       // AE (30) 
      timestamp,              // AF (31)
      form.user_login || "",  // AG (32)
      "",                     // AH (33)
      "",                     // AI (34)
      jenisDok,               // AJ (35)
      fileUrl,                // AK (36)
      ""                      // AL (37)
  ];

  sheet.appendRow(rowData);
  invalidatePtkSdnDataCache_();

  return "Sukses";
}

// 5. REVISI DATA PTK BARU (Tanpa Insert Baru)
function revisiUsulanPTKBaru(form, base64Data, fileName, jenisDokumen, userPengusul) {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    if (!sheet) return "Error: Sheet 'Master Data GTK' tidak ditemukan.";
    var data = sheet.getDataRange().getValues();
    
    var rowIndex = -1;
    for(var i=1; i<data.length; i++){ 
      if(String(data[i][0]) === String(form.id)){ rowIndex = i + 1; break; } 
    }
    if(rowIndex === -1) return "Error: ID PTK (" + form.id + ") tidak ditemukan di Master.";

    var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, '');
    if (inputNip !== "" && inputNip !== "-") {
        for (var i = 1; i < data.length; i++) {
            var rowNip = String(data[i][7]).replace(/[^0-9]/g, ''); 
            var rowId = String(data[i][0]);
            if (rowNip === inputNip && rowId !== String(form.id)) return "Gagal: NIP " + inputNip + " sudah dipakai oleh " + data[i][6];
        }
    }

    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
    var mkg = ""; if (form.mkg_thn || form.mkg_bln) { mkg = (form.mkg_thn || "0") + " Tahun " + (form.mkg_bln || "0") + " Bulan"; }
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    var user = form.user_login || "Admin";

    // Update Master Data
    sheet.getRange(rowIndex, 4).setValue(form.gelar_depan || "");         
    sheet.getRange(rowIndex, 5).setValue(form.nama_lengkap || "");        
    sheet.getRange(rowIndex, 6).setValue(form.gelar_belakang || "");      
    sheet.getRange(rowIndex, 7).setValue(namaFull);                       
    sheet.getRange(rowIndex, 8).setValue("'"+(form.nip || ""));           
    sheet.getRange(rowIndex, 9).setValue(form.tmp_lahir || "");           
    sheet.getRange(rowIndex, 10).setValue(convertStringToDate_(form.tgl_lahir));    
    sheet.getRange(rowIndex, 11).setValue("'"+(form.nik || ""));          
    sheet.getRange(rowIndex, 12).setValue(form.lp || "");                 
    sheet.getRange(rowIndex, 13).setValue(form.agama || "");              
    sheet.getRange(rowIndex, 14).setValue(form.pendidikan || "");         
    sheet.getRange(rowIndex, 15).setValue(form.jurusan || "");            
    sheet.getRange(rowIndex, 16).setValue(form.thn_lulus || "");          
    sheet.getRange(rowIndex, 17).setValue(form.alamat_ktp || "");         
    sheet.getRange(rowIndex, 18).setValue(form.alamat_domisili || "");    
    sheet.getRange(rowIndex, 19).setValue("'"+(form.hp || ""));           
    sheet.getRange(rowIndex, 20).setValue(form.status_peg || "");         
    sheet.getRange(rowIndex, 21).setValue(form.jabatan || "");            
    sheet.getRange(rowIndex, 22).setValue(convertStringToDate_(form.tmt_jabatan));  
    sheet.getRange(rowIndex, 23).setValue(form.pangkat || "");            
    sheet.getRange(rowIndex, 24).setValue(convertStringToDate_(form.tmt_gol));      
    sheet.getRange(rowIndex, 25).setValue(mkg);                           
    sheet.getRange(rowIndex, 26).setValue(form.tugas || "");              
    sheet.getRange(rowIndex, 27).setValue("'"+(form.nuptk || ""));        
    sheet.getRange(rowIndex, 28).setValue(form.serdik || "");             
    sheet.getRange(rowIndex, 29).setValue(form.dapodik || "");            
    sheet.getRange(rowIndex, 30).setValue(form.tugtam || "");             
    sheet.getRange(rowIndex, 31).setValue(form.email || "");              
    sheet.getRange(rowIndex, 34).setValue(now);                           
    sheet.getRange(rowIndex, 35).setValue(user);                          

    // Upload dokumen baru jika ada
    var fileUrl = null;
    if (base64Data && fileName) {
      try {
        var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB";
        var folder = DriveApp.getFolderById(folderId);
        var fileBytes = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName || "dokumen_ptk_baru.pdf");
        var file = folder.createFile(blob);
        fileUrl = file.getUrl();
      } catch(e) {
        Logger.log("Upload revisi gagal: " + e.message);
      }
    }

    // Update usulan_mutasi_sdn
    var sheetUsulan = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
    if (!sheetUsulan) return "Error: Sheet usulan tidak ditemukan.";
    var usulanData = sheetUsulan.getDataRange().getValues();
    var usulanRowIdx = -1;
    for(var i=1; i<usulanData.length; i++) {
       if(String(usulanData[i][0]) === String(form.id_usulan)) { usulanRowIdx = i + 1; break; }
    }
    
    if(usulanRowIdx !== -1) {
       var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
       var lembaga = form.unit_kerja || form.unit_login || "-";
       
       sheetUsulan.getRange(usulanRowIdx, 3).setValue(namaFull);
       if (jenisDokumen) sheetUsulan.getRange(usulanRowIdx, 4).setValue("PTK Baru (" + jenisDokumen + ")");
       sheetUsulan.getRange(usulanRowIdx, 5).setValue(lembaga);
       sheetUsulan.getRange(usulanRowIdx, 6).setValue(lembaga);
       if (fileUrl) sheetUsulan.getRange(usulanRowIdx, 7).setValue(fileUrl);
       sheetUsulan.getRange(usulanRowIdx, 8).setValue("Pending"); // Kembalikan ke Pending
       sheetUsulan.getRange(usulanRowIdx, 9).setValue(timestamp); // Tanggal revisi
       sheetUsulan.getRange(usulanRowIdx, 13).setValue(""); // Kosongkan catatan penolakan
    } else {
       return "Error: Data usulan dengan ID " + form.id_usulan + " tidak ditemukan.";
    }

    invalidatePtkSdnDataCache_();
    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
}

// ======================================================================
// MODUL: REFERENSI (TIDAK BERUBAH)
// ======================================================================
function getReferensiPTK() {
  try {
    function getColData(sheetName, colIndex) {
      try {
        var s = getSheet(KONFIG_PTK.DB_KEY, sheetName); 
        if (!s) return []; 
        var last = s.getLastRow(); 
        if (last < 2) return [];
        var data = s.getRange(2, colIndex, last - 1, 1).getValues(); 
        var res = [];
        for (var i = 0; i < data.length; i++) { 
          var val = String(data[i][0]).trim(); 
          if (val !== "") res.push(val); 
        } 
        return res;
      } catch (innerErr) {
        Logger.log("getColData Error for " + sheetName + ": " + innerErr.message);
        return [];
      }
    }
    
    function getPangkat() {
      try {
        var s = getSheet(KONFIG_PTK.DB_KEY, "data_pangkat"); 
        if (!s) return []; 
        var last = s.getLastRow(); 
        if (last < 2) return [];
        var data = s.getRange(2, 1, last - 1, 1).getValues(); 
        var res = [];
        for (var i = 0; i < data.length; i++) { 
          var val = String(data[i][0]).trim(); 
          if (val !== "") res.push(val); 
        } 
        return res;
      } catch (innerErr) {
        Logger.log("getPangkat Error: " + innerErr.message);
        return [];
      }
    }

    var resObj = { 
      jabatan_non_asn: getColData("isian_jabatan", 1), 
      jabatan_asn: getColData("isian_jabatan", 2), 
      tugas_non_asn: getColData("isian_tugas_di_sekolah", 1), 
      tugas_asn: getColData("isian_tugas_di_sekolah", 2), 
      pangkat: getPangkat() 
    };

    // Fallback jika database referensi kosong atau gagal dimuat agar tidak bug di frontend
    if (resObj.jabatan_asn.length === 0) {
      resObj.jabatan_asn = ["Kepala Sekolah", "Guru Kelas", "Guru PJOK", "Guru Agama Islam", "Guru Agama Kristen", "Guru Agama Katolik", "Guru Agama Hindu", "Guru Agama Buddha", "Guru Agama Konghucu", "Tenaga Administrasi Sekolah", "Penjaga Sekolah"];
    }
    if (resObj.jabatan_non_asn.length === 0) {
      resObj.jabatan_non_asn = ["Guru Kelas", "Guru Mapel", "Tenaga Administrasi Sekolah", "Penjaga Sekolah", "Pramubakti", "Petugas Keamanan"];
    }
    if (resObj.tugas_asn.length === 0) {
      resObj.tugas_asn = ["Kepala Sekolah", "Guru Kelas", "Guru Pend. Agama Islam", "Guru Pend. Agama Kristen", "Guru Pend. Agama Katolik", "Guru Pend. Agama Hindu", "Guru Pend. Agama Buddha", "Guru Pend. Agama Khonghucu", "Guru PJOK", "Tenaga Administrasi Sekolah", "Penjaga Sekolah"];
    }
    if (resObj.tugas_non_asn.length === 0) {
      resObj.tugas_non_asn = ["Guru Kelas", "Guru Pend. Agama Islam", "Guru Pend. Agama Kristen", "Guru Pend. Agama Katolik", "Guru Pend. Agama Hindu", "Guru Pend. Agama Buddha", "Guru Pend. Agama Khonghucu", "Guru PJOK", "Tenaga Administrasi Sekolah", "Penjaga Sekolah", "Pramubakti", "Petugas Keamanan"];
    }
    if (resObj.pangkat.length === 0) {
      resObj.pangkat = ["-", "Juru Muda, I/a", "Juru Muda Tingkat I, I/b", "Juru, I/c", "Juru Tingkat I, I/d", "Pengatur Muda, II/a", "Pengatur Muda Tingkat I, II/b", "Pengatur, II/c", "Pengatur Tingkat I, II/d", "Penata Muda, III/a", "Penata Muda Tingkat I, III/b", "Penata, III/c", "Penata Tingkat I, III/d", "Pembina, IV/a", "Pembina Tingkat I, IV/b", "Pembina Utama Muda, IV/c", "Pembina Utama Madya, IV/d", "Pembina Utama, IV/e", "IX", "X"];
    }

    return JSON.stringify(resObj);
  } catch (e) {
    Logger.log("getReferensiPTK Global Error: " + e.message);
    // Return fallback mutlak agar frontend tidak mati total
    return JSON.stringify({
      jabatan_asn: ["Kepala Sekolah", "Guru Kelas", "Guru PJOK", "Guru Agama Islam", "Guru Agama Kristen", "Guru Agama Katolik", "Guru Agama Hindu", "Guru Agama Buddha", "Guru Agama Konghucu", "Tenaga Administrasi Sekolah", "Penjaga Sekolah"],
      jabatan_non_asn: ["Guru Kelas", "Guru Mapel", "Tenaga Administrasi Sekolah", "Penjaga Sekolah", "Pramubakti", "Petugas Keamanan"],
      tugas_asn: ["Kepala Sekolah", "Guru Kelas", "Guru PJOK", "Guru Mapel", "Tenaga Kependidikan"],
      tugas_non_asn: ["Guru Kelas", "Guru PJOK", "Guru Mapel", "Tenaga Kependidikan"],
      pangkat: ["-", "Juru Muda, I/a", "Juru Muda Tingkat I, I/b", "Juru, I/c", "Juru Tingkat I, I/d", "Pengatur Muda, II/a", "Pengatur Muda Tingkat I, II/b", "Pengatur, II/c", "Pengatur Tingkat I, II/d", "Penata Muda, III/a", "Penata Muda Tingkat I, III/b", "Penata, III/c", "Penata Tingkat I, III/d", "Pembina, IV/a", "Pembina Tingkat I, IV/b", "Pembina Utama Muda, IV/c", "Pembina Utama Madya, IV/d", "Pembina Utama, IV/e", "IX", "X"]
    });
  }
}


function getUnitKerjaByNpsnPTK(npsn) {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "Database Sekolah");
    if (!sheet) return JSON.stringify({ error: "Sheet 'Database Sekolah' tidak ditemukan." });
    var lastRow = sheet.getLastRow(); if (lastRow < 2) return JSON.stringify({ error: "Database Sekolah kosong." });
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues(); var searchNpsn = String(npsn).trim().toUpperCase();
    for (var i = 0; i < data.length; i++) { if (String(data[i][0]).trim().toUpperCase() === searchNpsn) return JSON.stringify({ unitKerja: String(data[i][2]).trim() }); }
    return JSON.stringify({ error: "NPSN tidak terdaftar." });
  } catch (e) { return JSON.stringify({ error: "Gagal memuat Database Sekolah PTK: " + e.message }); }
}

function parseIndoDate(dateStr) {
  if (!dateStr || dateStr === "-" || dateStr === "") return "";
  var str = String(dateStr).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
  var slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) { var day = slashMatch[1].length === 1 ? "0" + slashMatch[1] : slashMatch[1]; var month = slashMatch[2].length === 1 ? "0" + slashMatch[2] : slashMatch[2]; return slashMatch[3] + "-" + month + "-" + day; }
  var months = { 'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04', 'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08', 'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12', 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'Jun': '06', 'Jul': '07', 'Agu': '08', 'Sep': '09', 'Okt': '10', 'Nov': '11', 'Des': '12' };
  var parts = str.split(' '); 
  if (parts.length >= 3) { var dayRaw = parts[0].replace(/[^0-9]/g, ''); var day = dayRaw.length === 1 ? "0" + dayRaw : dayRaw; var month = months[parts[1]]; if (month && parts[2].match(/^\d{4}$/)) return parts[2] + "-" + month + "-" + day; }
  try { var d = new Date(dateStr); if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); } catch(e) {}
  return "";
}

function moveDataPTKToNonAktif(id, reason, userLogin) {
  try {
    var sheetSource = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK); 
    var sheetTarget = getSheet(KONFIG_PTK.DB_KEY, "gtk_non_aktif");
    if (!sheetTarget) { 
      var ss = getDB(KONFIG_PTK.DB_KEY);
      sheetTarget = ss.insertSheet("gtk_non_aktif"); 
      var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues(); 
      headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus"); 
      sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers); 
    }
    var data = sheetSource.getDataRange().getValues(); var rowIndex = -1;
    for (var i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) { rowIndex = i; break; } }
    if (rowIndex === -1) return "Data tidak ditemukan.";
    var rowData = data[rowIndex]; var deleteTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    rowData.push(reason, deleteTime, userLogin); sheetTarget.appendRow(rowData); sheetSource.deleteRow(rowIndex + 1);
    return "Sukses";
  } catch (e) { return "Error: " + e.message; }
}

function getDataKeadaanGTK() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Keadaan GTK"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 67).getDisplayValues(); }
function getDataKebutuhanGuru() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Kebutuhan Guru"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 41).getDisplayValues(); }
function getDataBezettingSDN() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Bezetting"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 4) return []; return sheet.getRange(4, 1, lastRow - 3, 54).getDisplayValues(); }
function getDataRekapGolongan() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Rekap Golongan"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 76).getDisplayValues(); }
function getDataRekapPendidikan() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Rekap Pendidikan"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 42).getDisplayValues(); }

// =============================================================
// BACKEND: KELOLA DATA PTK SD SWASTA (SDS)
// =============================================================
function getDataPTKSDS() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS"); if (!sheet) return JSON.stringify([]);
    var lastRow = sheet.getLastRow(); if (lastRow < 2) return JSON.stringify([]); 
    var data = sheet.getRange(2, 1, lastRow - 1, 33).getDisplayValues(); 
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i]; if(row[0] === "") continue; 
      result.push({
        id: row[0], npsn: row[1], unit: row[2], gelar_depan: row[3], nama_no_gelar: row[4], gelar_belakang: row[5], 
        nama_lengkap: row[6], niy: row[7], tmp_lahir: row[8], tgl_lahir: row[9], nik: row[10], lp: row[11], agama: row[12],         
        pendidikan: row[13], jurusan: row[14], thn_lulus: row[15], 
        alamat_ktp: row[16], alamat_domisili: row[17], hp: row[18], status_peg: row[19], jabatan: row[20], tmt_jabatan: row[21],   
        inpassing: row[22], tmt_inpassing: row[23], nuptk: row[24], serdik: row[25], dapodik: row[26], tugtam: row[27], 
        diinput: row[28], user_input: row[29], diedit: row[30], user_edit: row[31], email: row[32] || "" 
      });
    }
    return JSON.stringify(result);
  } catch(e) { return JSON.stringify([]); }
}

function insertDataPTKSDS(form) {
  var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS");
  var data = sheet.getDataRange().getValues(); var inputNik = String(form.nik).trim(); 
  for (var i = 1; i < data.length; i++) { var rowNik = String(data[i][10]).replace(/'/g, "").trim(); if (rowNik === inputNik) return "NIK " + inputNik + " sudah terdaftar atas nama " + data[i][6] + ", hubungi admin."; }
  var newId = "SDS-" + new Date().getTime(); 
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : ""); 
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  var rawNpsn = form.npsn_baru || form.npsn_login || "";
  var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
  var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;

  var rowData = [
    newId, finalNpsn, form.unit_kerja || form.unit_login || "", form.gelar_depan || "", form.nama_lengkap || "", form.gelar_belakang || "",    
    namaFull || "", form.niy || "", form.tmp_lahir || "", convertStringToDate_(form.tgl_lahir), "'" + (form.nik || ""), form.lp || "", form.agama || "",             
    form.pendidikan || "", form.jurusan || "", form.thn_lulus || "", 
    form.alamat_ktp || "", form.alamat_domisili || "", "'" + (form.hp || ""), form.status_peg || "", form.jabatan || "", convertStringToDate_(form.tmt_jabatan),       
    form.inpassing || "", convertStringToDate_(form.tmt_inpassing), "'" + (form.nuptk || ""), form.serdik || "", form.dapodik || "", form.tugtam || "",            
    timestamp, form.user_login || "", "", "", form.email || ""  
  ];
  sheet.appendRow(rowData); return "Sukses";
}

function updateDataPTKSDS(form) {
  var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS");
  var data = sheet.getDataRange().getValues();
  var rowIdx = -1; 
  var idStr = String(form.id).trim();
  
  for (var i = 0; i < data.length; i++) { 
    if (String(data[i][0]).trim() === idStr) { 
      rowIdx = i + 1; 
      break; 
    } 
  }
  
  if (rowIdx == -1) return "Error: ID tidak ditemukan.";
  
  var inputNik = String(form.nik || "").trim();
  if (inputNik !== "") { 
    for (var i = 1; i < data.length; i++) { 
      var rowNik = String(data[i][10]).replace(/'/g, '').trim(); 
      if (rowNik === inputNik && String(data[i][0]).trim() !== idStr) { 
        return "Gagal: NIK " + inputNik + " sudah dipakai oleh " + data[i][6]; 
      } 
    } 
  }
  
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  
  if (form.npsn_baru && form.unit_kerja) { 
    var npsnVal = parseInt(String(form.npsn_baru).replace(/[^0-9]/g, ''), 10);
    sheet.getRange(rowIdx, 2).setValue(isNaN(npsnVal) ? form.npsn_baru : npsnVal); 
    sheet.getRange(rowIdx, 3).setValue(form.unit_kerja); 
  }
  
  var updateValues = [[ form.gelar_depan || "", form.nama_lengkap || "", form.gelar_belakang || "", namaFull || "", form.niy || "", form.tmp_lahir || "", convertStringToDate_(form.tgl_lahir), "'" + (form.nik || ""), form.lp || "", form.agama || "", form.pendidikan || "", form.jurusan || "", form.thn_lulus || "", form.alamat_ktp || "", form.alamat_domisili || "", "'" + (form.hp || ""), form.status_peg || "", form.jabatan || "", convertStringToDate_(form.tmt_jabatan), form.inpassing || "", convertStringToDate_(form.tmt_inpassing), "'" + (form.nuptk || ""), form.serdik || "", form.dapodik || "", form.tugtam || "" ]];
  sheet.getRange(rowIdx, 4, 1, 25).setValues(updateValues); // Digeser 25 Kolom
  sheet.getRange(rowIdx, 31).setValue(timestamp); 
  sheet.getRange(rowIdx, 32).setValue(form.user_login); 
  sheet.getRange(rowIdx, 33).setValue(form.email || ""); 
  return "Sukses";
}

function deleteDataPTKSDS(id, alasan, userLogin) {
  var sheetSource = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS"); 
  var sheetTarget = getSheet(KONFIG_PTK.DB_KEY, "gtk_non_aktif_sds"); 
  if (!sheetTarget) { 
    var ss = getDB(KONFIG_PTK.DB_KEY);
    sheetTarget = ss.insertSheet("gtk_non_aktif_sds"); 
    var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues(); 
    headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus"); 
    sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers); 
  }
  var data = sheetSource.getDataRange().getValues(); var rowIdx = -1; var rowData = [];
  for (var i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) { rowIdx = i + 1; rowData = data[i]; break; } }
  if (rowIdx == -1) return "Error: Data tidak ditemukan.";
  rowData.push(alasan, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"), userLogin);
  sheetTarget.appendRow(rowData); sheetSource.deleteRow(rowIdx); return "Sukses";
}

function getDataKeadaanGTKSDS() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Keadaan GTK SDS"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues(); }
function getDataKebutuhanGuruSDS() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Kebutuhan Guru SDS"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues(); }

// =============================================================
// BACKEND: KELOLA DATA PTK PAUD
// ID Spreadsheet: 1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU
// =============================================================
const KONFIG_PTK_PAUD = {
  DB_KEY: "PTK_PAUD_DB",
  SHEET_PTK: "Master Data GTK PAUD"
};

function getDataPTKPAUD() {
  try {
    var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK); if (!sheet) return JSON.stringify([]);
    var lastRow = sheet.getLastRow(); if (lastRow < 2) return JSON.stringify([]); 
    var data = sheet.getRange(2, 1, lastRow - 1, 34).getDisplayValues(); 
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i]; if(row[0] === "") continue; 
      result.push({
        id: row[0], npsn: row[1], unit: row[2], jenjang: row[3], gelar_depan: row[4], nama_no_gelar: row[5], gelar_belakang: row[6], nama_lengkap: row[7], niy: row[8], tmp_lahir: row[9], tgl_lahir: row[10], nik: row[11], lp: row[12], agama: row[13], pendidikan: row[14], jurusan: row[15], thn_lulus: row[16], 
        alamat_ktp: row[17], alamat_domisili: row[18], hp: row[19], status_peg: row[20], jabatan: row[21], tmt_jabatan: row[22], inpassing: row[23], tmt_inpassing: row[24], nuptk: row[25], serdik: row[26], dapodik: row[27], tugtam: row[28], 
        diinput: row[29], user_input: row[30], diedit: row[31], user_edit: row[32], email: row[33] || "" 
      });
    }
    return JSON.stringify(result);
  } catch(e) { return JSON.stringify([]); }
}

function insertDataPTKPAUD(form, base64Data, fileName, jenisDokumen, userPengusul) {
  try {
    var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK);
    var data = sheet.getDataRange().getValues();
    var inputNik = String(form.nik).trim();
    for (var i = 1; i < data.length; i++) {
      var rowNik = String(data[i][11]).replace(/'/g, "").trim();
      if (rowNik === inputNik) return "NIK " + inputNik + " sudah terdaftar atas nama " + data[i][7] + ".";
    }

    var newId = "PAUD-" + new Date().getTime();
    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    var rawNpsn = form.npsn_baru || form.npsn_login || "";
    var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
    var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;

    var rowData = [
      newId, finalNpsn, form.unit_kerja || form.unit_login || "", form.jenjang || "",
      form.gelar_depan || "", form.nama_lengkap || "", form.gelar_belakang || "", namaFull || "", form.niy || "",
      form.tmp_lahir || "", convertStringToDate_(form.tgl_lahir), "'" + (form.nik || ""), form.lp || "", form.agama || "",
      form.pendidikan || "", form.jurusan || "", form.thn_lulus || "",
      form.alamat_ktp || "", form.alamat_domisili || "", "'" + (form.hp || ""),
      form.status_peg || "", form.jabatan || "", convertStringToDate_(form.tmt_jabatan), form.inpassing || "", convertStringToDate_(form.tmt_inpassing),
      "'" + (form.nuptk || ""), form.serdik || "", form.dapodik || "", form.tugtam || "",
      timestamp, form.user_login || "", "", "", form.email || ""
    ];
    sheet.appendRow(rowData);

    // Upload dokumen ke Google Drive jika ada
    if (base64Data && fileName) {
      try {
        var folderId = "1myZbraP_DqdBdhFEcm35JNWG3v97UNqF";
        var folder = DriveApp.getFolderById(folderId);
        var fileBytes = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName || "dokumen_ptk_baru.pdf");
        var file = folder.createFile(blob);
        var fileUrl = file.getUrl();
      } catch(uploadErr) {
        Logger.log("Upload dokumen gagal: " + uploadErr.message);
      }
    }

    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
}

function updateDataPTKPAUD(form) {
  var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK);
  var dataDisplay = sheet.getDataRange().getDisplayValues(); 
  var dataValues = sheet.getDataRange().getValues();
  var rowIdx = -1; 
  var idStr = String(form.id).trim();
  
  for (var i = 0; i < dataDisplay.length; i++) { 
    if (String(dataDisplay[i][0]).trim() === idStr) { 
      rowIdx = i + 1; 
      break; 
    } 
  }
  
  if (rowIdx == -1) return "Error: ID tidak ditemukan.";
  
  var inputNik = String(form.nik || "").trim();
  if (inputNik !== "") { 
    for (var i = 1; i < dataDisplay.length; i++) { 
      var rowNik = String(dataDisplay[i][11]).replace(/'/g, '').trim(); 
      if (rowNik === inputNik && String(dataDisplay[i][0]).trim() !== idStr) { 
        return "Gagal: NIK " + inputNik + " sudah dipakai oleh " + dataDisplay[i][7]; 
      } 
    } 
  }
  
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : ""); 
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
  
  if (form.npsn_baru && form.unit_kerja) { 
    var npsnVal = parseInt(String(form.npsn_baru).replace(/[^0-9]/g, ''), 10);
    sheet.getRange(rowIdx, 2).setValue(isNaN(npsnVal) ? form.npsn_baru : npsnVal); 
    sheet.getRange(rowIdx, 3).setValue(form.unit_kerja); 
  }
  
  var updateValues = [[ form.jenjang || "", form.gelar_depan || "", form.nama_lengkap || "", form.gelar_belakang || "", namaFull || "", form.niy || "", form.tmp_lahir || "", convertStringToDate_(form.tgl_lahir), "'" + (form.nik || ""), form.lp || "", form.agama || "", form.pendidikan || "", form.jurusan || "", form.thn_lulus || "", form.alamat_ktp || "", form.alamat_domisili || "", "'" + (form.hp || ""), form.status_peg || "", form.jabatan || "", convertStringToDate_(form.tmt_jabatan), form.inpassing || "", convertStringToDate_(form.tmt_inpassing), "'" + (form.nuptk || ""), form.serdik || "", form.dapodik || "", form.tugtam || "" ]];
  sheet.getRange(rowIdx, 4, 1, 26).setValues(updateValues); 
  sheet.getRange(rowIdx, 32).setValue(timestamp); 
  sheet.getRange(rowIdx, 33).setValue(form.user_login); 
  sheet.getRange(rowIdx, 34).setValue(form.email || ""); 
  return "Sukses";
}

function deleteDataPTKPAUD(id, alasan, userLogin) {
  var sheetSource = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK); 
  var sheetTarget = getSheet(KONFIG_PTK_PAUD.DB_KEY, "gtk_non_aktif_paud"); 
  if (!sheetTarget) { 
    var ss = getDB(KONFIG_PTK_PAUD.DB_KEY);
    sheetTarget = ss.insertSheet("gtk_non_aktif_paud"); 
    var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues(); 
    headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus"); 
    sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers); 
  }
  
  // Gunakan getDisplayValues() untuk konsistensi dengan getDataPTKPAUD
  var dataDisplay = sheetSource.getDataRange().getDisplayValues(); 
  var dataValues = sheetSource.getDataRange().getValues(); 
  var rowIdx = -1; 
  var rowData = [];
  var idStr = String(id).trim();
  
  Logger.log("DELETE PTK PAUD: Searching for id = " + idStr);
  
  for (var i = 1; i < dataDisplay.length; i++) { 
    var currentId = String(dataDisplay[i][0]).trim();
    if (currentId === idStr) { 
      rowIdx = i + 1; 
      rowData = dataValues[i]; 
      Logger.log("DELETE PTK PAUD: Found at row " + rowIdx);
      break; 
    } 
  }
  
  if (rowIdx == -1) {
    var allIds = [];
    for (var j = 1; j < Math.min(dataDisplay.length, 6); j++) { 
      allIds.push(String(dataDisplay[j][0]).trim());
    }
    return "Error: Data tidak ditemukan.\n\nID yang dicari: " + idStr + "\n\nID pertama di sheet: " + JSON.stringify(allIds);
  }
  
  rowData.push(alasan, Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"), userLogin); 
  sheetTarget.appendRow(rowData); 
  sheetSource.deleteRow(rowIdx); 
  return "Sukses";
}

function getJenjangByNPSN(npsn) {
  try { var sheet = getSheet(KONFIG_PTK.DB_KEY, "Database Sekolah"); if (!sheet) return "Sheet Tidak Ditemukan"; var lastRow = sheet.getLastRow(); var data = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues(); var searchNpsn = String(npsn).trim(); for (var i = 0; i < data.length; i++) { if (String(data[i][0]).trim() === searchNpsn) return String(data[i][1]).trim(); } return ""; } catch (e) { return ""; }
}

function getDataKeadaanGTKPAUD() { var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, "Keadaan GTK PAUD"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 28).getDisplayValues(); }

function getDataValidasiPTKSDN() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "sinkron_gtk_sdn"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 58).getDisplayValues(); }

function getDataValidasiPTKSDS() { var sheet = getSheet(KONFIG_PTK.DB_KEY, "sinkron_gtk_sds"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 49).getDisplayValues(); }

function getDataValidasiPTKPAUD() { var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, "sinkron_gtk_paud"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 16).getDisplayValues(); }

function ajukanMutasiPTKPAUD(idPtk, jenis, tujuan, tanggal, base64Data, fileName, userPengusul) {
  try {
    var sheetSource = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK);
    var sheetUsulan = getSheet(KONFIG_PTK_PAUD.DB_KEY, "usulan_mutasi_paud");
    
    // Buat sheet usulan jika belum ada
    if (!sheetUsulan) {
      var ss = getDB(KONFIG_PTK_PAUD.DB_KEY);
      sheetUsulan = ss.insertSheet("usulan_mutasi_paud");
      var headers = ["ID Usulan", "ID PTK", "Nama PTK", "Jenis Mutasi", "Lembaga Asal", "Lembaga Tujuan", "File SK", "Status", "Tanggal Usulan", "User Pengusul", "Tanggal Eksekusi", "User Eksekutor", "Catatan", "TMT/Tanggal"];
      sheetUsulan.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Cek apakah ini EDIT (parameter pertama adalah idUsulan, diawali dengan "USUL-")
    var isEdit = false;
    var idUsulan = null;
    var actualIdPtk = idPtk;
    
    if (arguments.length > 7 && String(idPtk).startsWith("USUL-")) {
      isEdit = true;
      idUsulan = idPtk;
      actualIdPtk = jenis;
      jenis = tujuan;
      tujuan = tanggal;
      tanggal = arguments[4];
      base64Data = arguments[5];
      fileName = arguments[6];
      userPengusul = arguments[7];
    }
    
    // Ambil data PTK untuk tahu nama dan lembaga asal
    var dataPTK = sheetSource.getDataRange().getValues();
    var ptkRow = null;
    for (var i = 1; i < dataPTK.length; i++) {
      if (String(dataPTK[i][0]) === String(actualIdPtk)) {
        ptkRow = dataPTK[i];
        break;
      }
    }
    
    if (!ptkRow) return "Error: Data PTK tidak ditemukan.";
    
    var namaPtk = ptkRow[7]; // Kolom H (Nama Lengkap)
    var lembagaAsal = ptkRow[2]; // Kolom C (Unit/Lembaga)
    
    // Upload file ke Drive jika ada
    var fileUrl = "-";
    if (base64Data && fileName) {
      var folderId = "1myZbraP_DqdBdhFEcm35JNWG3v97UNqF";
      var folder = DriveApp.getFolderById(folderId);
      var fileBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName);
      var file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    if (isEdit) {
      // Update usulan yang sudah ada
      var dataUsulan = sheetUsulan.getDataRange().getValues();
      var usulanRowIdx = -1;
      for (var i = 1; i < dataUsulan.length; i++) {
        if (String(dataUsulan[i][0]) === String(idUsulan)) {
          usulanRowIdx = i + 1;
          break;
        }
      }
      
      if (usulanRowIdx === -1) return "Error: Data usulan tidak ditemukan.";
      
      // Gunakan file SK lama jika tidak upload file baru
      if (!base64Data || !fileName) {
        fileUrl = dataUsulan[usulanRowIdx - 1][6];
      }
      
      // Update data di sheet usulan
      sheetUsulan.getRange(usulanRowIdx, 2).setValue(actualIdPtk);
      sheetUsulan.getRange(usulanRowIdx, 3).setValue(namaPtk);
      sheetUsulan.getRange(usulanRowIdx, 4).setValue(jenis);
      sheetUsulan.getRange(usulanRowIdx, 5).setValue(lembagaAsal);
      sheetUsulan.getRange(usulanRowIdx, 6).setValue(tujuan || "-");
      sheetUsulan.getRange(usulanRowIdx, 7).setValue(fileUrl);
      sheetUsulan.getRange(usulanRowIdx, 8).setValue("Pending");
      sheetUsulan.getRange(usulanRowIdx, 13).setValue(tanggal || "-");
      
      return "Sukses";
    } else {
      // Tambah usulan baru
      var newIdUsulan = "USUL-" + new Date().getTime();
      
      var rowData = [
        newIdUsulan,
        actualIdPtk,
        namaPtk,
        jenis,
        lembagaAsal,
        tujuan || "-",
        fileUrl,
        "Pending",
        timestamp,
        userPengusul,
        "",
        "",
        "",
        tanggal || "-"
      ];
      
      sheetUsulan.appendRow(rowData);
      return "Sukses";
    }
  } catch (e) {
    return "Error: " + e.message;
  }
}

function getUsulanMutasiPTKPAUD() {
  try {
    var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, "usulan_mutasi_paud");
    if (!sheet) return JSON.stringify([]);
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    
    var data = sheet.getRange(2, 1, lastRow - 1, 14).getDisplayValues();
    var result = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      result.push({
        id_usulan: row[0],
        id_ptk: row[1],
        nama_ptk: row[2],
        jenis_mutasi: row[3],
        lembaga_asal: row[4],
        lembaga_tujuan: row[5],
        file_sk: row[6],
        status: row[7],
        tanggal_usulan: row[8],
        user_pengusul: row[9],
        tanggal_eksekusi: row[10],
        user_eksekutor: row[11],
        catatan: row[12] || "",
        tmt_tanggal: row[13] || "-"
      });
    }
    return JSON.stringify(result);
  } catch(e) { return JSON.stringify([]); }
}

function eksekusiMutasiPTKPAUD(idUsulan, keputusan, userEksekutor) {
  try {
    var sheetUsulan = getSheet(KONFIG_PTK_PAUD.DB_KEY, "usulan_mutasi_paud");
    var sheetSource = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK);
    
    if (!sheetUsulan) return "Error: Sheet usulan tidak ditemukan.";
    
    var dataUsulan = sheetUsulan.getDataRange().getValues();
    var usulanRowIdx = -1;
    var usulanRow = null;
    
    for (var i = 1; i < dataUsulan.length; i++) {
      if (String(dataUsulan[i][0]) === String(idUsulan)) {
        usulanRowIdx = i + 1;
        usulanRow = dataUsulan[i];
        break;
      }
    }
    
    if (usulanRowIdx === -1) return "Error: Data usulan tidak ditemukan.";
    if (usulanRow[7] !== "Pending") return "Error: Usulan sudah diproses.";
    
    var idPtk = usulanRow[1];
    var jenis = usulanRow[3];
    var tujuan = usulanRow[5];
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    var statusParts = keputusan.split('|');
    var mainStatus = statusParts[0];
    var catatan = statusParts[1] || "";
    
    if (mainStatus === "Setuju") {
      // Cari data PTK
      var dataPTK = sheetSource.getDataRange().getValues();
      var ptkRowIdx = -1;
      
      for (var i = 1; i < dataPTK.length; i++) {
        if (String(dataPTK[i][0]) === String(idPtk)) {
          ptkRowIdx = i + 1;
          break;
        }
      }
      
      if (ptkRowIdx === -1) return "Error: Data PTK tidak ditemukan di Master Data.";
      
      if (jenis === "Lokal") {
        // Mutasi Lokal: Ubah Unit/Lembaga di Master Data
        sheetSource.getRange(ptkRowIdx, 3).setValue(tujuan);
      } else {
        // Mutasi Luar Kecamatan atau Tidak Aktif: Pindahkan ke sheet "gtk_non_aktif_paud"
        var sheetTarget = getSheet(KONFIG_PTK_PAUD.DB_KEY, "gtk_non_aktif_paud");
        if (!sheetTarget) {
          var ss = getDB(KONFIG_PTK_PAUD.DB_KEY);
          sheetTarget = ss.insertSheet("gtk_non_aktif_paud");
          var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues();
          headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus");
          sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers);
        }
        
        var rowToMove = dataPTK[ptkRowIdx - 1];
        rowToMove.push("Mutasi: " + jenis, timestamp, userEksekutor);
        sheetTarget.appendRow(rowToMove);
        sheetSource.deleteRow(ptkRowIdx);
      }
    }
    
    // Update status usulan
    sheetUsulan.getRange(usulanRowIdx, 8).setValue(mainStatus);
    sheetUsulan.getRange(usulanRowIdx, 11).setValue(timestamp);
    sheetUsulan.getRange(usulanRowIdx, 12).setValue(userEksekutor);
    sheetUsulan.getRange(usulanRowIdx, 13).setValue(catatan);
    
    return "Sukses";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function hapusUsulanPTKPAUD(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheetUsulan = getSheet(KONFIG_PTK_PAUD.DB_KEY, "usulan_mutasi_paud");

    if (!sheetUsulan) throw new Error("Sheet usulan tidak ditemukan.");

    var idUsulan = dataKirim.recId;
    var data = sheetUsulan.getDataRange().getValues();
    var rowIdx = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(idUsulan)) {
        rowIdx = i + 1;
        break;
      }
    }

    if (rowIdx === -1) throw new Error("Data usulan tidak ditemukan.");

    var now = new Date();
    var validCode = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd");
    if(String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH"); 

    var fileUrl = data[rowIdx-1][6]; // Kolom G (Index 6)
    
    // Hapus file drive jika ada
    if (fileUrl && String(fileUrl).includes("drive")) {
        try {
            var fid = fileUrl.match(/[-\w]{25,}/);
            if(fid) DriveApp.getFileById(fid[0]).setTrashed(true); 
        } catch(e) { 
            console.log("Abaikan: Gagal hapus file drive. " + e.message); 
        }
    }

    sheetUsulan.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if(e.message === "KODE_SALAH") return "KODE_SALAH";
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Error Server: " + e.message;
  } finally { lock.releaseLock(); }
}

// =============================================================
// BACKEND: NOTIFIKASI MUTASI PTK PAUD
// =============================================================
function getNotifikasiMutasiPAUD(role, unit) {
  try {
    var sheet = getSheet("PTK_PAUD_DB", "usulan_mutasi_paud");
    if (!sheet) return { count: 0, recent: [] };
    
    var data = sheet.getDataRange().getValues();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    
    var notifList = [];
    var unreadCount = 0;
    var userUnit = String(unit || "").trim().toUpperCase();
    
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[7]).trim(); // Status
        var lembagaAsal = String(row[4]).trim().toUpperCase();
        var isPending = (status === "Pending" || status === "");
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isPending;
        } else {
            isTarget = (lembagaAsal === userUnit && !isPending);
        }
        
        if (isTarget) {
            var readStatus = String(row[14] || "").trim(); // Index 14 (Kolom O) untuk Read Status
            var isRead = false;
            
            if (isAdmin && readStatus.indexOf("Admin") > -1) isRead = true;
            if (!isAdmin && readStatus.indexOf("User") > -1) isRead = true;
            
            
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
                    rowId: i + 1,
                    source: "Mutasi PAUD",
                    nama: row[2], // Nama PTK
                    jenis: row[3], // Jenis Mutasi
                    status: status || "Pending",
                    waktu: (isPending ? row[8] : row[10]) || "-", // Tgl Usulan vs Tgl Eksekusi
                    isRead: isRead
                });
            }
        }
    }
    
    notifList.sort(function(a, b) {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });
    
    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

function tandaiNotifMutasiPAUDDibaca(rowId, role) {
  try {
    var sheet = getSheet("PTK_PAUD_DB", "usulan_mutasi_paud");
    if (!sheet) return;
    
    var currentRead = String(sheet.getRange(rowId, 15).getValue() || "").trim(); // Kolom O
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var marker = isAdmin ? "Admin" : "User";
    
    if (currentRead.indexOf(marker) === -1) {
        var newVal = currentRead ? currentRead + "," + marker : marker;
        sheet.getRange(rowId, 15).setValue(newVal);
    }
  } catch (e) {}
}

// =============================================================
// BACKEND: KELOLA MUTASI PTK SDN [NEW]
// =============================================================

function ajukanMutasiPTKSDN(idPtk, jenis, tujuan, tanggal, base64Data, fileName, userPengusul) {
  try {
    var sheetSource = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    var sheetUsulan = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
    
    // Buat sheet usulan jika belum ada
    if (!sheetUsulan) {
      var ss = getDB(KONFIG_PTK.DB_KEY);
      sheetUsulan = ss.insertSheet("usulan_mutasi_sdn");
      var headers = ["ID Usulan", "ID PTK", "Nama PTK", "Jenis Mutasi", "Lembaga Asal", "Lembaga Tujuan", "TMT/Tanggal", "File SK", "Status", "Tanggal Usulan", "User Pengusul", "Tanggal Eksekusi", "User Eksekutor", "Catatan"];
      sheetUsulan.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Ambil data PTK untuk tahu nama dan lembaga asal
    var dataPTK = sheetSource.getDataRange().getValues();
    var ptkRow = null;
    for (var i = 1; i < dataPTK.length; i++) {
      if (String(dataPTK[i][0]) === String(idPtk)) {
        ptkRow = dataPTK[i];
        break;
      }
    }
    
    if (!ptkRow) return "Error: Data PTK tidak ditemukan.";
    
    var namaPtk = ptkRow[6]; // Kolom G (Nama Lengkap)
    var lembagaAsal = ptkRow[2]; // Kolom C (Unit/Lembaga)
    
    // Upload file ke Drive (Conditional)
    var fileUrl = "-";
    if (base64Data && fileName) {
      var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB";
      var folder = DriveApp.getFolderById(folderId);
      var fileBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName);
      var file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }
    
    // Simpan usulan
    var idUsulan = "USUL-" + new Date().getTime();
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    var rowData = [
      idUsulan,
      idPtk,
      namaPtk,
      jenis,
      lembagaAsal,
      tujuan || "-",
      tanggal || "-",
      fileUrl,
      "Pending",
      timestamp,
      userPengusul,
      "",
      "",
      ""
    ];
    
    sheetUsulan.appendRow(rowData);
    return "Sukses";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function getUsulanMutasiPTKSDN() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
    if (!sheet) return JSON.stringify([]);
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    
    var data = sheet.getRange(2, 1, lastRow - 1, 14).getDisplayValues();
    var result = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      result.push({
        id_usulan: row[0],
        id_ptk: row[1],
        nama_ptk: row[2],
        jenis_mutasi: row[3],
        lembaga_asal: row[4],
        lembaga_tujuan: row[5],
        tmt_tanggal: row[6],
        file_sk: row[7],
        status: row[8],
        tanggal_usulan: row[9],
        user_pengusul: row[10],
        tanggal_eksekusi: row[11],
        user_eksekutor: row[12],
        catatan: row[13] || ""
      });
    }
    return JSON.stringify(result);
  } catch(e) { return JSON.stringify([]); }
}

function eksekusiMutasiPTKSDN(idUsulan, keputusan, userEksekutor) {
  try {
    var sheetUsulan = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
    var sheetSource = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    var ss = getDB(KONFIG_PTK.DB_KEY);
    
    if (!sheetUsulan) return "Error: Sheet usulan tidak ditemukan.";
    
    var dataUsulan = sheetUsulan.getDataRange().getValues();
    var usulanRowIdx = -1;
    var usulanRow = null;
    
    for (var i = 1; i < dataUsulan.length; i++) {
      if (String(dataUsulan[i][0]) === String(idUsulan)) {
        usulanRowIdx = i + 1;
        usulanRow = dataUsulan[i];
        break;
      }
    }
    
    if (usulanRowIdx === -1) return "Error: Data usulan tidak ditemukan.";
    if (usulanRow[8] !== "Pending") return "Error: Usulan sudah diproses.";
    
    var idPtk = usulanRow[1];
    var jenis = usulanRow[3];
    var tujuan = usulanRow[5];
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    var statusParts = keputusan.split('|');
    var mainStatus = statusParts[0];
    var catatan = statusParts[1] || "";
    
    if (mainStatus === "Setuju") {
      // Cari data PTK
      var dataPTK = sheetSource.getDataRange().getValues();
      var ptkRowIdx = -1;
      
      for (var i = 1; i < dataPTK.length; i++) {
        if (String(dataPTK[i][0]) === String(idPtk)) {
          ptkRowIdx = i + 1;
          break;
        }
      }
      
      if (ptkRowIdx === -1) return "Error: Data PTK tidak ditemukan di Master Data.";
      
      if (jenis === "Dalam Kecamatan") {
        // Mutasi Lokal: Ubah Unit/Lembaga di Master Data
        sheetSource.getRange(ptkRowIdx, 3).setValue(tujuan);
      } else {
        // Mutasi Luar Kecamatan atau Tidak Aktif: Pindahkan ke sheet "gtk_non_aktif"
        var sheetTarget = ss.getSheetByName("gtk_non_aktif");
        if (!sheetTarget) {
          sheetTarget = ss.insertSheet("gtk_non_aktif");
          var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues();
          headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus");
          sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers);
        }
        
        var rowToMove = dataPTK[ptkRowIdx - 1];
        rowToMove.push("Mutasi: " + jenis, timestamp, userEksekutor);
        sheetTarget.appendRow(rowToMove);
        sheetSource.deleteRow(ptkRowIdx);
      }
    }
    
    // Update status usulan
    sheetUsulan.getRange(usulanRowIdx, 9).setValue(mainStatus);
    sheetUsulan.getRange(usulanRowIdx, 12).setValue(timestamp);
    sheetUsulan.getRange(usulanRowIdx, 13).setValue(userEksekutor);
    sheetUsulan.getRange(usulanRowIdx, 14).setValue(catatan);
    
    return "Sukses";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function hapusUsulanPTKSDN(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheetUsulan = getSheet("PTK_DB", "usulan_mutasi_sdn");

    if (!sheetUsulan) throw new Error("Sheet usulan tidak ditemukan.");

    var idUsulan = dataKirim.recId;
    var data = sheetUsulan.getDataRange().getValues();
    var rowIdx = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(idUsulan)) {
        rowIdx = i + 1;
        break;
      }
    }

    if (rowIdx === -1) throw new Error("Data usulan tidak ditemukan.");

    var now = new Date();
    var validCode = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd");
    if(String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH"); 

    var fileUrl = data[rowIdx-1][6]; 
    
    // Hapus file drive jika ada
    if (fileUrl && String(fileUrl).includes("drive")) {
        try {
            var fid = fileUrl.match(/[-\w]{25,}/);
            if(fid) DriveApp.getFileById(fid[0]).setTrashed(true); 
        } catch(e) { 
            console.log("Abaikan: Gagal hapus file drive. " + e.message); 
        }
    }

    sheetUsulan.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if(e.message === "KODE_SALAH") return "KODE_SALAH";
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Error Server: " + e.message;
  } finally { lock.releaseLock(); }
}

// =============================================================
// BACKEND: NOTIFIKASI MUTASI PTK SDN
// =============================================================
function getNotifikasiMutasiSDN(role, unit) {
  try {
    var sheet = getSheet("PTK_DB", "usulan_mutasi_sdn");
    if (!sheet) return { count: 0, recent: [] };
    
    var data = sheet.getDataRange().getValues();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    
    var notifList = [];
    var unreadCount = 0;
    var userUnit = String(unit || "").trim().toUpperCase();
    
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[8]).trim(); // Status ada di Kolom I (index 8) untuk SDN
        var lembagaAsal = String(row[4]).trim().toUpperCase();
        var isPending = (status === "Pending" || status === "");
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isPending;
        } else {
            isTarget = (lembagaAsal === userUnit && !isPending);
        }
        
        if (isTarget) {
            var readStatus = String(row[14] || "").trim(); // Index 14 (Kolom O) untuk Read Status
            var isRead = false;
            
            if (isAdmin && readStatus.indexOf("Admin") > -1) isRead = true;
            if (!isAdmin && readStatus.indexOf("User") > -1) isRead = true;
            
            
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
                    rowId: i + 1,
                    source: "Mutasi SDN",
                    nama: row[2], // Nama PTK
                    jenis: row[3], // Jenis Mutasi
                    status: status || "Pending",
                    waktu: (isPending ? row[9] : row[11]) || "-", // Tgl Usulan (index 9) vs Tgl Eksekusi (index 11)
                    isRead: isRead
                });
            }
        }
    }
    
    notifList.sort(function(a, b) {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });
    
    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

function tandaiNotifMutasiSDNDibaca(rowId, role) {
  try {
    var sheet = getSheet("PTK_DB", "usulan_mutasi_sdn");
    if (!sheet) return;
    
    var currentRead = String(sheet.getRange(rowId, 15).getValue() || "").trim(); // Kolom O
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var marker = isAdmin ? "Admin" : "User";
    
    if (currentRead.indexOf(marker) === -1) {
        var newVal = currentRead ? currentRead + "," + marker : marker;
        sheet.getRange(rowId, 15).setValue(newVal);
    }
  } catch (e) {}
}

// =============================================================
// BACKEND: KELOLA MUTASI PTK SDS [NEW]
// =============================================================

function ajukanMutasiPTKSDS(idPtk, jenis, tujuan, tanggal, base64Data, fileName, userPengusul) {
  try {
    var sheetSource = getSheet("PTK_DB", "Master Data GTK SDS");
    var sheetUsulan = getSheet("PTK_DB", "usul_mutasi_sds");
    
    // Buat sheet usulan jika belum ada
    if (!sheetUsulan) {
      var ss = getDB("PTK_DB");
      sheetUsulan = ss.insertSheet("usul_mutasi_sds");
      var headers = ["ID Usulan", "ID PTK", "Nama PTK", "Jenis Mutasi", "Lembaga Asal", "Lembaga Tujuan", "TMT/Tanggal", "File SK", "Status", "Tanggal Usulan", "User Pengusul", "Tanggal Eksekusi", "User Eksekutor", "Catatan"];
      sheetUsulan.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Ambil data PTK untuk tahu nama dan lembaga asal
    var dataPTK = sheetSource.getDataRange().getValues();
    var ptkRow = null;
    for (var i = 1; i < dataPTK.length; i++) {
      if (String(dataPTK[i][0]) === String(idPtk)) {
        ptkRow = dataPTK[i];
        break;
      }
    }
    
    if (!ptkRow) return "Error: Data PTK tidak ditemukan.";
    
    var namaPtk = ptkRow[6]; // Kolom G (Nama Lengkap)
    var lembagaAsal = ptkRow[2]; // Kolom C (Unit/Lembaga)
    
    // Upload file ke Drive (Conditional)
    var fileUrl = "-";
    if (base64Data && fileName) {
      var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB";
      var folder = DriveApp.getFolderById(folderId);
      var fileBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName);
      var file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }
    
    // Simpan usulan
    var idUsulan = "USUL-" + new Date().getTime();
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    var rowData = [
      idUsulan,
      idPtk,
      namaPtk,
      jenis,
      lembagaAsal,
      tujuan || "-",
      tanggal || "-",
      fileUrl,
      "Pending",
      timestamp,
      userPengusul,
      "",
      "",
      ""
    ];
    
    sheetUsulan.appendRow(rowData);
    return "Sukses";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function getUsulanMutasiPTKSDS() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "usul_mutasi_sds");
    if (!sheet) return JSON.stringify([]);
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    
    var data = sheet.getRange(2, 1, lastRow - 1, 14).getDisplayValues();
    var result = [];
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      result.push({
        id_usulan: row[0],
        id_ptk: row[1],
        nama_ptk: row[2],
        jenis_mutasi: row[3],
        lembaga_asal: row[4],
        lembaga_tujuan: row[5],
        tmt_tanggal: row[6],
        file_sk: row[7],
        status: row[8],
        tanggal_usulan: row[9],
        user_pengusul: row[10],
        tanggal_eksekusi: row[11],
        user_eksekutor: row[12],
        catatan: row[13] || ""
      });
    }
    return JSON.stringify(result);
  } catch(e) { return JSON.stringify([]); }
}

function updateUsulanMutasiPTKSDN(idUsulan, idPtk, jenis, tujuan, tanggal, base64Data, fileName, userPengusul) {
  try {
    var sheetUsulan = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
    if (!sheetUsulan) return "Error: Sheet usulan tidak ditemukan.";
    
    var lastRow = sheetUsulan.getLastRow();
    if (lastRow < 2) return "Error: Data usulan kosong.";
    
    var data = sheetUsulan.getDataRange().getValues();
    var rowIdx = -1;
    var oldFileUrl = "";
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(idUsulan)) {
        rowIdx = i + 1;
        oldFileUrl = data[i][7] || "";
        break;
      }
    }
    
    if (rowIdx === -1) return "Error: Data usulan tidak ditemukan.";
    
    // Upload file if provided, otherwise use old file
    var fileUrl = oldFileUrl;
    if (base64Data && fileName) {
      var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB";
      var folder = DriveApp.getFolderById(folderId);
      var fileBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName);
      var file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    // Update columns
    sheetUsulan.getRange(rowIdx, 4).setValue(jenis); // Jenis Mutasi
    sheetUsulan.getRange(rowIdx, 6).setValue(tujuan || "-"); // Lembaga Tujuan
    sheetUsulan.getRange(rowIdx, 7).setValue(tanggal || "-"); // TMT/Tanggal
    if (fileUrl) sheetUsulan.getRange(rowIdx, 8).setValue(fileUrl); // File SK
    sheetUsulan.getRange(rowIdx, 9).setValue("Pending"); // Status
    sheetUsulan.getRange(rowIdx, 10).setValue(timestamp); // Tanggal Usulan
    sheetUsulan.getRange(rowIdx, 11).setValue(userPengusul); // User Pengusul
    sheetUsulan.getRange(rowIdx, 12).setValue(""); // Tanggal Eksekusi
    sheetUsulan.getRange(rowIdx, 13).setValue(""); // User Eksekutor
    sheetUsulan.getRange(rowIdx, 14).setValue(""); // Catatan
    
    return "Sukses";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function updateUsulanMutasiPTKSDS(idUsulan, idPtk, jenis, tujuan, tanggal, base64Data, fileName, userPengusul) {
  try {
    var sheetUsulan = getSheet("PTK_DB", "usul_mutasi_sds");
    if (!sheetUsulan) return "Error: Sheet usulan tidak ditemukan.";
    
    var lastRow = sheetUsulan.getLastRow();
    if (lastRow < 2) return "Error: Data usulan kosong.";
    
    var data = sheetUsulan.getRange(2, 1, lastRow - 1, 1).getValues();
    var rowIdx = -1;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(idUsulan)) {
        rowIdx = i + 2;
        break;
      }
    }
    
    if (rowIdx === -1) return "Error: Data usulan tidak ditemukan.";
    
    // Upload file if provided
    var fileUrl = null;
    if (base64Data && fileName) {
      var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB";
      var folder = DriveApp.getFolderById(folderId);
      var fileBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(fileBytes, "application/pdf", fileName);
      var file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    // Update columns
    sheetUsulan.getRange(rowIdx, 4).setValue(jenis); // Jenis Mutasi
    sheetUsulan.getRange(rowIdx, 6).setValue(tujuan || "-"); // Lembaga Tujuan
    sheetUsulan.getRange(rowIdx, 7).setValue(tanggal || "-"); // TMT/Tanggal
    if (fileUrl) sheetUsulan.getRange(rowIdx, 8).setValue(fileUrl); // File SK
    sheetUsulan.getRange(rowIdx, 9).setValue("Pending"); // Status
    sheetUsulan.getRange(rowIdx, 10).setValue(timestamp); // Tanggal Usulan
    sheetUsulan.getRange(rowIdx, 11).setValue(userPengusul); // User Pengusul
    sheetUsulan.getRange(rowIdx, 12).setValue(""); // Tanggal Eksekusi
    sheetUsulan.getRange(rowIdx, 13).setValue(""); // User Eksekutor
    sheetUsulan.getRange(rowIdx, 14).setValue(""); // Catatan
    
    return "Sukses";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function eksekusiMutasiPTKSDS(idUsulan, keputusan, userEksekutor) {
  try {
    var ss = getDB("PTK_DB");
    var sheetUsulan = getSheet("PTK_DB", "usul_mutasi_sds");
    var sheetSource = getSheet("PTK_DB", "Master Data GTK SDS");
    
    if (!sheetUsulan) return "Error: Sheet usulan tidak ditemukan.";
    
    var dataUsulan = sheetUsulan.getDataRange().getValues();
    var usulanRowIdx = -1;
    var usulanRow = null;
    
    for (var i = 1; i < dataUsulan.length; i++) {
      if (String(dataUsulan[i][0]) === String(idUsulan)) {
        usulanRowIdx = i + 1;
        usulanRow = dataUsulan[i];
        break;
      }
    }
    
    if (usulanRowIdx === -1) return "Error: Data usulan tidak ditemukan.";
    if (usulanRow[8] !== "Pending") return "Error: Usulan sudah diproses.";
    
    var idPtk = usulanRow[1];
    var jenis = usulanRow[3];
    var tujuan = usulanRow[5];
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    var statusParts = keputusan.split('|');
    var mainStatus = statusParts[0];
    var catatan = statusParts[1] || "";
    
    if (mainStatus === "Setuju") {
      // Cari data PTK
      var dataPTK = sheetSource.getDataRange().getValues();
      var ptkRowIdx = -1;
      
      for (var i = 1; i < dataPTK.length; i++) {
        if (String(dataPTK[i][0]) === String(idPtk)) {
          ptkRowIdx = i + 1;
          break;
        }
      }
      
      if (ptkRowIdx === -1) return "Error: Data PTK tidak ditemukan di Master Data.";
      
      if (jenis === "Dalam Kecamatan") {
        // Mutasi Lokal: Ubah Unit/Lembaga di Master Data
        sheetSource.getRange(ptkRowIdx, 3).setValue(tujuan);
      } else {
        // Mutasi Luar Kecamatan atau Tidak Aktif: Pindahkan ke sheet "gtk_non_aktif_sds"
        var sheetTarget = ss.getSheetByName("gtk_non_aktif_sds");
        if (!sheetTarget) {
          sheetTarget = ss.insertSheet("gtk_non_aktif_sds");
          var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues();
          headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus");
          sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers);
        }
        
        var rowToMove = dataPTK[ptkRowIdx - 1];
        rowToMove.push("Mutasi: " + jenis, timestamp, userEksekutor);
        sheetTarget.appendRow(rowToMove);
        sheetSource.deleteRow(ptkRowIdx);
      }
    }
    
    // Update status usulan
    sheetUsulan.getRange(usulanRowIdx, 9).setValue(mainStatus);
    sheetUsulan.getRange(usulanRowIdx, 12).setValue(timestamp);
    sheetUsulan.getRange(usulanRowIdx, 13).setValue(userEksekutor);
    sheetUsulan.getRange(usulanRowIdx, 14).setValue(catatan);
    
    return "Sukses";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function hapusUsulanPTKSDS(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheetUsulan = getSheet("PTK_DB", "usul_mutasi_sds");

    if (!sheetUsulan) throw new Error("Sheet usulan tidak ditemukan.");

    var idUsulan = dataKirim.recId;
    var data = sheetUsulan.getDataRange().getValues();
    var rowIdx = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(idUsulan)) {
        rowIdx = i + 1;
        break;
      }
    }

    if (rowIdx === -1) throw new Error("Data usulan tidak ditemukan.");

    var now = new Date();
    var validCode = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd");
    if(String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH"); 

    var fileUrl = data[rowIdx-1][7]; 
    
    // Hapus file drive jika ada
    if (fileUrl && String(fileUrl).includes("drive")) {
        try {
            var fid = fileUrl.match(/[-\w]{25,}/);
            if(fid) DriveApp.getFileById(fid[0]).setTrashed(true); 
        } catch(e) { 
            console.log("Abaikan: Gagal hapus file drive. " + e.message); 
        }
    }

    sheetUsulan.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if(e.message === "KODE_SALAH") return "KODE_SALAH";
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Error Server: " + e.message;
  } finally { lock.releaseLock(); }
}

// =============================================================
// BACKEND: NOTIFIKASI MUTASI PTK SDS
// =============================================================
function getNotifikasiMutasiSDS(role, unit) {
  try {
    var sheet = getSheet("PTK_DB", "usul_mutasi_sds");
    if (!sheet) return { count: 0, recent: [] };
    
    var data = sheet.getDataRange().getValues();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    
    var notifList = [];
    var unreadCount = 0;
    var userUnit = String(unit || "").trim().toUpperCase();
    
    for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var status = String(row[8]).trim(); // Status ada di Kolom I (index 8) untuk SDS
        var lembagaAsal = String(row[4]).trim().toUpperCase();
        var isPending = (status === "Pending" || status === "");
        var isTarget = false;
        
        if (isAdmin) {
            isTarget = isPending;
        } else {
            isTarget = (lembagaAsal === userUnit && !isPending);
        }
        
        if (isTarget) {
            var readStatus = String(row[14] || "").trim(); // Index 14 (Kolom O) untuk Read Status
            var isRead = false;
            
            if (isAdmin && readStatus.indexOf("Admin") > -1) isRead = true;
            if (!isAdmin && readStatus.indexOf("User") > -1) isRead = true;
            
            
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
                    rowId: i + 1,
                    source: "Mutasi SDS",
                    nama: row[2], // Nama PTK
                    jenis: row[3], // Jenis Mutasi
                    status: status || "Pending",
                    waktu: (isPending ? row[9] : row[11]) || "-", // Tgl Usulan (index 9) vs Tgl Eksekusi (index 11)
                    isRead: isRead
                });
            }
        }
    }
    
    notifList.sort(function(a, b) {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });
    
    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

function tandaiNotifMutasiSDSDibaca(rowId, role) {
  try {
    var sheet = getSheet("PTK_DB", "usul_mutasi_sds");
    if (!sheet) return;
    
    var currentRead = String(sheet.getRange(rowId, 15).getValue() || "").trim(); // Kolom O
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var marker = isAdmin ? "Admin" : "User";
    
    if (currentRead.indexOf(marker) === -1) {
        var newVal = currentRead ? currentRead + "," + marker : marker;
        sheet.getRange(rowId, 15).setValue(newVal);
    }
  } catch (e) {}
}

// Helper: Konversi String Date YYYY-MM-DD ke JS Date Object untuk Google Sheets
function convertStringToDate_(str) {
  if (!str || str === "-" || str === "") return "";
  var parts = String(str).trim().split('-');
  if (parts.length === 3) {
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  return str;
}

// Helper: Ambil Map Jumlah Pegawai di Laporan Bulanan PAUD
function getJumlahLapbulPaudMap_() {
  try {
    var ss = SpreadsheetApp.openById("1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU");
    var sheet = ss.getSheetByName("sinkron_gtk_paud");
    if (!sheet) return {};
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};
    var values = sheet.getRange(2, 1, lastRow - 1, 15).getValues();
    var map = {};
    for (var i = 0; i < values.length; i++) {
      var npsn = String(values[i][0]).trim();
      var count = values[i][14]; // Kolom O (index 14)
      if (npsn) {
        var num = parseInt(count);
        map[npsn] = isNaN(num) ? 0 : num;
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

// Helper: Ambil Map Jumlah Pegawai di Laporan Bulanan SD Negeri
function getJumlahLapbulSdnMap_() {
  try {
    var ss = SpreadsheetApp.openById("1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE");
    var sheet = ss.getSheetByName("sinkron_gtk_sdn");
    if (!sheet) return {};
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};
    var values = sheet.getRange(2, 1, lastRow - 1, 57).getValues();
    var map = {};
    for (var i = 0; i < values.length; i++) {
      var npsn = String(values[i][0]).trim();
      var count = values[i][56]; // Kolom BE (index 56)
      if (npsn) {
        var num = parseInt(count);
        map[npsn] = isNaN(num) ? 0 : num;
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

// Helper: Ambil Map Jumlah Pegawai di Laporan Bulanan SD Swasta
function getJumlahLapbulSdsMap_() {
  try {
    var ss = SpreadsheetApp.openById("1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE");
    var sheet = ss.getSheetByName("sinkron_gtk_sds");
    if (!sheet) return {};
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};
    var values = sheet.getRange(2, 1, lastRow - 1, 48).getValues();
    var map = {};
    for (var i = 0; i < values.length; i++) {
      var npsn = String(values[i][0]).trim();
      var count = values[i][47]; // Kolom AV (index 47)
      if (npsn) {
        var num = parseInt(count);
        map[npsn] = isNaN(num) ? 0 : num;
      }
    }
    return map;
  } catch (e) {
    return {};
  }
}

/**
 * Menyimpan ajuan koreksi data KTP (Nama, TTL, NIK) PTK SDN.
 * Menyimpan data ke sheet "usulan_koreksi_ktp_sdn" dan mengunggah berkas KTP ke Drive.
 */
function kirimAjuanKoreksiKtp(form, base64Data, fileName, userPengusul) {
  try {
    var ss = getDB(KONFIG_PTK.DB_KEY);
    var sheet = ss.getSheetByName("usulan_koreksi_ktp_sdn");
    
    // Inisialisasi sheet jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet("usulan_koreksi_ktp_sdn");
      var headers = [
        "ID Ajuan", "ID PTK", "Nama PTK (Lama)", "Nama PTK (Baru)", 
        "NIK (Lama)", "NIK (Baru)", "TTL (Lama)", "TTL (Baru)", 
        "File KTP", "Status", "Tanggal Usulan", "User Pengusul", 
        "Tanggal Eksekusi", "User Eksekutor", "Catatan"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
    
    var fileUrl = "-";
    // Upload berkas KTP ke Google Drive jika ada
    if (base64Data && fileName) {
      try {
        var folderId = "1WScDrF-y4PyjFjneXuIqX3yRNxIcqKzB"; // Folder ID yang sama dengan dokumen PTK SDN
        var folder = DriveApp.getFolderById(folderId);
        var fileBytes = Utilities.base64Decode(base64Data);
        var mimeType = "application/pdf";
        if (fileName.toLowerCase().endsWith(".png")) mimeType = "image/png";
        else if (fileName.toLowerCase().endsWith(".jpg") || fileName.toLowerCase().endsWith(".jpeg")) mimeType = "image/jpeg";
        
        var blob = Utilities.newBlob(fileBytes, mimeType, fileName);
        var file = folder.createFile(blob);
        fileUrl = file.getUrl();
      } catch (uploadErr) {
        return "Error Upload KTP: " + uploadErr.message;
      }
    } else {
      return "Error: File KTP wajib diunggah.";
    }
    
    var idAjuan = "AJU-KTP-" + new Date().getTime();
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    // Data yang akan dimasukkan
    var rowData = [
      idAjuan,
      form.id_ptk,
      form.nama_lama || "-",
      form.nama_baru || "-",
      form.nik_lama || "-",
      form.nik_baru || "-",
      form.ttl_lama || "-",
      form.ttl_baru || "-",
      fileUrl,
      "Pending",
      timestamp,
      userPengusul || "User Web",
      "-", // Tanggal Eksekusi
      "-", // User Eksekutor
      "-"  // Catatan
    ];
    
    sheet.appendRow(rowData);
    return "Sukses";
  } catch (e) {
    return "Error Server: " + e.message;
  }
}