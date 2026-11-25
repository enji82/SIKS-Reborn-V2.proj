const KONFIG_MURID = {
  PAUD_DB: "LAPBUL_PAUD_DB",
  SD_DB: "LAPBUL_SD_DB"
};

function getMuridSheet_(dbKey, sheetName) {
  if (typeof USE_CENTRAL_LAYANAN_DB !== "undefined" && USE_CENTRAL_LAYANAN_DB) {
    if (dbKey === KONFIG_MURID.SD_DB && sheetName === "Input SD") {
      var centralSd = getLayananCentralSheet("tbl_lapbul_sd");
      if (centralSd) return centralSd;
    }
    if (dbKey === KONFIG_MURID.PAUD_DB && sheetName === "Input PAUD") {
      var centralPaud = getLayananCentralSheet("tbl_lapbul_paud");
      if (centralPaud) return centralPaud;
    }
  }
  return getSheet(dbKey, sheetName);
}

function murid_toNum_(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  var n = parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function murid_parseBulan_(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  var s = String(val).trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s.indexOf("jan") > -1) return 1;
  if (s.indexOf("feb") > -1 || s.indexOf("peb") > -1) return 2;
  if (s.indexOf("mar") > -1) return 3;
  if (s.indexOf("apr") > -1) return 4;
  if (s.indexOf("mei") > -1 || s.indexOf("may") > -1) return 5;
  if (s.indexOf("jun") > -1) return 6;
  if (s.indexOf("jul") > -1) return 7;
  if (s.indexOf("agu") > -1 || s.indexOf("aug") > -1) return 8;
  if (s.indexOf("sep") > -1) return 9;
  if (s.indexOf("okt") > -1 || s.indexOf("oct") > -1) return 10;
  if (s.indexOf("nov") > -1) return 11;
  if (s.indexOf("des") > -1 || s.indexOf("dec") > -1) return 12;
  return 0;
}

function murid_readCentralRows_(dbKey, sheetName) {
  if (typeof USE_CENTRAL_LAYANAN_DB === "undefined" || !USE_CENTRAL_LAYANAN_DB) return null;
  var sheet = getMuridSheet_(dbKey, sheetName);
  if (!sheet) return null;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { headers: [], rows: [] };
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || "").toLowerCase().trim();
  });
  var rawRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();

  // Ambil daftar sekolah aktif dari SIKS_DB_MASTER (tbl_sekolah)
  var activeNpsn = {};
  var activeNama = {};
  var hasMaster = false;
  try {
    if (typeof getMasterSekolah === "function") {
      var masterList = getMasterSekolah();
      if (Array.isArray(masterList) && masterList.length > 0) {
        hasMaster = true;
        masterList.forEach(function(s) {
          var sNpsn = String(s.npsn || "").trim();
          var sNama = String(s.nama || "").trim().toLowerCase();
          if (sNpsn) activeNpsn[sNpsn] = true;
          if (sNama) activeNama[sNama] = true;
        });
      }
    }
  } catch (eM) {}

  // Ambil hanya 1 baris terbaru (tahun & bulan terbesar) per sekolah aktif
  var iSek = murid_colIdx_(headers, ["nama sekolah", "nama"], 0);
  var iBln = murid_colIdx_(headers, ["bulan"], 1);
  var iThn = murid_colIdx_(headers, ["tahun"], 2);
  var iNpsn = murid_colIdx_(headers, ["npsn"], 3);

  var latestBySchool = {};
  var orderKeys = [];
  for (var i = 0; i < rawRows.length; i++) {
    var r = rawRows[i];
    var nama = String(r[iSek] || "").trim();
    var npsn = String(r[iNpsn] || "").trim();
    if (!nama && !npsn) continue;
    if (hasMaster && !activeNpsn[npsn] && !activeNama[nama.toLowerCase()]) continue;

    var key = npsn || nama.toLowerCase();
    var thn = parseInt(String(r[iThn] || "").replace(/[^0-9]/g, ""), 10) || 0;
    var bln = murid_parseBulan_(r[iBln]);
    var periodScore = thn * 100 + bln;

    if (!latestBySchool[key]) {
      latestBySchool[key] = { score: periodScore, row: r };
      orderKeys.push(key);
    } else if (periodScore >= latestBySchool[key].score) {
      latestBySchool[key] = { score: periodScore, row: r };
    }
  }

  var rows = orderKeys.map(function(k) { return latestBySchool[k].row; });
  return { headers: headers, rows: rows };
}

