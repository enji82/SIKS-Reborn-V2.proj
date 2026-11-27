/* ======================================================================
   MODUL: KELOLA PTK SD
   Spreadsheet ID: 1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE
   Sheet: Master Data GTK
   ====================================================================== */

const KONFIG_PTK = {
  get DB_KEY() { return (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) ? "SIKS_DB_MASTER" : "PTK_DB"; },
  SHEET_PTK: "Master Data GTK"
};

// 1. AMBIL OPSI FILTER (UNIT & STATUS)
function getFilterOptionsPTK() {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      return getFilterOptionsPTK_Central();
    }
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

/**
 * DIAGNOSA & PERBAIKAN: Mendeteksi dan memperbaiki ID duplikat di Master Data GTK.
 * Jika ditemukan baris dengan ID sama di kolom A, baris kedua dst akan mendapat ID baru.
 * @returns {string} JSON { fixed: number, details: [...] }
 */
function fixDuplicateIdPTK() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ fixed: 0, details: [] });

    var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();   // ID
    var colG = sheet.getRange(2, 7, lastRow - 1, 1).getValues();   // Nama Lengkap

    var seenIds = {};
    var fixes = [];

    for (var i = 0; i < colA.length; i++) {
      var currentId = String(colA[i][0]).trim();
      if (!currentId) continue;

      if (seenIds.hasOwnProperty(currentId)) {
        // Duplikat ditemukan! Buat ID baru yang unik
        var newId = "GTK-" + new Date().getTime() + "-" + (i + 2);
        sheet.getRange(i + 2, 1).setValue(newId);
        fixes.push({
          oldId: currentId,
          newId: newId,
          nama: String(colG[i][0] || "-"),
          baris: i + 2
        });
        Utilities.sleep(15); // Jeda kecil agar timestamp unik
      } else {
        seenIds[currentId] = i + 2;
      }
    }

    if (fixes.length > 0) {
      invalidatePtkSdnDataCache_();
    }

    return JSON.stringify({ fixed: fixes.length, details: fixes });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function fixDuplicateIdPTKSDS() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS");
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ fixed: 0, details: [] });

    var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var colG = sheet.getRange(2, 7, lastRow - 1, 1).getValues();

    var seenIds = {};
    var fixes = [];

    for (var i = 0; i < colA.length; i++) {
      var currentId = String(colA[i][0]).trim();
      if (!currentId) continue;

      if (seenIds.hasOwnProperty(currentId)) {
        var newId = "GTK-" + new Date().getTime() + "-" + (i + 2);
        sheet.getRange(i + 2, 1).setValue(newId);
        fixes.push({ oldId: currentId, newId: newId, nama: String(colG[i][0] || "-"), baris: i + 2 });
        Utilities.sleep(15);
      } else {
        seenIds[currentId] = i + 2;
      }
    }

    return JSON.stringify({ fixed: fixes.length, details: fixes });
  } catch (e) { return JSON.stringify({ error: e.message }); }
}

function fixDuplicateIdPTKPAUD() {
  try {
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK PAUD");
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ fixed: 0, details: [] });

    var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var colG = sheet.getRange(2, 7, lastRow - 1, 1).getValues();

    var seenIds = {};
    var fixes = [];

    for (var i = 0; i < colA.length; i++) {
      var currentId = String(colA[i][0]).trim();
      if (!currentId) continue;

      if (seenIds.hasOwnProperty(currentId)) {
        var newId = "GTK-" + new Date().getTime() + "-" + (i + 2);
        sheet.getRange(i + 2, 1).setValue(newId);
        fixes.push({ oldId: currentId, newId: newId, nama: String(colG[i][0] || "-"), baris: i + 2 });
        Utilities.sleep(15);
      } else {
        seenIds[currentId] = i + 2;
      }
    }

    return JSON.stringify({ fixed: fixes.length, details: fixes });
  } catch (e) { return JSON.stringify({ error: e.message }); }
}

// 2. AMBIL DATA UTAMA (cache + baca kolom terbatas)
function buildPtkListSdn_() {
  var useCentral = (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB);
  var sheet = useCentral
    ? getSheet("SIKS_DB_MASTER", "tbl_ptk")
    : getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var allData = sheet.getDataRange().getValues();
  if (allData.length < 2) return [];

  if (useCentral) {
    var hdr = allData[0];
    allData = [hdr].concat(allData.slice(1).filter(function(r) {
      return String(r[1] || "").trim() === "SD Negeri";
    }));
  }

  var headers = allData[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var findCol = function(nameList, defaultIdx) {
    for (var k = 0; k < nameList.length; k++) {
      var idx = headers.indexOf(nameList[k]);
      if (idx > -1) return idx;
    }
    return defaultIdx;
  };

  var colMap = {
    id: findCol(["id_ptk", "id", "id ptk"], 0),
    npsn: findCol(["npsn"], 1),
    unit: findCol(["unit kerja", "unit_kerja", "unit", "nama_sekolah", "sekolah", "satuan pendidikan"], 2),
    gelar_depan: findCol(["gelar_depan", "gelar depan"], 3),
    nama_no_gelar: findCol(["nama_no_gelar", "nama tanpa gelar"], 4),
    gelar_belakang: findCol(["gelar_belakang", "gelar belakang"], 5),
    nama_lengkap: findCol(["nama_lengkap", "nama lengkap", "nama"], 6),
    nip: findCol(["nip"], 7),
    tmp_lahir: findCol(["tmp_lahir", "tempat lahir"], 8),
    tgl_lahir: findCol(["tgl_lahir", "tanggal lahir"], 9),
    nik: findCol(["nik"], 10),
    lp: findCol(["l/p", "lp", "jenis kelamin", "jenis_kelamin", "jk"], 11),
    agama: findCol(["agama"], 12),
    pendidikan: findCol(["pendidikan"], 13),
    jurusan: findCol(["jurusan"], 14),
    thn_lulus: findCol(["thn_lulus", "tahun lulus"], 15),
    alamat_ktp: findCol(["alamat_ktp", "alamat ktp"], 16),
    alamat_domisili: findCol(["alamat_domisili", "alamat domisili"], 17),
    hp: findCol(["hp", "no hp", "telepon"], 18),
    status_peg: findCol(["status kepegawaian", "status_kepegawaian", "status_peg", "status pegawai", "status"], 19),
    jabatan: findCol(["jabatan"], 20),
    tmt_jabatan: findCol(["tmt_jabatan", "tmt jabatan"], 21),
    pangkat: findCol(["pangkat, gol/ruang", "pangkat/golongan", "pangkat / golongan", "pangkat golongan", "pangkat_golongan", "golongan", "pangkat", "pangkat_gol", "pangkat/gol"], 22),
    tmt_gol: findCol(["tmt_gol", "tmt gol", "tmt golongan"], 23),
    mkg: findCol(["mkg", "misa kerja"], 24),
    tugas: findCol(["tugas", "tugas utama"], 25),
    mengajar_kelas: findCol(["mengajar_kelas", "mengajar kelas"], -1),
    nuptk: findCol(["nuptk"], 26),
    serdik: findCol(["serdik"], 27),
    dapodik: findCol(["dapodik"], 28),
    tugtam: findCol(["tugtam", "tugas tambahan"], 29),
    email: findCol(["email"], 30),
    diinput: findCol(["diinput", "tgl input"], 31),
    user_input: findCol(["user_input", "penginput"], 32),
    diedit: findCol(["diedit", "tgl edit"], 33),
    user_edit: findCol(["user edit", "user_edit", "pengedit"], 34),
    status_aktif: findCol(["status_aktif"], 2),
    jenis_dok: findCol(["jenis_dok", "jenis dokumen"], 35),
    file_url: findCol(["file_url", "url", "file"], 36)
  };

  var data = allData.slice(1);
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
    var rowId = row[colMap.id];
    if (!rowId) continue;

    var valDiinput = row[colMap.diinput];
    var valDiedit = row[colMap.diedit];

    result.push({
      id: rowId,
      npsn: row[colMap.npsn],
      unit: row[colMap.unit],
      gelar_depan: row[colMap.gelar_depan],
      nama_no_gelar: row[colMap.nama_no_gelar],
      gelar_belakang: row[colMap.gelar_belakang],
      nama_lengkap: row[colMap.nama_lengkap],
      nip: row[colMap.nip],
      tmp_lahir: row[colMap.tmp_lahir],
      tgl_lahir: parseIndoDate(row[colMap.tgl_lahir]),
      nik: row[colMap.nik],
      lp: row[colMap.lp],
      agama: row[colMap.agama],
      pendidikan: row[colMap.pendidikan],
      jurusan: row[colMap.jurusan],
      thn_lulus: row[colMap.thn_lulus],
      alamat_ktp: row[colMap.alamat_ktp],
      alamat_domisili: row[colMap.alamat_domisili],
      hp: row[colMap.hp],
      status_peg: row[colMap.status_peg],
      jabatan: row[colMap.jabatan],
      tmt_jabatan: parseIndoDate(row[colMap.tmt_jabatan]),
      pangkat: row[colMap.pangkat],
      tmt_gol: parseIndoDate(row[colMap.tmt_gol]),
      mkg: row[colMap.mkg],
      tugas: row[colMap.tugas],
      mengajar_kelas: colMap.mengajar_kelas > -1 ? String(row[colMap.mengajar_kelas] || "").trim() : "",
      nuptk: row[colMap.nuptk],
      serdik: row[colMap.serdik],
      dapodik: row[colMap.dapodik],
      tugtam: row[colMap.tugtam],
      email: row[colMap.email],
      diinput: valDiinput ? Utilities.formatDate(new Date(valDiinput), tz, "dd/MM/yy HH:mm") : "",
      user_input: row[colMap.user_input],
      diedit: valDiedit ? Utilities.formatDate(new Date(valDiedit), tz, "dd/MM/yy HH:mm") : "",
      user_edit: row[colMap.user_edit],
      status_aktif: String(row[colMap.status_aktif] || "AKTIF").trim().toUpperCase(),
      jenis_dok: row[colMap.jenis_dok] || "",
      file_url: row[colMap.file_url] || "",
      is_pending_baru: !!pendingPtkIds[String(rowId)]
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
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    if (!sheet) return JSON.stringify({ data: [], lapbulMap: {} });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ data: [], lapbulMap: {} });

    var data = sheet.getRange(2, 1, lastRow - 1, ctx.totalCols).getValues();
    var tz = Session.getScriptTimeZone();
    var result = [];

    var parseDateSafe = function(val) {
      if (!val || val === "" || val === "-") return null;
      if (val instanceof Date && !isNaN(val.getTime())) return val;
      var s = String(val).trim();
      var m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (m) {
        return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10), parseInt(m[4] || "0", 10), parseInt(m[5] || "0", 10), parseInt(m[6] || "0", 10));
      }
      var d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[c.id]) continue;
      if (ctx.useCentral) {
        if (c.jenjang > -1 && String(row[c.jenjang] || "").trim() !== "SD Negeri") continue;
        if (c.status_aktif > -1 && String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() === "NON_AKTIF") continue;
      }

      var dInput = c.diinput > -1 ? parseDateSafe(row[c.diinput]) : null;
      var dEdit = c.diedit > -1 ? parseDateSafe(row[c.diedit]) : null;

      var tglInputBaru = dInput ? Utilities.formatDate(dInput, tz, "dd/MM/yyyy HH:mm") : "";
      var tglDiperbarui = dEdit ? Utilities.formatDate(dEdit, tz, "dd/MM/yyyy HH:mm") : "";

      var tsInputBaru = dInput ? dInput.getTime() : 0;
      var tsDiperbarui = dEdit ? dEdit.getTime() : 0;
      var tsEfektif = Math.max(tsInputBaru, tsDiperbarui);

      result.push({
        id             : row[c.id],
        npsn           : c.npsn > -1 ? row[c.npsn] : "",
        unit           : c.unit > -1 ? row[c.unit] : "",
        nama_lengkap   : c.nama_lengkap > -1 ? row[c.nama_lengkap] : "",
        nip            : c.nip > -1 ? row[c.nip] : "",
        status_peg     : c.status_peg > -1 ? row[c.status_peg] : "",
        jabatan        : c.jabatan > -1 ? row[c.jabatan] : "",
        tgl_input_baru : tglInputBaru,
        user_input_baru: c.user_input > -1 ? (row[c.user_input] || "") : "",
        tgl_diperbarui : tglDiperbarui,
        user_diperbarui: c.user_edit > -1 ? (row[c.user_edit] || "") : "",
        ts_efektif     : tsEfektif
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
    var tz = Session.getScriptTimeZone();
    var fmtDate = function(val) {
      if (!val || val === "") return "";
      try {
        var d = (val instanceof Date) ? val : new Date(val);
        if (isNaN(d.getTime())) return "";
        return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm");
      } catch(e) { return ""; }
    };

    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return JSON.stringify({ data: [], lapbulMap: {} });
      var c = ctx.colMap;
      var idxNiy = ctx.headers.indexOf("niy");
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var result = [];

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (jenjang !== "SD Swasta" || statusAktif !== "AKTIF") continue;
        var rowId = c.id > -1 ? row[c.id] : "";
        if (!rowId) continue;

        var rawInput = c.diinput > -1 ? row[c.diinput] : "";
        var rawEdit = c.diedit > -1 ? row[c.diedit] : "";
        var tglInputBaru = fmtDate(rawInput);
        var tglDiperbarui = fmtDate(rawEdit);
        var tsInputBaru = (rawInput && rawInput instanceof Date) ? rawInput.getTime() : 0;
        var tsDiperbarui = (rawEdit && rawEdit instanceof Date) ? rawEdit.getTime() : 0;
        var tsEfektif = Math.max(tsInputBaru, tsDiperbarui);

        result.push({
          id              : rowId,
          npsn            : c.npsn > -1 ? row[c.npsn] : "",
          unit            : c.unit > -1 ? row[c.unit] : "",
          nama_lengkap    : c.nama_lengkap > -1 ? row[c.nama_lengkap] : "",
          niy             : idxNiy > -1 ? (row[idxNiy] || "") : "",
          status_peg      : c.status_peg > -1 ? row[c.status_peg] : "",
          jabatan         : c.jabatan > -1 ? row[c.jabatan] : "",
          tgl_input_baru  : tglInputBaru,
          user_input_baru : c.user_input > -1 ? (row[c.user_input] || "") : "",
          tgl_diperbarui  : tglDiperbarui,
          user_diperbarui : c.user_edit > -1 ? (row[c.user_edit] || "") : "",
          ts_efektif      : tsEfektif
        });
      }
      var lapbulMap = getJumlahLapbulSdsMap_();
      return JSON.stringify({ data: result, lapbulMap: lapbulMap });
    }

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
    var tz = Session.getScriptTimeZone();
    var fmtDate = function(val) {
      if (!val || val === "") return "";
      try {
        var d = (val instanceof Date) ? val : new Date(val);
        if (isNaN(d.getTime())) return "";
        return Utilities.formatDate(d, tz, "dd/MM/yyyy HH:mm");
      } catch(e) { return ""; }
    };

    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return JSON.stringify({ data: [], lapbulMap: {} });
      var c = ctx.colMap;
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var result = [];

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1 || statusAktif !== "AKTIF") continue;
        var rowId = c.id > -1 ? row[c.id] : "";
        if (!rowId) continue;

        var rawInput = c.diinput > -1 ? row[c.diinput] : "";
        var rawEdit = c.diedit > -1 ? row[c.diedit] : "";
        var tglInputBaru = fmtDate(rawInput);
        var tglDiperbarui = fmtDate(rawEdit);
        var tsInputBaru = (rawInput && rawInput instanceof Date) ? rawInput.getTime() : 0;
        var tsDiperbarui = (rawEdit && rawEdit instanceof Date) ? rawEdit.getTime() : 0;
        var tsEfektif = Math.max(tsInputBaru, tsDiperbarui);

        result.push({
          id              : rowId,
          jenjang         : jenjang,
          npsn            : c.npsn > -1 ? row[c.npsn] : "",
          unit            : c.unit > -1 ? row[c.unit] : "",
          nama_lengkap    : c.nama_lengkap > -1 ? row[c.nama_lengkap] : "",
          status_peg      : c.status_peg > -1 ? row[c.status_peg] : "",
          jabatan         : c.jabatan > -1 ? row[c.jabatan] : "",
          tgl_input_baru  : tglInputBaru,
          user_input_baru : c.user_input > -1 ? (row[c.user_input] || "") : "",
          tgl_diperbarui  : tglDiperbarui,
          user_diperbarui : c.user_edit > -1 ? (row[c.user_edit] || "") : "",
          ts_efektif      : tsEfektif
        });
      }
      var lapbulMap = getJumlahLapbulPaudMap_();
      return JSON.stringify({ data: result, lapbulMap: lapbulMap });
    }

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
    var statusValid = ["PNS", "CPNS", "PPPK", "PPPK PARUH WAKTU"];
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return JSON.stringify([]);
      var c = ctx.colMap;
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var result = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (jenjang !== "SD Negeri" || statusAktif !== "AKTIF") continue;
        var rowId = c.id > -1 ? row[c.id] : "";
        if (!rowId) continue;

        var statusRaw = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";
        if (statusValid.indexOf(statusRaw) === -1) continue;

        var unitStr = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
        if (unitStr.toUpperCase().indexOf("PAYAMAN 2") !== -1) continue;

        var tglLahir = parseIndoDate(c.tgl_lahir > -1 ? row[c.tgl_lahir] : "");
        if (!tglLahir) continue;

        result.push({
          id: rowId,
          npsn: c.npsn > -1 ? row[c.npsn] : "",
          unit: unitStr,
          nama: c.nama_lengkap > -1 ? row[c.nama_lengkap] : "",
          nip: c.nip > -1 ? String(row[c.nip] || "").replace(/'/g, "") : "",
          tgl_lahir: tglLahir,
          status_peg: statusRaw,
          jabatan: c.jabatan > -1 ? row[c.jabatan] : ""
        });
      }
      return result;
    }

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
 * Helper Dinamis Kolom tbl_ptk untuk SD Negeri
 */
function getTblPtkSdnContext_() {
  var useCentral = (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB);
  var sheet = useCentral
    ? getSheet("SIKS_DB_MASTER", "tbl_ptk")
    : getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var findCol = function(nameList, defaultIdx) {
    for (var k = 0; k < nameList.length; k++) {
      var idx = headers.indexOf(nameList[k]);
      if (idx > -1) return idx;
    }
    return defaultIdx;
  };
  var off = useCentral ? 3 : 0;
  var colMap = {
    id: findCol(["id_ptk", "id", "id ptk"], 0),
    old_id: findCol(["id"], off),
    jenjang: findCol(["jenjang"], useCentral ? 1 : -1),
    status_aktif: findCol(["status_aktif"], useCentral ? 2 : -1),
    npsn: findCol(["npsn"], 1 + off),
    unit: findCol(["unit kerja", "unit_kerja", "unit", "nama_sekolah", "sekolah", "satuan pendidikan"], 2 + off),
    gelar_depan: findCol(["gelar_depan", "gelar depan"], 3 + off),
    nama_no_gelar: findCol(["nama_no_gelar", "nama tanpa gelar"], 4 + off),
    gelar_belakang: findCol(["gelar_belakang", "gelar belakang"], 5 + off),
    nama_lengkap: findCol(["nama_lengkap", "nama lengkap", "nama"], 6 + off),
    nip: findCol(["nip"], 7 + off),
    tmp_lahir: findCol(["tmp_lahir", "tempat lahir"], 8 + off),
    tgl_lahir: findCol(["tgl_lahir", "tanggal lahir"], 9 + off),
    nik: findCol(["nik"], 10 + off),
    lp: findCol(["l/p", "lp", "jenis kelamin", "jenis_kelamin", "jk"], 11 + off),
    agama: findCol(["agama"], 12 + off),
    pendidikan: findCol(["pendidikan"], 13 + off),
    jurusan: findCol(["jurusan"], 14 + off),
    thn_lulus: findCol(["thn_lulus", "tahun lulus"], 15 + off),
    alamat_ktp: findCol(["alamat_ktp", "alamat ktp"], 16 + off),
    alamat_domisili: findCol(["alamat_domisili", "alamat domisili"], 17 + off),
    hp: findCol(["hp", "no hp", "telepon"], 18 + off),
    status_peg: findCol(["status kepegawaian", "status_kepegawaian", "status_peg", "status pegawai", "status"], 19 + off),
    jabatan: findCol(["jabatan"], 20 + off),
    tmt_jabatan: findCol(["tmt_jabatan", "tmt jabatan"], 21 + off),
    pangkat: findCol(["pangkat, gol/ruang", "pangkat/golongan", "pangkat / golongan", "pangkat golongan", "pangkat_golongan", "golongan", "pangkat", "pangkat_gol", "pangkat/gol"], 22 + off),
    tmt_gol: findCol(["tmt_gol", "tmt gol", "tmt golongan"], 23 + off),
    mkg: findCol(["mkg", "masa kerja", "misa kerja"], 24 + off),
    tugas: findCol(["tugas", "tugas utama"], 25 + off),
    nuptk: findCol(["nuptk"], 26 + off),
    serdik: findCol(["serdik"], 27 + off),
    dapodik: findCol(["dapodik"], 28 + off),
    tugtam: findCol(["tugtam", "tugas tambahan"], 29 + off),
    email: findCol(["email"], 30 + off),
    diinput: findCol(["diinput", "tgl input"], 31 + off),
    user_input: findCol(["user_input", "user input", "penginput"], 32 + off),
    diedit: findCol(["diedit", "tgl edit"], 33 + off),
    user_edit: findCol(["user edit", "user_edit", "pengedit"], 34 + off),
    jenis_dok: findCol(["jenis_dok", "jenis dokumen"], 35 + off),
    file_url: findCol(["file_url", "url", "file"], 36 + off),
    archive_dok: findCol(["riwayat dokumen", "arsip dokumen", "archive"], 37 + off),
    alasan_hapus: findCol(["alasan hapus"], -1),
    tgl_hapus: findCol(["tanggal hapus"], -1),
    user_hapus: findCol(["user hapus"], -1),
    mengajar_kelas: findCol(["mengajar_kelas", "mengajar kelas"], -1)
  };
  if (colMap.mengajar_kelas === -1 && sheet) {
    lastCol++;
    sheet.getRange(1, lastCol).setValue("mengajar_kelas");
    headers.push("mengajar_kelas");
    colMap.mengajar_kelas = lastCol - 1;
  }
  return { useCentral: useCentral, sheet: sheet, headers: headers, colMap: colMap, totalCols: lastCol };
}

function applyPtkMasterRowUpdate_(sheet, rowIndex, form, extras) {
  extras = extras || {};
  var ctx = getTblPtkSdnContext_();
  var c = ctx.colMap;
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var mkg = "";
  if (form.mkg_thn || form.mkg_bln) {
    mkg = (form.mkg_thn || "0") + " Tahun " + (form.mkg_bln || "0") + " Bulan";
  }
  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
  var user = form.user_login || "Admin";

  var fullRow = sheet.getRange(rowIndex, 1, 1, ctx.totalCols).getValues()[0];
  var setC = function(idx, val) {
    if (idx > -1 && idx < fullRow.length) fullRow[idx] = val;
  };

  if (form.npsn_baru && form.unit_kerja) {
    var npsnVal = parseInt(String(form.npsn_baru).replace(/[^0-9]/g, ''), 10);
    setC(c.npsn, isNaN(npsnVal) ? form.npsn_baru : npsnVal);
    setC(c.unit, form.unit_kerja);
  }

  setC(c.gelar_depan, form.gelar_depan || "");
  setC(c.nama_no_gelar, form.nama_lengkap || "");
  setC(c.gelar_belakang, form.gelar_belakang || "");
  setC(c.nama_lengkap, namaFull);
  setC(c.nip, "'" + (form.nip || ""));
  setC(c.tmp_lahir, form.tmp_lahir || "");
  setC(c.tgl_lahir, convertStringToDate_(form.tgl_lahir));
  setC(c.nik, "'" + (form.nik || ""));
  setC(c.lp, form.lp || "");
  setC(c.agama, form.agama || "");
  setC(c.pendidikan, form.pendidikan || "");
  setC(c.jurusan, form.jurusan || "");
  setC(c.thn_lulus, form.thn_lulus || "");
  setC(c.alamat_ktp, form.alamat_ktp || "");
  setC(c.alamat_domisili, form.alamat_domisili || "");
  setC(c.hp, "'" + (form.hp || ""));
  setC(c.status_peg, form.status_peg || "");
  setC(c.jabatan, form.jabatan || "");
  setC(c.tmt_jabatan, convertStringToDate_(form.tmt_jabatan));
  setC(c.pangkat, form.pangkat || "");
  setC(c.tmt_gol, convertStringToDate_(form.tmt_gol));
  setC(c.mkg, mkg);
  setC(c.tugas, form.tugas || "");
  setC(c.mengajar_kelas, "'" + (form.mengajar_kelas || "-"));
  setC(c.nuptk, "'" + (form.nuptk || ""));
  setC(c.serdik, form.serdik || "");
  setC(c.dapodik, form.dapodik || "");
  setC(c.tugtam, form.tugtam || "");
  setC(c.email, form.email || "");
  setC(c.diedit, now);
  setC(c.user_edit, user);
  if (extras.jenisDokumen) setC(c.jenis_dok, extras.jenisDokumen);
  if (extras.fileUrl) setC(c.file_url, extras.fileUrl);
  if (extras.newArchive) setC(c.archive_dok, extras.newArchive);

  sheet.getRange(rowIndex, 1, 1, ctx.totalCols).setValues([fullRow]);
}

// 3. UPDATE DATA PTK
function updateDataPTK(form, base64Data, fileName, jenisDokumen) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch(lockErr) {
    return "Error: Sistem sedang sibuk digunakan pengguna lain. Coba lagi dalam beberapa saat.";
  }
  try {
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var selfId = String(form.id || "").trim();
    for (var i = 1; i < data.length; i++) {
      var rId = String(data[i][c.id] || "").trim();
      var rOldId = c.old_id > -1 ? String(data[i][c.old_id] || "").trim() : "";
      if (rId === selfId || (rOldId && rOldId === selfId)) { rowIndex = i + 1; break; }
    }
    if(rowIndex === -1) return "Error: ID PTK tidak ditemukan.";

    var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, '');
    if (inputNip !== "" && inputNip !== "-") {
        for (var i = 1; i < data.length; i++) {
            if (i + 1 === rowIndex) continue;
            if (ctx.useCentral && c.jenjang > -1 && String(data[i][c.jenjang] || "").trim() !== "SD Negeri") continue;
            var rowNip = String(data[i][c.nip] || "").trim().replace(/[^0-9]/g, '');
            var rowId  = String(data[i][c.id] || "").trim();
            if (rowNip === inputNip) return "Gagal: NIP " + inputNip + " sudah dipakai oleh " + data[i][c.nama_lengkap] + " (ID: " + rowId + ")";
        }
    }

    var extras = {};
    if (jenisDokumen) extras.jenisDokumen = jenisDokumen;

    if (base64Data && fileName) {
      try {
        var oldFileUrl = c.file_url > -1 ? data[rowIndex - 1][c.file_url] : "";
        var oldJenisDok = c.jenis_dok > -1 ? data[rowIndex - 1][c.jenis_dok] : "";
        if (oldFileUrl && oldFileUrl !== "-" && oldFileUrl !== "") {
          var oldArchive = (c.archive_dok > -1 && data[rowIndex - 1].length > c.archive_dok) ? String(data[rowIndex - 1][c.archive_dok] || "").trim() : "";
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
    SpreadsheetApp.flush();
    invalidatePtkSdnDataCache_();

    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
  finally { lock.releaseLock(); }
}

// 4. INSERT DATA PTK (AUTO FILL LOGIC)
function insertDataPTK(form, base64Data, fileName, jenisDokumen, userPengusul) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch(lockErr) {
    return "Error: Sistem sedang sibuk digunakan pengguna lain. Coba lagi dalam beberapa saat.";
  }
  try {
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    if (!sheet) return "Error: Sheet PTK tidak ditemukan.";

    var data = sheet.getDataRange().getValues();
    // Deteksi Ganda NIP
    var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, ''); 
    if (inputNip !== "" && inputNip !== "-") {
        for (var i = 1; i < data.length; i++) {
          if (ctx.useCentral && c.jenjang > -1 && String(data[i][c.jenjang] || "").trim() !== "SD Negeri") continue;
          if (ctx.useCentral && c.status_aktif > -1 && String(data[i][c.status_aktif] || "AKTIF").trim().toUpperCase() === "NON_AKTIF") continue;
          var rowNip = String(data[i][c.nip] || "").replace(/[^0-9]/g, ''); 
          if (rowNip === inputNip) return "Gagal: NIP " + inputNip + " sudah terdaftar atas nama " + data[i][c.nama_lengkap];
        }
    }

    // Deteksi Ganda NIK
    var inputNik = String(form.nik || "").trim().replace(/[^0-9]/g, ''); 
    if (inputNik !== "" && inputNik !== "-") {
        for (var i = 1; i < data.length; i++) {
          if (ctx.useCentral && c.jenjang > -1 && String(data[i][c.jenjang] || "").trim() !== "SD Negeri") continue;
          if (ctx.useCentral && c.status_aktif > -1 && String(data[i][c.status_aktif] || "AKTIF").trim().toUpperCase() === "NON_AKTIF") continue;
          var rowNik = String(data[i][c.nik] || "").replace(/[^0-9]/g, '');
          if (rowNik === inputNik) return "Gagal: NIK " + inputNik + " sudah terdaftar atas nama " + data[i][c.nama_lengkap];
        }
        
        // Cek apakah terdaftar di data non-aktif SD Negeri
        var resCheckNonAktif = JSON.parse(checkAndGetPtkNonAktifSDNByNIK(inputNik));
        if (resCheckNonAktif.found) {
          return "NON_AKTIF_FOUND:" + JSON.stringify(resCheckNonAktif);
        }
    }

    var newId = ctx.useCentral ? ("PTK-" + new Date().getTime()) : ("GTK-" + new Date().getTime());
    var oldStyleId = "GTK-" + new Date().getTime();
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
      }
    }

    var rawNpsn = form.npsn_baru || form.npsn_login || "";
    var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
    var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;

    var newRow = new Array(ctx.totalCols).fill("");
    var setC = function(idx, val) {
      if (idx > -1 && idx < newRow.length) newRow[idx] = val;
    };

    setC(c.id, newId);
    if (c.old_id > -1 && c.old_id !== c.id) setC(c.old_id, oldStyleId);
    if (c.jenjang > -1) setC(c.jenjang, "SD Negeri");
    if (c.status_aktif > -1) setC(c.status_aktif, "AKTIF");
    setC(c.npsn, finalNpsn);
    setC(c.unit, form.unit_kerja || form.unit_login || "");
    setC(c.gelar_depan, form.gelar_depan || "");
    setC(c.nama_no_gelar, form.nama_lengkap || "");
    setC(c.gelar_belakang, form.gelar_belakang || "");
    setC(c.nama_lengkap, namaFull || "");
    setC(c.nip, "'" + (form.nip || ""));
    setC(c.tmp_lahir, form.tmp_lahir || "");
    setC(c.tgl_lahir, convertStringToDate_(form.tgl_lahir));
    setC(c.nik, "'" + (form.nik || ""));
    setC(c.lp, form.lp || "");
    setC(c.agama, form.agama || "");
    setC(c.pendidikan, form.pendidikan || "");
    setC(c.jurusan, form.jurusan || "");
    setC(c.thn_lulus, form.thn_lulus || "");
    setC(c.alamat_ktp, form.alamat_ktp || "");
    setC(c.alamat_domisili, form.alamat_domisili || "");
    setC(c.hp, "'" + (form.hp || ""));
    setC(c.status_peg, form.status_peg || "");
    setC(c.jabatan, form.jabatan || "");
    setC(c.tmt_jabatan, convertStringToDate_(form.tmt_jabatan));
    setC(c.pangkat, form.pangkat || "");
    setC(c.tmt_gol, convertStringToDate_(form.tmt_gol));
    setC(c.mkg, mkg);
    setC(c.tugas, form.tugas || "");
  setC(c.mengajar_kelas, "'" + (form.mengajar_kelas || "-"));
    setC(c.nuptk, "'" + (form.nuptk || ""));
    setC(c.serdik, form.serdik || "");
    setC(c.dapodik, form.dapodik || "");
    setC(c.tugtam, form.tugtam || "");
    setC(c.email, form.email || "");
    setC(c.diinput, timestamp);
    setC(c.user_input, form.user_login || "");
    setC(c.jenis_dok, jenisDok);
    setC(c.file_url, fileUrl);

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();
    invalidatePtkSdnDataCache_();

    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
  finally { lock.releaseLock(); }
}

