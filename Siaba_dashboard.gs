/* ======================================================================
   DASHBOARD SIABA: V2 CLEAN & OPTIMIZED
   ====================================================================== */

// 1. CONFIG ID DATABASE TERPUSAT
const KONFIG_DASHBOARD = {
  DB_KEYS: {
    cuti: "SIABA_CUTI_DB",
    dinas: "SIABA_DINAS_DB",
    lupa: "SIABA_LUPA_DB",
    salah: "SIABA_SALAH_DB",
    rekap: "SIABA_TA_PA"
  }
};

// 2. HELPER PARSER TANGGAL (Ringan & Cepat)
function dashParseDateIso(v) {
  if(!v) return null;
  if(v instanceof Date) return v;
  var s = String(v).trim().replace(/'/g,'');
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(m) return new Date(m[3], m[2]-1, m[1]);
  return new Date(s);
}

// 3. API: AMBIL DATA METRIK & TREN PER MODUL
function getSiabaMetric(type) {
  var cache = CacheService.getScriptCache();
  var now = new Date();
  var curYear = now.getFullYear();
  var curMonth = now.getMonth();
  var cacheKey = "metric_v2_final_" + type + "_" + curYear + "_" + curMonth;
  var cached = cache.get(cacheKey);
  if (cached) return cached;

  var config = {};
  if (type == 'cuti')  config = { key: KONFIG_DASHBOARD.DB_KEYS.cuti,  tab: "Form Cuti",        idxTgl: 4, idxStat: 10 };
  if (type == 'dinas') config = { key: KONFIG_DASHBOARD.DB_KEYS.dinas, tab: "Perjalanan_Dinas", idxTgl: 3, idxStat: 9 };
  if (type == 'lupa')  config = { key: KONFIG_DASHBOARD.DB_KEYS.lupa,  tab: "Lupa_Presensi",    idxTgl: 3, idxStat: 10 };
  if (type == 'salah') config = { key: KONFIG_DASHBOARD.DB_KEYS.salah, tab: "Salah_Presensi",   idxTgl: 3, idxStat: 8 };

  var res = {
    type: type,
    total: 0, 
    bulanIni: 0,
    proses: 0, revisi: 0, setuju: 0, tolak: 0, 
    trend: { 
      proses: new Array(12).fill(0),
      revisi: new Array(12).fill(0),
      setuju: new Array(12).fill(0),
      tolak:  new Array(12).fill(0)
    }
  };

  try {
    var sh = getSheet(config.key, config.tab);
    if (sh) {
      var data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var row = data[i];

        var tgl = dashParseDateIso(row[config.idxTgl]);
        
        if (!tgl || tgl.getFullYear() !== curYear) continue;

        var bln = tgl.getMonth();
        var st = String(row[config.idxStat]||"").toLowerCase();

        res.total++;
        if (bln === curMonth) res.bulanIni++;

        if (st.includes("setuju") || st.includes("ok") || st.includes("disetujui") || st.includes("acc")) {
          res.setuju++; res.trend.setuju[bln]++;
        } else if (st.includes("tolak") || st.includes("tidak")) {
          res.tolak++; res.trend.tolak[bln]++;
        } else if (st.includes("revisi") || st.includes("ubah")) {
          res.revisi++; res.trend.revisi[bln]++;
        } else {
          res.proses++; res.trend.proses[bln]++;
        }
      }
    }
  } catch (e) { res.error = e.message; }

  var json = JSON.stringify(res);
  cache.put(cacheKey, json, 120); 
  return json;
}

/**
 * HELPER: Ambil Unit Kerja User Berdasarkan Email Session
 */
function dashGetMyUnit() {
  try {
    var email = Session.getActiveUser().getEmail();
    var sheet = getSheet("USER_DB", SPREADSHEET_IDS.SHEET_USER_NAME);
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      // Username/Email di Kolom A (Index 0), Unit di Kolom F (Index 5)
      if (String(data[i][0]).trim().toLowerCase() === email.toLowerCase()) {
        return String(data[i][5] || "").trim();
      }
    }
  } catch (e) { console.error("Error getMyUnit: " + e.message); }
  return "";
}

// 4. API: AMBIL DATA GRAFIK KEDISIPLINAN (Dari File Rekap)
function getSiabaChartTrend() {
  var cache = CacheService.getScriptCache();
  var curYear = new Date().getFullYear();
  var cacheKey = "chart_trend_v2_final_" + curYear;
  var cached = cache.get(cacheKey);
  if (cached) return cached;

  var res = {
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"],
    terlambat: new Array(12).fill(0),
    pulangAwal: new Array(12).fill(0)
  };

  try {
    var ss = getDB(KONFIG_DASHBOARD.DB_KEYS.rekap);
    ["Rekap_Terlambat", "Rekap_Pulang_Awal"].forEach(function(nm) {
      var sh = ss.getSheetByName(nm);
      if (sh) {
        var data = sh.getDataRange().getDisplayValues();
        var key = nm.includes("Terlambat") ? "terlambat" : "pulangAwal";
        for (var i = 2; i < data.length; i++) {
          if (String(data[i][0]).trim() == curYear) {
            for (var m = 0; m < 12; m++) {
              res[key][m] += (parseInt(data[i][4 + (m * 2)]) || 0);
            }
          }
        }
      }
    });
  } catch (e) {}

  var json = JSON.stringify(res);
  cache.put(cacheKey, json, 300);
  return json;
}