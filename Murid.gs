const KONFIG_MURID = {
  PAUD_DB: "LAPBUL_PAUD_DB",
  SD_DB: "LAPBUL_SD_DB"
};

function getDataMuridPAUDRombel() {
  var sheet = getSheet(KONFIG_MURID.PAUD_DB, "Murid Rombel PAUD");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:Q (A=1, Q=17)
  var data = sheet.getRange(3, 1, lastRow - 2, 17).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID PAUD MENURUT JENIS KELAMIN
// ID: 1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs
// Sheet: Murid JK PAUD
// ==========================================

function getDataMuridPAUDJK() {
  var sheet = getSheet(KONFIG_MURID.PAUD_DB, "Murid JK PAUD");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:AM (A=1, AM=39)
  // Data dimulai dari baris 3
  var data = sheet.getRange(3, 1, lastRow - 2, 39).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID SD PER KELAS
// ID: 1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s
// Sheet: Murid SD per Kelas
// ==========================================

function getDataMuridSDKelas() {
  var sheet = getSheet(KONFIG_MURID.SD_DB, "Murid SD per Kelas");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:AA (A=1, AA=27)
  // Data dimulai dari baris 3
  var data = sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID SD PER ROMBEL (A-BO)
// ID: 1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s
// ==========================================

function getDataMuridSDRombel() {
  var sheet = getSheet(KONFIG_MURID.SD_DB, "Murid SD per Rombel");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  // Header ada 3 baris (A1-BO3), data mulai baris 4
  if (lastRow < 4) return []; 
  
  // Ambil Range A4:BO (A=1, BO=67)
  var data = sheet.getRange(4, 1, lastRow - 3, 67).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID SD PER AGAMA (A-DN)
// ID: 1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s
// Sheet: Murid SD per Agama
// ==========================================

function getDataMuridSDAgama() {
  var sheet = getSheet(KONFIG_MURID.SD_DB, "Murid SD per Agama");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  // Header ada 3 baris, data mulai baris 4
  if (lastRow < 4) return []; 
  
  // Ambil Range A4:DN
  // Struktur:
  // Static (A-F) = 6 kolom
  // Kelas 1-6 + Total = 7 group * 18 kolom = 126 kolom
  // Total = 6 + 126 = 132 kolom
  // Kolom ke-132 adalah DN (A=1, Z=26, AA=27... DN=118?? Cek hitungan)
  
  // Hitung manual:
  // A-F = 6
  // G-X (K1) = 18
  // Y-AP (K2) = 18
  // AQ-BH (K3) = 18
  // BI-BZ (K4) = 18
  // CA-CR (K5) = 18
  // CS-DJ (K6) = 18
  // DK-EB (Total) = 18
  // Total sampai kolom EB (Kolom ke 132)
  
  // Ambil 132 kolom
  var data = sheet.getRange(4, 1, lastRow - 3, 132).getDisplayValues();
  return data;
}

/* ======================================================================
   MODUL: DASHBOARD MURID (FINAL FIX - AKURASI INDEKS KOLOM)
   ====================================================================== */

function getDashboardMuridData(tahunFilter, bulanFilter, userNpsn, userUnitKerja) {
  var result = {
    // Struktur Data: t=Total, n=Negeri, s=Swasta, l=Laki-laki, p=Perempuan
    cards: { 
        sd_total: {t:0, n:0, s:0, l:0, p:0},
        sd_k1: {t:0, n:0, s:0, l:0, p:0}, sd_k2: {t:0, n:0, s:0, l:0, p:0}, sd_k3: {t:0, n:0, s:0, l:0, p:0},
        sd_k4: {t:0, n:0, s:0, l:0, p:0}, sd_k5: {t:0, n:0, s:0, l:0, p:0}, sd_k6: {t:0, n:0, s:0, l:0, p:0},
        sd_agama: { islam:0, kristen:0, katolik:0, hindu:0, buddha:0, khonghucu:0 },
        paud_total: {t:0, l:0, p:0},
        paud_tk_a: {t:0, l:0, p:0}, paud_tk_b: {t:0, l:0, p:0}, paud_kb: {t:0, l:0, p:0}, paud_sps: {t:0, l:0, p:0},
        tk:0, kb:0, sps:0 
    },
    chart: { sd_negeri:[], sd_swasta:[], tk:[], kb:[], sps:[] },
    lastMonthName: "-",
    log: [] 
  };

  for(var i=0; i<12; i++) {
    result.chart.sd_negeri[i] = 0; result.chart.sd_swasta[i] = 0;
    result.chart.tk[i] = 0; result.chart.kb[i] = 0; result.chart.sps[i] = 0;
  }

  var thnTarget = String(tahunFilter).trim();
  var blnTarget = parseInt(bulanFilter) || 0; 
  var targetNpsn = userNpsn ? String(userNpsn).trim() : "";
  var targetUnit = userUnitKerja ? String(userUnitKerja).trim().toLowerCase() : "";

  var parseBulan = function(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    var s = String(val).trim().toLowerCase();
    if (s.match(/^\d+$/)) return parseInt(s);
    if (s.includes("jan")) return 1; if (s.includes("feb") || s.includes("pebu")) return 2;
    if (s.includes("mar")) return 3; if (s.includes("apr")) return 4;
    if (s.includes("mei") || s.includes("may")) return 5; if (s.includes("jun")) return 6;
    if (s.includes("jul")) return 7; if (s.includes("agu")) return 8;
    if (s.includes("sep")) return 9; if (s.includes("okt")) return 10;
    if (s.includes("nov")) return 11; if (s.includes("des")) return 12;
    return 0;
  };

  var getNum = function(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseInt(String(val).replace(/[^0-9]/g, '')) || 0;
  };

  // =========================================================
  // 1. DATA SD
  // =========================================================
  try {
    var sheetInputSD = getSheet(KONFIG_MURID.SD_DB, "Input SD");
    
    if (sheetInputSD) {
        var lastRow = sheetInputSD.getLastRow();
        var lastRow = sheetInputSD.getLastRow();
        if (lastRow > 1) {
            var headers = sheetInputSD.getRange(1, 1, 1, sheetInputSD.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });

            var findCol = function(name, fallback) {
              var idx = headers.indexOf(name.toLowerCase());
              if (idx > -1) return idx;
              idx = headers.findIndex(function(h) { return h.includes(name.toLowerCase()); });
              return idx > -1 ? idx : fallback;
            };

            var idxSekolah = findCol("nama sekolah", 0);
            var idxBulan = findCol("bulan", 1);
            var idxTahun = findCol("tahun", 2);
            var idxNpsn = findCol("npsn", 3);
            var idxStatus = findCol("status sekolah", 4);
            var idxTotal = findCol("total murid", 226);

            // Dynamic find class L & P columns if headers match, else fallback to indices
            var getColByHdr = function(pattern, fallback) {
              var idx = headers.findIndex(function(h) { return h.includes(pattern); });
              return idx > -1 ? idx : fallback;
            };

            var classCols = [
              { key: 'sd_k1', l: getColByHdr('k1_l', 9), p: getColByHdr('k1_p', 10) },
              { key: 'sd_k2', l: getColByHdr('k2_l', 30), p: getColByHdr('k2_p', 31) },
              { key: 'sd_k3', l: getColByHdr('k3_l', 51), p: getColByHdr('k3_p', 52) },
              { key: 'sd_k4', l: getColByHdr('k4_l', 73), p: getColByHdr('k4_p', 74) },
              { key: 'sd_k5', l: getColByHdr('k5_l', 94), p: getColByHdr('k5_p', 95) },
              { key: 'sd_k6', l: getColByHdr('k6_l', 115), p: getColByHdr('k6_p', 116) }
            ];

            var maxCol = Math.max(sheetInputSD.getLastColumn(), 230);
            var dataRaw = sheetInputSD.getRange(2, 1, lastRow - 1, maxCol).getDisplayValues();

            for (var i = 0; i < dataRaw.length; i++) {
                var row = dataRaw[i];
                var rowTahun = String(row[idxTahun]).trim();
                var rowBulan = parseBulan(row[idxBulan]); 
                var rowNpsn = String(row[idxNpsn]).trim();
                var rowSekolah = String(row[idxSekolah]).trim().toLowerCase();

                if (rowTahun !== thnTarget) continue;
                if (rowBulan < 1 || rowBulan > 12) continue;

                // User school filtering for non-admin
                if (targetNpsn || targetUnit) {
                    var rNpsnClean = String(rowNpsn || "").trim();
                    var tNpsnClean = String(targetNpsn || "").trim();
                    var isMatchNpsn = (tNpsnClean && rNpsnClean && rNpsnClean === tNpsnClean);
                    
                    var rSekClean = String(rowSekolah || "").toLowerCase().trim();
                    var tUnitClean = String(targetUnit || "").toLowerCase().trim();
                    var uSub = tUnitClean.replace(/^(sdn|sds|tk|kb|sps)\s+/i, '').trim();
                    
                    var isMatchUnit = (tUnitClean && rSekClean && (rSekClean.includes(tUnitClean) || tUnitClean.includes(rSekClean) || (uSub && uSub.length >= 3 && rSekClean.includes(uSub))));
                    
                    if (!isMatchNpsn && !isMatchUnit) continue;
                }

                var classSumL = 0;
                var classSumP = 0;
                classCols.forEach(function(item) {
                  classSumL += getNum(row[item.l]);
                  classSumP += getNum(row[item.p]);
                });
                var classSumTotal = classSumL + classSumP;

                var valTotal = getNum(row[idxTotal]);
                if (valTotal === 0 && classSumTotal > 0) {
                    valTotal = classSumTotal;
                }

                var status = String(row[idxStatus]).toLowerCase();
                var isNegeri = status.includes("negeri") || rowSekolah.includes("sdn");

                // CHART
                if (isNegeri) result.chart.sd_negeri[rowBulan - 1] += valTotal;
                else result.chart.sd_swasta[rowBulan - 1] += valTotal;

                // CARD (Hitung Rincian)
                if (rowBulan === blnTarget) {
                    // Total SD
                    result.cards.sd_total.t += valTotal;
                    if(isNegeri) result.cards.sd_total.n += valTotal;
                    else result.cards.sd_total.s += valTotal;

                    // Hitung L & P total SD dari penjumlahan kelas 1-6
                    classCols.forEach(function(item) {
                      var valL = getNum(row[item.l]);
                      var valP = getNum(row[item.p]);
                      var valT = valL + valP;

                      result.cards[item.key].t += valT;
                      result.cards[item.key].l += valL;
                      result.cards[item.key].p += valP;
                      if(isNegeri) result.cards[item.key].n += valT;
                      else result.cards[item.key].s += valT;

                      result.cards.sd_total.l += valL;
                      result.cards.sd_total.p += valP;
                    });

                    // Agama SD (Hitung dari penjumlahan seluruh kelas 1-6 per agama)
                    // Atau ambil dari 6 agama x (L+P) di baris Input SD.
                    // Di Input SD: 6 agama x 3 kolom (L, P, Jml) = 18 kolom untuk TOTAL AGAMA.
                    // L&P: Islam(206,207), Kristen(209,210), Katolik(212,213), Hindu(215,216), Buddha(218,219), Khonghucu(221,222)
                    var isl = getNum(row[206]) + getNum(row[207]);
                    var kris = getNum(row[209]) + getNum(row[210]);
                    var kat = getNum(row[212]) + getNum(row[213]);
                    var hin = getNum(row[215]) + getNum(row[216]);
                    var bud = getNum(row[218]) + getNum(row[219]);
                    var khong = getNum(row[221]) + getNum(row[222]);

                    result.cards.sd_agama.islam += isl;
                    result.cards.sd_agama.kristen += kris;
                    result.cards.sd_agama.katolik += kat;
                    result.cards.sd_agama.hindu += hin;
                    result.cards.sd_agama.buddha += bud;
                    result.cards.sd_agama.khonghucu += khong;
                }
            }
        }
    }
  } catch (e) { result.log.push("SD ERROR: " + e.message); }

  // =========================================================
  // 2. DATA PAUD
  // =========================================================
  try {
    var sheetInputPAUD = getSheet(KONFIG_MURID.PAUD_DB, "Input PAUD");
    if (sheetInputPAUD) {
        var lastRow = sheetInputPAUD.getLastRow();
        var lastRow = sheetInputPAUD.getLastRow();
        if (lastRow > 1) {
            var headersP = sheetInputPAUD.getRange(1, 1, 1, sheetInputPAUD.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });

            var findColP = function(name, fallback) {
              var idx = headersP.indexOf(name.toLowerCase());
              if (idx > -1) return idx;
              idx = headersP.findIndex(function(h) { return h.includes(name.toLowerCase()); });
              return idx > -1 ? idx : fallback;
            };

            var idxSekolahP = findColP("nama sekolah", 0);
            var idxBulanP = findColP("bulan", 1);
            var idxTahunP = findColP("tahun", 2);
            var idxNpsnP = findColP("npsn", 3);
            var idxJenjang = findColP("jenjang", 6);

            var maxColP = Math.max(sheetInputPAUD.getLastColumn(), 60);
            var dataPAUD = sheetInputPAUD.getRange(2, 1, lastRow - 1, maxColP).getDisplayValues();

            var getColPByHdr = function(pattern, fallback) {
              var idx = headersP.findIndex(function(h) { return h.includes(pattern); });
              return idx > -1 ? idx : fallback;
            };

            var idxTkAL = getColPByHdr("tk_a_l", letterToColIndex("AF")); // 31
            var idxTkAP = getColPByHdr("tk_a_p", letterToColIndex("AG")); // 32
            var idxTkBL = getColPByHdr("tk_b_l", letterToColIndex("AI")); // 34
            var idxTkBP = getColPByHdr("tk_b_p", letterToColIndex("AJ")); // 35
            var idxKbL  = getColPByHdr("kb_l", letterToColIndex("AL"));   // 37
            var idxKbP  = getColPByHdr("kb_p", letterToColIndex("AM"));   // 38
            var idxSpsL = getColPByHdr("sps_l", letterToColIndex("AO"));  // 40
            var idxSpsP = getColPByHdr("sps_p", letterToColIndex("AP"));  // 41
            var idxTotalUsiaL = getColPByHdr("total_l", letterToColIndex("AC")); // 28
            var idxTotalUsiaP = getColPByHdr("total_p", letterToColIndex("AD")); // 29
            var idxTotalMuridP = getColPByHdr("total_murid", letterToColIndex("AZ")); // 51 (AZ)

            for (var i = 0; i < dataPAUD.length; i++) {
                var row = dataPAUD[i];
                var rowTahun = String(row[idxTahunP]).trim();
                var rowBulan = parseBulan(row[idxBulanP]);
                var rowNpsn = String(row[idxNpsnP]).trim();
                var rowSekolah = String(row[idxSekolahP]).trim().toLowerCase();

                if (rowTahun !== thnTarget) continue;
                if (rowBulan < 1 || rowBulan > 12) continue;

                // User school filtering for non-admin
                if (targetNpsn || targetUnit) {
                    var rNpsnCleanP = String(rowNpsn || "").trim();
                    var tNpsnCleanP = String(targetNpsn || "").trim();
                    var isMatchNpsnP = (tNpsnCleanP && rNpsnCleanP && rNpsnCleanP === tNpsnCleanP);
                    
                    var rSekCleanP = String(rowSekolah || "").toLowerCase().trim();
                    var tUnitCleanP = String(targetUnit || "").toLowerCase().trim();
                    var uSubP = tUnitCleanP.replace(/^(sdn|sds|tk|kb|sps)\s+/i, '').trim();
                    
                    var isMatchUnitP = (tUnitCleanP && rSekCleanP && (rSekCleanP.includes(tUnitCleanP) || tUnitCleanP.includes(rSekCleanP) || (uSubP && uSubP.length >= 3 && rSekCleanP.includes(uSubP))));
                    
                    if (!isMatchNpsnP && !isMatchUnitP) continue;
                }

                var tkAL = getNum(row[idxTkAL]); var tkAP = getNum(row[idxTkAP]);
                var tkBL = getNum(row[idxTkBL]); var tkBP = getNum(row[idxTkBP]);
                var kbL  = getNum(row[idxKbL]);  var kbP  = getNum(row[idxKbP]);
                var spsL = getNum(row[idxSpsL]); var spsP = getNum(row[idxSpsP]);

                var sumRombelL = tkAL + tkBL + kbL + spsL;
                var sumRombelP = tkAP + tkBP + kbP + spsP;

                var vL = getNum(row[idxTotalUsiaL]); // Total Usia L
                var vP = getNum(row[idxTotalUsiaP]); // Total Usia P
                
                if (vL === 0 && vP === 0 && (sumRombelL > 0 || sumRombelP > 0)) {
                    vL = sumRombelL;
                    vP = sumRombelP;
                }
                
                var valTotal = getNum(row[idxTotalMuridP]);
                if (valTotal === 0 || valTotal < (vL + vP)) {
                    valTotal = vL + vP;
                }

                var jenjangRaw = String(row[idxJenjang] || "").toUpperCase().trim();
                var jenjang = jenjangRaw || (rowSekolah.includes("tk") ? "TK" : (rowSekolah.includes("kb") ? "KB" : (rowSekolah.includes("sps") ? "SPS" : "TK")));

                if (jenjang.includes("TK")) result.chart.tk[rowBulan - 1] += valTotal;
                else if (jenjang.includes("KB")) result.chart.kb[rowBulan - 1] += valTotal;
                else if (jenjang.includes("SPS") || jenjang.includes("TPA")) result.chart.sps[rowBulan - 1] += valTotal;

                if (rowBulan === blnTarget) {
                    result.cards.paud_total.t += valTotal;
                    result.cards.paud_total.l += vL;
                    result.cards.paud_total.p += vP;

                    if (jenjang.includes("TK")) {
                        result.cards.tk += valTotal;
                        
                        result.cards.paud_tk_a.l += tkAL;
                        result.cards.paud_tk_a.p += tkAP;
                        result.cards.paud_tk_a.t += (tkAL + tkAP);

                        result.cards.paud_tk_b.l += tkBL;
                        result.cards.paud_tk_b.p += tkBP;
                        result.cards.paud_tk_b.t += (tkBL + tkBP);

                    } else if (jenjang.includes("KB")) {
                        result.cards.kb += valTotal;
                        result.cards.paud_kb.t += valTotal;
                        result.cards.paud_kb.l += vL;
                        result.cards.paud_kb.p += vP;
                    } else if (jenjang.includes("SPS") || jenjang.includes("TPA")) {
                        result.cards.sps += valTotal;
                        result.cards.paud_sps.t += valTotal;
                        result.cards.paud_sps.l += vL;
                        result.cards.paud_sps.p += vP;
                    } else {
                        // Default ke TK jika tidak teridentifikasi
                        result.cards.tk += valTotal;
                        result.cards.paud_tk_a.l += tkAL;
                        result.cards.paud_tk_a.p += tkAP;
                        result.cards.paud_tk_a.t += (tkAL + tkAP);
                        result.cards.paud_tk_b.l += tkBL;
                        result.cards.paud_tk_b.p += tkBP;
                        result.cards.paud_tk_b.t += (tkBL + tkBP);
                    }
                }
            }
        }
    }
  } catch (e) { result.log.push("PAUD ERROR: " + e.message); }

  var months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  result.lastMonthName = (blnTarget > 0) ? months[blnTarget - 1] : "-";

  return JSON.stringify(result);
}

// ==========================================
// DATA PERATURAN MURID (JUMLAH ROMBEL & MURID)
// Folder Google Drive: https://drive.google.com/drive/u/0/folders/1YiBlALry5bcZ9Ne-7GJHiaDANqv_POnN
// ==========================================
function murid_getPeraturanFiles() {
  try {
    var folderId = '1YiBlALry5bcZ9Ne-7GJHiaDANqv_POnN';
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var fileList = [];
    
    while (files.hasNext()) {
      var file = files.next();
      fileList.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl()
      });
    }
    
    // Sort files alphabetically by name
    fileList.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
    
    return JSON.stringify({ status: 'success', data: fileList });
  } catch (e) {
    return JSON.stringify({ status: 'error', message: e.message });
  }
}