// 5. REVISI DATA PTK BARU (Tanpa Insert Baru)
function revisiUsulanPTKBaru(form, base64Data, fileName, jenisDokumen, userPengusul) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch(lockErr) {
    return "Error: Sistem sedang sibuk digunakan pengguna lain. Coba lagi dalam beberapa saat.";
  }
  try {
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    if (!sheet) return "Error: Sheet PTK tidak ditemukan.";
    var data = sheet.getDataRange().getValues();
    
    var rowIndex = -1;
    var selfId = String(form.id || "").trim();
    for(var i=1; i<data.length; i++){ 
      var rId = String(data[i][c.id] || "").trim();
      var rOldId = c.old_id > -1 ? String(data[i][c.old_id] || "").trim() : "";
      if(rId === selfId || (rOldId && rOldId === selfId)){ rowIndex = i + 1; break; } 
    }
    if(rowIndex === -1) return "Error: ID PTK (" + form.id + ") tidak ditemukan di Master.";

    var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, '');
    if (inputNip !== "" && inputNip !== "-") {
        for (var i = 1; i < data.length; i++) {
            if (i + 1 === rowIndex) continue;
            if (ctx.useCentral && c.jenjang > -1 && String(data[i][c.jenjang] || "").trim() !== "SD Negeri") continue;
            var rowNip = String(data[i][c.nip] || "").replace(/[^0-9]/g, ''); 
            if (rowNip === inputNip) return "Gagal: NIP " + inputNip + " sudah dipakai oleh " + data[i][c.nama_lengkap];
        }
    }

    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");

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

    var extras = {};
    if (jenisDokumen) extras.jenisDokumen = jenisDokumen;
    if (fileUrl) extras.fileUrl = fileUrl;
    applyPtkMasterRowUpdate_(sheet, rowIndex, form, extras);

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

    SpreadsheetApp.flush();
    invalidatePtkSdnDataCache_();
    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
  finally { lock.releaseLock(); }
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
    var searchNpsn = String(npsn).trim().toUpperCase();
    if (typeof getSekolahByNPSN === "function") {
      var sek = getSekolahByNPSN(npsn);
      if (sek && sek.found && sek.nama_sekolah) {
        return JSON.stringify({ unitKerja: String(sek.nama_sekolah).trim() });
      }
    }
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "Database Sekolah");
    if (!sheet) return JSON.stringify({ error: "Sheet 'Database Sekolah' tidak ditemukan." });
    var lastRow = sheet.getLastRow(); if (lastRow < 2) return JSON.stringify({ error: "Database Sekolah kosong." });
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
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

function checkAndGetPtkNonAktifSDNByNIK(nik) {
  try {
    var inputNik = String(nik).replace(/'/g, "").trim();
    if (!inputNik) return JSON.stringify({ found: false });

    var ctx = getTblPtkSdnContext_();
    if (ctx.useCentral) {
      var dataDisplay = ctx.sheet.getDataRange().getDisplayValues();
      var c = ctx.colMap;
      for (var i = 1; i < dataDisplay.length; i++) {
        var row = dataDisplay[i];
        if (c.jenjang > -1 && String(row[c.jenjang] || "").trim() !== "SD Negeri") continue;
        if (c.status_aktif > -1 && String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() !== "NON_AKTIF") continue;
        var rowNik = String(row[c.nik] || "").replace(/'/g, "").trim();
        if (rowNik === inputNik) {
          return JSON.stringify({
            found: true,
            id: row[c.id],
            nama_lengkap: row[c.nama_lengkap] || row[c.nama_no_gelar] || "",
            nik: rowNik,
            lembaga_lama: row[c.unit] || "",
            alasan_non_aktif: (c.alasan_hapus > -1 ? row[c.alasan_hapus] : "") || "Mutasi / Non-Aktif",
            tgl_non_aktif: (c.tgl_hapus > -1 ? row[c.tgl_hapus] : "") || ""
          });
        }
      }
      return JSON.stringify({ found: false });
    }

    var sheetTarget = getSheet(KONFIG_PTK.DB_KEY, "gtk_non_aktif");
    if (!sheetTarget) return JSON.stringify({ found: false });
    var dataDisplay = sheetTarget.getDataRange().getDisplayValues();

    for (var i = 1; i < dataDisplay.length; i++) {
      var rowNik = String(dataDisplay[i][10] || "").replace(/'/g, "").trim();
      if (rowNik === inputNik) {
        var row = dataDisplay[i];
        var lastColIdx = row.length - 1;
        return JSON.stringify({
          found: true,
          id: row[0],
          nama_lengkap: row[6] || row[4] || "",
          nik: rowNik,
          lembaga_lama: row[2] || "",
          alasan_non_aktif: row[lastColIdx - 2] || "Mutasi / Non-Aktif",
          tgl_non_aktif: row[lastColIdx - 1] || ""
        });
      }
    }
    return JSON.stringify({ found: false });
  } catch(e) { return JSON.stringify({ found: false, error: e.message }); }
}

function reactivatePtkSDN(form) {
  try {
    var inputNik = String(form.nik).replace(/'/g, "").trim();
    var ctx = getTblPtkSdnContext_();
    if (ctx.useCentral) {
      var dataDisplay = ctx.sheet.getDataRange().getDisplayValues();
      var c = ctx.colMap;
      var rowIdx = -1;
      for (var i = 1; i < dataDisplay.length; i++) {
        var row = dataDisplay[i];
        if (c.jenjang > -1 && String(row[c.jenjang] || "").trim() !== "SD Negeri") continue;
        if (c.status_aktif > -1 && String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() !== "NON_AKTIF") continue;
        var rowNik = String(row[c.nik] || "").replace(/'/g, "").trim();
        if (rowNik === inputNik) {
          rowIdx = i + 1;
          break;
        }
      }
      if (rowIdx === -1) return "Error: Data non-aktif dengan NIK ini tidak ditemukan di tbl_ptk.";
      if (c.status_aktif > -1) ctx.sheet.getRange(rowIdx, c.status_aktif + 1).setValue("AKTIF");
      applyPtkMasterRowUpdate_(ctx.sheet, rowIdx, form, {});
      SpreadsheetApp.flush();
      invalidatePtkSdnDataCache_();
      return "Sukses";
    }

    var sheetNonAktif = getSheet(KONFIG_PTK.DB_KEY, "gtk_non_aktif");
    var sheetAktif = getSheet(KONFIG_PTK.DB_KEY, KONFIG_PTK.SHEET_PTK);
    if (!sheetNonAktif || !sheetAktif) return "Error: Sheet database tidak ditemukan.";

    var dataDisplay = sheetNonAktif.getDataRange().getDisplayValues();
    var dataValues = sheetNonAktif.getDataRange().getValues();
    var rowIdx = -1;
    var originalRow = [];

    for (var i = 1; i < dataDisplay.length; i++) {
      var rowNik = String(dataDisplay[i][10] || "").replace(/'/g, "").trim();
      if (rowNik === inputNik) {
        rowIdx = i + 1;
        originalRow = dataValues[i];
        break;
      }
    }

    if (rowIdx === -1) return "Error: Data non-aktif dengan NIK ini tidak ditemukan.";

    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var rawNpsn = form.npsn_baru || form.npsn_login || form.npsn || "";
    var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
    var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;
    var finalUnit = form.unit_kerja || form.unit_login || form.unit || "";

    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
    var mkg = ""; if (form.mkg_thn || form.mkg_bln) { mkg = (form.mkg_thn || "0") + " Tahun " + (form.mkg_bln || "0") + " Bulan"; }

    var activeRowData = [
      originalRow[0],
      finalNpsn,
      finalUnit,
      form.gelar_depan || originalRow[3] || "",
      form.nama_lengkap || originalRow[4] || "",
      form.gelar_belakang || originalRow[5] || "",
      namaFull || originalRow[6] || "",
      "'" + (form.nip || originalRow[7] || ""),
      form.tmp_lahir || originalRow[8] || "",
      convertStringToDate_(form.tgl_lahir || originalRow[9]),
      "'" + (form.nik || originalRow[10] || ""),
      form.lp || originalRow[11] || "",
      form.agama || originalRow[12] || "",
      form.pendidikan || originalRow[13] || "",
      form.jurusan || originalRow[14] || "",
      form.thn_lulus || originalRow[15] || "",
      form.alamat_ktp || originalRow[16] || "",
      form.alamat_domisili || originalRow[17] || "",
      "'" + (form.hp || originalRow[18] || ""),
      form.status_peg || originalRow[19] || "",
      form.jabatan || originalRow[20] || "",
      convertStringToDate_(form.tmt_jabatan || originalRow[21]),
      form.pangkat || originalRow[22] || "",
      convertStringToDate_(form.tmt_gol || originalRow[23]),
      mkg || originalRow[24] || "",
      form.tugas || originalRow[25] || "",
      "'" + (form.nuptk || originalRow[26] || ""),
      form.serdik || originalRow[27] || "",
      form.dapodik || originalRow[28] || "",
      form.tugtam || originalRow[29] || "",
      form.email || originalRow[30] || "",
      originalRow[31] || timestamp,
      originalRow[32] || form.user_login || "",
      timestamp,
      form.user_login || "",
      originalRow[35] || "",
      originalRow[36] || "",
      ""
    ];

    sheetAktif.appendRow(activeRowData);
    sheetNonAktif.deleteRow(rowIdx);
    SpreadsheetApp.flush();
    invalidatePtkSdnDataCache_();
    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
}

function moveDataPTKToNonAktif(id, reason, userLogin) {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    try {
      var tblPtk = getSheet("SIKS_DB_MASTER", "tbl_ptk");
      var lastRow = tblPtk.getLastRow();
      var lastCol = tblPtk.getLastColumn();
      if (lastRow < 2) return "Error: Data tbl_ptk kosong.";

      var hdrs = tblPtk.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var colIdPtk = hdrs.indexOf("id_ptk") > -1 ? hdrs.indexOf("id_ptk") : 0;
      var colOldId = hdrs.indexOf("id");
      var colStatusAktif = hdrs.indexOf("status_aktif") > -1 ? hdrs.indexOf("status_aktif") : 2;
      var colAlasan = hdrs.indexOf("alasan hapus");
      var colTglHapus = hdrs.indexOf("tanggal hapus");
      var colUserHapus = hdrs.indexOf("user hapus");
      var colDiedit = hdrs.indexOf("diedit");
      var colUserEdit = hdrs.indexOf("user edit") > -1 ? hdrs.indexOf("user edit") : hdrs.indexOf("user_edit");

      var vals = tblPtk.getRange(2, 1, lastRow - 1, Math.max(colIdPtk + 1, colOldId + 1, 4)).getDisplayValues();
      var targetId = String(id || "").trim();
      for (var k = 0; k < vals.length; k++) {
        var rIdPtk = String(vals[k][colIdPtk] || "").trim();
        var rOldId = colOldId > -1 ? String(vals[k][colOldId] || "").trim() : "";
        if (rIdPtk === targetId || (rOldId && rOldId === targetId)) {
          var sheetRow = k + 2;
          var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
          tblPtk.getRange(sheetRow, colStatusAktif + 1).setValue("NON_AKTIF");
          if (colAlasan > -1) tblPtk.getRange(sheetRow, colAlasan + 1).setValue(reason || "");
          if (colTglHapus > -1) tblPtk.getRange(sheetRow, colTglHapus + 1).setValue(nowStr);
          if (colUserHapus > -1) tblPtk.getRange(sheetRow, colUserHapus + 1).setValue(userLogin || "Admin");
          if (colDiedit > -1) tblPtk.getRange(sheetRow, colDiedit + 1).setValue(nowStr);
          if (colUserEdit > -1) tblPtk.getRange(sheetRow, colUserEdit + 1).setValue(userLogin || "Admin");
          SpreadsheetApp.flush();
          invalidatePtkSdnDataCache_();
          return "Sukses: Data PTK berhasil dinonaktifkan di tbl_ptk.";
        }
      }
      return "Error: ID PTK (" + targetId + ") tidak ditemukan di tbl_ptk.";
    } catch (eC) {
      return "Error: " + eC.message;
    }
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch(lockErr) {
    return "Error: Sistem sedang sibuk digunakan pengguna lain. Coba lagi dalam beberapa saat.";
  }
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
    SpreadsheetApp.flush();
    return "Sukses";
  } catch (e) { return "Error: " + e.message; }
  finally { lock.releaseLock(); }
}

function hapusPermanenPTKSDN(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return "Error: Sistem sedang sibuk digunakan pengguna lain. Coba lagi dalam beberapa saat.";
  }
  try {
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return "Error: Data kosong.";

    var vals = sheet.getRange(2, 1, lastRow - 1, Math.max(c.id + 1, c.old_id + 1, 4)).getDisplayValues();
    var targetId = String(id || "").trim();
    for (var k = 0; k < vals.length; k++) {
      var rId = String(vals[k][c.id] || "").trim();
      var rOldId = c.old_id > -1 ? String(vals[k][c.old_id] || "").trim() : "";
      if (rId === targetId || (rOldId && rOldId === targetId)) {
        sheet.deleteRow(k + 2);
        SpreadsheetApp.flush();
        invalidatePtkSdnDataCache_();
        return "Sukses: Data PTK berhasil dihapus permanen.";
      }
    }
    return "Error: ID PTK (" + targetId + ") tidak ditemukan.";
  } catch (e) {
    return "Error: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

function getDataKeadaanGTK() {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    // Daftar SD Negeri aktif dari master sekolah (jenjang "SD NEGERI")
    var activeSdnNpsn = {};
    var hasMaster = false;
    if (typeof getMasterSekolah === "function") {
      try {
        getMasterSekolah().forEach(function(ms) {
          var jjg = String(ms.jenjang || "").trim().toUpperCase();
          if ((jjg === "SD NEGERI" || jjg === "SDN") && ms.npsn) {
            activeSdnNpsn[String(ms.npsn).trim()] = true;
            hasMaster = true;
          }
        });
      } catch (eMs) {}
    }

    // Gunakan hitungan yang sama dengan halaman Keadaan PTK SDN (berbasis kolom "tugas")
    var rekap = JSON.parse(getDataRekapKeadaanSDN());
    var schools = (rekap && rekap.schools) ? rekap.schools : [];
    var result = [];

    schools.forEach(function(s) {
      var npsn = String(s.npsn || "").trim();

      var r = [s.unit || "", npsn];
      for (var k = 2; k < 67; k++) r.push(0);
      var J = s.jabatan;
      var asnPns = function(o) { return (o.pns || 0) + (o.cpns || 0); };

      // Kepala Sekolah
      r[2] = asnPns(J.ks);
      r[3] = J.ks.pppk || 0;
      // Guru Kelas, PJOK, PAI, Kristen: [pns, pppk, pw, non_asn]
      var setGuru = function(base, o) {
        r[base] = asnPns(o); r[base + 1] = o.pppk || 0; r[base + 2] = o.pppk_pw || 0; r[base + 3] = o.non_asn || 0;
      };
      setGuru(5, J.guru_kelas);
      setGuru(10, J.guru_pjok);
      setGuru(15, J.guru_pai);
      setGuru(20, J.guru_kristen);
      // Tendik: pengelola umum, operator, pengelola layanan, penata layanan (+ tendik lainnya)
      setGuru(25, J.pengelola_umum);
      setGuru(30, J.operator_layanan);
      setGuru(35, J.pengelola_layanan);
      setGuru(40, J.penata_layanan);
      r[40] += asnPns(J.tendik_lainnya);
      r[41] += J.tendik_lainnya.pppk || 0;
      r[42] += J.tendik_lainnya.pppk_pw || 0;
      r[46] = J.tendik_lainnya.non_asn || 0;

      // Ringkasan per status (dipakai kartu KPI & selisih "guru lain")
      var S = s.status;
      r[49] = (S.pns.ks || 0) + (S.cpns.ks || 0);
      r[50] = (S.pns.guru || 0) + (S.cpns.guru || 0);
      r[51] = (S.pns.tendik || 0) + (S.cpns.tendik || 0);
      r[52] = r[49] + r[50] + r[51];
      r[53] = S.pppk.ks || 0;
      r[54] = S.pppk.guru || 0;
      r[55] = S.pppk.tendik || 0;
      r[56] = r[53] + r[54] + r[55];
      r[57] = (S.pppk_pw.guru || 0) + (S.pppk_pw.ks || 0);
      r[58] = S.pppk_pw.tendik || 0;
      r[59] = r[57] + r[58];
      r[60] = (S.non_asn.guru || 0) + (S.non_asn.ks || 0);
      r[61] = S.non_asn.tendik || 0;
      r[62] = r[52];
      r[63] = r[56];
      r[64] = r[59];
      r[65] = r[60] + r[61];
      r[66] = S.total.jml || 0;

      result.push(r.map(function(v, idx) { return idx < 2 ? v : String(v); }));
    });
    return result;
  }
  var sheet = getSheet(KONFIG_PTK.DB_KEY, "Keadaan GTK"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 67).getDisplayValues();
}
function getDataKebutuhanGuru() { return getDataKebutuhanGuruSDNMaster(); }
function getDataBezettingSDN() { return getDataBezettingSDNMaster(); }

/**
 * BEZETTING SD NEGERI (DINAMIS DARI MASTER DATA GTK)
 * Menghitung bezetting, formasi, CPNS, pensiun (1 & 2 thn), selisih +/-, dan tendik
 * langsung secara real-time dari Master Data GTK.
 * Output: JSON string { success: true, schools: [...] }
 */
function getDataBezettingSDNMaster() {
  try {
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet PTK tidak ditemukan.", schools: [] });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ success: true, schools: [] });

    // 1. Ambil Data Rombel & Murid langsung dari tbl_lapbul_sd terakhir
    var rombelMuridMap = getRombelMuridFromLapbulSd_();

    // 2. Baca seluruh kolom tbl_ptk
    var data = sheet.getRange(2, 1, lastRow - 1, ctx.totalCols).getValues();
    var schoolMap = {};

    function initBezettingJabatan() {
      return {
        keb: 0,
        cpns: 0,
        pns: 0,
        pppk: 0,
        pw: 0,
        jml: 0,
        selisih: 0,
        non_asn_lt: 0,
        pens_1: 0,
        pens_2: 0
      };
    }

    // Map sekolah aktif SD Negeri dari tbl_sekolah agar sekolah tutup (seperti SDN PAYAMAN 2) tidak ikut muncul
    var activeSdnNpsn = {};
    var activeSdnNama = {};
    if (typeof getMasterSekolah === "function") {
      try {
        var masterSek = getMasterSekolah();
        masterSek.forEach(function(ms) {
          var jjg = String(ms.jenjang || "").trim().toUpperCase();
          var sts = String(ms.status || "").trim().toUpperCase();
          if (jjg === "SD NEGERI" || jjg === "SDN" || (jjg === "SD" && sts === "NEGERI")) {
            if (ms.npsn) activeSdnNpsn[String(ms.npsn).trim()] = true;
            if (ms.nama_sekolah) activeSdnNama[String(ms.nama_sekolah).trim().toUpperCase()] = true;
          }
        });
      } catch (eMs) {}
    }
    var hasMasterSdn = Object.keys(activeSdnNpsn).length > 0 || Object.keys(activeSdnNama).length > 0;

    // Inisialisasi sekolah dari rombelMuridMap (hanya SD Negeri yang masih aktif di tbl_sekolah)
    Object.keys(rombelMuridMap).forEach(function(key) {
      var ref = rombelMuridMap[key];
      var uUpper = String(ref.unit || "").trim().toUpperCase();
      if (uUpper.indexOf("PAYAMAN 2") !== -1) return;
      var nStr = String(ref.npsn || "").trim();
      if (hasMasterSdn) {
        if (!activeSdnNpsn[nStr] && !activeSdnNama[uUpper]) return;
      } else {
        var isSdn = (uUpper.indexOf("SD NEGERI") !== -1 || uUpper.indexOf("SDN") !== -1) && uUpper.indexOf("SWASTA") === -1 && uUpper.indexOf("SDS") === -1;
        if (!isSdn) return;
      }
      var sKey = ref.npsn || ref.unit;
      if (!schoolMap[sKey]) {
        schoolMap[sKey] = {
          npsn: ref.npsn || "",
          unit: ref.unit || "",
          rombel: ref.rombel || 0,
          murid: ref.murid || 0,
          ks: initBezettingJabatan(),
          guru_kelas: initBezettingJabatan(),
          guru_pjok: initBezettingJabatan(),
          guru_pai: initBezettingJabatan(),
          guru_kristen: initBezettingJabatan(),
          tendik_pw: { pengelola_umum: 0, operator_layanan: 0, pengelola_layanan: 0, penata_layanan: 0, jml: 0 },
          non_asn_cutoff: { guru: 0, tendik: 0, jml: 0 }
        };
      }
    });

    var now = new Date();
    var curYear = now.getFullYear(); // 2026
    var nextYear = curYear + 1;      // 2027
    var cutoffDate = new Date(2023, 7, 3); // 3 Agustus 2023

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[c.id]) continue;
      if (ctx.useCentral) {
        if (c.jenjang > -1 && String(row[c.jenjang] || "").trim() !== "SD Negeri") continue;
        if (c.status_aktif > -1 && String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() === "NON_AKTIF") continue;
      }

      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").trim() : "";
      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      var uUpper = unit.toUpperCase();
      if (!unit && !npsn) continue;
      if (uUpper.indexOf("PAYAMAN 2") !== -1) continue;
      if (hasMasterSdn && !activeSdnNpsn[npsn] && !activeSdnNama[uUpper]) continue;

      var schoolKey = npsn || unit;
      if (!schoolMap[schoolKey]) {
        var refInfo = rombelMuridMap[npsn] || rombelMuridMap[unit] || { rombel: 0, murid: 0 };
        schoolMap[schoolKey] = {
          npsn: npsn,
          unit: unit,
          rombel: refInfo.rombel || 0,
          murid: refInfo.murid || 0,
          ks: initBezettingJabatan(),
          guru_kelas: initBezettingJabatan(),
          guru_pjok: initBezettingJabatan(),
          guru_pai: initBezettingJabatan(),
          guru_kristen: initBezettingJabatan(),
          tendik_pw: { pengelola_umum: 0, operator_layanan: 0, pengelola_layanan: 0, penata_layanan: 0, jml: 0 },
          non_asn_cutoff: { guru: 0, tendik: 0, jml: 0 }
        };
      }

      var sch = schoolMap[schoolKey];
      if (!sch.unit && unit) sch.unit = unit;
      if (!sch.npsn && npsn) sch.npsn = npsn;

      // Status Pegawai
      var st = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";
      var isCpns = (st.indexOf("CPNS") !== -1);
      var isPw = (st.indexOf("PPPK PW") !== -1 || st.indexOf("PARUH WAKTU") !== -1 || st.indexOf("PW") !== -1);
      var isPppk = !isPw && (st.indexOf("PPPK") !== -1);
      var isPns = !isCpns && (st.indexOf("PNS") !== -1);
      var isAsnGroup = isCpns || isPns || isPppk || isPw;

      // Cek apakah Non-ASN < 3-8-2023
      var isNonAsnLt = false;
      if (!isAsnGroup) {
        var tmtVal = c.tmt_jabatan > -1 ? row[c.tmt_jabatan] : "";
        var tmtDate = null;
        if (tmtVal instanceof Date && !isNaN(tmtVal.getTime())) {
          tmtDate = tmtVal;
        } else if (tmtVal) {
          var strTmt = String(tmtVal).trim();
          var m1 = strTmt.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
          if (m1) tmtDate = new Date(parseInt(m1[1], 10), parseInt(m1[2], 10) - 1, parseInt(m1[3], 10));
          var m2 = strTmt.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
          if (m2) tmtDate = new Date(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10));
        }
        if (!tmtDate || tmtDate < cutoffDate) {
          isNonAsnLt = true;
        }
      }

      // Hitung Pensiun (Tahun Pensiun = Tahun Lahir + BUP 60)
      // Berlaku untuk CPNS, PNS, PPPK, PPPK Paruh Waktu
      var isPens1 = false;
      var isPens2 = false;
      if (isAsnGroup) {
        var tglLahirStr = c.tgl_lahir > -1 ? parseIndoDate(row[c.tgl_lahir]) : "";
        if (tglLahirStr) {
          var partsLahir = tglLahirStr.split('-');
          if (partsLahir.length === 3) {
            var thnLahir = parseInt(partsLahir[0], 10);
            var blnLahir = parseInt(partsLahir[1], 10) - 1;
            if (!isNaN(thnLahir) && !isNaN(blnLahir)) {
              var bup = 60; // BUP Guru & KS = 60
              var thnPensiun = thnLahir + bup;
              var blnPensiun = blnLahir + 1;
              if (blnPensiun > 11) { blnPensiun = 0; thnPensiun++; }
              if (thnPensiun === curYear) isPens1 = true;
              else if (thnPensiun === nextYear) isPens2 = true;
            }
          }
        }
      }

      // Tugas / Jabatan
      var tg = c.tugas > -1 ? String(row[c.tugas] || "").trim().toUpperCase() : "";

      if (tg.indexOf("KEPALA") !== -1) {
        var ks = sch.ks;
        if (isCpns) ks.cpns++;
        else if (isPns) ks.pns++;
        else if (isPppk) ks.pppk++;
        else if (isPw) ks.pw++;
        if (isPens1) ks.pens_1++;
        if (isPens2) ks.pens_2++;
      } else if (tg.indexOf("KELAS") !== -1) {
        var gk = sch.guru_kelas;
        if (isCpns) gk.cpns++;
        else if (isPns) gk.pns++;
        else if (isPppk) gk.pppk++;
        else if (isPw) gk.pw++;
        if (isNonAsnLt) {
          gk.non_asn_lt++;
          sch.non_asn_cutoff.guru++;
          sch.non_asn_cutoff.jml++;
        }
        if (isPens1) gk.pens_1++;
        if (isPens2) gk.pens_2++;
      } else if (tg.indexOf("PJOK") !== -1 || tg.indexOf("PENJAS") !== -1 || tg.indexOf("OLAHRAGA") !== -1) {
        var pjok = sch.guru_pjok;
        if (isCpns) pjok.cpns++;
        else if (isPns) pjok.pns++;
        else if (isPppk) pjok.pppk++;
        else if (isPw) pjok.pw++;
        if (isNonAsnLt) {
          pjok.non_asn_lt++;
          sch.non_asn_cutoff.guru++;
          sch.non_asn_cutoff.jml++;
        }
        if (isPens1) pjok.pens_1++;
        if (isPens2) pjok.pens_2++;
      } else if (tg.indexOf("PAI") !== -1 || tg.indexOf("AGAMA ISLAM") !== -1 || tg.indexOf("ISLAM") !== -1) {
        var pai = sch.guru_pai;
        if (isCpns) pai.cpns++;
        else if (isPns) pai.pns++;
        else if (isPppk) pai.pppk++;
        else if (isPw) pai.pw++;
        if (isNonAsnLt) {
          pai.non_asn_lt++;
          sch.non_asn_cutoff.guru++;
          sch.non_asn_cutoff.jml++;
        }
        if (isPens1) pai.pens_1++;
        if (isPens2) pai.pens_2++;
      } else if (tg.indexOf("KRISTEN") !== -1 || tg.indexOf("PROTESTAN") !== -1 || tg.indexOf("KATOLIK") !== -1) {
        var pak = sch.guru_kristen;
        if (isCpns) pak.cpns++;
        else if (isPns) pak.pns++;
        else if (isPppk) pak.pppk++;
        else if (isPw) pak.pw++;
        if (isNonAsnLt) {
          pak.non_asn_lt++;
          sch.non_asn_cutoff.guru++;
          sch.non_asn_cutoff.jml++;
        }
        if (isPens1) pak.pens_1++;
        if (isPens2) pak.pens_2++;
      } else {
        // TENDIK / GURU LAINNYA
        if (tg.indexOf("GURU") !== -1) {
          if (isNonAsnLt) {
            sch.non_asn_cutoff.guru++;
            sch.non_asn_cutoff.jml++;
          }
        } else {
          // Tendik
          if (isPw) {
            var tpw = sch.tendik_pw;
            if (tg.indexOf("PENGELOLA UMUM") !== -1) tpw.pengelola_umum++;
            else if (tg.indexOf("OPERATOR LAYANAN") !== -1 || tg.indexOf("OPERATOR") !== -1) tpw.operator_layanan++;
            else if (tg.indexOf("PENGELOLA LAYANAN") !== -1) tpw.pengelola_layanan++;
            else if (tg.indexOf("PENATA LAYANAN") !== -1) tpw.penata_layanan++;
            else tpw.pengelola_umum++;
            tpw.jml++;
          }
          if (isNonAsnLt) {
            sch.non_asn_cutoff.tendik++;
            sch.non_asn_cutoff.jml++;
          }
        }
      }
    }

    // 3. Hitung Kebutuhan, Jml Bezetting, dan Selisih (+/-) per Sekolah
    var schoolList = Object.keys(schoolMap).map(function(k) { return schoolMap[k]; });

    function hitungKebMapel(jmlRombel) {
      if (!jmlRombel || jmlRombel <= 0) return 0;
      if (jmlRombel <= 10) return 1;
      if (jmlRombel <= 15) return 2;
      if (jmlRombel <= 20) return 3;
      return Math.max(3, Math.ceil(jmlRombel / 6));
    }

    schoolList.forEach(function(s) {
      var rombel = s.rombel || 0;

      // A. Kepala Sekolah: Keb = 1
      s.ks.keb = 1;
      s.ks.jml = s.ks.cpns + s.ks.pns + s.ks.pppk + s.ks.pw;
      s.ks.selisih = s.ks.jml - s.ks.keb;

      // B. Guru Kelas: Keb = Rombel
      s.guru_kelas.keb = rombel;
      s.guru_kelas.jml = s.guru_kelas.cpns + s.guru_kelas.pns + s.guru_kelas.pppk + s.guru_kelas.pw;
      s.guru_kelas.selisih = s.guru_kelas.jml - s.guru_kelas.keb;

      // C. Guru PJOK: 1-10 rombel = 1, 11-15 rombel = 2, 16-20 rombel = 3
      s.guru_pjok.keb = hitungKebMapel(rombel);
      s.guru_pjok.jml = s.guru_pjok.cpns + s.guru_pjok.pns + s.guru_pjok.pppk + s.guru_pjok.pw;
      s.guru_pjok.selisih = s.guru_pjok.jml - s.guru_pjok.keb;

      // D. Guru PAI: 1-10 rombel = 1, 11-15 rombel = 2, 16-20 rombel = 3
      s.guru_pai.keb = hitungKebMapel(rombel);
      s.guru_pai.jml = s.guru_pai.cpns + s.guru_pai.pns + s.guru_pai.pppk + s.guru_pai.pw;
      s.guru_pai.selisih = s.guru_pai.jml - s.guru_pai.keb;

      // E. Guru PA Kristen: Keb = total eksisting atau 0
      var pakEksis = s.guru_kristen.cpns + s.guru_kristen.pns + s.guru_kristen.pppk + s.guru_kristen.pw;
      s.guru_kristen.keb = pakEksis > 0 ? pakEksis : 0;
      s.guru_kristen.jml = pakEksis;
      s.guru_kristen.selisih = s.guru_kristen.jml - s.guru_kristen.keb;
    });

    schoolList.sort(function(a, b) { return a.unit.localeCompare(b.unit); });

    return JSON.stringify({ success: true, schools: schoolList });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message, schools: [] });
  }
}

/**
 * KEBUTUHAN GURU SD NEGERI (DINAMIS DARI MASTER DATA GTK)
 * Menghitung formasi kebutuhan & distribusi guru langsung dari Master Data GTK real-time.
 * Output: JSON string { success: true, schools: [...] }
 */
/**
 * Helper: Ambil JML ROMBEL & JML MURID kiriman bulan terakhir per sekolah
 * langsung dari tbl_lapbul_sd (SIKS_DB_LAYANAN) dengan fallback sheet Kebutuhan Guru.
 */
function getRombelMuridFromLapbulSd_() {
  var map = {};
  try {
    var lapbulSheet = (typeof USE_CENTRAL_LAYANAN_DB !== "undefined" && USE_CENTRAL_LAYANAN_DB && typeof getLayananCentralSheet === "function")
      ? getLayananCentralSheet("tbl_lapbul_sd")
      : getSheet("LAPBUL_SD_DB", "Input SD");

    if (lapbulSheet && lapbulSheet.getLastRow() >= 2) {
      var data = lapbulSheet.getDataRange().getValues();
      var hdrs = data[0].map(function(h) { return String(h || "").toLowerCase().trim(); });
      var findIdx = function(patterns) {
        for (var p = 0; p < patterns.length; p++) {
          for (var c = 0; c < hdrs.length; c++) {
            if (hdrs[c] === patterns[p] || hdrs[c].indexOf(patterns[p]) !== -1) return c;
          }
        }
        return -1;
      };

      var idxNpsn = findIdx(["npsn"]);
      var idxUnit = findIdx(["nama sekolah", "nama_sekolah", "unit kerja", "sekolah"]);
      var idxTahun = findIdx(["tahun"]);
      var idxBulan = findIdx(["bulan"]);
      var idxRombel = findIdx(["total rombel", "jumlah rombel", "jml rombel", "rombel"]);
      var idxMurid = findIdx(["jumlah murid akhir", "total murid", "jumlah murid", "jml murid", "jumlah_akhir", "jml_akhir", "akhir bulan", "murid"]);
      if (idxMurid === -1 && hdrs.length > 226) {
        idxMurid = 226; // Kolom HS di Input SD / tbl_lapbul_sd
      }

      var bulanOrder = {
        "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
        "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11, "desember": 12
      };

      var bestScore = {};
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        var npsn = idxNpsn > -1 ? String(r[idxNpsn] || "").trim() : "";
        var unit = idxUnit > -1 ? String(r[idxUnit] || "").trim() : "";
        if (!npsn && !unit) continue;

        var thn = idxTahun > -1 ? (parseInt(r[idxTahun], 10) || 0) : 0;
        var blnRaw = idxBulan > -1 ? String(r[idxBulan] || "").trim().toLowerCase() : "";
        var blnNum = bulanOrder[blnRaw] || parseInt(blnRaw, 10) || 0;
        var score = thn * 100 + blnNum;

        var key = npsn || unit.toUpperCase();
        if (bestScore[key] === undefined || score >= bestScore[key]) {
          bestScore[key] = score;
          var rombel = idxRombel > -1 ? (parseInt(r[idxRombel], 10) || 0) : 0;
          var murid = idxMurid > -1 ? (parseInt(r[idxMurid], 10) || 0) : 0;
          var info = { rombel: rombel, murid: murid, unit: unit, npsn: npsn };
          if (npsn) map[npsn] = info;
          if (unit) map[unit] = info;
        }
      }
    }
  } catch (eLap) {
    Logger.log("getRombelMuridFromLapbulSd_ error: " + eLap.message);
  }

  // Fallback untuk sekolah yang belum ada di tbl_lapbul_sd
  try {
    var kgSheet = getSheet(KONFIG_PTK.DB_KEY, "Kebutuhan Guru");
    if (kgSheet && kgSheet.getLastRow() >= 3) {
      var kgData = kgSheet.getRange(3, 1, kgSheet.getLastRow() - 2, 4).getValues();
      for (var k = 0; k < kgData.length; k++) {
        var kUnit = String(kgData[k][0] || "").trim();
        var kNpsn = String(kgData[k][1] || "").trim();
        var kRombel = parseInt(kgData[k][2], 10) || 0;
        var kMurid = parseInt(kgData[k][3], 10) || 0;
        var infoFb = { rombel: kRombel, murid: kMurid, unit: kUnit, npsn: kNpsn };
        if (kNpsn && !map[kNpsn]) map[kNpsn] = infoFb;
        if (kUnit && !map[kUnit]) map[kUnit] = infoFb;
      }
    }
  } catch (eKg) {}

  return map;
}

