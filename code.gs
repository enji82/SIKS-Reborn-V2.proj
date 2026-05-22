/* ======================================================================
   CODE.GS - KONFIGURASI GLOBAL & SISTEM UTAMA
   Berisi: ID Database, ID Folder, Login, & Routing Halaman
   ====================================================================== */

// 1. DATABASE CONFIG (Digunakan oleh semua file .gs lainnya)
const SPREADSHEET_IDS = {
  USER_DB: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SHEET_USER_NAME: "Data User",
  SK_DATA_DB: "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4", // ID Database SK
  SK_DATA: "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4", // Alias
  
  // ID Lainnya
  DROPDOWN_DATA: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA", 
  PAUD_DATA: "1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs",
  LAPBUL_PAUD_DB: "1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs", // Alias
  SD_DATA: "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s",
  LAPBUL_SD_DB: "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s", // Alias
  LAPBUL_GABUNGAN: "1aKEIkhKApmONrCg-QQbMhXyeGDJBjCZrhR-fvXZFtJU",
  PTK_PAUD_DB: "1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU",
  PTK_SD_DB: "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE",
  PTK_DB: "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE", // Alias
  DATA_SEKOLAH: "1qeOYVfqFQdoTpysy55UIdKwAJv3VHo4df3g6u6m72Bs",   
  EFILE_DB: "1HzE0EEfIJBTX39oxJpoRDgP04aD9fY-zi2Dln7FbFPQ", // Database E-File
  FORM_OPTIONS_DB: "1prqqKQBYzkCNFmuzblNAZE41ag9rZTCiY2a0WvZCTvU",
  SIABA_DB: "1sfbvyIZurU04gictep8hI-NnvicGs0wrDqANssVXt6o",
  ARSIP_SIABA_DB: "1sMLUihDFeHufn5kWFG9Sj0G8xSHHOUi8usoeL4EgjqU",
  SIABA_TA_PA: "1tQsQY1-Ny1ie66GOZPTLtvZ7BiYCgFdNrX-AVGCtaHA",
  SIABA_SALAH_DB: "1TZGrMiTuyvh2Xbo44RhJuWlQnOC5LzClsgIoNKtRFkY",
  SIABA_LUPA_DB: "160IjN8aiDAgDYXjgDLStS4nCZLKn3Ny-dq3BOFAfDrU",
  SIABA_DINAS_DB: "1I_2yUFGXnBJTCSW6oaT3D482YCs8TIRkKgQVBbvpa1M",
  SIABA_CUTI_DB: "1UYG80gGxuC19ieaVBzJaUV8bhlS2q5gExr0-Yl7upKo",
  SIABA_REKAP_HELPER: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SIABA_SKP_SOURCE: "1ReJt2qoDE2f_8LeR8DXJbROB9EAHK8qP2kYp-ZZ3V9w", 
  SIABA_SKP_DB: "1T-AQ0jYJ_jXYEPxzu_KZauOlRTTforVtFEZ_1UrWHwk",
  SIABA_PNS_DB: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SIABA_PAK_DB: "1mAXwf7cHaOqIj2uf51Fup5tyyBzijTeIxVS8uO1E4dM",
  SIABA_LOOKUP_DB: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
};

// 2. FOLDER CONFIG (Digunakan oleh semua file .gs lainnya)
const FOLDER_CONFIG = {
  MAIN_SK: "1GwIow8B4O1OWoq3nhpzDbMO53LXJJUKs", // Folder Utama SK
  TRASH_SK: "1OB2Mxa_zvpYl7Vru9NEddYmBlU5SfYHL", // Folder Sampah SK
  
  // Folder Lainnya
  LAPBUL_KB: "18CxRT-eledBGRtHW1lFd2AZ8Bub6q5ra",
  LAPBUL_TK: "1WUNz_BSFmcwRVlrG67D2afm9oJ-bVI9H",
  LAPBUL_SD: "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El",
  SIABA_LUPA: "10kwGuGfwO5uFreEt7zBJZUaDx1fUSXo9",
  SIABA_DINAS: "1uPeOU7F_mgjZVyOLSsj-3LXGdq9rmmWl",
  SIABA_CUTI_DOCS: "1fAmqJXpmGIfEHoUeVm4LjnWvnwVwOfNM",
  SIABA_REKAP_ARCHIVE: "1MoGuseJNrOIMnkZNoqkKcK282jZpUkAm",
  SIABA_SKP_DOCS: "1DGYC8AtJFCpCZ0ou2ae9-5fc2-bWl20G",
  SIABA_PAK_DOCS: "1cvn-pOufs-OIbFQfqhmxc3fcmFuox4Sc",
  SIABA_ARSIP_ROOT: "1D0rwRT_tIj9QZTPPG3cRk4NRcbhMzDHm",
};