function murid_colIdx_(headers, names, fallback) {
  if (!Array.isArray(names)) names = [names];
  for (var i = 0; i < names.length; i++) {
    var target = String(names[i]).toLowerCase();
    var idx = headers.indexOf(target);
    if (idx > -1) return idx;
  }
  for (var j = 0; j < names.length; j++) {
    var target2 = String(names[j]).toLowerCase();
    var idx2 = headers.findIndex(function(h) { return h.indexOf(target2) > -1; });
    if (idx2 > -1) return idx2;
  }
  return fallback;
}

function getDataMuridPAUDRombel() {
  var central = murid_readCentralRows_(KONFIG_MURID.PAUD_DB, "Input PAUD");
  if (central) {
    var h = central.headers;
    var iSek = murid_colIdx_(h, ["nama sekolah", "nama"], 0);
    var iBln = murid_colIdx_(h, ["bulan"], 1);
    var iThn = murid_colIdx_(h, ["tahun"], 2);
    var iNpsn = murid_colIdx_(h, ["npsn"], 3);
    var iJenj = murid_colIdx_(h, ["jenjang"], 6);
    var iRombel = murid_colIdx_(h, ["total rombel", "jumlah rombel", "rombel"], 8);

    var usiaPairs = [
      [murid_colIdx_(h, ["0-1 l"], 14), murid_colIdx_(h, ["0-1 p"], 15)],
      [murid_colIdx_(h, ["1-2 l"], 16), murid_colIdx_(h, ["1-2 p"], 17)],
      [murid_colIdx_(h, ["2-3 l"], 18), murid_colIdx_(h, ["2-3 p"], 19)],
      [murid_colIdx_(h, ["3-4 l"], 20), murid_colIdx_(h, ["3-4 p"], 21)],
      [murid_colIdx_(h, ["4-5 l"], 22), murid_colIdx_(h, ["4-5 p"], 23)],
      [murid_colIdx_(h, ["5-6 l"], 24), murid_colIdx_(h, ["5-6 p"], 25)],
      [murid_colIdx_(h, ["> 6 l", ">6 l"], 26), murid_colIdx_(h, ["> 6 p", ">6 p"], 27)]
    ];
    var iAL = murid_colIdx_(h, ["a l", "a_l", "kel_a_l"], 31), iAP = murid_colIdx_(h, ["a p", "a_p", "kel_a_p"], 32);
    var iBL = murid_colIdx_(h, ["b l", "b_l", "kel_b_l"], 34), iBP = murid_colIdx_(h, ["b p", "b_p", "kel_b_p"], 35);
    var iKbL = murid_colIdx_(h, ["kb l", "kb_l", "kel_kb_l"], 37), iKbP = murid_colIdx_(h, ["kb p", "kb_p", "kel_kb_p"], 38);

    var out = [];
    central.rows.forEach(function(r) {
      var nama = String(r[iSek] || "").trim();
      if (!nama) return;
      var jenj = String(r[iJenj] || "").trim();
      var row = [
        nama,
        String(r[iNpsn] || "").trim(),
        jenj,
        String(r[iBln] || "").trim(),
        String(r[iThn] || "").trim(),
        String(murid_toNum_(r[iRombel]))
      ];
      var totUsia = 0;
      usiaPairs.forEach(function(p) {
        var jml = murid_toNum_(r[p[0]]) + murid_toNum_(r[p[1]]);
        totUsia += jml;
        row.push(String(jml));
      });
      row.push(String(totUsia));
      var kb = murid_toNum_(r[iKbL]) + murid_toNum_(r[iKbP]);
      var ka = murid_toNum_(r[iAL]) + murid_toNum_(r[iAP]);
      var kb2 = murid_toNum_(r[iBL]) + murid_toNum_(r[iBP]);
      if (kb + ka + kb2 === 0 && totUsia > 0) {
        kb = totUsia;
      }
      row.push(String(kb), String(ka), String(kb2), String(kb + ka + kb2));
      out.push(row);
    });
    return out;
  }

  var sheet = getSheet(KONFIG_MURID.PAUD_DB, "Murid Rombel PAUD");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  return sheet.getRange(3, 1, lastRow - 2, 18).getDisplayValues();
}

