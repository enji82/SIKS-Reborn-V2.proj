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
    "mutasi_paud", "mutasi_sdn", "mutasi_sds"];
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

    // Eksekusi pembersihan batch sekaligus dalam satu API call
    if (keysToRemove.length > 0) {
      cache.removeAll(keysToRemove);
    }
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
 * Mendapatkan seluruh data Pegawai (ASN) dari database.
 * Digunakan untuk autocomplete atau pencarian data pegawai.
 */
function getDatabasePegawai() {
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
        // Sortir nama secara alfabetis (A-Z) agar rapi di dropdown
        result.sort(function(a, b) {
          var nA = a.nama.toUpperCase();
          var nB = b.nama.toUpperCase();
          return (nA < nB) ? -1 : (nA > nB) ? 1 : 0;
        });
        Logger.log("getDatabasePegawai: Berhasil memuat " + result.length + " data dari " + t.db + " (" + t.sheet + ").");
        return result;
      }
    } catch (e) {
      Logger.log("getDatabasePegawai warning (" + t.db + " - " + t.sheet + "): " + e.message);
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