// ==========================================
// 2. CORE WEB APP (DoGet & Routing)
// ==========================================
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
      .setTitle('SIKS - REBORN')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// Routing Halaman (KEMBALI KE NAMA ASLI 'getHalaman')
function getHalaman(namaFile) {
  try {
    const prefix = "page_";
    const realName = namaFile.startsWith(prefix) ? namaFile : prefix + namaFile;
    return HtmlService.createTemplateFromFile(realName).evaluate().getContent();
  } catch (err) {
    return '<div class="alert alert-danger p-3">Halaman <b>' + namaFile + '</b> belum dibuat atau nama file salah.</div>';
  }
}

// ==========================================
// UTILITIES & SECURITY FUNCTIONS
// ==========================================

// Fungsi untuk hash password (SHA-256 dengan salt)
function hashPassword(password) {
  const salt = "SIKS_SALT_2024";
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt)
    .map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2); })
    .join('');
}

/** Normalisasi nilai password dari sel Sheet (trim, buang apostrof pembuka). */
function normalizeStoredPassword(stored) {
  return String(stored || "").trim().replace(/^'/, "");
}

/** Deteksi password yang sudah di-hash SHA-256 (64 karakter hex). */
function isPasswordHashed(stored) {
  return /^[a-f0-9]{64}$/i.test(normalizeStoredPassword(stored));
}

/**
 * Verifikasi login: cocokkan dengan format di sheet (plain ATAU hash).
 * Jangan hapus cabang plain-text sebelum semua baris di sheet sudah hash.
 */
function verifyPassword(inputPassword, storedRaw) {
  var stored = normalizeStoredPassword(storedRaw);
  if (!stored) return false;
  var input = String(inputPassword).trim();
  if (isPasswordHashed(stored)) {
    return hashPassword(input) === stored.toLowerCase();
  }
  return input === stored;
}

/** Simpan password baru ke sheet: selalu hash (kecuali sudah berupa hash valid). */
function preparePasswordForStorage(plainPassword) {
  var p = normalizeStoredPassword(plainPassword);
  if (!p) return "";
  if (isPasswordHashed(p)) return p.toLowerCase();
  return hashPassword(p);
}

/**
 * Setelah login sukses dengan password plain di sheet, tulis hash ke kolom B
 * (migrasi malas — user tidak perlu reset password).
 */
function upgradePasswordHashIfPlain(sheetUser, rowIndex, inputPassword, storedRaw) {
  try {
    var stored = normalizeStoredPassword(storedRaw);
    if (isPasswordHashed(stored)) return;
    if (String(inputPassword).trim() !== stored) return;
    sheetUser.getRange(rowIndex, 2).setValue(hashPassword(inputPassword));
  } catch (e) {
    Logger.log("upgradePasswordHashIfPlain: " + e.message);
  }
}

/**
 * Migrasi batch plain-text → hash (jalankan sekali dari editor script sebagai Admin).
 * @param {boolean} dryRun true = hanya log, tidak menulis sheet
 * @return {Object} ringkasan { updated, skipped, dryRun }
 */
function migrateAllPasswordsToHash(dryRun) {
  dryRun = dryRun !== false;
  var sheet = getSheet("USER_DB", SPREADSHEET_IDS.SHEET_USER_NAME);
  var data = sheet.getDataRange().getValues();
  var updated = 0;
  var skipped = 0;
  for (var i = 1; i < data.length; i++) {
    var user = String(data[i][0] || "").trim();
    if (!user) { skipped++; continue; }
    var stored = normalizeStoredPassword(data[i][1]);
    if (!stored || isPasswordHashed(stored)) { skipped++; continue; }
    if (!dryRun) {
      sheet.getRange(i + 1, 2).setValue(hashPassword(stored));
    }
    updated++;
  }
  if (!dryRun) SpreadsheetApp.flush();
  return { dryRun: dryRun, updated: updated, skipped: skipped };
}

// Fungsi untuk validasi input
function validateInput(input, type) {
  if (!input) return false;

  switch(type) {
    case 'username':
      return String(input).trim().length >= 3;
    case 'password':
      return String(input).trim().length >= 1; // Batasan 6 karakter telah dihapus
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input));
    default:
      return String(input).trim().length > 0;
  }
}