function getDataMuridPAUDJK() {
  var central = murid_readCentralRows_(KONFIG_MURID.PAUD_DB, "Input PAUD");
  if (central) {
    var h = central.headers;
    var iSek = murid_colIdx_(h, ["nama sekolah", "nama"], 0);
    var iBln = murid_colIdx_(h, ["bulan"], 1);
    var iThn = murid_colIdx_(h, ["tahun"], 2);
    var iNpsn = murid_colIdx_(h, ["npsn"], 3);
    var iJenj = murid_colIdx_(h, ["jenjang"], 6);
    var iRombel = murid_colIdx_(h, ["total rombel", "jumlah rombel", "rombel"], 8);

    var usiaPairs = [
      [murid_colIdx_(h, ["0-1 l"], 14), murid_colIdx_(h, ["0-1 p"], 15)],
      [murid_colIdx_(h, ["1-2 l"], 16), murid_colIdx_(h, ["1-2 p"], 17)],
      [murid_colIdx_(h, ["2-3 l"], 18), murid_colIdx_(h, ["2-3 p"], 19)],
      [murid_colIdx_(h, ["3-4 l"], 20), murid_colIdx_(h, ["3-4 p"], 21)],
      [murid_colIdx_(h, ["4-5 l"], 22), murid_colIdx_(h, ["4-5 p"], 23)],
      [murid_colIdx_(h, ["5-6 l"], 24), murid_colIdx_(h, ["5-6 p"], 25)],
      [murid_colIdx_(h, ["> 6 l", ">6 l"], 26), murid_colIdx_(h, ["> 6 p", ">6 p"], 27)]
    ];
    var iAL = murid_colIdx_(h, ["a l", "a_l", "kel_a_l"], 31), iAP = murid_colIdx_(h, ["a p", "a_p", "kel_a_p"], 32);
    var iBL = murid_colIdx_(h, ["b l", "b_l", "kel_b_l"], 34), iBP = murid_colIdx_(h, ["b p", "b_p", "kel_b_p"], 35);
    var iKbL = murid_colIdx_(h, ["kb l", "kb_l", "kel_kb_l"], 37), iKbP = murid_colIdx_(h, ["kb p", "kb_p", "kel_kb_p"], 38);

    var out = [];
    central.rows.forEach(function(r) {
      var nama = String(r[iSek] || "").trim();
      if (!nama) return;
      var row = [
        nama,
        String(r[iNpsn] || "").trim(),
        String(r[iJenj] || "").trim(),
        String(r[iBln] || "").trim(),
        String(r[iThn] || "").trim(),
        String(murid_toNum_(r[iRombel]))
      ];
      var uL = 0, uP = 0;
      usiaPairs.forEach(function(p) {
        var l = murid_toNum_(r[p[0]]), pr = murid_toNum_(r[p[1]]);
        uL += l; uP += pr;
        row.push(String(l), String(pr), String(l + pr));
      });
      row.push(String(uL), String(uP), String(uL + uP));

      var kbL = murid_toNum_(r[iKbL]), kbP = murid_toNum_(r[iKbP]);
      var aL = murid_toNum_(r[iAL]), aP = murid_toNum_(r[iAP]);
      var bL = murid_toNum_(r[iBL]), bP = murid_toNum_(r[iBP]);
      var kL = kbL + aL + bL, kP = kbP + aP + bP;
      if (kL + kP === 0 && (uL + uP) > 0) {
        kbL = uL;
        kbP = uP;
        kL = uL;
        kP = uP;
      }
      row.push(String(kbL), String(kbP), String(kbL + kbP));
      row.push(String(aL), String(aP), String(aL + aP));
      row.push(String(bL), String(bP), String(bL + bP));
      row.push(String(kL), String(kP), String(kL + kP));
      out.push(row);
    });
    return out;
  }

  var sheet = getSheet(KONFIG_MURID.PAUD_DB, "Murid JK PAUD");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  return sheet.getRange(3, 1, lastRow - 2, 42).getDisplayValues();
}

