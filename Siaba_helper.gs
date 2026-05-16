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
  try {
    const sheet = getSheet("SIABA_CUTI_DB", "Database_ASN");
    const data = sheet.getDataRange().getDisplayValues();
    let result = [];
    for (let i = 1; i < data.length; i++) {
      result.push({ 
        unit: data[i][0], 
        nip: data[i][1], 
        nama: data[i][2], 
        npsn: data[i][3] 
      });
    }
    return result;
  } catch (e) { 
    Logger.log("getDatabasePegawai Error: " + e.message);
    return []; 
  }
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