// Fungsi untuk sanitasi input
function sanitizeInput(input, type) {
  const cleaned = String(input).trim();
  switch(type) {
    case 'filename':
      return cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');
    case 'text':
      return cleaned.substring(0, 255);
    default:
      return cleaned;
  }
}

// Alias untuk loadPage (jaga-jaga jika ada script lain yang memanggil)
function loadPage(namaFile) { return getHalaman(namaFile); }

// ==========================================
// 3. AUTH SYSTEM (MANUAL LOGIN)
// ==========================================

// A. PROSES CEK PASSWORD (SAAT TOMBOL LOGIN DITEKAN)
function processLogin(formObj) {
  try {
    var inputUser = "";
    var inputPass = "";
    
    if (typeof formObj === 'object' && formObj.username) {
      inputUser = String(formObj.username).trim();
      inputPass = String(formObj.password).trim();
    } else {
      inputUser = String(arguments[0]).trim();
      inputPass = String(arguments[1]).trim();
    }

    // Validasi input
    if (!validateInput(inputUser, 'username') || !validateInput(inputPass, 'password')) {
      return { status: 'error', message: 'Username minimal 3 karakter dan password tidak boleh kosong.' };
    }

    var sheet = getSheet("USER_DB", SPREADSHEET_IDS.SHEET_USER_NAME);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Kolom A=Username, B=Password Biasa, C=Nama Lengkap, D=Role, E=Foto/Unit
      var storedPass = String(row[1]).trim();
      if (String(row[0]).trim().toLowerCase() === inputUser.toLowerCase() &&
          verifyPassword(inputPass, storedPass)) {

        upgradePasswordHashIfPlain(sheet, i + 1, inputPass, storedPass);

        var realName = row[2]; // Nama dari Excel
        
        // JIKA NAMA KOSONG DI EXCEL, PAKAI USERNAME AGAR TIDAK ERROR
        if (!realName || realName === "") realName = row[0];

        var userObj = {
          username: row[0],
          nama_lengkap: realName,
          nama: realName,
          role: row[3],
          photo: row[4] || "",
          unit: row[5] || "",
          isLoggedIn: true,
          aksesMenu: getAksesMenuUser(row[0]) // Sertakan whitelist hak akses
        };
        
        return { 
          status: 'success', 
          message: 'Login Berhasil',
          userData: userObj 
        };
      }
    }
    return { status: 'error', message: 'Username atau Password Salah.' };
  } catch (e) {
    Logger.log('Login error: ' + e.message);
    return { status: 'error', message: 'Terjadi kesalahan sistem. Silakan coba lagi.' };
  }
}


function processLogout() {
  return { status: 'success' };
}

// ==========================================
// 4. MANAJEMEN USER & HAK AKSES
// ==========================================

function initSheetHakAkses() {
  try {
    var ss = getDB("USER_DB");
    var sheet = ss.getSheetByName("Hak_Akses");
    if (!sheet) {
      sheet = ss.insertSheet("Hak_Akses");
      sheet.getRange(1, 1, 1, 3).setValues([["Username", "Menu_Diizinkan", "Diperbarui"]]);
      sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
    }
    return true;
  } catch (e) { return false; }
}

