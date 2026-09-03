/* ======================================================================
   SIABA_HELPER.GS - CENTRALIZED BACKEND UTILITIES
   Berisi: Koneksi DB, Caching, & Helper Fungsi Server-Side
   ====================================================================== */

/**
 * Membuka Spreadsheet berdasarkan Key dari SPREADSHEET_IDS atau ID mentah.
 * Memastikan koneksi efisien.
 */
function getDB(key) {
  const id = SPREADSHEET_IDS[key] || key;
  if (!id) throw new Error("ID Database untuk '" + key + "' tidak ditemukan di SPREADSHEET_IDS.");
  return SpreadsheetApp.openById(id);
}

/**
 * Mendapatkan Sheet berdasarkan nama dari DB tertentu.
 */
function getSheet(dbKey, sheetName) {
  const ss = getDB(dbKey);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan di database '" + dbKey + "'.");
  return sheet;
}

/**
 * Wrapper untuk CacheService agar pengambilan data repetitif lebih cepat.
 * @param {string} cacheKey - Kunci unik untuk cache.
 * @param {function} fetchFn - Fungsi untuk mengambil data jika cache kosong.
 * @param {number} ttlSeconds - Waktu simpan cache (default 600 detik / 10 menit).
 */
function getCachedData(cacheKey, fetchFn, ttlSeconds) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log("Cache Parse Error: " + e.message);
    }
  }
  
  // Jika tidak ada di cache, ambil data baru
  const data = fetchFn();
  
  // Simpan ke cache (max size GAS cache adalah 100KB per item)
  try {
    const jsonString = JSON.stringify(data);
    if (jsonString.length < 100000) {
      cache.put(cacheKey, jsonString, ttlSeconds || 600);
    }
  } catch (e) {
    Logger.log("Cache Put Error: " + e.message);
  }
  
  return data;
}

/**
 * Cache untuk respons JSON string (google.script.run yang expect string).
 */
function getCachedJsonString(cacheKey, fetchFn, ttlSeconds) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached != null) return cached;
  var raw = fetchFn();
  var str = (typeof raw === "string") ? raw : JSON.stringify(raw);
  try {
    if (str.length < 100000) {
      cache.put(cacheKey, str, ttlSeconds || 300);
    }
  } catch (e) {
    Logger.log("Cache Put Error [" + cacheKey + "]: " + e.message);
  }
  return str;
}

/** Hapus beberapa kunci cache sekaligus. */
function invalidateCacheKeys(keys) {
  try {
    var cache = CacheService.getScriptCache();
    (keys || []).forEach(function(k) {
      if (k) cache.remove(k);
    });
  } catch (e) {}
}

/** Kunci cache modul notifikasi (per modul + role + unit). */
function notifModuleCacheKey(moduleKey, role, unit) {
  return "NOTIF_" + moduleKey + "_" + String(role || "").toLowerCase() + "_" + String(unit || "").toUpperCase();
}

/** Cache hasil notifikasi satu modul (object { count, recent }). */
function getCachedNotifModule(moduleKey, role, unit, fetchFn, ttlSeconds) {
  var key = notifModuleCacheKey(moduleKey, role, unit);
  return getCachedData(key, function() {
    return fetchFn(role, unit);
  }, ttlSeconds || 60);
}

function invalidateNotifCachesFor(role, unit) {
  var cache = CacheService.getScriptCache();
  var mods = ["sk", "lapbul", "lupa", "salah", "perdin", "cuti", "surat_cuti", "efile",
    "mutasi_paud", "mutasi_sdn", "mutasi_sds", "perbaikan_gaji",
    "seragam_penerimaan", "seragam_penyerahan", "spmb", "ijazah", "arsip_ijazah", "arsip_tka", "koreksi_ktp", "lokupa", "pppkpw"];
  var roles = [String(role || "").toLowerCase(), "admin", "verifikator", "korwil", "user"];
  var units = [String(unit || "").toUpperCase(), ""];
  try {
    var keysToRemove = [
      "NOTIF_GLOBAL_" + String(role || "").toLowerCase() + "_" + String(unit || "").toUpperCase(),
      "NOTIF_GLOBAL_admin_",
      "NOTIF_GLOBAL_verifikator_",
      "NOTIF_GLOBAL_korwil_"
    ];
    if (unit) {
      keysToRemove.push("NOTIF_GLOBAL_user_" + String(unit).toUpperCase());
    }
    
    // Kumpulkan 110 kunci cache modul secara batch
    mods.forEach(function(m) {
      roles.forEach(function(r) {
        units.forEach(function(u) {
          keysToRemove.push(notifModuleCacheKey(m, r, u));
        });
      });
    });

    // Eksekusi pembersihan batch secara aman dengan memotongnya menjadi chunks maksimal 25 item
    if (keysToRemove.length > 0) {
      var chunkSize = 25;
      for (var i = 0; i < keysToRemove.length; i += chunkSize) {
        var chunk = keysToRemove.slice(i, i + chunkSize);
        try {
          cache.removeAll(chunk);
        } catch(err) {}
      }
    }
  } catch (e) {}
}