function getDataMuridSDKelas() {
  var central = murid_readCentralRows_(KONFIG_MURID.SD_DB, "Input SD");
  if (central) {
    var h = central.headers;
    var iSek = murid_colIdx_(h, ["nama sekolah", "nama"], 0);
    var iBln = murid_colIdx_(h, ["bulan"], 1);
    var iThn = murid_colIdx_(h, ["tahun"], 2);
    var iNpsn = murid_colIdx_(h, ["npsn"], 3);
    var iStat = murid_colIdx_(h, ["status sekolah", "status"], 4);
    var iRombel = murid_colIdx_(h, ["total rombel", "jumlah rombel", "rombel"], 8);
    var classCols = [
      [murid_colIdx_(h, ["k1 l", "k1_l", "k1_akhir_l", "k1 akhir l"], -1), murid_colIdx_(h, ["k1 p", "k1_p", "k1_akhir_p", "k1 akhir p"], -1)],
      [murid_colIdx_(h, ["k2 l", "k2_l", "k2_akhir_l", "k2 akhir l"], -1), murid_colIdx_(h, ["k2 p", "k2_p", "k2_akhir_p", "k2 akhir p"], -1)],
      [murid_colIdx_(h, ["k3 l", "k3_l", "k3_akhir_l", "k3 akhir l"], -1), murid_colIdx_(h, ["k3 p", "k3_p", "k3_akhir_p", "k3 akhir p"], -1)],
      [murid_colIdx_(h, ["k4 l", "k4_l", "k4_akhir_l", "k4 akhir l"], -1), murid_colIdx_(h, ["k4 p", "k4_p", "k4_akhir_p", "k4 akhir p"], -1)],
      [murid_colIdx_(h, ["k5 l", "k5_l", "k5_akhir_l", "k5 akhir l"], -1), murid_colIdx_(h, ["k5 p", "k5_p", "k5_akhir_p", "k5 akhir p"], -1)],
      [murid_colIdx_(h, ["k6 l", "k6_l", "k6_akhir_l", "k6 akhir l"], -1), murid_colIdx_(h, ["k6 p", "k6_p", "k6_akhir_p", "k6 akhir p"], -1)]
    ];

    var out = [];
    central.rows.forEach(function(r) {
      var nama = String(r[iSek] || "").trim();
      if (!nama) return;
      var row = [
        nama,
        String(r[iNpsn] || "").trim(),
        String(r[iStat] || "").trim(),
        String(r[iBln] || "").trim(),
        String(r[iThn] || "").trim(),
        String(murid_toNum_(r[iRombel]))
      ];
      var totL = 0, totP = 0;
      classCols.forEach(function(c, idxK) {
        var kNum = idxK + 1;
        var l = c[0] > -1 ? murid_toNum_(r[c[0]]) : 0;
        var p = c[1] > -1 ? murid_toNum_(r[c[1]]) : 0;
        if (l === 0 && p === 0) {
          [["1", "a"], ["2", "b"], ["3", "c"]].forEach(function(pair) {
            var numRb = pair[0], letRb = pair[1];
            l += murid_toNum_(r[murid_colIdx_(h, ["k" + kNum + "_" + numRb + "_akhir_l", "k" + kNum + " " + numRb + " akhir l", "k" + kNum + letRb + " l", "k" + kNum + "_" + letRb + "_l"], -1)]);
            p += murid_toNum_(r[murid_colIdx_(h, ["k" + kNum + "_" + numRb + "_akhir_p", "k" + kNum + " " + numRb + " akhir p", "k" + kNum + letRb + " p", "k" + kNum + "_" + letRb + "_p"], -1)]);
          });
        }
        if (l === 0 && p === 0) {
          ["islam", "kristen", "katolik", "hindu", "buddha", "khonghucu"].forEach(function(ag) {
            l += murid_toNum_(r[murid_colIdx_(h, ["k" + kNum + " " + ag + " l", "k" + kNum + "_" + ag + "_l"], -1)]);
            p += murid_toNum_(r[murid_colIdx_(h, ["k" + kNum + " " + ag + " p", "k" + kNum + "_" + ag + "_p"], -1)]);
          });
        }
        totL += l; totP += p;
        row.push(String(l), String(p), String(l + p));
      });
      row.push(String(totL), String(totP), String(totL + totP));
      out.push(row);
    });
    return out;
  }

  var sheet = getSheet(KONFIG_MURID.SD_DB, "Murid SD per Kelas");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  return sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues();
}