function getAksesMenuUser(username) {
  try {
    var sheet = getSheet("USER_DB", "Hak_Akses");
    if (!sheet) return []; // Sheet belum ada = akses kosong
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(username).trim()) {
        var raw = String(data[i][1] || "").trim();
        return raw ? JSON.parse(raw) : [];
      }
    }
    return []; // User belum diatur = hanya home yang tampil
  } catch (e) { return []; }
}

function getDaftarUser() {
  try {
    var sheet = getSheet("USER_DB", SPREADSHEET_IDS.SHEET_USER_NAME);
    if (!sheet) return JSON.stringify([]);
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || String(row[0]).trim() === "") continue;
      result.push({
        username: String(row[0]).trim(),
        nama: String(row[2] || row[0]).trim(),
        role: String(row[3] || "user").trim(),
        unit: String(row[5] || "").trim()
      });
    }
    return JSON.stringify(result);
  } catch (e) { return JSON.stringify({ error: e.message }); }
}

function getDetailUser(username) {
  try {
    var sheetUser = getSheet("USER_DB", SPREADSHEET_IDS.SHEET_USER_NAME);
    var data = sheetUser.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(username).trim()) {
        return JSON.stringify({
          username: String(data[i][0]).trim(),
          password: "",
          passwordIsHashed: isPasswordHashed(data[i][1]),
          nama: String(data[i][2] || "").trim(),
          role: String(data[i][3] || "user").trim(),
          photo: String(data[i][4] || "").trim(),
          unit: String(data[i][5] || "").trim(),
          aksesMenu: getAksesMenuUser(username)
        });
      }
    }
    return JSON.stringify({ error: "User tidak ditemukan." });
  } catch (e) { return JSON.stringify({ error: e.message }); }
}

function simpanUser(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheetUser = getSheet("USER_DB", SPREADSHEET_IDS.SHEET_USER_NAME);
    var data = sheetUser.getDataRange().getValues();
    var username = String(payload.username || "").trim();
    if (!username) return JSON.stringify({ error: "Username tidak boleh kosong." });

    var existingRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === username) { existingRow = i + 1; break; }
    }

    var passRaw = String(payload.password || "").trim();
    var keepExisting = payload.keepPassword === true ||
      passRaw === "__KEEP_EXISTING__" ||
      (existingRow > 0 && !passRaw);

    var passwordCol;
    if (keepExisting && existingRow > 0) {
      passwordCol = normalizeStoredPassword(data[existingRow - 1][1]);
      if (isPasswordHashed(passwordCol)) {
        passwordCol = passwordCol.toLowerCase();
      }
    } else if (!passRaw && existingRow < 0) {
      return JSON.stringify({ error: "Password wajib diisi untuk user baru." });
    } else {
      passwordCol = preparePasswordForStorage(passRaw);
    }

    var rowData = [
      username,
      passwordCol,
      String(payload.nama || username).trim(),
      String(payload.role || "user").trim(),
      String(payload.photo || "").trim(),
      String(payload.unit || "").trim()
    ];

    if (existingRow > 0) {
      sheetUser.getRange(existingRow, 1, 1, 6).setValues([rowData]);
    } else {
      sheetUser.appendRow(rowData);
    }

    // Simpan hak akses jika disertakan
    if (payload.aksesMenu !== undefined) {
      simpanAksesMenuUser(username, payload.aksesMenu);
    }

    SpreadsheetApp.flush();
    return JSON.stringify({ status: "Sukses" });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  } finally { lock.releaseLock(); }
}

function simpanAksesMenuUser(username, arrayMenu) {
  try {
    initSheetHakAkses();
    var sheet = getSheet("USER_DB", "Hak_Akses");
    var data = sheet.getDataRange().getValues();
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
    var jsonMenu = JSON.stringify(arrayMenu || []);
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(username).trim()) {
        sheet.getRange(i + 1, 2, 1, 2).setValues([[jsonMenu, now]]);
        return;
      }
    }
    sheet.appendRow([username, jsonMenu, now]);
  } catch (e) { Logger.log("simpanAksesMenuUser error: " + e.message); }
}