/**
 * Invalidasi cache HANYA untuk satu modul spesifik + global cache key.
 * Gunakan ini setelah simpan/verifikasi agar tidak memicu RESOURCE_EXHAUSTED
 * (menghindari 16 modul membaca ulang spreadsheet bersamaan).
 */
function invalidateNotifCacheForModule(moduleName, role, unit) {
  try {
    var cache = CacheService.getScriptCache();
    var roles = [String(role || "").toLowerCase(), "admin", "verifikator", "korwil", "user"];
    var units = [String(unit || "").toUpperCase(), ""];
    
    var keysToRemove = [
      // Hapus global cache untuk semua role admin
      "NOTIF_GLOBAL_admin_",
      "NOTIF_GLOBAL_verifikator_",
      "NOTIF_GLOBAL_korwil_"
    ];
    if (unit) {
      keysToRemove.push("NOTIF_GLOBAL_user_" + String(unit).toUpperCase());
    }
    // Hapus cache modul spesifik saja (bukan semua modul)
    roles.forEach(function(r) {
      units.forEach(function(u) {
        keysToRemove.push(notifModuleCacheKey(moduleName, r, u));
      });
    });
    
    cache.removeAll(keysToRemove);
  } catch (e) {}
}

/** Invalidasi cache daftar PTK SD. */
function invalidatePtkSdnCache() {
  invalidateCacheKeys(["ptk_filter_options", "PTK_LIST_SDN"]);
}

/** Kunci cache metrik dashboard Lapbul. */
function lapbulMetricCacheKey(dbKey, sheetName, tahun, bulan, jenjangArr) {
  return "LAPBUL_METRIC_" + dbKey + "_" + String(sheetName).replace(/\s/g, "_") + "_" +
    String(tahun) + "_" + String(bulan) + "_" + (jenjangArr || []).join("-");
}

/** Invalidasi cache metrik untuk periode tertentu (panggil setelah simpan/verifikasi/hapus). */
function invalidateLapbulMetricCache(tahun, bulan) {
  if (!tahun || !bulan) return;
  invalidateCacheKeys([
    lapbulMetricCacheKey("LAPBUL_SD_DB", "Status SD", tahun, bulan, ["SD"]),
    lapbulMetricCacheKey("LAPBUL_PAUD_DB", "Status PAUD", tahun, bulan, ["TK", "KB", "SPS", "TPA"])
  ]);
}

/** Invalidasi semua bulan untuk satu tahun (saat verifikasi tanpa info bulan). */
function invalidateLapbulMetricCacheForYear(tahun) {
  if (!tahun) return;
  var bulanList = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
    "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus",
    "September", "Oktober", "November", "Desember"];
  bulanList.forEach(function(b) {
    invalidateLapbulMetricCache(tahun, b);
  });
}

/**
 * Helper untuk mendapatkan unit user yang sedang login (Session-based via browser logic).
 * Catatan: dashGetMyUnit biasanya didefinisikan di file lain, dipindahkan ke sini jika perlu global.
 */
function getMyUnit_Helper() {
  // Logic ini biasanya bergantung pada state login yang dikirim dari client.
  // Untuk sementara gunakan placeholder jika dipanggil server-side tanpa context.
  return "SEMUA";
}

/**
 * Standardize API Response format.
 */
function apiResponse(status, data, message) {
  return JSON.stringify({
    status: status || 'success',
    data: data || null,
    message: message || ''
  });
}

/**
 * Mendapatkan daftar Tahun & Bulan dari sheet 'Lookup Siaba'.
 * Digunakan oleh banyak filter di modul SIABA.
 */