function getDataMuridSDRombel() {
  var central = murid_readCentralRows_(KONFIG_MURID.SD_DB, "Input SD");
  if (central) {
    var h = central.headers;
    var iSek = murid_colIdx_(h, ["nama sekolah", "nama"], 0);
    var iBln = murid_colIdx_(h, ["bulan"], 1);
    var iThn = murid_colIdx_(h, ["tahun"], 2);
    var iNpsn = murid_colIdx_(h, ["npsn"], 3);
    var iStat = murid_colIdx_(h, ["status sekolah", "status"], 4);
    var iRombel = murid_colIdx_(h, ["total rombel", "jumlah rombel", "rombel"], 8);

    var out = [];
    central.rows.forEach(function(r) {
      var nama = String(r[iSek] || "").trim();
      if (!nama) return;
      var row = [
        nama,
        String(r[iNpsn] || "").trim(),
        String(r[iStat] || "").trim(),
        String(r[iBln] || "").trim(),
        String(r[iThn] || "").trim(),
        String(murid_toNum_(r[iRombel]))
      ];
      var grandTotal = 0;
      for (var k = 1; k <= 6; k++) {
        var rbVals = [];
        var kTotal = 0;
        [["1", "a"], ["2", "b"], ["3", "c"]].forEach(function(pair) {
          var numRb = pair[0], rb = pair[1];
          var getRbVal = function(tipe, jk) {
            return murid_toNum_(r[murid_colIdx_(h, [
              "k" + k + "_" + numRb + "_" + tipe + "_" + jk,
              "k" + k + " " + numRb + " " + tipe + " " + jk,
              "k" + k + "_" + rb + "_" + tipe + "_" + jk,
              "k" + k + " " + rb + " " + tipe + " " + jk
            ], -1)]);
          };
          var l = murid_toNum_(r[murid_colIdx_(h, [
            "k" + k + "_" + numRb + "_akhir_l", "k" + k + " " + numRb + " akhir l",
            "k" + k + "_" + rb + "_akhir_l", "k" + k + " " + rb + " akhir l",
            "k" + k + rb + " l", "k" + k + "_" + rb + "_l", "k" + k + rb + "_l"
          ], -1)]);
          var p = murid_toNum_(r[murid_colIdx_(h, [
            "k" + k + "_" + numRb + "_akhir_p", "k" + k + " " + numRb + " akhir p",
            "k" + k + "_" + rb + "_akhir_p", "k" + k + " " + rb + " akhir p",
            "k" + k + rb + " p", "k" + k + "_" + rb + "_p", "k" + k + rb + "_p"
          ], -1)]);
          if (l === 0) {
            var awalL = getRbVal("awal", "l"), masukL = getRbVal("masuk", "l"), keluarL = getRbVal("keluar", "l");
            if (awalL > 0 || masukL > 0 || keluarL > 0) l = Math.max(0, awalL + masukL - keluarL);
          }
          if (p === 0) {
            var awalP = getRbVal("awal", "p"), masukP = getRbVal("masuk", "p"), keluarP = getRbVal("keluar", "p");
            if (awalP > 0 || masukP > 0 || keluarP > 0) p = Math.max(0, awalP + masukP - keluarP);
          }
          var j = l + p;
          kTotal += j;
          rbVals.push([l, p, j]);
        });
        if (kTotal === 0) {
          var fl = murid_toNum_(r[murid_colIdx_(h, ["k" + k + " l", "k" + k + "_l", "k" + k + "_akhir_l", "k" + k + " akhir l"], -1)]);
          var fp = murid_toNum_(r[murid_colIdx_(h, ["k" + k + " p", "k" + k + "_p", "k" + k + "_akhir_p", "k" + k + " akhir p"], -1)]);
          if (fl === 0 && fp === 0) {
            ["islam", "kristen", "katolik", "hindu", "buddha", "khonghucu"].forEach(function(ag) {
              fl += murid_toNum_(r[murid_colIdx_(h, ["k" + k + " " + ag + " l", "k" + k + "_" + ag + "_l"], -1)]);
              fp += murid_toNum_(r[murid_colIdx_(h, ["k" + k + " " + ag + " p", "k" + k + "_" + ag + "_p"], -1)]);
            });
          }
          if (fl > 0 || fp > 0) {
            rbVals[0] = [fl, fp, fl + fp];
            kTotal = fl + fp;
          }
        }
        rbVals.forEach(function(v) { row.push(String(v[0]), String(v[1]), String(v[2])); });
        grandTotal += kTotal;
        row.push(String(kTotal));
      }
      row.push(String(grandTotal));
      out.push(row);
    });
    return out;
  }

  var sheet = getSheet(KONFIG_MURID.SD_DB, "Murid SD per Rombel");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];
  return sheet.getRange(4, 1, lastRow - 3, 67).getDisplayValues();
}