function hapusUser(username) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!username || String(username).trim() === "") return JSON.stringify({ error: "Username kosong." });
    var ss = getDB("USER_DB");
    
    // Hapus dari Data User
    var sheetUser = ss.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME);
    var data = sheetUser.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0]).trim() === String(username).trim()) {
        sheetUser.deleteRow(i + 1); break;
      }
    }
    // Hapus dari Hak_Akses
    var sheetAkses = ss.getSheetByName("Hak_Akses");
    if (sheetAkses) {
      var dataAkses = sheetAkses.getDataRange().getValues();
      for (var j = dataAkses.length - 1; j >= 1; j--) {
        if (String(dataAkses[j][0]).trim() === String(username).trim()) {
          sheetAkses.deleteRow(j + 1); break;
        }
      }
    }
    SpreadsheetApp.flush();
    return JSON.stringify({ status: "Sukses" });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  } finally { lock.releaseLock(); }
}

// ==========================================
// 5. VISITOR COUNTER & SETTING
// ==========================================
function getVisitorStats() {
  var props = PropertiesService.getScriptProperties();
  var today = new Date().toLocaleDateString("id-ID"); 
  
  // Statistik Hits
  var totalHits = Number(props.getProperty('TOTAL_HITS')) || 0;
  var lastDate = props.getProperty('LAST_DATE_HIT');
  var todayHits = Number(props.getProperty('TODAY_HITS')) || 0;
  
  // Ambil Data Online Terupdate
  var onlineCount = Number(props.getProperty('ONLINE_COUNT')) || 0;

  if (lastDate !== today) {
    todayHits = 0;
    props.setProperty('LAST_DATE_HIT', today);
  }

  totalHits++;
  todayHits++;
  props.setProperty('TOTAL_HITS', totalHits.toString());
  props.setProperty('TODAY_HITS', todayHits.toString());

  // Running Text & User Count
  var totalUsers = 0;
  var infoText = "Selamat Datang di SIKS-REBORN";

  try {
    var sheetUser = getSheet("USER_DB", SPREADSHEET_IDS.SHEET_USER_NAME);
    if(sheetUser) totalUsers = sheetUser.getLastRow() - 1;
    // Ambil Running Text
    var sheetSetting = getSheet("USER_DB", "SETTING");
    if (sheetSetting) infoText = sheetSetting.getRange("B1").getValue();
  } catch (e) {
    infoText = "Maintenance Mode";
  }

  return { 
    total: totalHits, 
    today: todayHits, 
    users: totalUsers, 
    online: onlineCount, // <--- Data Baru dikirim ke sini
    info: infoText 
  };
}

function saveRunningText(textBaru) {
  try {
    var ss = getDB("USER_DB");
    var sheet = ss.getSheetByName("SETTING");
    if (!sheet) {
      sheet = ss.insertSheet("SETTING");
      sheet.getRange("A1").setValue("RUNNING_TEXT");
    }
    sheet.getRange("B1").setValue(textBaru);
    return { status: 'success', message: 'Berhasil disimpan!' };
  } catch (e) {
    return { status: 'error', message: 'Gagal: ' + e.message };
  }
}

// Untuk memuat halaman Setting di Sidebar
function loadPageSetting() {
  return HtmlService.createTemplateFromFile('page_setting').evaluate().getContent();
}

/* ======================================================================
   MODUL: MONITORING AKTIVITAS (TURBO SPLIT)
   ====================================================================== */