function getLookupFilters() {
  try {
    return getCachedData("SIABA_LOOKUP_FILTERS", function() {
      const sheet = getSheet("SIABA_LOOKUP_DB", "Lookup Siaba");
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return { years: [], months: [] };

      const data = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
      let years = new Set();
      let months = new Set();

      data.forEach(row => {
        if (row[0]) years.add(row[0]);
        if (row[1]) months.add(row[1]);
      });

      const URUTAN_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      let sortedMonths = Array.from(months).sort((a, b) => URUTAN_BULAN.indexOf(a) - URUTAN_BULAN.indexOf(b));

      return {
        years: Array.from(years).sort().reverse(),
        months: sortedMonths
      };
    }, 3600);
  } catch (e) {
    Logger.log("getLookupFilters Error: " + e.message);
    return { error: e.message };
  }
}

/**
 * ======================================================================
 * MASTER DATA PEGAWAI TERPADU (SINGLE SOURCE OF TRUTH)
 * ======================================================================
 * Mengambil data pegawai dari PTK_DB (Master Data GTK SDN, Master Data GTK SDS)
 * dan PTK_PAUD_DB (Master Data GTK PAUD).
 *
 * @param {Object} options
 *   - filterUnit    : String nama unit/sekolah atau "SEMUA"
 *   - filterNpsn    : String NPSN sekolah atau "SEMUA"
 *   - jenisPegawai  : "SEMUA" | "ASN_ONLY" | "PPPK_PW" | "GURU_TPG"
 *   - jenjang       : "SEMUA" | "SD" | "PAUD" | "SDS"
 * @return {Array<Object>}
 */