function getDataKebutuhanGuruSDNMaster() {
  try {
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet PTK tidak ditemukan.", schools: [] });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ success: true, schools: [] });

    // Map Rombel & Murid langsung dari Laporan Bulan SD terakhir (tbl_lapbul_sd)
    var rombelMuridMap = getRombelMuridFromLapbulSd_();

    var data = sheet.getRange(2, 1, lastRow - 1, ctx.totalCols).getValues();
    var schoolMap = {};

    function initJabatanItem() {
      return { keb: 0, cpns: 0, pns: 0, pppk: 0, pw: 0, non_asn_lt: 0, non_asn_gt: 0, selisih: 0, ket: "Sesuai" };
    }

    // Map sekolah aktif SD Negeri dari tbl_sekolah agar sekolah tutup (seperti SDN PAYAMAN 2) tidak ikut muncul
    var activeSdnNpsn = {};
    var activeSdnNama = {};
    var sdnUnitToNpsn = {};
    if (typeof getMasterSekolah === "function") {
      try {
        var masterSek = getMasterSekolah();
        masterSek.forEach(function(ms) {
          var jjg = String(ms.jenjang || "").trim().toUpperCase();
          var sts = String(ms.status || "").trim().toUpperCase();
          if (jjg === "SD NEGERI" || jjg === "SDN" || (jjg === "SD" && sts === "NEGERI")) {
            var mNpsn = ms.npsn ? String(ms.npsn).replace(/'/g, "").trim() : "";
            var mNama = ms.nama_sekolah ? String(ms.nama_sekolah).trim().toUpperCase() : "";
            if (mNpsn) activeSdnNpsn[mNpsn] = true;
            if (mNama) activeSdnNama[mNama] = true;
            if (mNpsn && mNama) sdnUnitToNpsn[mNama] = mNpsn;
          }
        });
      } catch (eMs) {}
    }
    var hasMasterSdn = Object.keys(activeSdnNpsn).length > 0 || Object.keys(activeSdnNama).length > 0;

    // Inisialisasi sekolah dari rombelMuridMap (hanya SD Negeri yang masih aktif di tbl_sekolah)
    Object.keys(rombelMuridMap).forEach(function(key) {
      var ref = rombelMuridMap[key];
      var uUpper = String(ref.unit || "").trim().toUpperCase();
      if (uUpper.indexOf("PAYAMAN 2") !== -1) return;
      var nStr = String(ref.npsn || "").replace(/'/g, "").trim();
      if (!nStr && uUpper && sdnUnitToNpsn[uUpper]) nStr = sdnUnitToNpsn[uUpper];
      if (hasMasterSdn) {
        if (!activeSdnNpsn[nStr] && !activeSdnNama[uUpper]) return;
      } else {
        var isSdn = (uUpper.indexOf("SD NEGERI") !== -1 || uUpper.indexOf("SDN") !== -1) && uUpper.indexOf("SWASTA") === -1 && uUpper.indexOf("SDS") === -1;
        if (!isSdn) return;
      }
      var sKey = nStr || uUpper;
      if (!schoolMap[sKey]) {
        schoolMap[sKey] = {
          npsn: nStr,
          unit: ref.unit || "",
          rombel: ref.rombel || 0,
          murid: ref.murid || 0,
          ks: initJabatanItem(),
          guru_kelas: initJabatanItem(),
          guru_pjok: initJabatanItem(),
          guru_pai: initJabatanItem(),
          guru_kristen: initJabatanItem()
        };
      }
    });

    var cutoffDate = new Date(2023, 7, 3); // 3 Agustus 2023

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[c.id]) continue;
      if (ctx.useCentral) {
        if (c.jenjang > -1 && String(row[c.jenjang] || "").trim() !== "SD Negeri") continue;
        if (c.status_aktif > -1 && String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() === "NON_AKTIF") continue;
      }

      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").replace(/'/g, "").trim() : "";
      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      var uUpper = unit.toUpperCase();
      if (uUpper.indexOf("PAYAMAN 2") !== -1) continue;
      if (!npsn && uUpper && sdnUnitToNpsn[uUpper]) npsn = sdnUnitToNpsn[uUpper];
      if (!unit && !npsn) continue;
      if (hasMasterSdn && !activeSdnNpsn[npsn] && !activeSdnNama[uUpper]) continue;

      var schoolKey = npsn || uUpper;
      if (!schoolMap[schoolKey]) {
        var refInfo = rombelMuridMap[npsn] || rombelMuridMap[unit] || { rombel: 0, murid: 0 };
        schoolMap[schoolKey] = {
          npsn: npsn,
          unit: unit,
          rombel: refInfo.rombel || 0,
          murid: refInfo.murid || 0,
          ks: initJabatanItem(),
          guru_kelas: initJabatanItem(),
          guru_pjok: initJabatanItem(),
          guru_pai: initJabatanItem(),
          guru_kristen: initJabatanItem()
        };
      }

      var sch = schoolMap[schoolKey];
      if (!sch.unit && unit) sch.unit = unit;
      if (!sch.npsn && npsn) sch.npsn = npsn;

      // 1. Normalisasi Status Kepegawaian & Non ASN Cutoff
      var st = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";
      var statusKey = "non_asn_lt";

      if (st.indexOf("CPNS") !== -1) {
        statusKey = "cpns";
      } else if (st.indexOf("PPPK PW") !== -1 || st.indexOf("PARUH WAKTU") !== -1 || st.indexOf("PW") !== -1) {
        statusKey = "pw";
      } else if (st.indexOf("PPPK") !== -1) {
        statusKey = "pppk";
      } else if (st.indexOf("PNS") !== -1) {
        statusKey = "pns";
      } else {
        // Non ASN - cek tanggal TMT Jabatan
        var tmtVal = c.tmt_jabatan > -1 ? row[c.tmt_jabatan] : "";
        var tmtDate = null;
        if (tmtVal instanceof Date && !isNaN(tmtVal.getTime())) {
          tmtDate = tmtVal;
        } else if (tmtVal) {
          var strTmt = String(tmtVal).trim();
          var m1 = strTmt.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
          if (m1) tmtDate = new Date(parseInt(m1[1], 10), parseInt(m1[2], 10) - 1, parseInt(m1[3], 10));
          var m2 = strTmt.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
          if (m2) tmtDate = new Date(parseInt(m2[3], 10), parseInt(m2[2], 10) - 1, parseInt(m2[1], 10));
        }

        if (tmtDate && tmtDate >= cutoffDate) {
          statusKey = "non_asn_gt";
        } else {
          statusKey = "non_asn_lt";
        }
      }

      // 2. Normalisasi Tugas
      var tg = c.tugas > -1 ? String(row[c.tugas] || "").trim().toUpperCase() : "";
      var jabKey = "";

      if (tg.indexOf("KEPALA") !== -1) {
        jabKey = "ks";
      } else if (tg.indexOf("KELAS") !== -1) {
        jabKey = "guru_kelas";
      } else if (tg.indexOf("PJOK") !== -1 || tg.indexOf("PENJAS") !== -1 || tg.indexOf("OLAHRAGA") !== -1) {
        jabKey = "guru_pjok";
      } else if (tg.indexOf("PAI") !== -1 || tg.indexOf("AGAMA ISLAM") !== -1 || tg.indexOf("ISLAM") !== -1) {
        jabKey = "guru_pai";
      } else if (tg.indexOf("KRISTEN") !== -1 || tg.indexOf("PROTESTAN") !== -1 || tg.indexOf("KATOLIK") !== -1) {
        jabKey = "guru_kristen";
      }

      if (jabKey && sch[jabKey] && sch[jabKey][statusKey] !== undefined) {
        sch[jabKey][statusKey]++;
      }
    }

    // 3. Hitung Kebutuhan, Selisih, dan Keterangan per Sekolah
    var schoolList = Object.keys(schoolMap).map(function(k) { return schoolMap[k]; });

    schoolList.forEach(function(s) {
      var rombel = s.rombel || 0;

      // A. Kepala Sekolah: Keb = 1
      s.ks.keb = 1;
      var totalKs = s.ks.cpns + s.ks.pns + s.ks.pppk + s.ks.pw + s.ks.non_asn_lt + s.ks.non_asn_gt;
      s.ks.selisih = totalKs - s.ks.keb;
      s.ks.ket = s.ks.selisih < 0 ? "Kurang " + Math.abs(s.ks.selisih) : (s.ks.selisih > 0 ? "Lebih " + s.ks.selisih : "Sesuai");

      // B. Guru Kelas: Keb = Rombel (atau total jika rombel belum terisi)
      s.guru_kelas.keb = rombel;
      var totalGk = s.guru_kelas.cpns + s.guru_kelas.pns + s.guru_kelas.pppk + s.guru_kelas.pw + s.guru_kelas.non_asn_lt + s.guru_kelas.non_asn_gt;
      s.guru_kelas.selisih = totalGk - s.guru_kelas.keb;
      s.guru_kelas.ket = s.guru_kelas.selisih < 0 ? "Kurang " + Math.abs(s.guru_kelas.selisih) : (s.guru_kelas.selisih > 0 ? "Lebih " + s.guru_kelas.selisih : "Sesuai");

      // Helper formula beban kerja mapel (PJOK & PAI) sesuai kebijakan dinas:
      // 1-10 rombel = 1 guru, 11-15 rombel = 2 guru, 16-20 rombel = 3 guru
      function hitungKebMapel(jmlRombel) {
        if (!jmlRombel || jmlRombel <= 0) return 0;
        if (jmlRombel <= 10) return 1;
        if (jmlRombel <= 15) return 2;
        if (jmlRombel <= 20) return 3;
        return Math.max(3, Math.ceil(jmlRombel / 6));
      }

      // C. Guru PJOK: 1-10 rombel = 1, 11-15 rombel = 2, 16-20 rombel = 3
      s.guru_pjok.keb = hitungKebMapel(rombel);
      var totalPjok = s.guru_pjok.cpns + s.guru_pjok.pns + s.guru_pjok.pppk + s.guru_pjok.pw + s.guru_pjok.non_asn_lt + s.guru_pjok.non_asn_gt;
      s.guru_pjok.selisih = totalPjok - s.guru_pjok.keb;
      s.guru_pjok.ket = s.guru_pjok.selisih < 0 ? "Kurang " + Math.abs(s.guru_pjok.selisih) : (s.guru_pjok.selisih > 0 ? "Lebih " + s.guru_pjok.selisih : "Sesuai");

      // D. Guru PAI: 1-10 rombel = 1, 11-15 rombel = 2, 16-20 rombel = 3
      s.guru_pai.keb = hitungKebMapel(rombel);
      var totalPai = s.guru_pai.cpns + s.guru_pai.pns + s.guru_pai.pppk + s.guru_pai.pw + s.guru_pai.non_asn_lt + s.guru_pai.non_asn_gt;
      s.guru_pai.selisih = totalPai - s.guru_pai.keb;
      s.guru_pai.ket = s.guru_pai.selisih < 0 ? "Kurang " + Math.abs(s.guru_pai.selisih) : (s.guru_pai.selisih > 0 ? "Lebih " + s.guru_pai.selisih : "Sesuai");

      // E. Guru PA Kristen: Keb = total yang ada atau 0 jika tidak ada
      var totalPak = s.guru_kristen.cpns + s.guru_kristen.pns + s.guru_kristen.pppk + s.guru_kristen.pw + s.guru_kristen.non_asn_lt + s.guru_kristen.non_asn_gt;
      s.guru_kristen.keb = totalPak > 0 ? totalPak : 0;
      s.guru_kristen.selisih = totalPak - s.guru_kristen.keb;
      s.guru_kristen.ket = s.guru_kristen.selisih < 0 ? "Kurang " + Math.abs(s.guru_kristen.selisih) : (s.guru_kristen.selisih > 0 ? "Lebih " + s.guru_kristen.selisih : "Sesuai");
    });

    schoolList.sort(function(a, b) { return a.unit.localeCompare(b.unit); });

    return JSON.stringify({ success: true, schools: schoolList });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message, schools: [] });
  }
}

/**
 * REKAPITULASI KEADAAN PTK SD NEGERI (DINAMIS DARI MASTER DATA GTK)
 * Menghitung langsung dari sheet 'Master Data GTK' secara real-time.
 * Output: JSON string { success: true, schools: [...] }
 */
function getDataRekapKeadaanSDN() {
  try {
    var ctx = getTblPtkSdnContext_();
    var sheet = ctx.sheet;
    var c = ctx.colMap;
    if (!sheet) return JSON.stringify({ success: false, message: "Sheet PTK tidak ditemukan.", schools: [] });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ success: true, schools: [] });

    var data = sheet.getRange(2, 1, lastRow - 1, ctx.totalCols).getValues();
    var schoolMap = {};

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (!row[c.id]) continue;
      if (ctx.useCentral) {
        if (c.jenjang > -1 && String(row[c.jenjang] || "").trim() !== "SD Negeri") continue;
        if (c.status_aktif > -1 && String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() === "NON_AKTIF") continue;
      }

      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").trim() : "";
      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      if (!unit && !npsn) continue;

      var schoolKey = npsn || unit;

      if (!schoolMap[schoolKey]) {
        schoolMap[schoolKey] = {
          npsn: npsn,
          unit: unit,
          jabatan: {
            ks: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            guru_kelas: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            guru_pjok: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            guru_pai: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            guru_kristen: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            guru_lainnya: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            pengelola_umum: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            operator_layanan: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            pengelola_layanan: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            penata_layanan: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 },
            tendik_lainnya: { cpns: 0, pns: 0, pppk: 0, pppk_pw: 0, non_asn: 0, jml: 0 }
          },
          status: {
            cpns: { ks: 0, guru: 0, tendik: 0, jml: 0 },
            pns: { ks: 0, guru: 0, tendik: 0, jml: 0 },
            pppk: { ks: 0, guru: 0, tendik: 0, jml: 0 },
            pppk_pw: { ks: 0, guru: 0, tendik: 0, jml: 0 },
            non_asn: { ks: 0, guru: 0, tendik: 0, jml: 0 },
            total: { ks: 0, guru: 0, tendik: 0, jml: 0 }
          }
        };
      }

      var sch = schoolMap[schoolKey];
      if (!sch.unit && unit) sch.unit = unit;
      if (!sch.npsn && npsn) sch.npsn = npsn;

      // 1. Normalisasi Status Kepegawaian
      var st = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";
      var statusKey = "non_asn";
      if (st.indexOf("CPNS") !== -1) {
        statusKey = "cpns";
      } else if (st.indexOf("PPPK PW") !== -1 || st.indexOf("PARUH WAKTU") !== -1 || st.indexOf("PW") !== -1) {
        statusKey = "pppk_pw";
      } else if (st.indexOf("PPPK") !== -1) {
        statusKey = "pppk";
      } else if (st.indexOf("PNS") !== -1) {
        statusKey = "pns";
      } else {
        statusKey = "non_asn";
      }

      // 2. Normalisasi Tugas / Jabatan
      var tg = c.tugas > -1 ? String(row[c.tugas] || "").trim().toUpperCase() : "";
      var jabKey = "tendik_lainnya";
      var roleGroup = "tendik"; // 'ks', 'guru', 'tendik'

      if (tg.indexOf("KEPALA") !== -1) {
        jabKey = "ks";
        roleGroup = "ks";
      } else if (tg.indexOf("KELAS") !== -1) {
        jabKey = "guru_kelas";
        roleGroup = "guru";
      } else if (tg.indexOf("PJOK") !== -1 || tg.indexOf("PENJAS") !== -1 || tg.indexOf("OLAHRAGA") !== -1) {
        jabKey = "guru_pjok";
        roleGroup = "guru";
      } else if (tg.indexOf("PAI") !== -1 || tg.indexOf("AGAMA ISLAM") !== -1 || tg.indexOf("ISLAM") !== -1) {
        jabKey = "guru_pai";
        roleGroup = "guru";
      } else if (tg.indexOf("KRISTEN") !== -1 || tg.indexOf("PROTESTAN") !== -1 || tg.indexOf("KATOLIK") !== -1) {
        jabKey = "guru_kristen";
        roleGroup = "guru";
      } else if (tg.indexOf("GURU") !== -1) {
        jabKey = "guru_lainnya";
        roleGroup = "guru";
      } else if (tg.indexOf("PENGELOLA UMUM") !== -1) {
        jabKey = "pengelola_umum";
        roleGroup = "tendik";
      } else if (tg.indexOf("OPERATOR LAYANAN") !== -1 || tg.indexOf("OPERATOR") !== -1) {
        jabKey = "operator_layanan";
        roleGroup = "tendik";
      } else if (tg.indexOf("PENGELOLA LAYANAN") !== -1) {
        jabKey = "pengelola_layanan";
        roleGroup = "tendik";
      } else if (tg.indexOf("PENATA LAYANAN") !== -1) {
        jabKey = "penata_layanan";
        roleGroup = "tendik";
      } else {
        jabKey = "tendik_lainnya";
        roleGroup = "tendik";
      }

      // Akumulasi Matriks 1: Menurut Jabatan
      if (sch.jabatan[jabKey]) {
        sch.jabatan[jabKey][statusKey]++;
        sch.jabatan[jabKey].jml++;
      }

      // Akumulasi Matriks 2: Menurut Status Kepegawaian
      if (sch.status[statusKey]) {
        sch.status[statusKey][roleGroup]++;
        sch.status[statusKey].jml++;
      }
      sch.status.total[roleGroup]++;
      sch.status.total.jml++;
    }

    var schoolList = Object.keys(schoolMap).map(function(k) { return schoolMap[k]; });
    schoolList.sort(function(a, b) { return a.unit.localeCompare(b.unit); });

    return JSON.stringify({ success: true, schools: schoolList });
  } catch (e) {
    return JSON.stringify({ success: false, message: e.message, schools: [] });
  }
}