// JALUR 1: STATISTIK & GRAFIK (Cepat)
function getMonitoring_Charts() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("monitoring_charts");
    if (cached != null) return cached;

    var sheetLog = getSheet("USER_DB", "LOG_ACCESS");
    if (!sheetLog) return { error: "Sheet LOG_ACCESS tidak ditemukan" };

    // Ambil Data: Kolom A (Timestamp) & F (Jenis Hari)
    // Kita tidak butuh nama user disini, jadi lebih ringan
    var lastRow = sheetLog.getLastRow();
    if (lastRow < 2) return { empty: true };
    
    // Ambil A sampai F
    var data = sheetLog.getRange(2, 1, lastRow - 1, 6).getValues();

    var stats = {
      total: data.length, kerja: 0, libur: 0,
      daily: {}, weekly: {}, monthly: {}
    };

    var months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rawTime = row[0]; // Timestamp
      var jenis = String(row[5] || "").toLowerCase(); // Jenis Hari

      // 1. Hitung Kerja vs Libur
      if (jenis.includes("libur") || jenis.includes("minggu") || jenis.includes("sabtu")) {
        stats.libur++;
      } else {
        stats.kerja++;
      }

      // 2. Olah Tanggal
      var d = new Date(rawTime);
      if (isNaN(d.getTime())) continue; // Skip jika tanggal error

      // Harian (yyyy-mm-dd)
      var tglKey = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
      stats.daily[tglKey] = (stats.daily[tglKey] || 0) + 1;

      // Bulanan (Nama Bulan)
      var blnKey = months[d.getMonth()] + " " + d.getFullYear();
      stats.monthly[blnKey] = (stats.monthly[blnKey] || 0) + 1;

      // Mingguan (Week Number)
      var weekNum = Utilities.formatDate(d, "Asia/Jakarta", "w");
      var weekKey = "Minggu " + weekNum;
      stats.weekly[weekKey] = (stats.weekly[weekKey] || 0) + 1;
    }

    var result = JSON.stringify(stats);
    cache.put("monitoring_charts", result, 300);
    return result;

  } catch (e) { return JSON.stringify({ error: e.toString() }); }
}

// JALUR 2: ANALISA USER (Ranking & Pasif)
function getMonitoring_Users() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("monitoring_users");
    if (cached != null) return cached;

    var ss = getDB("USER_DB");
    
    // 1. Ambil Log User (Kolom D = Nama User)
    var sheetLog = ss.getSheetByName("LOG_ACCESS");
    var userActivityMap = {}; // Menghitung frekuensi login
    
    if (sheetLog && sheetLog.getLastRow() > 1) {
      // Ambil hanya kolom D (Index 4)
      var dataLog = sheetLog.getRange(2, 4, sheetLog.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < dataLog.length; i++) {
        var uName = String(dataLog[i][0]).trim();
        if (uName) {
          userActivityMap[uName] = (userActivityMap[uName] || 0) + 1;
        }
      }
    }

    // 2. Hitung Top 10
    var ranking = [];
    for (var key in userActivityMap) {
      ranking.push({ name: key, count: userActivityMap[key] });
    }
    // Sort Descending
    ranking.sort(function(a, b) { return b.count - a.count; });
    var top10 = ranking.slice(0, 10);

    // 3. Cari User Pasif (Bandingkan dengan Database User)
    var userPasif = [];
    var sheetUser = ss.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME);
    if (sheetUser && sheetUser.getLastRow() > 1) {
      // Asumsi Nama User ada di Kolom C (Index 3) di sheet Data User
      var dataUser = sheetUser.getRange(2, 3, sheetUser.getLastRow() - 1, 1).getValues();
      
      // Buat set nama yang sudah log-in dengan lowercase + trim untuk case-insensitive matching
      var loggedInLower = {};
      for (var key in userActivityMap) {
        loggedInLower[key.toLowerCase().trim()] = true;
      }
      
      for (var j = 0; j < dataUser.length; j++) {
        var dbName = String(dataUser[j][0]).trim();
        if (dbName) {
          var dbNameLower = dbName.toLowerCase();
          if (!loggedInLower[dbNameLower]) {
             userPasif.push(dbName);
          }
        }
      }
    }

    var result = JSON.stringify({
      topUsers: top10,
      passiveUsers: userPasif
    });
    cache.put("monitoring_users", result, 300);
    return result;

  } catch (e) { return JSON.stringify({ error: e.toString() }); }
}

/* ======================================================================
   MODUL: LOGGER PENGUNJUNG (REQUIRED FOR HOME & MONITORING)
   ====================================================================== */