function getMasterPegawaiUnified(options) {
  var opts = options || {};
  var filterUnit = String(opts.filterUnit || "").trim().toUpperCase();
  var filterNpsn = String(opts.filterNpsn || "").trim().toUpperCase();
  var jenisPegawai = String(opts.jenisPegawai || "SEMUA").trim().toUpperCase();
  var filterJenjang = String(opts.jenjang || "SEMUA").trim().toUpperCase();

  // Helper normalisasi nama unit (hilangkan spasi ganda & leading zero)
  function normUnit(u) {
    return String(u || "").trim().toUpperCase().replace(/\s+/g, " ").replace(/\b0+(\d+)\b/g, "$1");
  }

  // Helper cek apakah status termasuk ASN (PNS, CPNS, PPPK, PPPK Paruh Waktu)
  function isAsnStatus(statusRaw) {
    var s = String(statusRaw || "").trim().toUpperCase();
    if (!s) return false;
    return s.indexOf("PNS") !== -1 || s.indexOf("CPNS") !== -1 || s.indexOf("PPPK") !== -1;
  }

  // Helper cek PPPK Paruh Waktu
  function isPppkPwStatus(statusRaw) {
    var s = String(statusRaw || "").trim().toUpperCase().replace(/\s+/g, " ");
    return s === "PPPK PARUH WAKTU" || s === "PPPK PW" || s === "PPPKPW" || s.indexOf("PARUH") !== -1;
  }

  // Helper cek ASN Guru / TPG
  function isGuruTpgStatus(statusRaw) {
    var allowed = ["CPNS", "PNS", "PPPK", "PPPK PARUH WAKTU", "PPPK PW"];
    var s = String(statusRaw || "").trim().toUpperCase();
    return allowed.some(function(al) { return s.indexOf(al) !== -1; });
  }

  var sheets = [
    { dbKey: "PTK_DB",      sheetName: "Master Data GTK",      jenjang: "SD",   namaCol: 6, namaNoGelarCol: 4, nipCol: 7, nikCol: 10, statusCol: 19, tugasCol: 25, nuptkCol: 26, hpCol: 18, alamatCol: 16, colCount: 27 },
    { dbKey: "PTK_PAUD_DB", sheetName: "Master Data GTK PAUD", jenjang: "PAUD", namaCol: 7, namaNoGelarCol: 5, nipCol: 8, nikCol: 11, statusCol: 20, tugasCol: -1, nuptkCol: 25, hpCol: 19, alamatCol: 17, colCount: 27 },
    { dbKey: "PTK_DB",      sheetName: "Master Data GTK SDS",  jenjang: "SDS",  namaCol: 6, namaNoGelarCol: 4, nipCol: 7, nikCol: 10, statusCol: 19, tugasCol: 20, nuptkCol: 24, hpCol: 18, alamatCol: 16, colCount: 27 }
  ];

  var result = [];

  sheets.forEach(function(s) {
    if (filterJenjang !== "SEMUA" && s.jenjang !== filterJenjang) return;
    try {
      var sheet = getSheet(s.dbKey, s.sheetName);
      if (!sheet) return;
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      var maxCol = sheet.getLastColumn();
      var readCol = Math.min(maxCol, s.colCount);
      var data = sheet.getRange(2, 1, lastRow - 1, readCol).getDisplayValues();

      data.forEach(function(row) {
        if (!row[0]) return;
        var rNpsn = String(row[1] || "").trim().toUpperCase();
        var rUnit = String(row[2] || "").trim();
        var namaLengkap = String(row[s.namaCol] || "").trim();
        var namaNoGelar = (s.namaNoGelarCol !== -1 && s.namaNoGelarCol < readCol) ? String(row[s.namaNoGelarCol] || "").trim() : "";
        var namaBersih = namaNoGelar || namaLengkap;
        var nip   = String(row[s.nipCol]  || "").trim();
        var nik   = s.nikCol !== -1 && s.nikCol < readCol ? String(row[s.nikCol] || "").trim().replace(/'/g, "") : "";
        var status = String(row[s.statusCol] || "").trim();
        var tugas  = (s.tugasCol !== -1 && s.tugasCol < readCol) ? String(row[s.tugasCol] || "").trim() : "";
        var nuptk  = (s.nuptkCol !== -1 && s.nuptkCol < readCol) ? String(row[s.nuptkCol] || "").trim() : "";
        var hp     = (s.hpCol !== -1 && s.hpCol < readCol) ? String(row[s.hpCol] || "").trim() : "";
        var alamat = (s.alamatCol !== -1 && s.alamatCol < readCol) ? String(row[s.alamatCol] || "").trim() : "";

        if (!namaLengkap && !namaBersih) return;

        // Filter NPSN
        if (filterNpsn && filterNpsn !== "SEMUA" && rNpsn !== filterNpsn) return;

        // Filter Unit
        if (filterUnit && filterUnit !== "SEMUA") {
          var targetUnitNorm = normUnit(filterUnit);
          var rowUnitNorm = normUnit(rUnit);
          if (rowUnitNorm !== targetUnitNorm && rowUnitNorm.indexOf(targetUnitNorm) === -1 && targetUnitNorm.indexOf(rowUnitNorm) === -1) {
            return;
          }
        }

        // Filter Jenis Pegawai
        if (jenisPegawai === "ASN_ONLY" && !isAsnStatus(status)) return;
        if (jenisPegawai === "PPPK_PW" && !isPppkPwStatus(status)) return;
        if (jenisPegawai === "GURU_TPG" && !isGuruTpgStatus(status)) return;

        result.push({
          id_ptk: String(row[0]).trim(),
          npsn: rNpsn,
          unit: rUnit,
          nama: namaBersih, // Default: Nama Tanpa Gelar untuk menghemat ruang tabel/modal
          nama_tanpa_gelar: namaBersih,
          nama_lengkap: namaLengkap || namaBersih,
          nama_dengan_gelar: namaLengkap || namaBersih,
          nip: nip,
          nik: nik,
          jenjang: s.jenjang,
          status: status,
          status_peg: status,
          tugas: tugas,
          jabatan: tugas,
          nuptk: nuptk,
          hp: hp,
          alamat: alamat
        });
      });
    } catch (sheetErr) {
      Logger.log("getMasterPegawaiUnified skip sheet [" + s.sheetName + "]: " + sheetErr.message);
    }
  });

  if (result.length > 0) {
    result.sort(function(a, b) { return a.nama.localeCompare(b.nama); });
  }
  return result;
}

/**
 * Mendapatkan seluruh data Pegawai (ASN) dari database.
 * Digunakan untuk autocomplete atau pencarian data pegawai (Lupa, Salah, Lokasi Upacara, Cuti).
 * Nama disajikan tanpa gelar untuk efisiensi tabel, serta menyertakan nama_dengan_gelar untuk keperluan form cuti.
 */
function getDatabasePegawai() {
  try {
    var listAsn = getMasterPegawaiUnified({ jenisPegawai: "ASN_ONLY" });
    if (Array.isArray(listAsn) && listAsn.length > 0) {
      return listAsn.map(function(item) {
        return {
          unit: item.unit,
          nip: item.nip,
          nama: item.nama_tanpa_gelar || item.nama, // Nama tanpa gelar
          nama_tanpa_gelar: item.nama_tanpa_gelar || item.nama,
          nama_dengan_gelar: item.nama_dengan_gelar || item.nama_lengkap || item.nama,
          npsn: item.npsn,
          status: item.status,
          jabatan: item.jabatan,
          hp: item.hp,
          alamat: item.alamat
        };
      });
    }
  } catch (errUnified) {
    Logger.log("getDatabasePegawai unified fallback warning: " + errUnified.message);
  }

  // Fallback cadangan ke database sheet SIABA terdahulu jika terjadi kendala akses PTK_DB
  const targets = [
    { db: "SIABA_CUTI_DB", sheet: "Database_ASN" },
    { db: "SIABA_PNS_DB", sheet: "Database" },
    { db: "SIABA_LUPA_DB", sheet: "Database_ASN" },
    { db: "SIABA_SALAH_DB", sheet: "Database" }
  ];
  
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    try {
      const sheet = getSheet(t.db, t.sheet);
      if (!sheet) continue;
      const data = sheet.getDataRange().getDisplayValues();
      if (!data || data.length < 2) continue;
      
      let result = [];
      for (let j = 1; j < data.length; j++) {
        const row = data[j];
        if (!row[1] || !row[2]) continue; // Skip jika NIP atau Nama kosong
        result.push({ 
          unit: String(row[0]).trim(), 
          nip: String(row[1]).trim(), 
          nama: String(row[2]).trim(), 
          npsn: String(row[3] || "").trim() 
        });
      }
      
      if (result.length > 0) {
        result.sort(function(a, b) {
          return a.nama.localeCompare(b.nama);
        });
        Logger.log("getDatabasePegawai fallback: Berhasil memuat " + result.length + " data dari " + t.db + " (" + t.sheet + ").");
        return result;
      }
    } catch (e) {
      Logger.log("getDatabasePegawai fallback warning (" + t.db + " - " + t.sheet + "): " + e.message);
    }
  }
  
  Logger.log("getDatabasePegawai ERROR: Semua target database pegawai gagal dimuat.");
  return [];
}