// =============================================================
// BACKEND: KELOLA DATA PTK SD SWASTA (SDS)
// =============================================================
function getDataPTKSDS() {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return JSON.stringify([]);
      var c = ctx.colMap;
      var idxNiy = ctx.headers.indexOf("niy");
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var extraIdx = {};
      if (jenjang === 'PAUD' && typeof PTK_PAUD_EXTRA_COLS_ !== "undefined") {
        for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
          extraIdx[PTK_PAUD_EXTRA_COLS_[k]] = ctx.headers.indexOf(PTK_PAUD_EXTRA_COLS_[k]);
        }
      }
      var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var result = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
        if (jenjang !== "SD Swasta") continue;
        var rowId = c.id > -1 ? row[c.id] : "";
        if (!rowId) continue;
        result.push({
          id: rowId,
          status_aktif: c.status_aktif > -1 ? (String(row[c.status_aktif] || "AKTIF").trim().toUpperCase()) : "AKTIF",
          npsn: c.npsn > -1 ? (row[c.npsn] || "") : "",
          unit: c.unit > -1 ? (row[c.unit] || "") : "",
          gelar_depan: c.gelar_depan > -1 ? (row[c.gelar_depan] || "") : "",
          nama_no_gelar: c.nama_no_gelar > -1 ? (row[c.nama_no_gelar] || "") : "",
          gelar_belakang: c.gelar_belakang > -1 ? (row[c.gelar_belakang] || "") : "",
          nama_lengkap: c.nama_lengkap > -1 ? (row[c.nama_lengkap] || "") : "",
          niy: idxNiy > -1 ? (row[idxNiy] || "") : "",
          tmp_lahir: c.tmp_lahir > -1 ? (row[c.tmp_lahir] || "") : "",
          tgl_lahir: c.tgl_lahir > -1 ? (row[c.tgl_lahir] || "") : "",
          nik: c.nik > -1 ? (row[c.nik] || "") : "",
          lp: c.lp > -1 ? (row[c.lp] || "") : "",
          agama: c.agama > -1 ? (row[c.agama] || "") : "",
          pendidikan: c.pendidikan > -1 ? (row[c.pendidikan] || "") : "",
          jurusan: c.jurusan > -1 ? (row[c.jurusan] || "") : "",
          thn_lulus: c.thn_lulus > -1 ? (row[c.thn_lulus] || "") : "",
          alamat_ktp: c.alamat_ktp > -1 ? (row[c.alamat_ktp] || "") : "",
          alamat_domisili: c.alamat_domisili > -1 ? (row[c.alamat_domisili] || "") : "",
          hp: c.hp > -1 ? (row[c.hp] || "") : "",
          status_peg: c.status_peg > -1 ? (row[c.status_peg] || "") : "",
          jabatan: c.jabatan > -1 ? (row[c.jabatan] || "") : "",
          mengajar_kelas: c.mengajar_kelas > -1 ? String(row[c.mengajar_kelas] || "").trim() : "",
          tmt_jabatan: c.tmt_jabatan > -1 ? (row[c.tmt_jabatan] || "") : "",
          inpassing: idxInpassing > -1 ? (row[idxInpassing] || "") : "",
          tmt_inpassing: idxTmtInpassing > -1 ? (row[idxTmtInpassing] || "") : "",
          nuptk: c.nuptk > -1 ? (row[c.nuptk] || "") : "",
          serdik: c.serdik > -1 ? (row[c.serdik] || "") : "",
          dapodik: c.dapodik > -1 ? (row[c.dapodik] || "") : "",
          tugtam: c.tugtam > -1 ? (row[c.tugtam] || "") : "",
          diinput: c.diinput > -1 ? (row[c.diinput] || "") : "",
          user_input: c.user_input > -1 ? (row[c.user_input] || "") : "",
          diedit: c.diedit > -1 ? (row[c.diedit] || "") : "",
          user_edit: c.user_edit > -1 ? (row[c.user_edit] || "") : "",
          email: c.email > -1 ? (row[c.email] || "") : "",
          masa_kerja_tahun: extraIdx.masa_kerja_tahun > -1 ? (row[extraIdx.masa_kerja_tahun] || "") : "",
          masa_kerja_bulan: extraIdx.masa_kerja_bulan > -1 ? (row[extraIdx.masa_kerja_bulan] || "") : "",
          nip: extraIdx.nip > -1 ? (row[extraIdx.nip] || "") : "",
          tugas_di_sekolah: extraIdx.tugas_di_sekolah > -1 ? (row[extraIdx.tugas_di_sekolah] || "") : "",
          diklat_dasar: extraIdx.diklat_dasar > -1 ? (row[extraIdx.diklat_dasar] || "") : "",
          tahun_diklat_dasar: extraIdx.tahun_diklat_dasar > -1 ? (row[extraIdx.tahun_diklat_dasar] || "") : "",
          diklat_lanjut: extraIdx.diklat_lanjut > -1 ? (row[extraIdx.diklat_lanjut] || "") : "",
          tahun_diklat_lanjut: extraIdx.tahun_diklat_lanjut > -1 ? (row[extraIdx.tahun_diklat_lanjut] || "") : "",
          diklat_mahir: extraIdx.diklat_mahir > -1 ? (row[extraIdx.diklat_mahir] || "") : "",
          tahun_diklat_mahir: extraIdx.tahun_diklat_mahir > -1 ? (row[extraIdx.tahun_diklat_mahir] || "") : "",
          diklat_kepala_sekolah: extraIdx.diklat_kepala_sekolah > -1 ? (row[extraIdx.diklat_kepala_sekolah] || "") : "",
          tahun_diklat_kepala_sekolah: extraIdx.tahun_diklat_kepala_sekolah > -1 ? (row[extraIdx.tahun_diklat_kepala_sekolah] || "") : "",
          bantuan_tunjangan_profesi: extraIdx.bantuan_tunjangan_profesi > -1 ? (row[extraIdx.bantuan_tunjangan_profesi] || "") : "",
          bantuan_bosda: extraIdx.bantuan_bosda > -1 ? (row[extraIdx.bantuan_bosda] || "") : "",
          bantuan_insentif: extraIdx.bantuan_insentif > -1 ? (row[extraIdx.bantuan_insentif] || "") : "",
          bantuan_lainnya: extraIdx.bantuan_lainnya > -1 ? (row[extraIdx.bantuan_lainnya] || "") : ""
        });
      }
      return JSON.stringify(result);
    }

    var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS"); 
    if (!sheet) return JSON.stringify([]);
    var lastRow = sheet.getLastRow(); 
    if (lastRow < 2) return JSON.stringify([]); 
    
    var data = sheet.getDataRange().getDisplayValues(); 
    if (data.length < 2) return JSON.stringify([]);

    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var findCol = function(nameList, defaultIdx) {
      for (var k = 0; k < nameList.length; k++) {
        var idx = headers.indexOf(nameList[k]);
        if (idx > -1) return idx;
      }
      return defaultIdx;
    };

    var colMap = {
      id: findCol(["id_ptk", "id", "id ptk"], 0),
      npsn: findCol(["npsn"], 1),
      unit: findCol(["unit", "nama_sekolah", "sekolah", "lembaga"], 2),
      gelar_depan: findCol(["gelar_depan", "gelar depan"], 3),
      nama_no_gelar: findCol(["nama_no_gelar", "nama tanpa gelar"], 4),
      gelar_belakang: findCol(["gelar_belakang", "gelar belakang"], 5),
      nama_lengkap: findCol(["nama_lengkap", "nama lengkap", "nama"], 6),
      niy: findCol(["niy", "nig"], 7),
      tmp_lahir: findCol(["tmp_lahir", "tempat lahir"], 8),
      tgl_lahir: findCol(["tgl_lahir", "tanggal lahir"], 9),
      nik: findCol(["nik"], 10),
      lp: findCol(["l/p", "lp", "jenis kelamin", "jenis_kelamin", "jk"], 11),
      agama: findCol(["agama"], 12),
      pendidikan: findCol(["pendidikan"], 13),
      jurusan: findCol(["jurusan"], 14),
      thn_lulus: findCol(["thn_lulus", "tahun lulus"], 15),
      alamat_ktp: findCol(["alamat_ktp", "alamat ktp"], 16),
      alamat_domisili: findCol(["alamat_domisili", "alamat domisili"], 17),
      hp: findCol(["hp", "no hp", "telepon"], 18),
      status_peg: findCol(["status kepegawaian", "status_kepegawaian", "status_peg", "status pegawai", "status"], 19),
      jabatan: findCol(["jabatan"], 20),
      tmt_jabatan: findCol(["tmt_jabatan", "tmt jabatan"], 21),
      inpassing: findCol(["inpassing"], 22),
      tmt_inpassing: findCol(["tmt_inpassing", "tmt inpassing"], 23),
      nuptk: findCol(["nuptk"], 24),
      serdik: findCol(["serdik"], 25),
      dapodik: findCol(["dapodik"], 26),
      tugtam: findCol(["tugtam", "tugas tambahan"], 27),
      diinput: findCol(["diinput", "tgl input"], 28),
      user_input: findCol(["user_input", "penginput"], 29),
      diedit: findCol(["diedit", "tgl edit"], 30),
      user_edit: findCol(["user_edit", "pengedit"], 31),
      email: findCol(["email"], 32)
    };

    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i]; 
      var rowId = row[colMap.id];
      if (!rowId || rowId === "") continue; 
      
      result.push({
        id: rowId, 
        npsn: row[colMap.npsn] || "", 
        unit: row[colMap.unit] || "", 
        gelar_depan: row[colMap.gelar_depan] || "", 
        nama_no_gelar: row[colMap.nama_no_gelar] || "", 
        gelar_belakang: row[colMap.gelar_belakang] || "", 
        nama_lengkap: row[colMap.nama_lengkap] || "", 
        niy: row[colMap.niy] || "", 
        tmp_lahir: row[colMap.tmp_lahir] || "", 
        tgl_lahir: row[colMap.tgl_lahir] || "", 
        nik: row[colMap.nik] || "", 
        lp: row[colMap.lp] || "", 
        agama: row[colMap.agama] || "", 
        pendidikan: row[colMap.pendidikan] || "", 
        jurusan: row[colMap.jurusan] || "", 
        thn_lulus: row[colMap.thn_lulus] || "", 
        alamat_ktp: row[colMap.alamat_ktp] || "", 
        alamat_domisili: row[colMap.alamat_domisili] || "", 
        hp: row[colMap.hp] || "", 
        status_peg: row[colMap.status_peg] || "", 
        jabatan: row[colMap.jabatan] || "", 
        tmt_jabatan: row[colMap.tmt_jabatan] || "", 
        inpassing: row[colMap.inpassing] || "", 
        tmt_inpassing: row[colMap.tmt_inpassing] || "", 
        nuptk: row[colMap.nuptk] || "", 
        serdik: row[colMap.serdik] || "", 
        dapodik: row[colMap.dapodik] || "", 
        tugtam: row[colMap.tugtam] || "", 
        diinput: row[colMap.diinput] || "", 
        user_input: row[colMap.user_input] || "", 
        diedit: row[colMap.diedit] || "", 
        user_edit: row[colMap.user_edit] || "", 
        email: row[colMap.email] || "" 
      });
    }
    return JSON.stringify(result);
  } catch(e) { 
    Logger.log("Error pada getDataPTKSDS: " + e.toString() + "\n" + (e.stack || ""));
    return JSON.stringify([]); 
  }
}