// (Fungsi logUserVisit yang pertama dihapus karena duplikat dengan versi di bawah yang lebih lengkap)


/* ======================================================================
   MODUL: LOGGER PENGUNJUNG & ONLINE TRACKER (WAJIB ADA)
   ====================================================================== */

// 1. UPDATE STATUS ONLINE (Untuk menghitung User Online Realtime)
function updateOnlineStatus(username) {
  try {
    var props = PropertiesService.getScriptProperties();
    var now = new Date().getTime();
    var cutoff = now - (10 * 60 * 1000); // Batas aktif: 10 Menit terakhir
    
    // Ambil database user online dari memori script
    var json = props.getProperty('ONLINE_USERS_DB');
    var activeUsers = json ? JSON.parse(json) : {};
    
    // Masukkan user ini (Update waktu terakhir akses)
    if (username) activeUsers[username] = now;
    
    // Bersihkan user yang sudah offline (lebih dari 10 menit tidak aktif)
    var cleanList = {};
    var count = 0;
    for (var u in activeUsers) {
      if (activeUsers[u] > cutoff) {
        cleanList[u] = activeUsers[u];
        count++;
      }
    }
    
    // Simpan Kembali ke Properti Script
    props.setProperty('ONLINE_USERS_DB', JSON.stringify(cleanList));
    props.setProperty('ONLINE_COUNT', count.toString());
    
  } catch (e) {
    console.log("Online Tracker Error: " + e.message);
  }
}

// 2. LOG VISITOR KE SPREADSHEET (Untuk Data Historis & Grafik)
function logUserVisit(userData) {
  // Cegah error jika data user kosong
  if (!userData) return;
  
  // A. Update Status Online (Realtime)
  updateOnlineStatus(userData.username || userData.nama);

  // B. Simpan Log Permanen ke Spreadsheet
  try {
    var ss = getDB("USER_DB");
    var sheet = ss.getSheetByName("LOG_ACCESS");
    
    // Jika sheet belum ada, buat baru otomatis
    if (!sheet) {
        sheet = ss.insertSheet("LOG_ACCESS");
        sheet.appendRow(["Timestamp", "Tanggal", "Bulan", "Nama User", "Role", "Jenis Hari"]);
    }
    
    var now = new Date();
    var timestamp = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var tgalOnly  = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    var blnOnly   = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM");
    
    // Cek Hari Libur (Sabtu/Minggu)
    var dayIndex = now.getDay();
    var jenisHari = "Hari Efektif";
    var ketHari = "Reguler";

    // 1. Cek Weekend
    if (dayIndex === 0 || dayIndex === 6) {
      jenisHari = "Hari Libur";
      ketHari = (dayIndex === 0) ? "Minggu" : "Sabtu";
    }

    // 2. Cek Kalender Libur (Jika Anda punya sheet DATA_LIBUR)
    var sheetLibur = ss.getSheetByName("DATA_LIBUR");
    if (sheetLibur && sheetLibur.getLastRow() > 1) {
      var dataLibur = sheetLibur.getRange(2, 1, sheetLibur.getLastRow()-1, 2).getValues();
      for (var i = 0; i < dataLibur.length; i++) {
        var tglLibur = Utilities.formatDate(new Date(dataLibur[i][0]), "Asia/Jakarta", "yyyy-MM-dd");
        if (tglLibur === tgalOnly) {
          jenisHari = "Hari Libur";
          ketHari = dataLibur[i][1];
          break;
        }
      }
    }

    // Simpan Baris Log
    sheet.appendRow([
        timestamp, 
        tgalOnly, 
        blnOnly, 
        userData.nama || userData.username, 
        userData.role, 
        jenisHari + " (" + ketHari + ")"
    ]);

    // Invalidate Cache
    var cache = CacheService.getScriptCache();
    cache.remove("monitoring_charts");
    cache.remove("monitoring_users");
    
  } catch (e) {
    console.log("Log Error: " + e.message);
  }
}

/* ======================================================================
   MODUL: SELF-HEALING USER DATA (FIX NAMA "USER WEB")
   ====================================================================== */