/**
 * Ambil nama unit kerja dari sheet Database_Sekolah berdasarkan NPSN.
 * @param {string} npsn
 * @param {string} dbKey Kunci SPREADSHEET_IDS (default SIABA_CUTI_DB)
 */
function getUnitKerjaByNPSN(npsn, dbKey) {
  try {
    var key = dbKey || "SIABA_CUTI_DB";
    var sheet = getSheet(key, "Database_Sekolah");
    var data = sheet.getDataRange().getDisplayValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(npsn).trim()) {
        return JSON.stringify({ unitKerja: data[i][2] });
      }
    }
    return JSON.stringify({ error: "NPSN (" + npsn + ") tidak terdaftar." });
  } catch (e) {
    return JSON.stringify({ error: "Error Server: " + e.message });
  }
}

/**
 * Parse tanggal/waktu notifikasi SIABA (dd-MM-yyyy HH:mm:ss atau ISO).
 */
function parseSiabaDateTime(val) {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  var s = String(val).replace(/'/g, "").trim();
  if (s === "") return 0;
  var iso = s.split("-");
  if (iso.length === 3 && iso[0].length === 4) return new Date(s).getTime();
  var parts = s.split(" ");
  var sep = parts[0].indexOf("-") > -1 ? "-" : "/";
  var dP = parts[0].split(sep);
  if (dP.length !== 3) return 0;
  var tP = (parts[1] || "00:00:00").split(":");
  return new Date(
    parseInt(dP[2], 10), parseInt(dP[1], 10) - 1, parseInt(dP[0], 10),
    parseInt(tP[0] || 0, 10), parseInt(tP[1] || 0, 10), parseInt(tP[2] || 0, 10)
  ).getTime();
}

/**
 * Mendapatkan daftar Unit Kerja unik dari database sekolah.
 */
function getDaftarUnit() {
  try {
    const sheet = getSheet("SIABA_CUTI_DB", "Database_Sekolah");
    const data = sheet.getDataRange().getDisplayValues();
    let unique = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2]) unique.add(data[i][2]);
    }
    return Array.from(unique).sort();
  } catch (e) { return []; }
}
/**
 * Membuka spreadsheet berdasarkan ID secara langsung (untuk ID dinamis)
 * @param {string} id ID Spreadsheet
 * @return {SpreadsheetApp.Spreadsheet}
 */
function getDBById(id) {
  try {
    if (!id) throw new Error("ID Spreadsheet tidak boleh kosong.");
    return SpreadsheetApp.openById(id);
  } catch (e) {
    Logger.log("ERROR getDBById [" + id + "]: " + e.message);
    throw new Error("Gagal mengakses database (" + id.substring(0,5) + "...). Pastikan ID valid dan akses tersedia.");
  }
}