function getDataMuridSDAgama() {
  var central = murid_readCentralRows_(KONFIG_MURID.SD_DB, "Input SD");
  if (central) {
    var h = central.headers;
    var iSek = murid_colIdx_(h, ["nama sekolah", "nama"], 0);
    var iBln = murid_colIdx_(h, ["bulan"], 1);
    var iThn = murid_colIdx_(h, ["tahun"], 2);
    var iNpsn = murid_colIdx_(h, ["npsn"], 3);
    var iStat = murid_colIdx_(h, ["status sekolah", "status"], 4);
    var iRombel = murid_colIdx_(h, ["total rombel", "jumlah rombel", "rombel"], 8);
    var agamas = ["islam", "kristen", "katolik", "hindu", "buddha", "khonghucu"];

    var out = [];
    central.rows.forEach(function(r) {
      var nama = String(r[iSek] || "").trim();
      if (!nama) return;
      var row = [
        nama,
        String(r[iNpsn] || "").trim(),
        String(r[iStat] || "").trim(),
        String(r[iBln] || "").trim(),
        String(r[iThn] || "").trim(),
        String(murid_toNum_(r[iRombel]))
      ];
      var totAgamaL = [0, 0, 0, 0, 0, 0];
      var totAgamaP = [0, 0, 0, 0, 0, 0];
      for (var k = 1; k <= 6; k++) {
        agamas.forEach(function(ag, idxAg) {
          var l = murid_toNum_(r[murid_colIdx_(h, ["k" + k + " " + ag + " l", "k" + k + "_" + ag + "_l"], -1)]);
          var p = murid_toNum_(r[murid_colIdx_(h, ["k" + k + " " + ag + " p", "k" + k + "_" + ag + "_p"], -1)]);
          totAgamaL[idxAg] += l;
          totAgamaP[idxAg] += p;
          row.push(String(l), String(p), String(l + p));
        });
      }
      for (var a = 0; a < 6; a++) {
        row.push(String(totAgamaL[a]), String(totAgamaP[a]), String(totAgamaL[a] + totAgamaP[a]));
      }
      out.push(row);
    });
    return out;
  }

  var sheet = getSheet(KONFIG_MURID.SD_DB, "Murid SD per Agama");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];
  return sheet.getRange(4, 1, lastRow - 3, 132).getDisplayValues();
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

  var letterToColIndex = function(letter) {
    var str = String(letter).toUpperCase();
    var sum = 0;
    for (var i = 0; i < str.length; i++) {
      sum *= 26;
      sum += (str.charCodeAt(i) - 64);
    }
    return sum - 1; // 0-indexed
  };

  // =========================================================
  // 1. DATA SD
  // =========================================================
  try {
    var sheetInputSD = getMuridSheet_(KONFIG_MURID.SD_DB, "Input SD");
    
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

                // User school filtering for non-admin (Cek NPSN atau Nama Sekolah)
                if (targetNpsn || targetUnit) {
                    var rNpsnClean = String(rowNpsn || "").trim();
                    var tNpsnClean = String(targetNpsn || "").trim();
                    var rSekClean  = String(rowSekolah || "").toLowerCase().trim();
                    var tUnitClean = String(targetUnit || "").toLowerCase().trim();
                    var uSub       = tUnitClean.replace(/^(sdn|sds|tk|kb|sps)\s+/i, '').trim();

                    var matchByNpsn = (tNpsnClean !== "" && rNpsnClean !== "" && tNpsnClean === rNpsnClean);
                    var matchByUnit = (tUnitClean !== "" && rSekClean !== "" && (rSekClean.indexOf(tUnitClean) > -1 || tUnitClean.indexOf(rSekClean) > -1 || (uSub.length >= 3 && rSekClean.indexOf(uSub) > -1)));

                    if (!matchByNpsn && !matchByUnit) continue;
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
    var sheetInputPAUD = getMuridSheet_(KONFIG_MURID.PAUD_DB, "Input PAUD");
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

            var getColPByHdr = function(patterns, fallback) {
              if (!Array.isArray(patterns)) patterns = [patterns];
              for (var p = 0; p < patterns.length; p++) {
                var pat = patterns[p].toLowerCase();
                var idx = headersP.findIndex(function(h) { 
                  return h === pat || h.endsWith(" " + pat) || h.startsWith(pat + " "); 
                });
                if (idx > -1) return idx;
              }
              return fallback;
            };

            var idxTkAL = getColPByHdr(["tk_a_l", "tk a l", "a l"], letterToColIndex("AF")); // 31
            var idxTkAP = getColPByHdr(["tk_a_p", "tk a p", "a p"], letterToColIndex("AG")); // 32
            var idxTkBL = getColPByHdr(["tk_b_l", "tk b l", "b l"], letterToColIndex("AI")); // 34
            var idxTkBP = getColPByHdr(["tk_b_p", "tk b p", "b p"], letterToColIndex("AJ")); // 35
            var idxKbL  = getColPByHdr(["kb_l", "kb l"], letterToColIndex("AL"));   // 37
            var idxKbP  = getColPByHdr(["kb_p", "kb p"], letterToColIndex("AM"));   // 38
            var idxSpsL = getColPByHdr(["sps_l", "sps l"], letterToColIndex("AO"));  // 40
            var idxSpsP = getColPByHdr(["sps_p", "sps p"], letterToColIndex("AP"));  // 41
            var idxTotalUsiaL = getColPByHdr(["total_l", "total l", "total usia l"], letterToColIndex("AC")); // 28
            var idxTotalUsiaP = getColPByHdr(["total_p", "total p", "total usia p"], letterToColIndex("AD")); // 29
            var idxTotalMuridP = getColPByHdr(["total_murid", "total murid"], letterToColIndex("AZ")); // 51 (AZ)

            for (var i = 0; i < dataPAUD.length; i++) {
                var row = dataPAUD[i];
                var rowTahun = String(row[idxTahunP]).trim();
                var rowBulan = parseBulan(row[idxBulanP]);
                var rowNpsn = String(row[idxNpsnP]).trim();
                var rowSekolah = String(row[idxSekolahP]).trim().toLowerCase();

                if (rowTahun !== thnTarget) continue;
                if (rowBulan < 1 || rowBulan > 12) continue;

                // User school filtering for non-admin (Cek NPSN atau Nama Sekolah)
                if (targetNpsn || targetUnit) {
                    var rNpsnCleanP = String(rowNpsn || "").trim();
                    var tNpsnCleanP = String(targetNpsn || "").trim();
                    var rSekCleanP  = String(rowSekolah || "").toLowerCase().trim();
                    var tUnitCleanP = String(targetUnit || "").toLowerCase().trim();
                    var uSubP       = tUnitCleanP.replace(/^(sdn|sds|tk|kb|sps)\s+/i, '').trim();

                    var matchByNpsnP = (tNpsnCleanP !== "" && rNpsnCleanP !== "" && tNpsnCleanP === rNpsnCleanP);
                    var matchByUnitP = (tUnitCleanP !== "" && rSekCleanP !== "" && (rSekCleanP.indexOf(tUnitCleanP) > -1 || tUnitCleanP.indexOf(rSekCleanP) > -1 || (uSubP.length >= 3 && rSekCleanP.indexOf(uSubP) > -1)));

                    if (!matchByNpsnP && !matchByUnitP) continue;
                }

                var tkAL = getNum(row[idxTkAL]); var tkAP = getNum(row[idxTkAP]);
                var tkBL = getNum(row[idxTkBL]); var tkBP = getNum(row[idxTkBP]);
                var kbL  = getNum(row[idxKbL]);  var kbP  = getNum(row[idxKbP]);
                var spsL = getNum(row[idxSpsL]); var spsP = getNum(row[idxSpsP]);

                var sumRombelL = tkAL + tkBL + kbL + spsL;
                var sumRombelP = tkAP + tkBP + kbP + spsP;

                var vL = getNum(row[idxTotalUsiaL]); // Total Usia L
                var vP = getNum(row[idxTotalUsiaP]); // Total Usia P
                
                if (sumRombelL > 0 || sumRombelP > 0) {
                    // Gunakan data per rombel agar 100% presisi dan sinkron dengan kartu rincian kelas
                    vL = sumRombelL;
                    vP = sumRombelP;
                } else if ((vL > 1000 || vP > 1000)) {
                    vL = 0;
                    vP = 0;
                }

                var valTotal = getNum(row[idxTotalMuridP]);
                if (valTotal > 10000) valTotal = 0; // Proteksi pembacaan kolom non-jumlah

                // Sinkronkan valTotal dengan vL + vP jika rombel/usia tersedia
                if ((vL + vP) > 0) {
                    valTotal = vL + vP;
                } else if (valTotal === 0 && (sumRombelL + sumRombelP) > 0) {
                    valTotal = sumRombelL + sumRombelP;
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