function getUserProfileByName(username) {
  try {
    var sheet = getSheet("USER_DB", "Data User");
    var data = sheet.getDataRange().getValues();

    // Loop cari username (Kolom A / Index 0)
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
        // Asumsi Struktur Kolom Database User:
        // A=Username, B=Password, C=Nama Lengkap, D=Role, E=Unit/Foto
        return {
          found: true,
          username: data[i][0],
          nama_lengkap: data[i][2], // Kolom C
          role: data[i][3],         // Kolom D
          unit: data[i][4]          // Kolom E
        };
      }
    }
    return { found: false };
  } catch (e) {
    return { found: false, error: e.toString() };
  }
}

/**
 * MENGAMBIL TIMELINE AKTIVITAS USER LOGIN
 * Menggabungkan Log Access dan Log Aktivitas Modul
 */
function getUserActivityTimeline(username, displayName) {
  try {
    var activities = [];
    var uName = String(username || "").trim().toLowerCase();
    var dName = String(displayName || "").trim().toLowerCase();
    if (!uName && !dName) return [];

    // 1. Ambil dari LOG_ACCESS (Login/Access)
    var sheetLog = getSheet("USER_DB", "LOG_ACCESS");
    if (sheetLog) {
      var dataLog = sheetLog.getDataRange().getValues();
      for (var i = dataLog.length - 1; i >= 1; i--) {
        var row = dataLog[i];
        var logUser = String(row[3] || "").trim().toLowerCase();
        
        var isMatch = false;
        if (uName && (logUser === uName || logUser.includes(uName))) isMatch = true;
        if (dName && (logUser === dName || logUser.includes(dName) || dName.includes(logUser))) isMatch = true;
        
        if (isMatch) {
          activities.push({
            type: 'login',
            title: 'Sesi Login',
            desc: 'Berhasil masuk ke sistem (' + (row[5] || 'Reguler') + ')',
            time: row[0],
            icon: 'fa-sign-in-alt',
            color: 'primary'
          });
        }
        if (activities.length >= 20) break; // Batasi pencarian awal
      }
    }

    // 2. Ambil dari SK_DATA (Jika ada aktivitas unggah/edit)
    try {
      var sheetSK = getSheet("SK_DATA_DB", "Unggah_SK");
      if (sheetSK) {
        var dataSK = sheetSK.getDataRange().getValues();
        var skCount = 0;
        for (var j = dataSK.length - 1; j >= 1; j--) {
          var rowSK = dataSK[j];
          var userInput = String(rowSK[8] || "").trim().toLowerCase();
          var userUpdate = String(rowSK[11] || "").trim().toLowerCase();
          
          var matchInput = false;
          if (uName && (userInput === uName || userInput.includes(uName))) matchInput = true;
          if (dName && (userInput === dName || userInput.includes(dName) || dName.includes(userInput))) matchInput = true;

          var matchUpdate = false;
          if (uName && (userUpdate === uName || userUpdate.includes(uName))) matchUpdate = true;
          if (dName && (userUpdate === dName || userUpdate.includes(dName) || dName.includes(userUpdate))) matchUpdate = true;
          
          if (matchInput || matchUpdate) {
            activities.push({
              type: 'sk',
              title: 'Kelola SK',
              desc: 'Mengunggah/Memperbarui SK: ' + (rowSK[4] || '-'),
              time: rowSK[10] || rowSK[0],
              icon: 'fa-file-signature',
              color: 'success'
            });
            skCount++;
          }
          if (skCount >= 5) break; 
        }
      }
    } catch (e) { Logger.log("Timeline SK Error: " + e); }

    // 3. Sorting Berdasarkan Waktu (Terbaru di Atas)
    activities.sort(function(a, b) {
      return parseSiabaDateTime(b.time) - parseSiabaDateTime(a.time);
    });

    // Ambil 10 Terakhir
    return activities.slice(0, 10);

  } catch (e) {
    Logger.log("getUserActivityTimeline Error: " + e);
    return [];
  }
}