function checkAndGetPtkNonAktifSDSByNIK(nik) {
  try {
    var inputNik = String(nik).replace(/'/g, "").trim();
    if (!inputNik) return JSON.stringify({ found: false });

    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return JSON.stringify({ found: false });
      var c = ctx.colMap;
      var idxNiy = ctx.headers.indexOf("niy");
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var extraIdx = {};
      if (jenjang === 'PAUD' && typeof PTK_PAUD_EXTRA_COLS_ !== "undefined") {
        for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
          extraIdx[PTK_PAUD_EXTRA_COLS_[k]] = ctx.headers.indexOf(PTK_PAUD_EXTRA_COLS_[k]);
        }
      }
      var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
      var dataDisplay = ctx.sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < dataDisplay.length; i++) {
        var row = dataDisplay[i];
        var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (jenjang !== "SD Swasta" || statusAktif !== "NON_AKTIF") continue;
        var rowNik = c.nik > -1 ? String(row[c.nik] || "").replace(/'/g, "").trim() : "";
        if (rowNik === inputNik) {
          return JSON.stringify({
            found: true,
            id: c.id > -1 ? row[c.id] : "",
            nama_lengkap: (c.nama_lengkap > -1 ? row[c.nama_lengkap] : "") || (c.nama_no_gelar > -1 ? row[c.nama_no_gelar] : "") || "",
            nik: rowNik,
            lembaga_lama: c.unit > -1 ? (row[c.unit] || "") : "",
            alasan_non_aktif: c.alasan_hapus > -1 ? (row[c.alasan_hapus] || "Mutasi / Non-Aktif") : "Mutasi / Non-Aktif",
            tgl_non_aktif: c.tgl_hapus > -1 ? (row[c.tgl_hapus] || "") : "",
            data: {
              gelar_depan: c.gelar_depan > -1 ? (row[c.gelar_depan] || "") : "",
              nama_no_gelar: c.nama_no_gelar > -1 ? (row[c.nama_no_gelar] || "") : "",
              gelar_belakang: c.gelar_belakang > -1 ? (row[c.gelar_belakang] || "") : "",
              niy: idxNiy > -1 ? (row[idxNiy] || "") : "",
              tmp_lahir: c.tmp_lahir > -1 ? (row[c.tmp_lahir] || "") : "",
              tgl_lahir: c.tgl_lahir > -1 ? (row[c.tgl_lahir] || "") : "",
              lp: c.lp > -1 ? (row[c.lp] || "") : "",
              agama: c.agama > -1 ? (row[c.agama] || "") : "",
              pendidikan: c.pendidikan > -1 ? (row[c.pendidikan] || "") : "",
              jurusan: c.jurusan > -1 ? (row[c.jurusan] || "") : "",
              thn_lulus: c.thn_lulus > -1 ? (row[c.thn_lulus] || "") : "",
              alamat_ktp: c.alamat_ktp > -1 ? (row[c.alamat_ktp] || "") : "",
              alamat_domisili: c.alamat_domisili > -1 ? (row[c.alamat_domisili] || "") : "",
              hp: c.hp > -1 ? (row[c.hp] || "") : "",
              status_peg: c.status_peg > -1 ? (row[c.status_peg] || "") : "",
              jabatan: c.jabatan > -1 ? (row[c.jabatan] || "") : "",
          mengajar_kelas: c.mengajar_kelas > -1 ? String(row[c.mengajar_kelas] || "").trim() : "",
              tmt_jabatan: c.tmt_jabatan > -1 ? (row[c.tmt_jabatan] || "") : "",
              inpassing: idxInpassing > -1 ? (row[idxInpassing] || "") : "",
              tmt_inpassing: idxTmtInpassing > -1 ? (row[idxTmtInpassing] || "") : "",
              nuptk: c.nuptk > -1 ? (row[c.nuptk] || "") : "",
              serdik: c.serdik > -1 ? (row[c.serdik] || "") : "",
              dapodik: c.dapodik > -1 ? (row[c.dapodik] || "") : "",
              tugtam: c.tugtam > -1 ? (row[c.tugtam] || "") : "",
              email: c.email > -1 ? (row[c.email] || "") : ""
            }
          });
        }
      }
      return JSON.stringify({ found: false });
    }

    var sheetTarget = getSheet(KONFIG_PTK.DB_KEY, "gtk_non_aktif_sds");
    if (!sheetTarget) return JSON.stringify({ found: false });
    var dataDisplay = sheetTarget.getDataRange().getDisplayValues();
    var inputNik = String(nik).replace(/'/g, "").trim();
    if (!inputNik) return JSON.stringify({ found: false });

    for (var i = 1; i < dataDisplay.length; i++) {
      var rowNik = String(dataDisplay[i][10] || "").replace(/'/g, "").trim();
      if (rowNik === inputNik) {
        var row = dataDisplay[i];
        var lastColIdx = row.length - 1;
        return JSON.stringify({
          found: true,
          id: row[0],
          nama_lengkap: row[6] || row[4] || "",
          nik: rowNik,
          lembaga_lama: row[2] || "",
          alasan_non_aktif: row[lastColIdx - 2] || "Mutasi / Non-Aktif",
          tgl_non_aktif: row[lastColIdx - 1] || "",
          data: {
            gelar_depan: row[3] || "",
            nama_no_gelar: row[4] || "",
            gelar_belakang: row[5] || "",
            niy: row[7] || "",
            tmp_lahir: row[8] || "",
            tgl_lahir: row[9] || "",
            lp: row[11] || "",
            agama: row[12] || "",
            pendidikan: row[13] || "",
            jurusan: row[14] || "",
            thn_lulus: row[15] || "",
            alamat_ktp: row[16] || "",
            alamat_domisili: row[17] || "",
            hp: row[18] || "",
            status_peg: row[19] || "",
            jabatan: row[20] || "",
            tmt_jabatan: row[21] || "",
            inpassing: row[22] || "",
            tmt_inpassing: row[23] || "",
            nuptk: row[24] || "",
            serdik: row[25] || "",
            dapodik: row[26] || "",
            tugtam: row[27] || "",
            email: row[32] || ""
          }
        });
      }
    }
    return JSON.stringify({ found: false });
  } catch(e) { return JSON.stringify({ found: false, error: e.message }); }
}

function reactivatePtkSDS(form) {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
      var c = ctx.colMap;
      var idxNiy = ctx.headers.indexOf("niy");
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var extraIdx = {};
      if (jenjang === 'PAUD' && typeof PTK_PAUD_EXTRA_COLS_ !== "undefined") {
        for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
          extraIdx[PTK_PAUD_EXTRA_COLS_[k]] = ctx.headers.indexOf(PTK_PAUD_EXTRA_COLS_[k]);
        }
      }
      var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
      var inputNik = String(form.nik).replace(/'/g, "").trim();
      var dataDisplay = ctx.sheet.getDataRange().getDisplayValues();
      var dataValues = ctx.sheet.getDataRange().getValues();
      var rowIdx = -1;
      var originalRow = [];

      for (var i = 1; i < dataDisplay.length; i++) {
        var jenjang = c.jenjang > -1 ? String(dataDisplay[i][c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(dataDisplay[i][c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (jenjang !== "SD Swasta" || statusAktif !== "NON_AKTIF") continue;
        var rowNik = c.nik > -1 ? String(dataDisplay[i][c.nik] || "").replace(/'/g, "").trim() : "";
        if (rowNik === inputNik) {
          rowIdx = i + 1;
          originalRow = dataValues[i];
          break;
        }
      }
      if (rowIdx === -1) return "Error: Data non-aktif dengan NIK ini tidak ditemukan.";

      var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
      var rawNpsn = form.npsn_baru || form.npsn_login || form.npsn || "";
      var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
      var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;
      var finalUnit = form.unit_kerja || form.unit_login || form.unit || "";
      var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");

      var rowArr = originalRow.slice();
      if (c.status_aktif > -1) rowArr[c.status_aktif] = "AKTIF";
      if (c.npsn > -1) rowArr[c.npsn] = finalNpsn;
      if (c.unit > -1) rowArr[c.unit] = finalUnit;
      if (c.gelar_depan > -1) rowArr[c.gelar_depan] = form.gelar_depan || originalRow[c.gelar_depan] || "";
      if (c.nama_no_gelar > -1) rowArr[c.nama_no_gelar] = form.nama_lengkap || originalRow[c.nama_no_gelar] || "";
      if (c.gelar_belakang > -1) rowArr[c.gelar_belakang] = form.gelar_belakang || originalRow[c.gelar_belakang] || "";
      if (c.nama_lengkap > -1) rowArr[c.nama_lengkap] = namaFull || originalRow[c.nama_lengkap] || "";
      if (idxNiy > -1) rowArr[idxNiy] = "'" + (form.niy || originalRow[idxNiy] || "");
      if (c.tmp_lahir > -1) rowArr[c.tmp_lahir] = form.tmp_lahir || originalRow[c.tmp_lahir] || "";
      if (c.tgl_lahir > -1) rowArr[c.tgl_lahir] = convertStringToDate_(form.tgl_lahir || originalRow[c.tgl_lahir]);
      if (c.nik > -1) rowArr[c.nik] = "'" + (form.nik || originalRow[c.nik] || "");
      if (c.lp > -1) rowArr[c.lp] = form.lp || originalRow[c.lp] || "";
      if (c.agama > -1) rowArr[c.agama] = form.agama || originalRow[c.agama] || "";
      if (c.pendidikan > -1) rowArr[c.pendidikan] = form.pendidikan || originalRow[c.pendidikan] || "";
      if (c.jurusan > -1) rowArr[c.jurusan] = form.jurusan || originalRow[c.jurusan] || "";
      if (c.thn_lulus > -1) rowArr[c.thn_lulus] = form.thn_lulus || originalRow[c.thn_lulus] || "";
      if (c.alamat_ktp > -1) rowArr[c.alamat_ktp] = form.alamat_ktp || originalRow[c.alamat_ktp] || "";
      if (c.alamat_domisili > -1) rowArr[c.alamat_domisili] = form.alamat_domisili || originalRow[c.alamat_domisili] || "";
      if (c.hp > -1) rowArr[c.hp] = "'" + (form.hp || originalRow[c.hp] || "");
      if (c.status_peg > -1) rowArr[c.status_peg] = form.status_peg || originalRow[c.status_peg] || "";
      if (c.jabatan > -1) rowArr[c.jabatan] = form.jabatan || originalRow[c.jabatan] || "";
      if (c.mengajar_kelas > -1) rowArr[c.mengajar_kelas] = "'" + (form.mengajar_kelas || originalRow[c.mengajar_kelas] || "-");
      if (c.tmt_jabatan > -1) rowArr[c.tmt_jabatan] = convertStringToDate_(form.tmt_jabatan || originalRow[c.tmt_jabatan]);
      if (idxInpassing > -1) rowArr[idxInpassing] = form.inpassing || originalRow[idxInpassing] || "";
      if (idxTmtInpassing > -1) rowArr[idxTmtInpassing] = convertStringToDate_(form.tmt_inpassing || originalRow[idxTmtInpassing]);
      if (c.nuptk > -1) rowArr[c.nuptk] = "'" + (form.nuptk || originalRow[c.nuptk] || "");
      if (c.serdik > -1) rowArr[c.serdik] = form.serdik || originalRow[c.serdik] || "";
      if (c.dapodik > -1) rowArr[c.dapodik] = form.dapodik || originalRow[c.dapodik] || "";
      if (c.tugtam > -1) rowArr[c.tugtam] = form.tugtam || originalRow[c.tugtam] || "";
      if (c.diedit > -1) rowArr[c.diedit] = timestamp;
      if (c.user_edit > -1) rowArr[c.user_edit] = form.user_login || "";
      if (c.email > -1) rowArr[c.email] = form.email || originalRow[c.email] || "";
      if (c.alasan_hapus > -1) rowArr[c.alasan_hapus] = "";
      if (c.tgl_hapus > -1) rowArr[c.tgl_hapus] = "";
      if (c.user_hapus > -1) rowArr[c.user_hapus] = "";

      ctx.sheet.getRange(rowIdx, 1, 1, rowArr.length).setValues([rowArr]);
      SpreadsheetApp.flush();
      return "Sukses";
    }

    var sheetNonAktif = getSheet(KONFIG_PTK.DB_KEY, "gtk_non_aktif_sds");
    var sheetAktif = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS");
    if (!sheetNonAktif || !sheetAktif) return "Error: Sheet database tidak ditemukan.";

    var inputNik = String(form.nik).replace(/'/g, "").trim();
    var dataDisplay = sheetNonAktif.getDataRange().getDisplayValues();
    var dataValues = sheetNonAktif.getDataRange().getValues();
    var rowIdx = -1;
    var originalRow = [];

    for (var i = 1; i < dataDisplay.length; i++) {
      var rowNik = String(dataDisplay[i][10] || "").replace(/'/g, "").trim();
      if (rowNik === inputNik) {
        rowIdx = i + 1;
        originalRow = dataValues[i];
        break;
      }
    }

    if (rowIdx === -1) return "Error: Data non-aktif dengan NIK ini tidak ditemukan.";

    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var rawNpsn = form.npsn_baru || form.npsn_login || form.npsn || "";
    var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
    var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;
    var finalUnit = form.unit_kerja || form.unit_login || form.unit || "";

    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");

    var activeRowData = [
      originalRow[0], // ID lama tetap dipertahankan
      finalNpsn,
      finalUnit,
      form.gelar_depan || originalRow[3] || "",
      form.nama_lengkap || originalRow[4] || "",
      form.gelar_belakang || originalRow[5] || "",
      namaFull || originalRow[6] || "",
      "'" + (form.niy || originalRow[7] || ""),
      form.tmp_lahir || originalRow[8] || "",
      convertStringToDate_(form.tgl_lahir || originalRow[9]),
      "'" + (form.nik || originalRow[10] || ""),
      form.lp || originalRow[11] || "",
      form.agama || originalRow[12] || "",
      form.pendidikan || originalRow[13] || "",
      form.jurusan || originalRow[14] || "",
      form.thn_lulus || originalRow[15] || "",
      form.alamat_ktp || originalRow[16] || "",
      form.alamat_domisili || originalRow[17] || "",
      "'" + (form.hp || originalRow[18] || ""),
      form.status_peg || originalRow[19] || "",
      form.jabatan || originalRow[20] || "",
      convertStringToDate_(form.tmt_jabatan || originalRow[21]),
      form.inpassing || originalRow[22] || "",
      convertStringToDate_(form.tmt_inpassing || originalRow[23]),
      "'" + (form.nuptk || originalRow[24] || ""),
      form.serdik || originalRow[25] || "",
      form.dapodik || originalRow[26] || "",
      form.tugtam || originalRow[27] || "",
      originalRow[28] || timestamp, // Diinput
      originalRow[29] || form.user_login || "", // User input
      timestamp, // Diedit / Reaktif
      form.user_login || "", // User edit / Reaktif
      form.email || originalRow[32] || ""
    ];

    sheetAktif.appendRow(activeRowData);
    sheetNonAktif.deleteRow(rowIdx);
    SpreadsheetApp.flush();
    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
}

function insertDataPTKSDS(form) {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
    var c = ctx.colMap;
    var idxNiy = ctx.headers.indexOf("niy");
    var idxInpassing = ctx.headers.indexOf("inpassing");
    var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
    var data = ctx.sheet.getDataRange().getValues();
    var inputNik = String(form.nik || "").replace(/'/g, "").trim();

    for (var i = 1; i < data.length; i++) {
      var rowNik = c.nik > -1 ? String(data[i][c.nik] || "").replace(/'/g, "").trim() : "";
      if (rowNik === inputNik && inputNik !== "") {
        var rowStatus = c.status_aktif > -1 ? String(data[i][c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        var rowJenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
        if (rowStatus === "NON_AKTIF" && rowJenjang === "SD Swasta") {
          var resCheckNonAktif = JSON.parse(checkAndGetPtkNonAktifSDSByNIK(inputNik));
          if (resCheckNonAktif.found) return "NON_AKTIF_FOUND:" + JSON.stringify(resCheckNonAktif);
        }
        var namaExist = c.nama_lengkap > -1 ? data[i][c.nama_lengkap] : "";
        return "NIK " + inputNik + " sudah terdaftar atas nama " + namaExist + ", hubungi admin.";
      }
    }

    var newId = "SDS-" + new Date().getTime();
    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var rawNpsn = form.npsn_baru || form.npsn_login || "";
    var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
    var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;

    var rowArr = new Array(ctx.headers.length);
    for (var h = 0; h < rowArr.length; h++) rowArr[h] = "";
    if (c.id > -1) rowArr[c.id] = newId;
    if (c.jenjang > -1) rowArr[c.jenjang] = "SD Swasta";
    if (c.status_aktif > -1) rowArr[c.status_aktif] = "AKTIF";
    if (c.npsn > -1) rowArr[c.npsn] = finalNpsn;
    if (c.unit > -1) rowArr[c.unit] = form.unit_kerja || form.unit_login || "";
    if (c.gelar_depan > -1) rowArr[c.gelar_depan] = form.gelar_depan || "";
    if (c.nama_no_gelar > -1) rowArr[c.nama_no_gelar] = form.nama_lengkap || "";
    if (c.gelar_belakang > -1) rowArr[c.gelar_belakang] = form.gelar_belakang || "";
    if (c.nama_lengkap > -1) rowArr[c.nama_lengkap] = namaFull || "";
    if (idxNiy > -1) rowArr[idxNiy] = form.niy || "";
    if (c.tmp_lahir > -1) rowArr[c.tmp_lahir] = form.tmp_lahir || "";
    if (c.tgl_lahir > -1) rowArr[c.tgl_lahir] = convertStringToDate_(form.tgl_lahir);
    if (c.nik > -1) rowArr[c.nik] = "'" + (form.nik || "");
    if (c.lp > -1) rowArr[c.lp] = form.lp || "";
    if (c.agama > -1) rowArr[c.agama] = form.agama || "";
    if (c.pendidikan > -1) rowArr[c.pendidikan] = form.pendidikan || "";
    if (c.jurusan > -1) rowArr[c.jurusan] = form.jurusan || "";
    if (c.thn_lulus > -1) rowArr[c.thn_lulus] = form.thn_lulus || "";
    if (c.alamat_ktp > -1) rowArr[c.alamat_ktp] = form.alamat_ktp || "";
    if (c.alamat_domisili > -1) rowArr[c.alamat_domisili] = form.alamat_domisili || "";
    if (c.hp > -1) rowArr[c.hp] = "'" + (form.hp || "");
    if (c.status_peg > -1) rowArr[c.status_peg] = form.status_peg || "";
    if (c.jabatan > -1) rowArr[c.jabatan] = form.jabatan || "";
    if (c.mengajar_kelas > -1) rowArr[c.mengajar_kelas] = "'" + (form.mengajar_kelas || "-");
    if (c.tmt_jabatan > -1) rowArr[c.tmt_jabatan] = convertStringToDate_(form.tmt_jabatan);
    if (idxInpassing > -1) rowArr[idxInpassing] = form.inpassing || "";
    if (idxTmtInpassing > -1) rowArr[idxTmtInpassing] = convertStringToDate_(form.tmt_inpassing);
    if (c.nuptk > -1) rowArr[c.nuptk] = "'" + (form.nuptk || "");
    if (c.serdik > -1) rowArr[c.serdik] = form.serdik || "";
    if (c.dapodik > -1) rowArr[c.dapodik] = form.dapodik || "";
    if (c.tugtam > -1) rowArr[c.tugtam] = form.tugtam || "";
    if (c.diinput > -1) rowArr[c.diinput] = timestamp;
    if (c.user_input > -1) rowArr[c.user_input] = form.user_login || "";
    if (c.email > -1) rowArr[c.email] = form.email || "";

    ctx.sheet.appendRow(rowArr);
    return "Sukses";
  }

  var sheet = getSheet(KONFIG_PTK.DB_KEY, "Master Data GTK SDS");
  var data = sheet.getDataRange().getValues(); var inputNik = String(form.nik).trim(); 
  for (var i = 1; i < data.length; i++) { var rowNik = String(data[i][10]).replace(/'/g, "").trim(); if (rowNik === inputNik) return "NIK " + inputNik + " sudah terdaftar atas nama " + data[i][6] + ", hubungi admin."; }
  
  // Cek apakah terdaftar di sheet non-aktif SD Swasta
  var resCheckNonAktif = JSON.parse(checkAndGetPtkNonAktifSDSByNIK(inputNik));
  if (resCheckNonAktif.found) {
    return "NON_AKTIF_FOUND:" + JSON.stringify(resCheckNonAktif);
  }

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
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
    var c = ctx.colMap;
    var idxNiy = ctx.headers.indexOf("niy");
    var idxInpassing = ctx.headers.indexOf("inpassing");
    var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
    var data = ctx.sheet.getDataRange().getValues();
    var rowIdx = -1;
    var idStr = String(form.id).trim();

    for (var i = 1; i < data.length; i++) {
      var jenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
      if (jenjang !== "SD Swasta") continue;
      if (c.id > -1 && String(data[i][c.id]).trim() === idStr) {
        rowIdx = i + 1;
        break;
      }
    }
    if (rowIdx == -1) return "Error: ID tidak ditemukan.";

    var inputNik = String(form.nik || "").replace(/'/g, "").trim();
    if (inputNik !== "") {
      for (var i = 1; i < data.length; i++) {
        var rowNik = c.nik > -1 ? String(data[i][c.nik] || "").replace(/'/g, '').trim() : "";
        var rowId = c.id > -1 ? String(data[i][c.id]).trim() : "";
        if (rowNik === inputNik && rowId !== idStr) {
          var namaExist = c.nama_lengkap > -1 ? data[i][c.nama_lengkap] : "";
          return "Gagal: NIK " + inputNik + " sudah dipakai oleh " + namaExist;
        }
      }
    }

    var rowArr = data[rowIdx - 1].slice();
    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    if (form.npsn_baru && form.unit_kerja) {
      var npsnVal = parseInt(String(form.npsn_baru).replace(/[^0-9]/g, ''), 10);
      if (c.npsn > -1) rowArr[c.npsn] = isNaN(npsnVal) ? form.npsn_baru : npsnVal;
      if (c.unit > -1) rowArr[c.unit] = form.unit_kerja;
    }

    if (c.gelar_depan > -1) rowArr[c.gelar_depan] = form.gelar_depan || "";
    if (c.nama_no_gelar > -1) rowArr[c.nama_no_gelar] = form.nama_lengkap || "";
    if (c.gelar_belakang > -1) rowArr[c.gelar_belakang] = form.gelar_belakang || "";
    if (c.nama_lengkap > -1) rowArr[c.nama_lengkap] = namaFull || "";
    if (idxNiy > -1) rowArr[idxNiy] = form.niy || "";
    if (c.tmp_lahir > -1) rowArr[c.tmp_lahir] = form.tmp_lahir || "";
    if (c.tgl_lahir > -1) rowArr[c.tgl_lahir] = convertStringToDate_(form.tgl_lahir);
    if (c.nik > -1) rowArr[c.nik] = "'" + (form.nik || "");
    if (c.lp > -1) rowArr[c.lp] = form.lp || "";
    if (c.agama > -1) rowArr[c.agama] = form.agama || "";
    if (c.pendidikan > -1) rowArr[c.pendidikan] = form.pendidikan || "";
    if (c.jurusan > -1) rowArr[c.jurusan] = form.jurusan || "";
    if (c.thn_lulus > -1) rowArr[c.thn_lulus] = form.thn_lulus || "";
    if (c.alamat_ktp > -1) rowArr[c.alamat_ktp] = form.alamat_ktp || "";
    if (c.alamat_domisili > -1) rowArr[c.alamat_domisili] = form.alamat_domisili || "";
    if (c.hp > -1) rowArr[c.hp] = "'" + (form.hp || "");
    if (c.status_peg > -1) rowArr[c.status_peg] = form.status_peg || "";
    if (c.jabatan > -1) rowArr[c.jabatan] = form.jabatan || "";
    if (c.mengajar_kelas > -1) rowArr[c.mengajar_kelas] = "'" + (form.mengajar_kelas || "-");
    if (c.tmt_jabatan > -1) rowArr[c.tmt_jabatan] = convertStringToDate_(form.tmt_jabatan);
    if (idxInpassing > -1) rowArr[idxInpassing] = form.inpassing || "";
    if (idxTmtInpassing > -1) rowArr[idxTmtInpassing] = convertStringToDate_(form.tmt_inpassing);
    if (c.nuptk > -1) rowArr[c.nuptk] = "'" + (form.nuptk || "");
    if (c.serdik > -1) rowArr[c.serdik] = form.serdik || "";
    if (c.dapodik > -1) rowArr[c.dapodik] = form.dapodik || "";
    if (c.tugtam > -1) rowArr[c.tugtam] = form.tugtam || "";
    if (c.diedit > -1) rowArr[c.diedit] = timestamp;
    if (c.user_edit > -1) rowArr[c.user_edit] = form.user_login || "";
    if (c.email > -1) rowArr[c.email] = form.email || "";

    ensurePtkPaudExtraColumns_(ctx);
    while (rowArr.length < ctx.headers.length) rowArr.push("");
    for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
      var colName = PTK_PAUD_EXTRA_COLS_[k];
      var colIdx = ctx.headers.indexOf(colName);
      if (colIdx > -1) {
        var val = form[colName] || "";
        rowArr[colIdx] = (colName === "nip" && val) ? ("'" + val) : val;
      }
    }

    ctx.sheet.getRange(rowIdx, 1, 1, rowArr.length).setValues([rowArr]);
    return "Sukses";
  }

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
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
    var c = ctx.colMap;
    var data = ctx.sheet.getDataRange().getValues();
    var rowIdx = -1;
    var idStr = String(id).trim();
    for (var i = 1; i < data.length; i++) {
      var jenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
      if (jenjang !== "SD Swasta") continue;
      if (c.id > -1 && String(data[i][c.id]).trim() === idStr) {
        rowIdx = i + 1;
        break;
      }
    }
    if (rowIdx == -1) return "Error: Data tidak ditemukan.";
    var tglHapus = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    if (c.status_aktif > -1) ctx.sheet.getRange(rowIdx, c.status_aktif + 1).setValue("NON_AKTIF");
    if (c.alasan_hapus > -1) ctx.sheet.getRange(rowIdx, c.alasan_hapus + 1).setValue(alasan || "");
    if (c.tgl_hapus > -1) ctx.sheet.getRange(rowIdx, c.tgl_hapus + 1).setValue(tglHapus);
    if (c.user_hapus > -1) ctx.sheet.getRange(rowIdx, c.user_hapus + 1).setValue(userLogin || "");
    return "Sukses";
  }

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

function hapusPermanenPTKPAUD(id) {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
      var c = ctx.colMap;
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var idStr = String(id).trim();
      for (var i = 1; i < data.length; i++) {
        var jenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(data[i][c.status_aktif] || "").trim().toUpperCase() : "";
        if (jenjang !== "" && jenjang.toUpperCase().indexOf("SD") === -1 && statusAktif === "NON_AKTIF" && c.id > -1 && String(data[i][c.id]).trim() === idStr) {
          ctx.sheet.deleteRow(i + 1);
          return "Sukses";
        }
      }
      return "Error: Data PTK non-aktif tidak ditemukan.";
    }
    return "Error: Fitur Hapus Permanen hanya tersedia pada database terpusat.";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function hapusPermanenPTKSDS(id) {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
      var c = ctx.colMap;
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var idStr = String(id).trim();
      for (var i = 1; i < data.length; i++) {
        var jenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(data[i][c.status_aktif] || "").trim().toUpperCase() : "";
        if (jenjang === "SD Swasta" && statusAktif === "NON_AKTIF" && c.id > -1 && String(data[i][c.id]).trim() === idStr) {
          ctx.sheet.deleteRow(i + 1);
          return "Sukses";
        }
      }
      return "Error: Data PTK non-aktif tidak ditemukan.";
    }
    return "Error: Fitur Hapus Permanen hanya tersedia pada database terpusat.";
  } catch (e) {
    return "Error: " + e.message;
  }
}

function getDataKeadaanGTKSDS() {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return [];
    var c = ctx.colMap;
    var data = ctx.sheet.getDataRange().getDisplayValues();
    var schoolMap = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
      var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
      if (jenjang !== "SD Swasta" || statusAktif !== "AKTIF") continue;

      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").trim() : "";
      if (!unit) continue;

      var key = unit.toUpperCase();
      if (!schoolMap[key]) {
        var arr = [unit, npsn];
        for (var k = 2; k < 27; k++) arr.push(0);
        schoolMap[key] = arr;
      }
      var r = schoolMap[key];
      var jab = c.jabatan > -1 ? String(row[c.jabatan] || "").trim().toUpperCase() : "";
      var stat = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";
      var isTetap = (stat.indexOf("GTY") > -1 || stat.indexOf("PTY") > -1 || stat.indexOf("TETAP YAYASAN") > -1);

      if (jab.indexOf("KEPALA") > -1) {
        r[2]++;
      } else if (jab.indexOf("KELAS") > -1) {
        r[isTetap ? 3 : 4]++;
      } else if (jab.indexOf("PJOK") > -1 || jab.indexOf("PENJAS") > -1 || jab.indexOf("OLAHRAGA") > -1) {
        r[isTetap ? 5 : 6]++;
      } else if (jab.indexOf("PAI") > -1 || jab.indexOf("AGAMA ISLAM") > -1) {
        r[isTetap ? 7 : 8]++;
      } else if (jab.indexOf("INGGRIS") > -1 || jab.indexOf("B.ING") > -1 || jab.indexOf("B. ING") > -1) {
        r[isTetap ? 9 : 10]++;
      } else if (jab.indexOf("GURU") > -1) {
        r[isTetap ? 11 : 12]++;
      } else if (jab.indexOf("PENJAGA") > -1) {
        r[isTetap ? 13 : 14]++;
      } else if (jab.indexOf("TAS") > -1 || jab.indexOf("TATA USAHA") > -1 || jab.indexOf("ADMINISTRASI") > -1 || jab.indexOf("OPERATOR") > -1) {
        r[isTetap ? 15 : 16]++;
      } else if (jab.indexOf("PERPUS") > -1 || jab.indexOf("PUSTAKA") > -1) {
        r[isTetap ? 17 : 18]++;
      } else {
        r[isTetap ? 19 : 20]++;
      }
    }

    var result = [];
    Object.keys(schoolMap).sort().forEach(function(k) {
      var r = schoolMap[k];
      var jmlGty = r[3] + r[5] + r[7] + r[9] + r[11];
      var jmlPty = r[13] + r[15] + r[17] + r[19];
      var jmlGtt = r[4] + r[6] + r[8] + r[10] + r[12];
      var jmlPtt = r[14] + r[16] + r[18] + r[20];
      r[21] = jmlGty;
      r[22] = jmlPty;
      r[23] = jmlGty + jmlPty;
      r[24] = jmlGtt;
      r[25] = jmlPtt;
      r[26] = r[2] + r[23] + r[24] + r[25];
      result.push(r.map(function(v, idx) { return idx < 2 ? v : String(v); }));
    });
    return result;
  }

  var sheet = getSheet(KONFIG_PTK.DB_KEY, "Keadaan GTK SDS"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues();
}
function getDataKebutuhanGuruSDS() {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ssMaster = getDB("SIKS_DB_MASTER");
    var sheetSekolah = ssMaster ? ssMaster.getSheetByName("tbl_sekolah") : null;
    var sheetLapbul = ssMaster ? ssMaster.getSheetByName("tbl_lapbul_sd") : null;
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return [];

    // 1. Ambil daftar SD Swasta dari tbl_sekolah
    var schoolMap = {}; // key: npsn -> { unit, npsn, rombel, murid }
    if (sheetSekolah) {
      var sData = sheetSekolah.getDataRange().getDisplayValues();
      var sHead = sData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var sIdxNpsn = sHead.indexOf("npsn");
      var sIdxNama = sHead.indexOf("nama_sekolah");
      if (sIdxNama === -1) sIdxNama = sHead.indexOf("unit");
      var sIdxJenjang = sHead.indexOf("jenjang");
      var sIdxStatus = sHead.indexOf("status");
      for (var i = 1; i < sData.length; i++) {
        var row = sData[i];
        var jenjang = sIdxJenjang > -1 ? String(row[sIdxJenjang] || "").trim().toUpperCase() : "";
        var status = sIdxStatus > -1 ? String(row[sIdxStatus] || "").trim().toUpperCase() : "";
        if (!(jenjang === "SD SWASTA" || jenjang === "SDS" || (jenjang === "SD" && status === "SWASTA"))) continue;
        var npsn = sIdxNpsn > -1 ? String(row[sIdxNpsn] || "").trim() : "";
        var unit = sIdxNama > -1 ? String(row[sIdxNama] || "").trim() : "";
        if (npsn && unit) {
          schoolMap[npsn] = { unit: unit, npsn: npsn, rombel: 0, murid: 0 };
        }
      }
    }

    // 2. Ambil Rombel & Murid terbaru per NPSN dari tbl_lapbul_sd
    if (sheetLapbul) {
      var lData = sheetLapbul.getDataRange().getDisplayValues();
      var lHead = lData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var lIdxNpsn = lHead.indexOf("npsn");
      var lIdxRombel = lHead.indexOf("jml_rombel");
      var lIdxMurid = lHead.indexOf("jml_murid");
      for (var i = 1; i < lData.length; i++) {
        var row = lData[i];
        var npsn = lIdxNpsn > -1 ? String(row[lIdxNpsn] || "").trim() : "";
        if (npsn && schoolMap[npsn]) {
          var rmb = lIdxRombel > -1 ? (parseInt(row[lIdxRombel], 10) || 0) : 0;
          var mrd = lIdxMurid > -1 ? (parseInt(row[lIdxMurid], 10) || 0) : 0;
          if (rmb > 0) schoolMap[npsn].rombel = rmb;
          if (mrd > 0) schoolMap[npsn].murid = mrd;
        }
      }
    }

    // 3. Hitung PTK aktif SD Swasta dari tbl_ptk
    var c = ctx.colMap;
    var pData = ctx.sheet.getDataRange().getDisplayValues();
    var nowYear = new Date().getFullYear();
    var ptkAgg = {}; // key: npsn

    for (var i = 1; i < pData.length; i++) {
      var row = pData[i];
      var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
      var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
      if (jenjang !== "SD Swasta" || statusAktif !== "AKTIF") continue;

      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").trim() : "";
      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      if (!npsn) continue;
      if (!schoolMap[npsn] && unit) {
        schoolMap[npsn] = { unit: unit, npsn: npsn, rombel: 0, murid: 0 };
      }
      if (!ptkAgg[npsn]) {
        ptkAgg[npsn] = {
          ks_gty: 0, ks_p1: 0, ks_p2: 0,
          gk_gty: 0, gk_gtt: 0, gk_p1: 0, gk_p2: 0,
          pjok_gty: 0, pjok_gtt: 0, pjok_p1: 0, pjok_p2: 0,
          pai_gty: 0, pai_gtt: 0, pai_p1: 0, pai_p2: 0
        };
      }

      var agg = ptkAgg[npsn];
      var jab = c.jabatan > -1 ? String(row[c.jabatan] || "").trim().toUpperCase() : "";
      var stat = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";
      var isGty = (stat.indexOf("GTY") > -1 || stat.indexOf("PTY") > -1 || stat.indexOf("TETAP YAYASAN") > -1);

      // Cek tahun lahir untuk pensiun (usia >= 59 -> 1 thn, usia == 58 -> 2 thn)
      var p1 = 0, p2 = 0;
      var tglLahir = c.tgl_lahir > -1 ? String(row[c.tgl_lahir] || "").trim() : "";
      var mYear = tglLahir.match(/\b(19\d{2}|20\d{2})\b/);
      if (mYear) {
        var age = nowYear - parseInt(mYear[1], 10);
        if (age >= 59) p1 = 1;
        else if (age === 58) p2 = 1;
      }

      if (jab.indexOf("KEPALA") > -1) {
        agg.ks_gty++;
        agg.ks_p1 += p1;
        agg.ks_p2 += p2;
      } else if (jab.indexOf("KELAS") > -1) {
        if (isGty) agg.gk_gty++; else agg.gk_gtt++;
        agg.gk_p1 += p1;
        agg.gk_p2 += p2;
      } else if (jab.indexOf("PJOK") > -1 || jab.indexOf("PENJAS") > -1 || jab.indexOf("OLAHRAGA") > -1) {
        if (isGty) agg.pjok_gty++; else agg.pjok_gtt++;
        agg.pjok_p1 += p1;
        agg.pjok_p2 += p2;
      } else if (jab.indexOf("PAI") > -1 || jab.indexOf("AGAMA ISLAM") > -1) {
        if (isGty) agg.pai_gty++; else agg.pai_gtt++;
        agg.pai_p1 += p1;
        agg.pai_p2 += p2;
      }
    }

    var result = [];
    Object.keys(schoolMap).sort(function(a, b) {
      return schoolMap[a].unit.localeCompare(schoolMap[b].unit);
    }).forEach(function(npsn) {
      var s = schoolMap[npsn];
      var a = ptkAgg[npsn] || {
        ks_gty: 0, ks_p1: 0, ks_p2: 0,
        gk_gty: 0, gk_gtt: 0, gk_p1: 0, gk_p2: 0,
        pjok_gty: 0, pjok_gtt: 0, pjok_p1: 0, pjok_p2: 0,
        pai_gty: 0, pai_gtt: 0, pai_p1: 0, pai_p2: 0
      };
      var kebKs = 1;
      var kebGk = s.rombel > 0 ? s.rombel : 6;
      var kebPjok = s.rombel > 6 ? 2 : 1;
      var kebPai = s.rombel > 6 ? 2 : 1;

      var rowOut = [
        s.unit, s.npsn, String(s.rombel), String(s.murid),
        String(kebKs), String(a.ks_gty), String(a.ks_gty - kebKs), String(a.ks_p1), String(a.ks_p2),
        String(kebGk), String(a.gk_gty), String(a.gk_gtt), String((a.gk_gty + a.gk_gtt) - kebGk), String(a.gk_p1), String(a.gk_p2),
        String(kebPjok), String(a.pjok_gty), String(a.pjok_gtt), String((a.pjok_gty + a.pjok_gtt) - kebPjok), String(a.pjok_p1), String(a.pjok_p2),
        String(kebPai), String(a.pai_gty), String(a.pai_gtt), String((a.pai_gty + a.pai_gtt) - kebPai), String(a.pai_p1), String(a.pai_p2)
      ];
      result.push(rowOut);
    });
    return result;
  }

  var sheet = getSheet(KONFIG_PTK.DB_KEY, "Kebutuhan Guru SDS"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues();
}

// =============================================================
// BACKEND: KELOLA DATA PTK PAUD
// ID Spreadsheet: 1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU
// =============================================================
const KONFIG_PTK_PAUD = {
  DB_KEY: "PTK_PAUD_DB",
  SHEET_PTK: "Master Data GTK PAUD"
};

var PTK_PAUD_EXTRA_COLS_ = [
  "masa_kerja_tahun", "masa_kerja_bulan", "nip", "tugas_di_sekolah",
  "diklat_dasar", "tahun_diklat_dasar",
  "diklat_lanjut", "tahun_diklat_lanjut",
  "diklat_mahir", "tahun_diklat_mahir",
  "diklat_kepala_sekolah", "tahun_diklat_kepala_sekolah",
  "bantuan_tunjangan_profesi", "bantuan_bosda", "bantuan_insentif", "bantuan_lainnya"
];

function ensurePtkPaudExtraColumns_(ctx) {
  var added = false;
  for (var i = 0; i < PTK_PAUD_EXTRA_COLS_.length; i++) {
    var colName = PTK_PAUD_EXTRA_COLS_[i];
    if (ctx.headers.indexOf(colName) === -1) {
      var newColIdx = ctx.headers.length + 1;
      ctx.sheet.getRange(1, newColIdx).setValue(colName);
      ctx.headers.push(colName);
      added = true;
    }
  }
  return added;
}

function getDataPTKPAUD() {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return JSON.stringify([]);
      var c = ctx.colMap;
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
      var idxJenisPtk = ctx.headers.indexOf("jenis_ptk");
      var extraIdx = {};
      for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
        var col = PTK_PAUD_EXTRA_COLS_[k];
        extraIdx[col] = ctx.headers.indexOf(col);
      }
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var result = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
        if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1) continue;
        var rowId = c.id > -1 ? row[c.id] : "";
        if (!rowId) continue;
        result.push({
          id: rowId,
          status_aktif: c.status_aktif > -1 ? (String(row[c.status_aktif] || "AKTIF").trim().toUpperCase()) : "AKTIF",
          jenjang: jenjang,
          npsn: c.npsn > -1 ? (row[c.npsn] || "") : "",
          unit: c.unit > -1 ? (row[c.unit] || "") : "",
          gelar_depan: c.gelar_depan > -1 ? (row[c.gelar_depan] || "") : "",
          nama_no_gelar: c.nama_no_gelar > -1 ? (row[c.nama_no_gelar] || "") : "",
          gelar_belakang: c.gelar_belakang > -1 ? (row[c.gelar_belakang] || "") : "",
          nama_lengkap: c.nama_lengkap > -1 ? (row[c.nama_lengkap] || "") : "",
          tmp_lahir: c.tmp_lahir > -1 ? (row[c.tmp_lahir] || "") : "",
          tgl_lahir: c.tgl_lahir > -1 ? (row[c.tgl_lahir] || "") : "",
          nik: c.nik > -1 ? (row[c.nik] || "") : "",
          lp: c.lp > -1 ? (row[c.lp] || "") : "",
          agama: c.agama > -1 ? (row[c.agama] || "") : "",
          pendidikan: c.pendidikan > -1 ? (row[c.pendidikan] || "") : "",
          jurusan: c.jurusan > -1 ? (row[c.jurusan] || "") : "",
          thn_lulus: c.thn_lulus > -1 ? (row[c.thn_lulus] || "") : "",
          alamat_ktp: c.alamat_ktp > -1 ? (row[c.alamat_ktp] || "") : "",
          alamat_domisili: c.alamat_domisili > -1 ? (row[c.alamat_domisili] || "") : "",
          hp: c.hp > -1 ? (row[c.hp] || "") : "",
          status_peg: c.status_peg > -1 ? (row[c.status_peg] || "") : "",
          jabatan: c.jabatan > -1 ? (row[c.jabatan] || "") : "",
          mengajar_kelas: c.mengajar_kelas > -1 ? String(row[c.mengajar_kelas] || "").trim() : "",
          tmt_jabatan: c.tmt_jabatan > -1 ? (row[c.tmt_jabatan] || "") : "",
          inpassing: idxInpassing > -1 ? (row[idxInpassing] || "") : "",
          tmt_inpassing: idxTmtInpassing > -1 ? (row[idxTmtInpassing] || "") : "",
          nuptk: c.nuptk > -1 ? (row[c.nuptk] || "") : "",
          serdik: c.serdik > -1 ? (row[c.serdik] || "") : "",
          dapodik: c.dapodik > -1 ? (row[c.dapodik] || "") : "",
          tugtam: c.tugtam > -1 ? (row[c.tugtam] || "") : "",
          jenis_ptk: idxJenisPtk > -1 ? (row[idxJenisPtk] || "") : "",
          diinput: c.diinput > -1 ? (row[c.diinput] || "") : "",
          user_input: c.user_input > -1 ? (row[c.user_input] || "") : "",
          diedit: c.diedit > -1 ? (row[c.diedit] || "") : "",
          user_edit: c.user_edit > -1 ? (row[c.user_edit] || "") : "",
          email: c.email > -1 ? (row[c.email] || "") : "",
          masa_kerja_tahun: extraIdx.masa_kerja_tahun > -1 ? (row[extraIdx.masa_kerja_tahun] || "") : "",
          masa_kerja_bulan: extraIdx.masa_kerja_bulan > -1 ? (row[extraIdx.masa_kerja_bulan] || "") : "",
          nip: extraIdx.nip > -1 ? (row[extraIdx.nip] || "") : "",
          tugas_di_sekolah: extraIdx.tugas_di_sekolah > -1 ? (row[extraIdx.tugas_di_sekolah] || "") : "",
          diklat_dasar: extraIdx.diklat_dasar > -1 ? (row[extraIdx.diklat_dasar] || "") : "",
          tahun_diklat_dasar: extraIdx.tahun_diklat_dasar > -1 ? (row[extraIdx.tahun_diklat_dasar] || "") : "",
          diklat_lanjut: extraIdx.diklat_lanjut > -1 ? (row[extraIdx.diklat_lanjut] || "") : "",
          tahun_diklat_lanjut: extraIdx.tahun_diklat_lanjut > -1 ? (row[extraIdx.tahun_diklat_lanjut] || "") : "",
          diklat_mahir: extraIdx.diklat_mahir > -1 ? (row[extraIdx.diklat_mahir] || "") : "",
          tahun_diklat_mahir: extraIdx.tahun_diklat_mahir > -1 ? (row[extraIdx.tahun_diklat_mahir] || "") : "",
          diklat_kepala_sekolah: extraIdx.diklat_kepala_sekolah > -1 ? (row[extraIdx.diklat_kepala_sekolah] || "") : "",
          tahun_diklat_kepala_sekolah: extraIdx.tahun_diklat_kepala_sekolah > -1 ? (row[extraIdx.tahun_diklat_kepala_sekolah] || "") : "",
          bantuan_tunjangan_profesi: extraIdx.bantuan_tunjangan_profesi > -1 ? (row[extraIdx.bantuan_tunjangan_profesi] || "") : "",
          bantuan_bosda: extraIdx.bantuan_bosda > -1 ? (row[extraIdx.bantuan_bosda] || "") : "",
          bantuan_insentif: extraIdx.bantuan_insentif > -1 ? (row[extraIdx.bantuan_insentif] || "") : "",
          bantuan_lainnya: extraIdx.bantuan_lainnya > -1 ? (row[extraIdx.bantuan_lainnya] || "") : ""
        });
      }
      return JSON.stringify(result);
    }

    var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK); 
    if (!sheet) return JSON.stringify([]);
    var lastRow = sheet.getLastRow(); 
    if (lastRow < 2) return JSON.stringify([]); 
    
    var data = sheet.getDataRange().getDisplayValues(); 
    if (data.length < 2) return JSON.stringify([]);

    var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var findCol = function(nameList, defaultIdx) {
      for (var k = 0; k < nameList.length; k++) {
        var idx = headers.indexOf(nameList[k]);
        if (idx > -1) return idx;
      }
      return defaultIdx;
    };

    var colMap = {
      id: findCol(["id_ptk", "id", "id ptk"], 0),
      npsn: findCol(["npsn"], 1),
      unit: findCol(["unit", "nama_sekolah", "sekolah", "lembaga"], 2),
      jenjang: findCol(["jenjang"], 3),
      gelar_depan: findCol(["gelar_depan", "gelar depan"], 4),
      nama_no_gelar: findCol(["nama_no_gelar", "nama tanpa gelar"], 5),
      gelar_belakang: findCol(["gelar_belakang", "gelar belakang"], 6),
      nama_lengkap: findCol(["nama_lengkap", "nama lengkap", "nama"], 7),
      niy: findCol(["niy", "nig"], 8),
      tmp_lahir: findCol(["tmp_lahir", "tempat lahir"], 9),
      tgl_lahir: findCol(["tgl_lahir", "tanggal lahir"], 10),
      nik: findCol(["nik"], 11),
      lp: findCol(["lp", "jenis kelamin", "jk"], 12),
      agama: findCol(["agama"], 13),
      pendidikan: findCol(["pendidikan"], 14),
      jurusan: findCol(["jurusan"], 15),
      thn_lulus: findCol(["thn_lulus", "tahun lulus"], 16),
      alamat_ktp: findCol(["alamat_ktp", "alamat ktp"], 17),
      alamat_domisili: findCol(["alamat_domisili", "alamat domisili"], 18),
      hp: findCol(["hp", "no hp", "telepon"], 19),
      status_peg: findCol(["status_peg", "status pegawai", "status"], 20),
      jabatan: findCol(["jabatan"], 21),
      tmt_jabatan: findCol(["tmt_jabatan", "tmt jabatan"], 22),
      inpassing: findCol(["inpassing"], 23),
      tmt_inpassing: findCol(["tmt_inpassing", "tmt inpassing"], 24),
      nuptk: findCol(["nuptk"], 25),
      serdik: findCol(["serdik"], 26),
      dapodik: findCol(["dapodik"], 27),
      tugtam: findCol(["tugtam", "tugas tambahan"], 28),
      diinput: findCol(["diinput", "tgl input"], 29),
      user_input: findCol(["user_input", "penginput"], 30),
      diedit: findCol(["diedit", "tgl edit"], 31),
      user_edit: findCol(["user_edit", "pengedit"], 32),
      email: findCol(["email"], 33)
    };

    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i]; 
      var rowId = row[colMap.id];
      if (!rowId || rowId === "") continue; 
      
      result.push({
        id: rowId, 
        npsn: row[colMap.npsn] || "", 
        unit: row[colMap.unit] || "", 
        jenjang: row[colMap.jenjang] || "", 
        gelar_depan: row[colMap.gelar_depan] || "", 
        nama_no_gelar: row[colMap.nama_no_gelar] || "", 
        gelar_belakang: row[colMap.gelar_belakang] || "", 
        nama_lengkap: row[colMap.nama_lengkap] || "", 
        niy: row[colMap.niy] || "", 
        tmp_lahir: row[colMap.tmp_lahir] || "", 
        tgl_lahir: row[colMap.tgl_lahir] || "", 
        nik: row[colMap.nik] || "", 
        lp: row[colMap.lp] || "", 
        agama: row[colMap.agama] || "", 
        pendidikan: row[colMap.pendidikan] || "", 
        jurusan: row[colMap.jurusan] || "", 
        thn_lulus: row[colMap.thn_lulus] || "", 
        alamat_ktp: row[colMap.alamat_ktp] || "", 
        alamat_domisili: row[colMap.alamat_domisili] || "", 
        hp: row[colMap.hp] || "", 
        status_peg: row[colMap.status_peg] || "", 
        jabatan: row[colMap.jabatan] || "", 
        tmt_jabatan: row[colMap.tmt_jabatan] || "", 
        inpassing: row[colMap.inpassing] || "", 
        tmt_inpassing: row[colMap.tmt_inpassing] || "", 
        nuptk: row[colMap.nuptk] || "", 
        serdik: row[colMap.serdik] || "", 
        dapodik: row[colMap.dapodik] || "", 
        tugtam: row[colMap.tugtam] || "", 
        diinput: row[colMap.diinput] || "", 
        user_input: row[colMap.user_input] || "", 
        diedit: row[colMap.diedit] || "", 
        user_edit: row[colMap.user_edit] || "", 
        email: row[colMap.email] || "" 
      });
    }
    return JSON.stringify(result);
  } catch(e) { 
    Logger.log("Error pada getDataPTKPAUD: " + e.toString() + "\n" + (e.stack || ""));
    return JSON.stringify([]); 
  }
}

function checkAndGetPtkNonAktifPAUDByNIK(nik) {
  try {
    var inputNik = String(nik).replace(/'/g, "").trim();
    if (!inputNik) return JSON.stringify({ found: false });

    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return JSON.stringify({ found: false });
      var c = ctx.colMap;
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
      var dataDisplay = ctx.sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < dataDisplay.length; i++) {
        var row = dataDisplay[i];
        var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1 || statusAktif !== "NON_AKTIF") continue;
        var rowNik = c.nik > -1 ? String(row[c.nik] || "").replace(/'/g, "").trim() : "";
        if (rowNik === inputNik) {
          return JSON.stringify({
            found: true,
            id: c.id > -1 ? row[c.id] : "",
            nama_lengkap: (c.nama_lengkap > -1 ? row[c.nama_lengkap] : "") || (c.nama_no_gelar > -1 ? row[c.nama_no_gelar] : "") || "",
            nik: rowNik,
            lembaga_lama: c.unit > -1 ? (row[c.unit] || "") : "",
            alasan_non_aktif: c.alasan_hapus > -1 ? (row[c.alasan_hapus] || "Mutasi / Non-Aktif") : "Mutasi / Non-Aktif",
            tgl_non_aktif: c.tgl_hapus > -1 ? (row[c.tgl_hapus] || "") : "",
            data: {
              gelar_depan: c.gelar_depan > -1 ? (row[c.gelar_depan] || "") : "",
              nama_no_gelar: c.nama_no_gelar > -1 ? (row[c.nama_no_gelar] || "") : "",
              gelar_belakang: c.gelar_belakang > -1 ? (row[c.gelar_belakang] || "") : "",
              tmp_lahir: c.tmp_lahir > -1 ? (row[c.tmp_lahir] || "") : "",
              tgl_lahir: c.tgl_lahir > -1 ? (row[c.tgl_lahir] || "") : "",
              lp: c.lp > -1 ? (row[c.lp] || "") : "",
              agama: c.agama > -1 ? (row[c.agama] || "") : "",
              pendidikan: c.pendidikan > -1 ? (row[c.pendidikan] || "") : "",
              jurusan: c.jurusan > -1 ? (row[c.jurusan] || "") : "",
              thn_lulus: c.thn_lulus > -1 ? (row[c.thn_lulus] || "") : "",
              alamat_ktp: c.alamat_ktp > -1 ? (row[c.alamat_ktp] || "") : "",
              alamat_domisili: c.alamat_domisili > -1 ? (row[c.alamat_domisili] || "") : "",
              hp: c.hp > -1 ? (row[c.hp] || "") : "",
              status_peg: c.status_peg > -1 ? (row[c.status_peg] || "") : "",
              jabatan: c.jabatan > -1 ? (row[c.jabatan] || "") : "",
          mengajar_kelas: c.mengajar_kelas > -1 ? String(row[c.mengajar_kelas] || "").trim() : "",
              tmt_jabatan: c.tmt_jabatan > -1 ? (row[c.tmt_jabatan] || "") : "",
              inpassing: idxInpassing > -1 ? (row[idxInpassing] || "") : "",
              tmt_inpassing: idxTmtInpassing > -1 ? (row[idxTmtInpassing] || "") : "",
              nuptk: c.nuptk > -1 ? (row[c.nuptk] || "") : "",
              serdik: c.serdik > -1 ? (row[c.serdik] || "") : "",
              dapodik: c.dapodik > -1 ? (row[c.dapodik] || "") : "",
              tugtam: c.tugtam > -1 ? (row[c.tugtam] || "") : "",
              email: c.email > -1 ? (row[c.email] || "") : ""
            }
          });
        }
      }
      return JSON.stringify({ found: false });
    }

    var sheetTarget = getSheet(KONFIG_PTK_PAUD.DB_KEY, "gtk_non_aktif_paud");
    if (!sheetTarget) return JSON.stringify({ found: false });
    var dataDisplay = sheetTarget.getDataRange().getDisplayValues();
    var inputNik = String(nik).replace(/'/g, "").trim();
    if (!inputNik) return JSON.stringify({ found: false });

    for (var i = 1; i < dataDisplay.length; i++) {
      var rowNik = String(dataDisplay[i][11] || "").replace(/'/g, "").trim();
      if (rowNik === inputNik) {
        var row = dataDisplay[i];
        var lastColIdx = row.length - 1;
        return JSON.stringify({
          found: true,
          id: row[0],
          nama_lengkap: row[7] || row[5] || "",
          nik: rowNik,
          lembaga_lama: row[2] || "",
          alasan_non_aktif: row[lastColIdx - 2] || "Mutasi / Non-Aktif",
          tgl_non_aktif: row[lastColIdx - 1] || "",
          data: {
            gelar_depan: row[4] || "",
            nama_no_gelar: row[5] || "",
            gelar_belakang: row[6] || "",
            niy: row[8] || "",
            tmp_lahir: row[9] || "",
            tgl_lahir: row[10] || "",
            lp: row[12] || "",
            agama: row[13] || "",
            pendidikan: row[14] || "",
            jurusan: row[15] || "",
            thn_lulus: row[16] || "",
            alamat_ktp: row[17] || "",
            alamat_domisili: row[18] || "",
            hp: row[19] || "",
            status_peg: row[20] || "",
            jabatan: row[21] || "",
            tmt_jabatan: row[22] || "",
            inpassing: row[23] || "",
            tmt_inpassing: row[24] || "",
            nuptk: row[25] || "",
            serdik: row[26] || "",
            dapodik: row[27] || "",
            tugtam: row[28] || "",
            email: row[33] || ""
          }
        });
      }
    }
    return JSON.stringify({ found: false });
  } catch(e) { return JSON.stringify({ found: false, error: e.message }); }
}

function reactivatePtkPAUD(form) {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
      var c = ctx.colMap;
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
      var inputNik = String(form.nik).replace(/'/g, "").trim();
      var dataDisplay = ctx.sheet.getDataRange().getDisplayValues();
      var dataValues = ctx.sheet.getDataRange().getValues();
      var rowIdx = -1;
      var originalRow = [];

      for (var i = 1; i < dataDisplay.length; i++) {
        var jenjang = c.jenjang > -1 ? String(dataDisplay[i][c.jenjang] || "").trim() : "";
        var statusAktif = c.status_aktif > -1 ? String(dataDisplay[i][c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1 || statusAktif !== "NON_AKTIF") continue;
        var rowNik = c.nik > -1 ? String(dataDisplay[i][c.nik] || "").replace(/'/g, "").trim() : "";
        if (rowNik === inputNik) {
          rowIdx = i + 1;
          originalRow = dataValues[i];
          break;
        }
      }
      if (rowIdx === -1) return "Error: Data non-aktif dengan NIK ini tidak ditemukan.";

      var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
      var rawNpsn = form.npsn_baru || form.npsn_login || form.npsn || "";
      var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
      var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;
      var finalUnit = form.unit_kerja || form.unit_login || form.unit || "";
      var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");

      var rowArr = originalRow.slice();
      if (c.status_aktif > -1) rowArr[c.status_aktif] = "AKTIF";
      if (c.npsn > -1) rowArr[c.npsn] = finalNpsn;
      if (c.unit > -1) rowArr[c.unit] = finalUnit;
      if (c.gelar_depan > -1) rowArr[c.gelar_depan] = form.gelar_depan || originalRow[c.gelar_depan] || "";
      if (c.nama_no_gelar > -1) rowArr[c.nama_no_gelar] = form.nama_lengkap || originalRow[c.nama_no_gelar] || "";
      if (c.gelar_belakang > -1) rowArr[c.gelar_belakang] = form.gelar_belakang || originalRow[c.gelar_belakang] || "";
      if (c.nama_lengkap > -1) rowArr[c.nama_lengkap] = namaFull || originalRow[c.nama_lengkap] || "";
      if (c.tmp_lahir > -1) rowArr[c.tmp_lahir] = form.tmp_lahir || originalRow[c.tmp_lahir] || "";
      if (c.tgl_lahir > -1) rowArr[c.tgl_lahir] = convertStringToDate_(form.tgl_lahir || originalRow[c.tgl_lahir]);
      if (c.nik > -1) rowArr[c.nik] = "'" + (form.nik || originalRow[c.nik] || "");
      if (c.lp > -1) rowArr[c.lp] = form.lp || originalRow[c.lp] || "";
      if (c.agama > -1) rowArr[c.agama] = form.agama || originalRow[c.agama] || "";
      if (c.pendidikan > -1) rowArr[c.pendidikan] = form.pendidikan || originalRow[c.pendidikan] || "";
      if (c.jurusan > -1) rowArr[c.jurusan] = form.jurusan || originalRow[c.jurusan] || "";
      if (c.thn_lulus > -1) rowArr[c.thn_lulus] = form.thn_lulus || originalRow[c.thn_lulus] || "";
      if (c.alamat_ktp > -1) rowArr[c.alamat_ktp] = form.alamat_ktp || originalRow[c.alamat_ktp] || "";
      if (c.alamat_domisili > -1) rowArr[c.alamat_domisili] = form.alamat_domisili || originalRow[c.alamat_domisili] || "";
      if (c.hp > -1) rowArr[c.hp] = "'" + (form.hp || originalRow[c.hp] || "");
      if (c.status_peg > -1) rowArr[c.status_peg] = form.status_peg || originalRow[c.status_peg] || "";
      if (c.jabatan > -1) rowArr[c.jabatan] = form.jabatan || originalRow[c.jabatan] || "";
      if (c.mengajar_kelas > -1) rowArr[c.mengajar_kelas] = "'" + (form.mengajar_kelas || originalRow[c.mengajar_kelas] || "-");
      if (c.tmt_jabatan > -1) rowArr[c.tmt_jabatan] = convertStringToDate_(form.tmt_jabatan || originalRow[c.tmt_jabatan]);
      if (idxInpassing > -1) rowArr[idxInpassing] = form.inpassing || originalRow[idxInpassing] || "";
      if (idxTmtInpassing > -1) rowArr[idxTmtInpassing] = convertStringToDate_(form.tmt_inpassing || originalRow[idxTmtInpassing]);
      if (c.nuptk > -1) rowArr[c.nuptk] = "'" + (form.nuptk || originalRow[c.nuptk] || "");
      if (c.serdik > -1) rowArr[c.serdik] = form.serdik || originalRow[c.serdik] || "";
      if (c.dapodik > -1) rowArr[c.dapodik] = form.dapodik || originalRow[c.dapodik] || "";
      if (c.tugtam > -1) rowArr[c.tugtam] = form.tugtam || originalRow[c.tugtam] || "";
      if (c.diedit > -1) rowArr[c.diedit] = timestamp;
      if (c.user_edit > -1) rowArr[c.user_edit] = form.user_login || "";
      if (c.email > -1) rowArr[c.email] = form.email || originalRow[c.email] || "";
      if (c.alasan_hapus > -1) rowArr[c.alasan_hapus] = "";
      if (c.tgl_hapus > -1) rowArr[c.tgl_hapus] = "";
      if (c.user_hapus > -1) rowArr[c.user_hapus] = "";

      ctx.sheet.getRange(rowIdx, 1, 1, rowArr.length).setValues([rowArr]);
      SpreadsheetApp.flush();
      return "Sukses";
    }

    var sheetNonAktif = getSheet(KONFIG_PTK_PAUD.DB_KEY, "gtk_non_aktif_paud");
    var sheetAktif = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK);
    if (!sheetNonAktif || !sheetAktif) return "Error: Sheet database tidak ditemukan.";

    var inputNik = String(form.nik).replace(/'/g, "").trim();
    var dataDisplay = sheetNonAktif.getDataRange().getDisplayValues();
    var dataValues = sheetNonAktif.getDataRange().getValues();
    var rowIdx = -1;
    var originalRow = [];

    for (var i = 1; i < dataDisplay.length; i++) {
      var rowNik = String(dataDisplay[i][11] || "").replace(/'/g, "").trim();
      if (rowNik === inputNik) {
        rowIdx = i + 1;
        originalRow = dataValues[i];
        break;
      }
    }

    if (rowIdx === -1) return "Error: Data non-aktif dengan NIK ini tidak ditemukan.";

    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var rawNpsn = form.npsn_baru || form.npsn_login || form.npsn || "";
    var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
    var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;
    var finalUnit = form.unit_kerja || form.unit_login || form.unit || "";
    var finalJenjang = form.jenjang || originalRow[3] || "";

    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");

    // Siapkan 34 kolom standar Master Data GTK PAUD
    var activeRowData = [
      originalRow[0], // ID lama tetap dipertahankan
      finalNpsn,
      finalUnit,
      finalJenjang,
      form.gelar_depan || originalRow[4] || "",
      form.nama_lengkap || originalRow[5] || "",
      form.gelar_belakang || originalRow[6] || "",
      namaFull || originalRow[7] || "",
      form.niy || originalRow[8] || "",
      form.tmp_lahir || originalRow[9] || "",
      convertStringToDate_(form.tgl_lahir || originalRow[10]),
      "'" + (form.nik || originalRow[11] || ""),
      form.lp || originalRow[12] || "",
      form.agama || originalRow[13] || "",
      form.pendidikan || originalRow[14] || "",
      form.jurusan || originalRow[15] || "",
      form.thn_lulus || originalRow[16] || "",
      form.alamat_ktp || originalRow[17] || "",
      form.alamat_domisili || originalRow[18] || "",
      "'" + (form.hp || originalRow[19] || ""),
      form.status_peg || originalRow[20] || "",
      form.jabatan || originalRow[21] || "",
      convertStringToDate_(form.tmt_jabatan || originalRow[22]),
      form.inpassing || originalRow[23] || "",
      convertStringToDate_(form.tmt_inpassing || originalRow[24]),
      "'" + (form.nuptk || originalRow[25] || ""),
      form.serdik || originalRow[26] || "",
      form.dapodik || originalRow[27] || "",
      form.tugtam || originalRow[28] || "",
      originalRow[29] || timestamp, // Diinput
      originalRow[30] || form.user_login || "", // User input
      timestamp, // Diedit / Reaktif
      form.user_login || "", // User edit / Reaktif
      form.email || originalRow[33] || ""
    ];

    sheetAktif.appendRow(activeRowData);
    sheetNonAktif.deleteRow(rowIdx);
    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
}

function insertDataPTKPAUD(form, base64Data, fileName, jenisDokumen, userPengusul) {
  try {
    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
      var c = ctx.colMap;
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var inputNik = String(form.nik || "").replace(/'/g, "").trim();

      for (var i = 1; i < data.length; i++) {
        var rowNik = c.nik > -1 ? String(data[i][c.nik] || "").replace(/'/g, "").trim() : "";
        if (rowNik === inputNik && inputNik !== "") {
          var rowStatus = c.status_aktif > -1 ? String(data[i][c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
          var rowJenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
          if (rowStatus === "NON_AKTIF" && rowJenjang !== "" && rowJenjang.toUpperCase().indexOf("SD") === -1) {
            var resCheckNonAktif = JSON.parse(checkAndGetPtkNonAktifPAUDByNIK(inputNik));
            if (resCheckNonAktif.found) return "NON_AKTIF_FOUND:" + JSON.stringify(resCheckNonAktif);
          }
          var namaExist = c.nama_lengkap > -1 ? data[i][c.nama_lengkap] : "";
          return "NIK " + inputNik + " sudah terdaftar atas nama " + namaExist + ".";
        }
      }

      var newId = "PAUD-" + new Date().getTime();
      var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
      var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
      var rawNpsn = form.npsn_baru || form.npsn_login || "";
      var npsnNum = parseInt(String(rawNpsn).replace(/[^0-9]/g, ''), 10);
      var finalNpsn = isNaN(npsnNum) ? rawNpsn : npsnNum;

      var rowArr = new Array(ctx.headers.length);
      for (var h = 0; h < rowArr.length; h++) rowArr[h] = "";
      if (c.id > -1) rowArr[c.id] = newId;
      if (c.jenjang > -1) rowArr[c.jenjang] = form.jenjang || "PAUD";
      if (c.status_aktif > -1) rowArr[c.status_aktif] = "AKTIF";
      if (c.npsn > -1) rowArr[c.npsn] = finalNpsn;
      if (c.unit > -1) rowArr[c.unit] = form.unit_kerja || form.unit_login || "";
      if (c.gelar_depan > -1) rowArr[c.gelar_depan] = form.gelar_depan || "";
      if (c.nama_no_gelar > -1) rowArr[c.nama_no_gelar] = form.nama_lengkap || "";
      if (c.gelar_belakang > -1) rowArr[c.gelar_belakang] = form.gelar_belakang || "";
      if (c.nama_lengkap > -1) rowArr[c.nama_lengkap] = namaFull || "";
      if (c.tmp_lahir > -1) rowArr[c.tmp_lahir] = form.tmp_lahir || "";
      if (c.tgl_lahir > -1) rowArr[c.tgl_lahir] = convertStringToDate_(form.tgl_lahir);
      if (c.nik > -1) rowArr[c.nik] = "'" + (form.nik || "");
      if (c.lp > -1) rowArr[c.lp] = form.lp || "";
      if (c.agama > -1) rowArr[c.agama] = form.agama || "";
      if (c.pendidikan > -1) rowArr[c.pendidikan] = form.pendidikan || "";
      if (c.jurusan > -1) rowArr[c.jurusan] = form.jurusan || "";
      if (c.thn_lulus > -1) rowArr[c.thn_lulus] = form.thn_lulus || "";
      if (c.alamat_ktp > -1) rowArr[c.alamat_ktp] = form.alamat_ktp || "";
      if (c.alamat_domisili > -1) rowArr[c.alamat_domisili] = form.alamat_domisili || "";
      if (c.hp > -1) rowArr[c.hp] = "'" + (form.hp || "");
      if (c.status_peg > -1) rowArr[c.status_peg] = form.status_peg || "";
      if (c.jabatan > -1) rowArr[c.jabatan] = form.jabatan || "";
    if (c.mengajar_kelas > -1) rowArr[c.mengajar_kelas] = "'" + (form.mengajar_kelas || "-");
      if (c.tmt_jabatan > -1) rowArr[c.tmt_jabatan] = convertStringToDate_(form.tmt_jabatan);
      if (idxInpassing > -1) rowArr[idxInpassing] = form.inpassing || "";
      if (idxTmtInpassing > -1) rowArr[idxTmtInpassing] = convertStringToDate_(form.tmt_inpassing);
      if (c.nuptk > -1) rowArr[c.nuptk] = "'" + (form.nuptk || "");
      if (c.serdik > -1) rowArr[c.serdik] = form.serdik || "";
      if (c.dapodik > -1) rowArr[c.dapodik] = form.dapodik || "";
      if (c.tugtam > -1) rowArr[c.tugtam] = form.tugtam || "";
      if (c.diinput > -1) rowArr[c.diinput] = timestamp;
      if (c.user_input > -1) rowArr[c.user_input] = form.user_login || userPengusul || "";
      if (c.email > -1) rowArr[c.email] = form.email || "";

      ensurePtkPaudExtraColumns_(ctx);
      while (rowArr.length < ctx.headers.length) rowArr.push("");
      for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
        var colName = PTK_PAUD_EXTRA_COLS_[k];
        var colIdx = ctx.headers.indexOf(colName);
        if (colIdx > -1) {
          var val = form[colName] || "";
          rowArr[colIdx] = (colName === "nip" && val) ? ("'" + val) : val;
        }
      }

      ctx.sheet.appendRow(rowArr);
      return "Sukses";
    }

    var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, KONFIG_PTK_PAUD.SHEET_PTK);
    var data = sheet.getDataRange().getValues();
    var inputNik = String(form.nik).trim();
    for (var i = 1; i < data.length; i++) {
      var rowNik = String(data[i][11]).replace(/'/g, "").trim();
      if (rowNik === inputNik) return "NIK " + inputNik + " sudah terdaftar atas nama " + data[i][7] + ".";
    }

    // Cek apakah terdaftar di sheet non-aktif
    var resCheckNonAktif = JSON.parse(checkAndGetPtkNonAktifPAUDByNIK(inputNik));
    if (resCheckNonAktif.found) {
      return "NON_AKTIF_FOUND:" + JSON.stringify(resCheckNonAktif);
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
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
    var c = ctx.colMap;
    var idxInpassing = ctx.headers.indexOf("inpassing");
    var idxTmtInpassing = ctx.headers.indexOf("tmt_inpassing");
    var data = ctx.sheet.getDataRange().getValues();
    var rowIdx = -1;
    var idStr = String(form.id).trim();

    for (var i = 1; i < data.length; i++) {
      var jenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
      if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1) continue;
      if (c.id > -1 && String(data[i][c.id]).trim() === idStr) {
        rowIdx = i + 1;
        break;
      }
    }
    if (rowIdx == -1) return "Error: ID tidak ditemukan.";

    var inputNik = String(form.nik || "").replace(/'/g, "").trim();
    if (inputNik !== "") {
      for (var i = 1; i < data.length; i++) {
        var rowNik = c.nik > -1 ? String(data[i][c.nik] || "").replace(/'/g, '').trim() : "";
        var rowId = c.id > -1 ? String(data[i][c.id]).trim() : "";
        if (rowNik === inputNik && rowId !== idStr) {
          var namaExist = c.nama_lengkap > -1 ? data[i][c.nama_lengkap] : "";
          return "Gagal: NIK " + inputNik + " sudah dipakai oleh " + namaExist;
        }
      }
    }

    var rowArr = data[rowIdx - 1].slice();
    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    if (form.npsn_baru && form.unit_kerja) {
      var npsnVal = parseInt(String(form.npsn_baru).replace(/[^0-9]/g, ''), 10);
      if (c.npsn > -1) rowArr[c.npsn] = isNaN(npsnVal) ? form.npsn_baru : npsnVal;
      if (c.unit > -1) rowArr[c.unit] = form.unit_kerja;
    }

    if (c.gelar_depan > -1) rowArr[c.gelar_depan] = form.gelar_depan || "";
    if (c.nama_no_gelar > -1) rowArr[c.nama_no_gelar] = form.nama_lengkap || "";
    if (c.gelar_belakang > -1) rowArr[c.gelar_belakang] = form.gelar_belakang || "";
    if (c.nama_lengkap > -1) rowArr[c.nama_lengkap] = namaFull || "";
    if (c.tmp_lahir > -1) rowArr[c.tmp_lahir] = form.tmp_lahir || "";
    if (c.tgl_lahir > -1) rowArr[c.tgl_lahir] = convertStringToDate_(form.tgl_lahir);
    if (c.nik > -1) rowArr[c.nik] = "'" + (form.nik || "");
    if (c.lp > -1) rowArr[c.lp] = form.lp || "";
    if (c.agama > -1) rowArr[c.agama] = form.agama || "";
    if (c.pendidikan > -1) rowArr[c.pendidikan] = form.pendidikan || "";
    if (c.jurusan > -1) rowArr[c.jurusan] = form.jurusan || "";
    if (c.thn_lulus > -1) rowArr[c.thn_lulus] = form.thn_lulus || "";
    if (c.alamat_ktp > -1) rowArr[c.alamat_ktp] = form.alamat_ktp || "";
    if (c.alamat_domisili > -1) rowArr[c.alamat_domisili] = form.alamat_domisili || "";
    if (c.hp > -1) rowArr[c.hp] = "'" + (form.hp || "");
    if (c.status_peg > -1) rowArr[c.status_peg] = form.status_peg || "";
    if (c.jabatan > -1) rowArr[c.jabatan] = form.jabatan || "";
    if (c.mengajar_kelas > -1) rowArr[c.mengajar_kelas] = "'" + (form.mengajar_kelas || "-");
    if (c.tmt_jabatan > -1) rowArr[c.tmt_jabatan] = convertStringToDate_(form.tmt_jabatan);
    if (idxInpassing > -1) rowArr[idxInpassing] = form.inpassing || "";
    if (idxTmtInpassing > -1) rowArr[idxTmtInpassing] = convertStringToDate_(form.tmt_inpassing);
    if (c.nuptk > -1) rowArr[c.nuptk] = "'" + (form.nuptk || "");
    if (c.serdik > -1) rowArr[c.serdik] = form.serdik || "";
    if (c.dapodik > -1) rowArr[c.dapodik] = form.dapodik || "";
    if (c.tugtam > -1) rowArr[c.tugtam] = form.tugtam || "";
    if (c.diedit > -1) rowArr[c.diedit] = timestamp;
    if (c.user_edit > -1) rowArr[c.user_edit] = form.user_login || "";
    if (c.email > -1) rowArr[c.email] = form.email || "";

    ensurePtkPaudExtraColumns_(ctx);
    while (rowArr.length < ctx.headers.length) rowArr.push("");
    for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
      var colName = PTK_PAUD_EXTRA_COLS_[k];
      var colIdx = ctx.headers.indexOf(colName);
      if (colIdx > -1) {
        var val = form[colName] || "";
        rowArr[colIdx] = (colName === "nip" && val) ? ("'" + val) : val;
      }
    }

    ctx.sheet.getRange(rowIdx, 1, 1, rowArr.length).setValues([rowArr]);
    return "Sukses";
  }

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
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
    var c = ctx.colMap;
    var data = ctx.sheet.getDataRange().getValues();
    var rowIdx = -1;
    var idStr = String(id).trim();
    for (var i = 1; i < data.length; i++) {
      var jenjang = c.jenjang > -1 ? String(data[i][c.jenjang] || "").trim() : "";
      if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1) continue;
      if (c.id > -1 && String(data[i][c.id]).trim() === idStr) {
        rowIdx = i + 1;
        break;
      }
    }
    if (rowIdx == -1) return "Error: Data tidak ditemukan.";
    var tglHapus = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    if (c.status_aktif > -1) ctx.sheet.getRange(rowIdx, c.status_aktif + 1).setValue("NON_AKTIF");
    if (c.alasan_hapus > -1) ctx.sheet.getRange(rowIdx, c.alasan_hapus + 1).setValue(alasan || "");
    if (c.tgl_hapus > -1) ctx.sheet.getRange(rowIdx, c.tgl_hapus + 1).setValue(tglHapus);
    if (c.user_hapus > -1) ctx.sheet.getRange(rowIdx, c.user_hapus + 1).setValue(userLogin || "");
    return "Sukses";
  }

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

function getDataKeadaanGTKPAUD() {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return [];
    var c = ctx.colMap;
    var data = ctx.sheet.getDataRange().getDisplayValues();
    var schoolMap = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
      var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
      if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1 || statusAktif !== "AKTIF") continue;

      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").trim() : "";
      if (!unit) continue;

      var key = unit.toUpperCase();
      if (!schoolMap[key]) {
        var arr = [unit, npsn, jenjang];
        for (var k = 3; k < 28; k++) arr.push(0);
        schoolMap[key] = arr;
      }
      var r = schoolMap[key];
      var jab = c.jabatan > -1 ? String(row[c.jabatan] || "").trim().toUpperCase() : "";
      var stat = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";
      var isAsn = (stat.indexOf("PNS") > -1 || stat.indexOf("PPPK") > -1 || (stat.indexOf("ASN") > -1 && stat.indexOf("NON") === -1));
      var isTetap = (stat.indexOf("GTY") > -1 || stat.indexOf("PTY") > -1 || stat.indexOf("TETAP YAYASAN") > -1);

      if (jab.indexOf("KEPALA") > -1) {
        r[isAsn ? 4 : 3]++;
      } else if (jab.indexOf("KELAS") > -1 || jab.indexOf("GURU PAUD") > -1 || jab.indexOf("GURU TK") > -1 || jab.indexOf("GURU KB") > -1) {
        if (isAsn) r[6]++;
        else if (isTetap) r[5]++;
        else r[7]++;
      } else if (jab.indexOf("EXTRA") > -1 || jab.indexOf("EKSTRA") > -1) {
        r[isTetap ? 8 : 9]++;
      } else if (jab.indexOf("PENGASUH") > -1) {
        r[isTetap ? 10 : 11]++;
      } else if (jab.indexOf("GURU") > -1) {
        r[isTetap ? 12 : 13]++;
      } else if (jab.indexOf("PENJAGA") > -1) {
        r[isTetap ? 14 : 15]++;
      } else if (jab.indexOf("TAS") > -1 || jab.indexOf("TATA USAHA") > -1 || jab.indexOf("ADMINISTRASI") > -1 || jab.indexOf("OPERATOR") > -1) {
        r[isTetap ? 16 : 17]++;
      } else if (jab.indexOf("PERPUS") > -1 || jab.indexOf("PUSTAKA") > -1) {
        r[isTetap ? 18 : 19]++;
      } else {
        r[isTetap ? 20 : 21]++;
      }
    }

    var result = [];
    Object.keys(schoolMap).sort().forEach(function(k) {
      var r = schoolMap[k];
      var jmlAsn = r[4] + r[6];
      var jmlGty = r[3] + r[5] + r[8] + r[10] + r[12];
      var jmlPty = r[14] + r[16] + r[18] + r[20];
      var jmlGtt = r[7] + r[9] + r[11] + r[13];
      var jmlPtt = r[15] + r[17] + r[19] + r[21];
      r[22] = jmlGty;
      r[23] = jmlAsn;
      r[24] = jmlGtt;
      r[25] = jmlPty;
      r[26] = jmlPtt;
      r[27] = jmlAsn + jmlGty + jmlPty + jmlGtt + jmlPtt;
      result.push(r.map(function(v, idx) { return idx < 3 ? v : String(v); }));
    });
    return result;
  }

  var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, "Keadaan GTK PAUD"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 28).getDisplayValues();
}


function getDataValidasiPTKSDS() {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ssMaster = getDB("SIKS_DB_MASTER");
    var sheetSekolah = ssMaster ? ssMaster.getSheetByName("tbl_sekolah") : null;
    var sheetLapbul = ssMaster ? ssMaster.getSheetByName("tbl_lapbul_sd") : null;
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return [];

    var schoolMap = {}; // npsn -> unit
    if (sheetSekolah) {
      var sData = sheetSekolah.getDataRange().getDisplayValues();
      var sHead = sData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var sIdxNpsn = sHead.indexOf("npsn");
      var sIdxNama = sHead.indexOf("nama_sekolah");
      if (sIdxNama === -1) sIdxNama = sHead.indexOf("unit");
      var sIdxJenjang = sHead.indexOf("jenjang");
      var sIdxStatus = sHead.indexOf("status");
      for (var i = 1; i < sData.length; i++) {
        var row = sData[i];
        var jenjang = sIdxJenjang > -1 ? String(row[sIdxJenjang] || "").trim().toUpperCase() : "";
        var status = sIdxStatus > -1 ? String(row[sIdxStatus] || "").trim().toUpperCase() : "";
        if (!(jenjang === "SD SWASTA" || jenjang === "SDS" || (jenjang === "SD" && status === "SWASTA"))) continue;
        var npsn = sIdxNpsn > -1 ? String(row[sIdxNpsn] || "").trim() : "";
        var unit = sIdxNama > -1 ? String(row[sIdxNama] || "").trim() : "";
        if (npsn && unit) schoolMap[npsn] = unit;
      }
    }

    // Agregasi PTK aktif SD Swasta dari tbl_ptk
    var c = ctx.colMap;
    var pData = ctx.sheet.getDataRange().getDisplayValues();
    var ptkMap = {}; // npsn -> [15 counts]
    for (var i = 1; i < pData.length; i++) {
      var row = pData[i];
      var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
      var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
      if (jenjang !== "SD Swasta" || statusAktif !== "AKTIF") continue;
      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").trim() : "";
      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      if (!npsn) continue;
      if (!schoolMap[npsn] && unit) schoolMap[npsn] = unit;
      if (!ptkMap[npsn]) ptkMap[npsn] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

      var cnt = ptkMap[npsn];
      var jab = c.jabatan > -1 ? String(row[c.jabatan] || "").trim().toUpperCase() : "";
      var stat = c.status_peg > -1 ? String(row[c.status_peg] || "").trim().toUpperCase() : "";

      if (stat.indexOf("GTY") > -1) cnt[0]++;
      else if (stat.indexOf("PTY") > -1) cnt[1]++;
      else if (stat.indexOf("GTT") > -1) cnt[2]++;
      else if (stat.indexOf("PTT") > -1) cnt[3]++;

      if (jab.indexOf("KEPALA") > -1) cnt[4]++;
      else if (jab.indexOf("KELAS") > -1) cnt[5]++;
      else if (jab.indexOf("PJOK") > -1 || jab.indexOf("PENJAS") > -1 || jab.indexOf("OLAHRAGA") > -1) cnt[6]++;
      else if (jab.indexOf("PAI") > -1 || jab.indexOf("AGAMA ISLAM") > -1) cnt[7]++;
      else if (jab.indexOf("INGGRIS") > -1 || jab.indexOf("B.ING") > -1 || jab.indexOf("B. ING") > -1) cnt[8]++;
      else if (jab.indexOf("GURU") > -1) cnt[9]++;
      else if (jab.indexOf("PENJAGA") > -1) cnt[10]++;
      else if (jab.indexOf("TAS") > -1 || jab.indexOf("TATA USAHA") > -1 || jab.indexOf("ADMINISTRASI") > -1 || jab.indexOf("OPERATOR") > -1) cnt[11]++;
      else if (jab.indexOf("PERPUS") > -1 || jab.indexOf("PUSTAKA") > -1) cnt[12]++;
      else cnt[13]++;

      cnt[14]++;
    }

    // Ambil data lapbul terbaru per NPSN dari tbl_lapbul_sd
    var lapbulMap = {}; // npsn -> { bulan, tahun, counts: [15] }
    if (sheetLapbul) {
      var lData = sheetLapbul.getDataRange().getDisplayValues();
      var lHead = lData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var lIdxNpsn = lHead.indexOf("npsn");
      var lIdxBulan = lHead.indexOf("bulan");
      var lIdxTahun = lHead.indexOf("tahun");
      var getLIdx = function(names) {
        for (var k = 0; k < names.length; k++) {
          var idx = lHead.indexOf(names[k]);
          if (idx > -1) return idx;
        }
        return -1;
      };
      var lCols = [
        getLIdx(["gty"]), getLIdx(["pty"]), getLIdx(["gtt"]), getLIdx(["ptt"]),
        getLIdx(["ks", "kepala_sekolah"]), getLIdx(["guru_kelas", "gk"]), getLIdx(["guru_pjok", "pjok"]),
        getLIdx(["guru_pai", "pai"]), getLIdx(["guru_bing", "guru_inggris", "bing"]), getLIdx(["guru_mapel", "mapel_lain"]),
        getLIdx(["penjaga"]), getLIdx(["tas", "tu"]), getLIdx(["perpus", "pustakawan"]),
        getLIdx(["tendik_lain"]), getLIdx(["jml_ptk", "total_ptk"])
      ];
      for (var i = 1; i < lData.length; i++) {
        var row = lData[i];
        var npsn = lIdxNpsn > -1 ? String(row[lIdxNpsn] || "").trim() : "";
        if (!npsn || !schoolMap[npsn]) continue;
        var counts = [];
        for (var j = 0; j < 15; j++) {
          counts.push(lCols[j] > -1 ? (parseInt(row[lCols[j]], 10) || 0) : 0);
        }
        lapbulMap[npsn] = {
          bulan: lIdxBulan > -1 ? (row[lIdxBulan] || "-") : "-",
          tahun: lIdxTahun > -1 ? (row[lIdxTahun] || "-") : "-",
          counts: counts
        };
      }
    }

    var result = [];
    Object.keys(schoolMap).sort(function(a, b) {
      return schoolMap[a].localeCompare(schoolMap[b]);
    }).forEach(function(npsn) {
      var p = ptkMap[npsn] || [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      var l = lapbulMap[npsn] || { bulan: "-", tahun: "-", counts: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] };
      var rowOut = [npsn, schoolMap[npsn], l.bulan, l.tahun];
      for (var j = 0; j < 15; j++) {
        var pVal = p[j];
        var lVal = l.counts[j];
        rowOut.push(String(pVal), String(lVal), (pVal === lVal ? "Valid" : "Tidak Valid"));
      }
      result.push(rowOut);
    });
    return result;
  }

  var sheet = getSheet(KONFIG_PTK.DB_KEY, "sinkron_gtk_sds"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 49).getDisplayValues();
}

function getDataValidasiPTKPAUD() {
  if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
    var ssMaster = getDB("SIKS_DB_MASTER");
    var sheetSekolah = ssMaster ? ssMaster.getSheetByName("tbl_sekolah") : null;
    var sheetLapbul = ssMaster ? ssMaster.getSheetByName("tbl_lapbul_paud") : null;
    var ctx = getTblPtkSdnContext_();
    if (!ctx) return [];

    var schoolMap = {}; // npsn -> unit
    if (sheetSekolah) {
      var sData = sheetSekolah.getDataRange().getDisplayValues();
      var sHead = sData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var sIdxNpsn = sHead.indexOf("npsn");
      var sIdxNama = sHead.indexOf("nama_sekolah");
      if (sIdxNama === -1) sIdxNama = sHead.indexOf("unit");
      var sIdxJenjang = sHead.indexOf("jenjang");
      for (var i = 1; i < sData.length; i++) {
        var row = sData[i];
        var jenjang = sIdxJenjang > -1 ? String(row[sIdxJenjang] || "").trim().toUpperCase() : "";
        if (!jenjang || jenjang.indexOf("SD") > -1) continue;
        var npsn = sIdxNpsn > -1 ? String(row[sIdxNpsn] || "").trim() : "";
        var unit = sIdxNama > -1 ? String(row[sIdxNama] || "").trim() : "";
        if (npsn && unit) schoolMap[npsn] = unit;
      }
    }

    // Agregasi PTK aktif PAUD dari tbl_ptk: [L, P, Guru, Tendik]
    var c = ctx.colMap;
    var pData = ctx.sheet.getDataRange().getDisplayValues();
    var ptkMap = {};
    for (var i = 1; i < pData.length; i++) {
      var row = pData[i];
      var jenjang = c.jenjang > -1 ? String(row[c.jenjang] || "").trim() : "";
      var statusAktif = c.status_aktif > -1 ? String(row[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
      if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1 || statusAktif !== "AKTIF") continue;
      var npsn = c.npsn > -1 ? String(row[c.npsn] || "").trim() : "";
      var unit = c.unit > -1 ? String(row[c.unit] || "").trim() : "";
      if (!npsn) continue;
      if (!schoolMap[npsn] && unit) schoolMap[npsn] = unit;
      if (!ptkMap[npsn]) ptkMap[npsn] = [0, 0, 0, 0];

      var cnt = ptkMap[npsn];
      var lp = c.lp > -1 ? String(row[c.lp] || "").trim().toUpperCase() : "";
      var jab = c.jabatan > -1 ? String(row[c.jabatan] || "").trim().toUpperCase() : "";
      if (lp === "L" || lp.indexOf("LAKI") > -1) cnt[0]++;
      else if (lp === "P" || lp.indexOf("PEREMPUAN") > -1) cnt[1]++;

      if (jab.indexOf("GURU") > -1 || jab.indexOf("KEPALA") > -1 || jab.indexOf("PENDIDIK") > -1 || jab.indexOf("PENGASUH") > -1) {
        cnt[2]++;
      } else {
        cnt[3]++;
      }
    }

    var lapbulMap = {};
    if (sheetLapbul) {
      var lData = sheetLapbul.getDataRange().getDisplayValues();
      var lHead = lData[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var lIdxNpsn = lHead.indexOf("npsn");
      var lIdxBulan = lHead.indexOf("bulan");
      var lIdxTahun = lHead.indexOf("tahun");
      var getLIdx = function(names) {
        for (var k = 0; k < names.length; k++) {
          var idx = lHead.indexOf(names[k]);
          if (idx > -1) return idx;
        }
        return -1;
      };
      var lCols = [
        getLIdx(["ptk_l", "l", "laki_laki"]),
        getLIdx(["ptk_p", "p", "perempuan"]),
        getLIdx(["jml_guru", "guru", "pendidik"]),
        getLIdx(["jml_tendik", "tendik", "tenaga_kependidikan"])
      ];
      for (var i = 1; i < lData.length; i++) {
        var row = lData[i];
        var npsn = lIdxNpsn > -1 ? String(row[lIdxNpsn] || "").trim() : "";
        if (!npsn || !schoolMap[npsn]) continue;
        var counts = [];
        for (var j = 0; j < 4; j++) {
          counts.push(lCols[j] > -1 ? (parseInt(row[lCols[j]], 10) || 0) : 0);
        }
        lapbulMap[npsn] = {
          bulan: lIdxBulan > -1 ? (row[lIdxBulan] || "-") : "-",
          tahun: lIdxTahun > -1 ? (row[lIdxTahun] || "-") : "-",
          counts: counts
        };
      }
    }

    var result = [];
    Object.keys(schoolMap).sort(function(a, b) {
      return schoolMap[a].localeCompare(schoolMap[b]);
    }).forEach(function(npsn) {
      var p = ptkMap[npsn] || [0, 0, 0, 0];
      var l = lapbulMap[npsn] || { bulan: "-", tahun: "-", counts: [0, 0, 0, 0] };
      var rowOut = [npsn, schoolMap[npsn], l.bulan, l.tahun];
      for (var j = 0; j < 4; j++) {
        var pVal = p[j];
        var lVal = l.counts[j];
        rowOut.push(String(pVal), String(lVal), (pVal === lVal ? "Valid" : "Tidak Valid"));
      }
      result.push(rowOut);
    });
    return result;
  }

  var sheet = getSheet(KONFIG_PTK_PAUD.DB_KEY, "sinkron_gtk_paud"); if (!sheet) return []; var lastRow = sheet.getLastRow(); if (lastRow < 3) return []; return sheet.getRange(3, 1, lastRow - 2, 16).getDisplayValues();
}

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
      if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
        var ctx = getTblPtkSdnContext_();
        if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
        var c = ctx.colMap;
        var dataPTK = ctx.sheet.getDataRange().getValues();
        var ptkRowIdx = -1;
        for (var i = 1; i < dataPTK.length; i++) {
          var jenjang = c.jenjang > -1 ? String(dataPTK[i][c.jenjang] || "").trim() : "";
          if (!jenjang || jenjang.toUpperCase().indexOf("SD") > -1) continue;
          if (c.id > -1 && String(dataPTK[i][c.id]) === String(idPtk)) {
            ptkRowIdx = i + 1;
            break;
          }
        }
        if (ptkRowIdx === -1) return "Error: Data PTK tidak ditemukan di Master Data.";

        if (jenis === "Lokal" || jenis === "Dalam Kecamatan") {
          if (c.unit > -1) ctx.sheet.getRange(ptkRowIdx, c.unit + 1).setValue(tujuan);
          if (c.diedit > -1) ctx.sheet.getRange(ptkRowIdx, c.diedit + 1).setValue(timestamp);
          if (c.user_edit > -1) ctx.sheet.getRange(ptkRowIdx, c.user_edit + 1).setValue(userEksekutor || "");
        } else {
          if (c.status_aktif > -1) ctx.sheet.getRange(ptkRowIdx, c.status_aktif + 1).setValue("NON_AKTIF");
          if (c.alasan_hapus > -1) ctx.sheet.getRange(ptkRowIdx, c.alasan_hapus + 1).setValue("Mutasi: " + jenis);
          if (c.tgl_hapus > -1) ctx.sheet.getRange(ptkRowIdx, c.tgl_hapus + 1).setValue(timestamp);
          if (c.user_hapus > -1) ctx.sheet.getRange(ptkRowIdx, c.user_hapus + 1).setValue(userEksekutor || "");
        }
      } else {
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
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var ctx = getTblPtkSdnContext_();
    var sheetSource = ctx.sheet;
    var c = ctx.colMap;
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
    var targetId = String(idPtk || "").trim();
    for (var i = 1; i < dataPTK.length; i++) {
      var rId = String(dataPTK[i][c.id] || "").trim();
      var rOldId = c.old_id > -1 ? String(dataPTK[i][c.old_id] || "").trim() : "";
      if (rId === targetId || (rOldId && rOldId === targetId)) {
        ptkRow = dataPTK[i];
        break;
      }
    }
    
    if (!ptkRow) return "Error: Data PTK tidak ditemukan.";
    
    var namaPtk = ptkRow[c.nama_lengkap];
    var lembagaAsal = ptkRow[c.unit];
    
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
  } finally {
    lock.releaseLock();
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
    var ctx = getTblPtkSdnContext_();
    var sheetSource = ctx.sheet;
    var c = ctx.colMap;
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
    
    var idPtk = String(usulanRow[1] || "").trim();
    var jenis = usulanRow[3];
    var tujuan = usulanRow[5];
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    var statusParts = keputusan.split('|');
    var mainStatus = statusParts[0];
    var catatan = statusParts[1] || "";
    
    if (mainStatus === "Setuju" || mainStatus === "Disetujui") {
      // Cari data PTK
      var dataPTK = sheetSource.getDataRange().getValues();
      var ptkRowIdx = -1;
      
      for (var i = 1; i < dataPTK.length; i++) {
        var rId = String(dataPTK[i][c.id] || "").trim();
        var rOldId = c.old_id > -1 ? String(dataPTK[i][c.old_id] || "").trim() : "";
        if (rId === idPtk || (rOldId && rOldId === idPtk)) {
          ptkRowIdx = i + 1;
          break;
        }
      }
      
      if (ptkRowIdx === -1) return "Error: Data PTK tidak ditemukan di Master Data.";
      
      if (jenis === "Dalam Kecamatan" || jenis === "Lokal") {
        // Mutasi Lokal: Ubah Unit/Lembaga di Master Data
        sheetSource.getRange(ptkRowIdx, c.unit + 1).setValue(tujuan);
      } else {
        if (ctx.useCentral) {
          if (c.status_aktif > -1) sheetSource.getRange(ptkRowIdx, c.status_aktif + 1).setValue("NON_AKTIF");
          if (c.alasan_hapus > -1) sheetSource.getRange(ptkRowIdx, c.alasan_hapus + 1).setValue("Mutasi: " + jenis);
          if (c.tgl_hapus > -1) sheetSource.getRange(ptkRowIdx, c.tgl_hapus + 1).setValue(timestamp);
          if (c.user_hapus > -1) sheetSource.getRange(ptkRowIdx, c.user_hapus + 1).setValue(userEksekutor || "Admin");
        } else {
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

      invalidatePtkSdnDataCache_();
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
    var sheetUsulan = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");

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

    var fileUrl = data[rowIdx-1][7]; // Index 7 adalah File SK
    
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
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
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
    var sheet = getSheet(KONFIG_PTK.DB_KEY, "usulan_mutasi_sdn");
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
    var sheetUsulan = getSheet("PTK_DB", "usul_mutasi_sds");
    
    // Buat sheet usulan jika belum ada
    if (!sheetUsulan) {
      var ss = getDB("PTK_DB");
      sheetUsulan = ss.insertSheet("usul_mutasi_sds");
      var headers = ["ID Usulan", "ID PTK", "Nama PTK", "Jenis Mutasi", "Lembaga Asal", "Lembaga Tujuan", "TMT/Tanggal", "File SK", "Status", "Tanggal Usulan", "User Pengusul", "Tanggal Eksekusi", "User Eksekutor", "Catatan"];
      sheetUsulan.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    var namaPtk = "";
    var lembagaAsal = "";
    var foundPtk = false;

    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
      var c = ctx.colMap;
      var dataPTK = ctx.sheet.getDataRange().getValues();
      for (var i = 1; i < dataPTK.length; i++) {
        var jenjang = c.jenjang > -1 ? String(dataPTK[i][c.jenjang] || "").trim() : "";
        if (jenjang !== "SD Swasta") continue;
        if (c.id > -1 && String(dataPTK[i][c.id]) === String(idPtk)) {
          namaPtk = c.nama_lengkap > -1 ? (dataPTK[i][c.nama_lengkap] || "") : "";
          lembagaAsal = c.unit > -1 ? (dataPTK[i][c.unit] || "") : "";
          foundPtk = true;
          break;
        }
      }
    } else {
      var sheetSource = getSheet("PTK_DB", "Master Data GTK SDS");
      var dataPTK = sheetSource.getDataRange().getValues();
      for (var i = 1; i < dataPTK.length; i++) {
        if (String(dataPTK[i][0]) === String(idPtk)) {
          namaPtk = dataPTK[i][6];
          lembagaAsal = dataPTK[i][2];
          foundPtk = true;
          break;
        }
      }
    }
    
    if (!foundPtk) return "Error: Data PTK tidak ditemukan.";
    
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
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
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
  } finally {
    lock.releaseLock();
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
      if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
        var ctx = getTblPtkSdnContext_();
        if (!ctx) return "Error: Tabel tbl_ptk tidak ditemukan.";
        var c = ctx.colMap;
        var dataPTK = ctx.sheet.getDataRange().getValues();
        var ptkRowIdx = -1;
        for (var i = 1; i < dataPTK.length; i++) {
          var jenjang = c.jenjang > -1 ? String(dataPTK[i][c.jenjang] || "").trim() : "";
          if (jenjang !== "SD Swasta") continue;
          if (c.id > -1 && String(dataPTK[i][c.id]) === String(idPtk)) {
            ptkRowIdx = i + 1;
            break;
          }
        }
        if (ptkRowIdx === -1) return "Error: Data PTK tidak ditemukan di Master Data.";

        if (jenis === "Dalam Kecamatan") {
          if (c.unit > -1) ctx.sheet.getRange(ptkRowIdx, c.unit + 1).setValue(tujuan);
          if (c.diedit > -1) ctx.sheet.getRange(ptkRowIdx, c.diedit + 1).setValue(timestamp);
          if (c.user_edit > -1) ctx.sheet.getRange(ptkRowIdx, c.user_edit + 1).setValue(userEksekutor || "");
        } else {
          if (c.status_aktif > -1) ctx.sheet.getRange(ptkRowIdx, c.status_aktif + 1).setValue("NON_AKTIF");
          if (c.alasan_hapus > -1) ctx.sheet.getRange(ptkRowIdx, c.alasan_hapus + 1).setValue("Mutasi: " + jenis);
          if (c.tgl_hapus > -1) ctx.sheet.getRange(ptkRowIdx, c.tgl_hapus + 1).setValue(timestamp);
          if (c.user_hapus > -1) ctx.sheet.getRange(ptkRowIdx, c.user_hapus + 1).setValue(userEksekutor || "");
        }
      } else {
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
        "Tanggal Eksekusi", "User Eksekutor", "Catatan", "Read Status"
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
      "-", // Catatan
      ""   // Read Status
    ];
    
    sheet.appendRow(rowData);
    return "Sukses";
  } catch (e) {
    return "Error Server: " + e.message;
  }
}

/* ======================================================================
   LAPBUL PTK HELPERS
   ====================================================================== */

function getPTKSekolahByNpsnLapbul(npsn, jenjang) {
  try {
    if (!npsn || !jenjang) return { error: 'NPSN atau jenjang kosong.' };
    var searchNpsn = String(npsn).trim();
    var tz = Session.getScriptTimeZone();

    // ── Helper format tanggal ──
    var fmtTgl = function(v) {
      if (!v) return '-';
      if (v instanceof Date) return Utilities.formatDate(v, tz, 'dd-MM-yyyy');
      return String(v);
    };

    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return [];
      var c = ctx.colMap;
      var idxNiy = ctx.headers.indexOf("niy");
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var extraIdx = {};
      if (jenjang === 'PAUD' && typeof PTK_PAUD_EXTRA_COLS_ !== "undefined") {
        for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
          extraIdx[PTK_PAUD_EXTRA_COLS_[k]] = ctx.headers.indexOf(PTK_PAUD_EXTRA_COLS_[k]);
        }
      }
      var data = ctx.sheet.getDataRange().getDisplayValues();
      var resCentral = [];
      for (var i = 1; i < data.length; i++) {
        var r = data[i];
        var rowId = c.id > -1 ? r[c.id] : "";
        if (!rowId) continue;
        var statusAktif = c.status_aktif > -1 ? String(r[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (statusAktif === "NON_AKTIF") continue;
        var rowJenjang = c.jenjang > -1 ? String(r[c.jenjang] || "").trim() : "";
        var isPaudRow = rowJenjang.toUpperCase().includes("PAUD") || rowJenjang.toUpperCase().includes("TK") || rowJenjang.toUpperCase().includes("KB") || rowJenjang.toUpperCase().includes("TPA") || rowJenjang.toUpperCase().includes("SPS");
        if (jenjang === 'PAUD') {
          if (!isPaudRow) continue;
        } else {
          if (rowJenjang !== "SD Negeri" && rowJenjang !== "SD Swasta") continue;
        }
        var rowNpsn = c.npsn > -1 ? String(r[c.npsn] || "").replace(/'/g, "").trim() : "";
        if (rowNpsn !== searchNpsn) continue;

        var isSdn = (rowJenjang === "SD Negeri");
        var nipNiy = isSdn ? (c.nip > -1 ? String(r[c.nip] || "") : "") : (idxNiy > -1 ? String(r[idxNiy] || "") : (c.nip > -1 ? String(r[c.nip] || "") : ""));
        var jabTugas = isSdn ? (c.tugas > -1 ? String(r[c.tugas] || "") : "") : (c.jabatan > -1 ? String(r[c.jabatan] || "") : "");
        var golAsn = isSdn ? (c.pangkat > -1 ? String(r[c.pangkat] || "") : "") : (idxInpassing > -1 ? String(r[idxInpassing] || "") : (c.pangkat > -1 ? String(r[c.pangkat] || "") : ""));
        var mengajarVal = c.mengajar_kelas > -1 ? String(r[c.mengajar_kelas] || "").trim() : "";

        resCentral.push({
          id_ptk       : rowId,
          npsn_asal    : rowNpsn,
          unit         : c.unit > -1 ? String(r[c.unit] || "") : "",
          nama         : c.nama_lengkap > -1 ? String(r[c.nama_lengkap] || "") : "",
          nip_niy      : nipNiy.replace(/'/g, ""),
          tempat_lahir : c.tmp_lahir > -1 ? String(r[c.tmp_lahir] || "-") : "-",
          tgl_lahir    : fmtTgl(c.tgl_lahir > -1 ? r[c.tgl_lahir] : ""),
          jk           : c.lp > -1 ? String(r[c.lp] || "") : "",
          agama        : c.agama > -1 ? String(r[c.agama] || "-") : "-",
          pendidikan   : c.pendidikan > -1 ? String(r[c.pendidikan] || "") : "",
          status       : c.status_peg > -1 ? String(r[c.status_peg] || "") : "",
          jabatan      : jabTugas,
          tmt          : fmtTgl(c.tmt_jabatan > -1 ? r[c.tmt_jabatan] : ""),
          gol_asn      : golAsn,
          nuptk        : c.nuptk > -1 ? String(r[c.nuptk] || "").replace(/'/g, "") : "",
          serdik       : c.serdik > -1 ? String(r[c.serdik] || "") : "",
          dapodik      : c.dapodik > -1 ? String(r[c.dapodik] || "") : "",
          sumber       : isSdn ? 'SDN' : 'SDS',
          is_induk     : true,
          jabatan_lapbul : '',
          mengajar     : mengajarVal,
          masa_kerja_tahun: extraIdx.masa_kerja_tahun > -1 ? String(r[extraIdx.masa_kerja_tahun] || "") : "",
          masa_kerja_bulan: extraIdx.masa_kerja_bulan > -1 ? String(r[extraIdx.masa_kerja_bulan] || "") : "",
          tahun_diklat_dasar: extraIdx.tahun_diklat_dasar > -1 ? String(r[extraIdx.tahun_diklat_dasar] || "") : "",
          tahun_diklat_lanjut: extraIdx.tahun_diklat_lanjut > -1 ? String(r[extraIdx.tahun_diklat_lanjut] || "") : "",
          tahun_diklat_mahir: extraIdx.tahun_diklat_mahir > -1 ? String(r[extraIdx.tahun_diklat_mahir] || "") : "",
          diklat_kepala_sekolah: extraIdx.diklat_kepala_sekolah > -1 ? String(r[extraIdx.diklat_kepala_sekolah] || "") : "",
          tahun_diklat_kepala_sekolah: extraIdx.tahun_diklat_kepala_sekolah > -1 ? String(r[extraIdx.tahun_diklat_kepala_sekolah] || "") : "",
          bantuan_tunjangan_profesi: extraIdx.bantuan_tunjangan_profesi > -1 ? String(r[extraIdx.bantuan_tunjangan_profesi] || "") : "",
          bantuan_bosda: extraIdx.bantuan_bosda > -1 ? String(r[extraIdx.bantuan_bosda] || "") : "",
          bantuan_insentif: extraIdx.bantuan_insentif > -1 ? String(r[extraIdx.bantuan_insentif] || "") : "",
          bantuan_lainnya: extraIdx.bantuan_lainnya > -1 ? String(r[extraIdx.bantuan_lainnya] || "") : "",
          alpa: '', sakit: '', izin: '', cuti: '', tugas_luar: '', tugas_belajar: '', lainnya: ''
        });
      }
      return resCentral;
    }

    // ── Helper map baris SDN → objek ──
    // Pemetaan kolom berdasarkan buildPtkListSdn_:
    // A(0)=ID, B(1)=NPSN, C(2)=Unit, D(3)=gelar_depan, E(4)=nama_no_gelar, F(5)=gelar_belakang
    // G(6)=nama_lengkap, H(7)=nip, I(8)=tmp_lahir, J(9)=tgl_lahir, K(10)=nik
    // L(11)=lp, M(12)=agama, N(13)=pendidikan, O(14)=jurusan, P(15)=thn_lulus
    // Q(16)=alamat_ktp, R(17)=alamat_domisili, S(18)=hp
    // T(19)=status_peg, U(20)=jabatan, V(21)=tmt_jabatan, W(22)=pangkat/gol, X(23)=tmt_gol
    // Y(24)=mkg, Z(25)=tugas, AA(26)=nuptk, AB(27)=serdik, AC(28)=dapodik
    var mapSdn = function(r, sumber) {
      return {
        id_ptk       : r[0],
        npsn_asal    : String(r[1]),
        unit         : r[2],
        nama         : String(r[6] || ''),
        nip_niy      : String(r[7] || ''),
        tempat_lahir : String(r[8] || '-'),
        tgl_lahir    : fmtTgl(r[9]),
        jk           : String(r[11] || ''),
        agama        : String(r[12] || '-'),
        pendidikan   : String(r[13] || ''),   // ← kolom N
        status       : String(r[19] || ''),   // ← kolom T (status_peg)
        jabatan      : String(r[25] || ''),   // ← kolom Z (tugas)
        tmt          : fmtTgl(r[21]),         // ← kolom V (tmt_jabatan)
        gol_asn      : String(r[22] || ''),   // ← kolom W (pangkat/gol)
        nuptk        : String(r[26] || ''),   // ← kolom AA
        serdik       : String(r[27] || ''),   // ← kolom AB
        dapodik      : String(r[28] || ''),   // ← kolom AC
        sumber       : sumber,
        is_induk     : true,
        jabatan_lapbul : '', mengajar: '', alpa: '', sakit: '', izin: '',
        cuti: '', tugas_luar: '', tugas_belajar: '', lainnya: ''
      };
    };

    // ── Helper map baris SDS → objek ──
    // Pemetaan kolom berdasarkan getDataPTKSDS:
    // A(0)=ID, B(1)=NPSN, C(2)=Unit, D(3)=gelar_depan, E(4)=nama_no_gelar, F(5)=gelar_belakang
    // G(6)=nama_lengkap, H(7)=niy, I(8)=tmp_lahir, J(9)=tgl_lahir, K(10)=nik
    // L(11)=lp, M(12)=agama, N(13)=pendidikan, O(14)=jurusan, P(15)=thn_lulus
    // Q(16)=alamat_ktp, R(17)=alamat_domisili, S(18)=hp
    // T(19)=status_peg, U(20)=jabatan, V(21)=tmt_jabatan, W(22)=inpassing, X(23)=tmt_inpassing
    // Y(24)=nuptk, Z(25)=serdik, AA(26)=dapodik
    var mapSds = function(r, sumber) {
      return {
        id_ptk       : r[0],
        npsn_asal    : String(r[1]),
        unit         : r[2],
        nama         : String(r[6] || ''),
        nip_niy      : String(r[7] || ''),
        tempat_lahir : String(r[8] || '-'),
        tgl_lahir    : String(r[9] || '-'),  // SDS pakai displayValues, sudah string
        jk           : String(r[11] || ''),
        agama        : String(r[12] || '-'),
        pendidikan   : String(r[13] || ''),   // ← kolom N (sama)
        status       : String(r[19] || ''),   // ← kolom T (status_peg)
        jabatan      : String(r[20] || ''),   // ← kolom U
        tmt          : String(r[21] || '-'),  // ← kolom V (tmt_jabatan)
        gol_asn      : String(r[22] || ''),   // ← kolom W (inpassing, bukan gol ASN)
        nuptk        : String(r[24] || ''),   // ← kolom Y (berbeda dari SDN!)
        serdik       : String(r[25] || ''),   // ← kolom Z
        dapodik      : String(r[26] || ''),   // ← kolom AA
        sumber       : sumber,
        is_induk     : true,
        jabatan_lapbul : '', mengajar: '', alpa: '', sakit: '', izin: '',
        cuti: '', tugas_luar: '', tugas_belajar: '', lainnya: ''
      };
    };

    var result = [];

    // ── Cari di SDN ──
    try {
      var sheetSdn = getSheet(KONFIG_PTK.DB_KEY, 'Master Data GTK');
      var lastRowSdn = sheetSdn.getLastRow();
      if (lastRowSdn >= 2) {
        var valSdn = sheetSdn.getRange(2, 1, lastRowSdn - 1, 30).getValues();
        var filteredSdn = valSdn.filter(function(r) {
          return r[0] && String(r[1]).trim() === searchNpsn;
        });
        result = result.concat(filteredSdn.map(function(r) { return mapSdn(r, 'SDN'); }));
      }
    } catch(eSdn) {
      Logger.log('getPTKSekolahByNpsnLapbul SDN error: ' + eSdn.message);
    }

    // ── Cari di SDS ──
    try {
      var sheetSds = getSheet(KONFIG_PTK.DB_KEY, 'Master Data GTK SDS');
      var lastRowSds = sheetSds.getLastRow();
      if (lastRowSds >= 2) {
        var valSds = sheetSds.getRange(2, 1, lastRowSds - 1, 28).getDisplayValues();
        var filteredSds = valSds.filter(function(r) {
          return r[0] && String(r[1]).trim() === searchNpsn;
        });
        result = result.concat(filteredSds.map(function(r) { return mapSds(r, 'SDS'); }));
      }
    } catch(eSds) {
      Logger.log('getPTKSekolahByNpsnLapbul SDS error: ' + eSds.message);
    }

    return result;
  } catch (e) {
    Logger.log('getPTKSekolahByNpsnLapbul ERROR: ' + e.message);
    return { error: e.message };
  }
}

function searchPTKGlobalLapbul(keyword, jenjang) {
  try {
    if (!keyword || keyword.length < 3) return [];
    var key = keyword.toLowerCase().trim();
    var tz = Session.getScriptTimeZone();
    var results = [];

    // ── Helper format tanggal ──
    var fmtTgl = function(v) {
      if (!v) return '-';
      if (v instanceof Date) return Utilities.formatDate(v, tz, 'dd-MM-yyyy');
      return String(v);
    };

    if (typeof USE_CENTRAL_PTK_DB !== "undefined" && USE_CENTRAL_PTK_DB) {
      var ctx = getTblPtkSdnContext_();
      if (!ctx) return [];
      var c = ctx.colMap;
      var idxNiy = ctx.headers.indexOf("niy");
      var idxInpassing = ctx.headers.indexOf("inpassing");
      var extraIdx = {};
      if (jenjang === 'PAUD' && typeof PTK_PAUD_EXTRA_COLS_ !== "undefined") {
        for (var k = 0; k < PTK_PAUD_EXTRA_COLS_.length; k++) {
          extraIdx[PTK_PAUD_EXTRA_COLS_[k]] = ctx.headers.indexOf(PTK_PAUD_EXTRA_COLS_[k]);
        }
      }
      var data = ctx.sheet.getDataRange().getDisplayValues();
      for (var i = 1; i < data.length; i++) {
        if (results.length >= 50) break;
        var r = data[i];
        var rowId = c.id > -1 ? r[c.id] : "";
        if (!rowId) continue;
        var statusAktif = c.status_aktif > -1 ? String(r[c.status_aktif] || "AKTIF").trim().toUpperCase() : "AKTIF";
        if (statusAktif === "NON_AKTIF") continue;
        var rowJenjang = c.jenjang > -1 ? String(r[c.jenjang] || "").trim() : "";
        if (rowJenjang !== "SD Negeri" && rowJenjang !== "SD Swasta") continue;

        var isSdn = (rowJenjang === "SD Negeri");
        var nama = c.nama_lengkap > -1 ? String(r[c.nama_lengkap] || "") : "";
        var nipNiy = isSdn ? (c.nip > -1 ? String(r[c.nip] || "") : "") : (idxNiy > -1 ? String(r[idxNiy] || "") : "");
        var nuptk = c.nuptk > -1 ? String(r[c.nuptk] || "") : "";
        if (nama.toLowerCase().indexOf(key) !== -1 || nipNiy.toLowerCase().indexOf(key) !== -1 || nuptk.toLowerCase().indexOf(key) !== -1) {
          var jabTugas = isSdn ? (c.tugas > -1 ? String(r[c.tugas] || "") : "") : (c.jabatan > -1 ? String(r[c.jabatan] || "") : "");
          var golAsn = isSdn ? (c.pangkat > -1 ? String(r[c.pangkat] || "") : "") : (idxInpassing > -1 ? String(r[idxInpassing] || "") : "");
          var mengajarVal = c.mengajar_kelas > -1 ? String(r[c.mengajar_kelas] || "").trim() : "";
          results.push({
            id_ptk       : rowId,
            npsn_asal    : c.npsn > -1 ? String(r[c.npsn] || "").replace(/'/g, "").trim() : "",
            unit         : c.unit > -1 ? String(r[c.unit] || "") : "",
            nama         : nama,
            nip_niy      : nipNiy.replace(/'/g, ""),
            tempat_lahir : c.tmp_lahir > -1 ? String(r[c.tmp_lahir] || "-") : "-",
            tgl_lahir    : fmtTgl(c.tgl_lahir > -1 ? r[c.tgl_lahir] : ""),
            jk           : c.lp > -1 ? String(r[c.lp] || "") : "",
            agama        : c.agama > -1 ? String(r[c.agama] || "-") : "-",
            pendidikan   : c.pendidikan > -1 ? String(r[c.pendidikan] || "") : "",
            status       : c.status_peg > -1 ? String(r[c.status_peg] || "") : "",
            jabatan      : jabTugas,
            tmt          : fmtTgl(c.tmt_jabatan > -1 ? r[c.tmt_jabatan] : ""),
            gol_asn      : golAsn,
            nuptk        : nuptk.replace(/'/g, ""),
            serdik       : c.serdik > -1 ? String(r[c.serdik] || "") : "",
            dapodik      : c.dapodik > -1 ? String(r[c.dapodik] || "") : "",
            sumber       : isSdn ? 'SDN' : 'SDS',
            is_induk     : false,
            jabatan_lapbul : '',
            mengajar     : mengajarVal,
            alpa: '', sakit: '', izin: '', cuti: '', tugas_luar: '', tugas_belajar: '', lainnya: ''
          });
        }
      }
      return results;
    }

    // ── Cari di SDN ──
    // Kolom: G(6)=nama, H(7)=nip, AA(26)=nuptk, N(13)=pendidikan, T(19)=status, U(20)=jabatan
    try {
      var sheetSdn = getSheet(KONFIG_PTK.DB_KEY, 'Master Data GTK');
      var lastRowSdn = sheetSdn.getLastRow();
      if (lastRowSdn >= 2) {
        var valSdn = sheetSdn.getRange(2, 1, lastRowSdn - 1, 30).getValues();
        for (var i = 0; i < valSdn.length; i++) {
          if (results.length >= 50) break;
          var r = valSdn[i];
          if (!r[0]) continue;
          var nama = String(r[6]).toLowerCase();
          var nip  = String(r[7]).toLowerCase();
          var nuptk = String(r[26]).toLowerCase();
          if (nama.indexOf(key) !== -1 || nip.indexOf(key) !== -1 || nuptk.indexOf(key) !== -1) {
            results.push({
              id_ptk       : r[0],
              npsn_asal    : String(r[1]),
              unit         : String(r[2] || ''),
              nama         : String(r[6] || ''),
              nip_niy      : String(r[7] || ''),
              tempat_lahir : String(r[8] || '-'),
              tgl_lahir    : fmtTgl(r[9]),
              jk           : String(r[11] || ''),
              agama        : String(r[12] || '-'),
              pendidikan   : String(r[13] || ''),
              status       : String(r[19] || ''),
              jabatan      : String(r[25] || ''),
              tmt          : fmtTgl(r[21]),
              gol_asn      : String(r[22] || ''),
              nuptk        : String(r[26] || ''),
              serdik       : String(r[27] || ''),
              dapodik      : String(r[28] || ''),
              sumber       : 'SDN',
              is_induk     : false,
              jabatan_lapbul : '', mengajar: '', alpa: '', sakit: '', izin: '',
              cuti: '', tugas_luar: '', tugas_belajar: '', lainnya: ''
            });
          }
        }
      }
    } catch(eSdn) {
      Logger.log('searchPTKGlobalLapbul SDN error: ' + eSdn.message);
    }

    // ── Cari di SDS ──
    // Kolom: G(6)=nama, H(7)=niy, Y(24)=nuptk, N(13)=pendidikan, T(19)=status
    try {
      var sheetSds = getSheet(KONFIG_PTK.DB_KEY, 'Master Data GTK SDS');
      var lastRowSds = sheetSds.getLastRow();
      if (lastRowSds >= 2) {
        var valSds = sheetSds.getRange(2, 1, lastRowSds - 1, 28).getDisplayValues();
        for (var j = 0; j < valSds.length; j++) {
          if (results.length >= 50) break;
          var r = valSds[j];
          if (!r[0]) continue;
          var nama = String(r[6]).toLowerCase();
          var niy  = String(r[7]).toLowerCase();
          var nuptk = String(r[24]).toLowerCase();
          if (nama.indexOf(key) !== -1 || niy.indexOf(key) !== -1 || nuptk.indexOf(key) !== -1) {
            results.push({
              id_ptk       : r[0],
              npsn_asal    : String(r[1]),
              unit         : String(r[2] || ''),
              nama         : String(r[6] || ''),
              nip_niy      : String(r[7] || ''),
              tempat_lahir : String(r[8] || '-'),
              tgl_lahir    : String(r[9] || '-'),
              jk           : String(r[11] || ''),
              agama        : String(r[12] || '-'),
              pendidikan   : String(r[13] || ''),
              status       : String(r[19] || ''),
              jabatan      : String(r[20] || ''),
              tmt          : String(r[21] || '-'),
              gol_asn      : String(r[22] || ''),
              nuptk        : String(r[24] || ''),
              serdik       : String(r[25] || ''),
              dapodik      : String(r[26] || ''),
              sumber       : 'SDS',
              is_induk     : false,
              jabatan_lapbul : '', mengajar: '', alpa: '', sakit: '', izin: '',
              cuti: '', tugas_luar: '', tugas_belajar: '', lainnya: ''
            });
          }
        }
      }
    } catch(eSds) {
      Logger.log('searchPTKGlobalLapbul SDS error: ' + eSds.message);
    }

    return results;
  } catch (e) {
    Logger.log('searchPTKGlobalLapbul ERROR: ' + e.message);
    return { error: e.message };
  }
}

// ======================================================================
// KOREKSI KTP APPROVAL ENGINE
// ======================================================================

function getUsulanKoreksiKtpList() {
  try {
    var ss = getDB(KONFIG_PTK.DB_KEY);
    var sheet = ss.getSheetByName("usulan_koreksi_ktp_sdn");
    if (!sheet) return JSON.stringify([]);
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idxIdAjuan = headers.indexOf("ID Ajuan");
    var idxIdPtk = headers.indexOf("ID PTK");
    var idxNamaLama = headers.indexOf("Nama PTK (Lama)");
    var idxNamaBaru = headers.indexOf("Nama PTK (Baru)");
    var idxNikLama = headers.indexOf("NIK (Lama)");
    var idxNikBaru = headers.indexOf("NIK (Baru)");
    var idxTtlLama = headers.indexOf("TTL (Lama)");
    var idxTtlBaru = headers.indexOf("TTL (Baru)");
    var idxFileKtp = headers.indexOf("File KTP");
    var idxStatus = headers.indexOf("Status");
    var idxTglUsulan = headers.indexOf("Tanggal Usulan");
    var idxUserPengusul = headers.indexOf("User Pengusul");
    var idxTglEksekusi = headers.indexOf("Tanggal Eksekusi");
    var idxUserEksekutor = headers.indexOf("User Eksekutor");
    var idxCatatan = headers.indexOf("Catatan");
    var idxReadStatus = headers.indexOf("Read Status");
    
    // Ambil mapping unit sekolah dari Master Data GTK / tbl_ptk untuk memperkaya data ajuan
    var schoolMap = {};
    try {
      var ctxKtp = getTblPtkSdnContext_();
      var sheetMaster = ctxKtp.sheet;
      var cKtp = ctxKtp.colMap;
      if (sheetMaster && sheetMaster.getLastRow() > 1) {
        var masterVals = sheetMaster.getDataRange().getValues();
        for (var m = 1; m < masterVals.length; m++) {
          var uVal = String(masterVals[m][cKtp.unit] || "").trim();
          var rId = String(masterVals[m][cKtp.id] || "").trim();
          var rOldId = cKtp.old_id > -1 ? String(masterVals[m][cKtp.old_id] || "").trim() : "";
          if (rId) schoolMap[rId] = uVal;
          if (rOldId) schoolMap[rOldId] = uVal;
        }
      }
    } catch(eMap) {
      Logger.log("getUsulanKoreksiKtpList: School map error: " + eMap.message);
    }

    var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
    var list = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if (idxIdAjuan !== -1 && !row[idxIdAjuan]) continue;
      
      var idPtkVal = idxIdPtk !== -1 ? String(row[idxIdPtk]).trim() : "";
      list.push({
        id_ajuan: idxIdAjuan !== -1 ? row[idxIdAjuan] : "",
        id_ptk: idPtkVal,
        sekolah: schoolMap[idPtkVal] || "-",
        nama_lama: idxNamaLama !== -1 ? row[idxNamaLama] : "",
        nama_baru: idxNamaBaru !== -1 ? row[idxNamaBaru] : "",
        nik_lama: idxNikLama !== -1 ? row[idxNikLama] : "",
        nik_baru: idxNikBaru !== -1 ? row[idxNikBaru] : "",
        ttl_lama: idxTtlLama !== -1 ? row[idxTtlLama] : "",
        ttl_baru: idxTtlBaru !== -1 ? row[idxTtlBaru] : "",
        file_ktp: idxFileKtp !== -1 ? row[idxFileKtp] : "",
        status: idxStatus !== -1 ? row[idxStatus] : "Pending",
        tgl_usulan: idxTglUsulan !== -1 ? row[idxTglUsulan] : "",
        user_pengusul: idxUserPengusul !== -1 ? row[idxUserPengusul] : "",
        tgl_eksekusi: idxTglEksekusi !== -1 ? row[idxTglEksekusi] : "",
        user_eksekutor: idxUserEksekutor !== -1 ? row[idxUserEksekutor] : "",
        catatan: idxCatatan !== -1 ? row[idxCatatan] : "",
        read_status: idxReadStatus !== -1 ? (row[idxReadStatus] || "") : ""
      });
    }
    return JSON.stringify(list);
  } catch (e) {
    Logger.log("Error getUsulanKoreksiKtpList: " + e.message);
    return JSON.stringify({ error: e.message });
  }
}

function prosesUsulanKoreksiKtp(idAjuan, status, catatan, userExecutor) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    Logger.log("prosesUsulanKoreksiKtp: Gagal mendapatkan lock");
    return "Error: Sistem sedang sibuk. Coba lagi dalam beberapa saat.";
  }
  
  try {
    Logger.log("prosesUsulanKoreksiKtp: Memulai idAjuan=" + idAjuan + ", status=" + status + ", executor=" + userExecutor);
    var ss = getDB(KONFIG_PTK.DB_KEY);
    var sheetUsulan = ss.getSheetByName("usulan_koreksi_ktp_sdn");
    if (!sheetUsulan) {
      Logger.log("prosesUsulanKoreksiKtp: Sheet usulan_koreksi_ktp_sdn tidak ditemukan");
      return "Error: Sheet usulan tidak ditemukan.";
    }
    
    var usulanData = sheetUsulan.getDataRange().getValues();
    var headers = usulanData[0];
    
    var colIdAjuan = headers.indexOf("ID Ajuan") + 1;
    var colIdPtk = headers.indexOf("ID PTK") + 1;
    var colNamaBaru = headers.indexOf("Nama PTK (Baru)") + 1;
    var colNikBaru = headers.indexOf("NIK (Baru)") + 1;
    var colTtlBaru = headers.indexOf("TTL (Baru)") + 1;
    var colStatus = headers.indexOf("Status") + 1;
    var colTglEksekusi = headers.indexOf("Tanggal Eksekusi") + 1;
    var colUserEksekutor = headers.indexOf("User Eksekutor") + 1;
    var colCatatan = headers.indexOf("Catatan") + 1;
    
    var usulanRowIndex = -1;
    for (var i = 1; i < usulanData.length; i++) {
      if (colIdAjuan > 0 && String(usulanData[i][colIdAjuan - 1]).trim() === String(idAjuan).trim()) {
        usulanRowIndex = i + 1;
        break;
      }
    }
    
    Logger.log("prosesUsulanKoreksiKtp: Pencarian row usulan -> usulanRowIndex=" + usulanRowIndex);
    if (usulanRowIndex === -1) {
      return "Error: Data usulan dengan ID " + idAjuan + " tidak ditemukan.";
    }
    
    var idPtk = colIdPtk > 0 ? String(usulanData[usulanRowIndex - 1][colIdPtk - 1]).trim() : "";
    var namaBaru = colNamaBaru > 0 ? String(usulanData[usulanRowIndex - 1][colNamaBaru - 1]).trim() : "";
    var nikBaru = colNikBaru > 0 ? String(usulanData[usulanRowIndex - 1][colNikBaru - 1]).trim() : "";
    var ttlBaru = colTtlBaru > 0 ? String(usulanData[usulanRowIndex - 1][colTtlBaru - 1]).trim() : "";
    
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    
    // Update Usulan Status
    if (colStatus > 0) sheetUsulan.getRange(usulanRowIndex, colStatus).setValue(status);
    if (colTglEksekusi > 0) sheetUsulan.getRange(usulanRowIndex, colTglEksekusi).setValue(timestamp);
    if (colUserEksekutor > 0) sheetUsulan.getRange(usulanRowIndex, colUserEksekutor).setValue(userExecutor || "Admin");
    if (colCatatan > 0) sheetUsulan.getRange(usulanRowIndex, colCatatan).setValue(catatan || "-");
    Logger.log("prosesUsulanKoreksiKtp: Berhasil update status usulan ke " + status);
    
    // Jika disetujui, update ke Master Data GTK / tbl_ptk
    if (status === "Disetujui") {
      var ctxMaster = getTblPtkSdnContext_();
      var sheetMaster = ctxMaster.sheet;
      var cM = ctxMaster.colMap;
      if (!sheetMaster) {
        Logger.log("prosesUsulanKoreksiKtp: Sheet master GTK tidak ditemukan");
        return "Error: Sheet master PTK tidak ditemukan.";
      }
      
      var masterData = sheetMaster.getDataRange().getValues();
      var masterRowIndex = -1;
      for (var j = 1; j < masterData.length; j++) {
        var rId = String(masterData[j][cM.id] || "").trim();
        var rOldId = cM.old_id > -1 ? String(masterData[j][cM.old_id] || "").trim() : "";
        if (rId === idPtk || (rOldId && rOldId === idPtk)) {
          masterRowIndex = j + 1;
          break;
        }
      }
      
      Logger.log("prosesUsulanKoreksiKtp: Pencarian row master -> masterRowIndex=" + masterRowIndex + " (idPtk=" + idPtk + ")");
      if (masterRowIndex === -1) {
        Logger.log("prosesUsulanKoreksiKtp: ID PTK tidak ditemukan di master");
        return "Error: ID PTK " + idPtk + " tidak ditemukan di Master Data.";
      }
      
      // Update fields
      if (namaBaru !== "-" && namaBaru !== "" && cM.nama_no_gelar > -1) {
        sheetMaster.getRange(masterRowIndex, cM.nama_no_gelar + 1).setValue(namaBaru);
      }
      if (nikBaru !== "-" && nikBaru !== "" && cM.nik > -1) {
        sheetMaster.getRange(masterRowIndex, cM.nik + 1).setValue("'" + nikBaru);
      }
      if (ttlBaru !== "-" && ttlBaru !== "") {
        var parts = ttlBaru.split(",");
        if (parts.length >= 2) {
          var tmpLahir = parts[0].trim();
          var tglLahirStr = parts.slice(1).join(",").trim();
          if (cM.tmp_lahir > -1) sheetMaster.getRange(masterRowIndex, cM.tmp_lahir + 1).setValue(tmpLahir);
          if (cM.tgl_lahir > -1) sheetMaster.getRange(masterRowIndex, cM.tgl_lahir + 1).setValue(convertStringToDate_(tglLahirStr));
        }
      }
      
      // Rebuild nama lengkap beserta gelar (Nama Full)
      var gelarDepan = cM.gelar_depan > -1 ? String(sheetMaster.getRange(masterRowIndex, cM.gelar_depan + 1).getValue() || "").trim() : "";
      var namaLengkap = cM.nama_no_gelar > -1 ? String(sheetMaster.getRange(masterRowIndex, cM.nama_no_gelar + 1).getValue() || "").trim() : "";
      var gelarBelakang = cM.gelar_belakang > -1 ? String(sheetMaster.getRange(masterRowIndex, cM.gelar_belakang + 1).getValue() || "").trim() : "";
      var namaFull = (gelarDepan ? gelarDepan + " " : "") + namaLengkap + (gelarBelakang ? ", " + gelarBelakang : "");
      if (cM.nama_lengkap > -1) sheetMaster.getRange(masterRowIndex, cM.nama_lengkap + 1).setValue(namaFull);
      Logger.log("prosesUsulanKoreksiKtp: Berhasil update master PTK");
    }
    
    SpreadsheetApp.flush();
    invalidatePtkSdnDataCache_();
    Logger.log("prosesUsulanKoreksiKtp: Selesai proses, status sukses");
    return "Sukses";
  } catch (e) {
    Logger.log("Error prosesUsulanKoreksiKtp: " + e.message);
    return "Error Server: " + e.message;
  } finally {
    lock.releaseLock();
  }
}

function getNotifikasiKoreksiKtp(role, unit) {
  try {
    var ss = getDB(KONFIG_PTK.DB_KEY);
    var sheet = ss.getSheetByName("usulan_koreksi_ktp_sdn");
    if (!sheet) return { count: 0, recent: [] };
    
    var data = sheet.getDataRange().getValues();
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    
    // Hanya admin yang bisa memproses koreksi KTP
    if (!isAdmin) return { count: 0, recent: [] };
    
    var notifList = [];
    var unreadCount = 0;
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var status = String(row[9]).trim(); // Status (Index 9)
      var isPending = (status === "Pending" || status === "");
      
      if (isPending) {
        var readStatus = String(row[15] || "").trim(); // Read Status (Index 15)
        var isRead = (readStatus.indexOf("Admin") > -1);
        
        if (!isRead) {
          unreadCount++;
        }
        
        var namaBaru = String(row[3]).trim();
        var nikBaru = String(row[5]).trim();
        var ttlBaru = String(row[7]).trim();
        var jenisKoreksi = [];
        if (namaBaru !== "-" && namaBaru !== "") jenisKoreksi.push("Nama");
        if (nikBaru !== "-" && nikBaru !== "") jenisKoreksi.push("NIK");
        if (ttlBaru !== "-" && ttlBaru !== "") jenisKoreksi.push("TTL");
        
        notifList.push({
          rowId: i + 1,
          source: "Koreksi KTP",
          nama: row[2] !== "-" ? row[2] : (row[3] !== "-" ? row[3] : "PTK"),
          kriteria: "Koreksi " + jenisKoreksi.join("/"),
          status: status || "Pending",
          waktu: row[10] || "-", // Tanggal Usulan
          isRead: isRead
        });
      }
    }
    
    // Urutkan: unread first, lalu berdasarkan waktu terbaru
    notifList.sort(function(a, b) {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });
    
    return { count: unreadCount, recent: notifList.slice(0, 5) };
  } catch (e) {
    Logger.log("Error getNotifikasiKoreksiKtp: " + e.message);
    return { count: 0, recent: [] };
  }
}

function tandaiNotifKoreksiKtpDibaca(rowIdOrIdAjuan, role) {
  try {
    var ss = getDB(KONFIG_PTK.DB_KEY);
    var sheet = ss.getSheetByName("usulan_koreksi_ktp_sdn");
    if (!sheet) return "Error: Sheet usulan tidak ditemukan.";
    
    var idx = -1;
    if (!isNaN(rowIdOrIdAjuan) && parseInt(rowIdOrIdAjuan, 10) > 1) {
      idx = parseInt(rowIdOrIdAjuan, 10);
    } else {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(rowIdOrIdAjuan).trim()) {
          idx = i + 1;
          break;
        }
      }
    }
    
    if (idx === -1 || idx > sheet.getLastRow()) return "Error: Baris tidak valid.";
    
    var headers = sheet.getDataRange().getValues()[0];
    var colReadStatus = headers.indexOf("Read Status") + 1;
    if (colReadStatus === 0) return "Error: Kolom Read Status tidak ditemukan.";
    
    var currentReadStatus = String(sheet.getRange(idx, colReadStatus).getValue() || "").trim();
    if (currentReadStatus.indexOf("Admin") === -1) {
      var newReadStatus = currentReadStatus ? currentReadStatus + ",Admin" : "Admin";
      sheet.getRange(idx, colReadStatus).setValue(newReadStatus);
      SpreadsheetApp.flush();
    }
    return "Sukses";
  } catch(e) {
    return "Error: " + e.message;
  }
}

function tandaiSemuaNotifKoreksiKtpDibaca(role, unit) {
  try {
    var ss = getDB(KONFIG_PTK.DB_KEY);
    var sheet = ss.getSheetByName("usulan_koreksi_ktp_sdn");
    if (!sheet) return "Error: Sheet tidak ditemukan.";
    
    var data = sheet.getDataRange().getValues();
    var isChanged = false;
    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][9]).trim();
      if (status === "Pending" || status === "") {
        var currentReadStatus = String(data[i][15] || "").trim();
        if (currentReadStatus.indexOf("Admin") === -1) {
          var newReadStatus = currentReadStatus ? currentReadStatus + ",Admin" : "Admin";
          sheet.getRange(i + 1, 16).setValue(newReadStatus);
          isChanged = true;
        }
      }
    }
    if (isChanged) SpreadsheetApp.flush();
    return "Sukses";
  } catch(e) {
    return "Error: " + e.message;
  }
}