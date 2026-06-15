/* ======================================================================
   LAPBUL.GS - FULL ENGINE (KELOLA, STATUS, & DASHBOARD)
   100% COMPLIANT DENGAN BAB VIII (getDisplayValues)
   ====================================================================== */

const KONFIG_LAPBUL = {
    SD_DB: "LAPBUL_SD_DB",
    PAUD_DB: "LAPBUL_PAUD_DB",
    USER_DB: "USER_DB"
};

/* ======================================================================
   1. MODUL KELOLA DATA (PARTIAL FETCH)
   ====================================================================== */
function getLapbulKelolaData(filterJenjang, filterBulan, filterTahun, filterStatus, keyword) {
  var result = [];
  var LIMIT_PER_SHEET = 5000; // Menggunakan batas 5000 baris agar filter periode laporan tidak memotong data lama (cukup untuk ~6 tahun data)

  var reqJenjang = String(filterJenjang || "").toUpperCase().trim();
  var reqBulan = String(filterBulan || "").toLowerCase().trim();
  var reqTahun = String(filterTahun || "").toLowerCase().trim();
  var reqStatus = String(filterStatus || "").toLowerCase().trim();
  var reqKey = String(keyword || "").toLowerCase().trim();

  var cleanStringDate = function(val) {
      if (!val) return "-";
      var s = String(val).replace(/['"]/g, "").trim();
      if (s === "") return "-";
      return s;
  };

  var letterToColIndex = function(letter) {
      var col = 0;
      for (var i = 0; i < letter.length; i++) {
          col = col * 26 + (letter.charCodeAt(i) - 64);
      }
      return col - 1;
  };

  var sumCols = function(rowDisplayValues, startLetter, endLetter) {
      var startIdx = letterToColIndex(startLetter);
      var endIdx = letterToColIndex(endLetter);
      var total = 0;
      for (var i = startIdx; i <= endIdx; i++) {
          var val = parseFloat(String(rowDisplayValues[i] || "").replace(/,/g, "")) || 0;
          total += val;
      }
      return total;
  };

  var fetchDataSmart = function(dbKey, sheetName, sourceLabel) {
      var sourceResult = [];
      try {
          var sheet = getSheet(dbKey, sheetName);
          if (!sheet) return [];

          var lastRow = sheet.getLastRow();
          if (lastRow < 2) return []; 

          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });

          var idx = {
              nama: headers.indexOf("nama sekolah") > -1 ? headers.indexOf("nama sekolah") : headers.indexOf("nama"),
              npsn: headers.indexOf("npsn"),
              bulan: headers.indexOf("bulan"),
              tahun: headers.indexOf("tahun"),
              jenjang: headers.indexOf("jenjang"),
              statusSekolah: headers.findIndex(function(h) { return h.includes("status sekolah") || h === "status"; }),
              rombel: headers.findIndex(function(h) { return h.includes("rombel") || h.includes("jml") || h.includes("total"); }),
              file: headers.findIndex(function(h) { return h.includes("file") || h.includes("dokumen"); })
          };

          var col = (sourceLabel === 'PAUD') ? 
                    { tglKirim:0, userKirim:43, tglEdit:44, userEdit:45, tglVerif:46, userVerif:47, statusData:48, ket:49 } : 
                    { tglKirim:0, userKirim:219, tglEdit:220, userEdit:221, tglVerif:222, userVerif:223, statusData:218, ket:224 };

          var startRow = Math.max(2, lastRow - LIMIT_PER_SHEET + 1); 
          var numRows = (lastRow - startRow + 1);
          if (numRows < 1) return [];

          var data = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getDisplayValues();

          for (var i = data.length - 1; i >= 0; i--) {
              var row = data[i];
              var realRowNumber = startRow + i; 

              if (reqBulan && String(row[idx.bulan]||"").toLowerCase() !== reqBulan) continue;
              if (reqTahun && String(row[idx.tahun]||"").toLowerCase() !== reqTahun) continue;
              if (reqJenjang && String(row[idx.jenjang]||"").toUpperCase() !== reqJenjang) continue;

              var rStatusData = String(row[col.statusData] || "Diproses");
              if (rStatusData.toLowerCase().includes("hapus")) continue;
              if (reqStatus && !rStatusData.toLowerCase().includes(reqStatus)) continue;

              var rNama = (idx.nama > -1) ? String(row[idx.nama]) : "Tanpa Nama";
              var rNpsn = (idx.npsn > -1) ? String(row[idx.npsn]) : "";
              if (reqKey && !rNama.toLowerCase().includes(reqKey) && !rNpsn.includes(reqKey)) continue;

              var rMurid = 0, rKS = 0, rGuru = 0, rTendik = 0, rPTK = 0;
              var rCpns = 0, rPns = 0, rPppk = 0, rPppkPw = 0, rGty = 0, rPty = 0, rGtt = 0, rPtt = 0;
              
              var sumArr = function(arrLetters) {
                  var tot = 0;
                  for (var c = 0; c < arrLetters.length; c++) {
                      var idx = letterToColIndex(arrLetters[c].toUpperCase());
                      tot += (parseFloat(String(row[idx] || "").replace(/,/g, "")) || 0);
                  }
                  return tot;
              };

              if (sourceLabel === 'PAUD') {
                  rMurid = parseFloat(String(row[letterToColIndex("AZ")] || "").replace(/,/g, "")) || 0;
                  rKS = sumCols(row, "AA", "AD");
                  rGuru = sumCols(row, "AE", "AL") + sumCols(row, "BB", "BI");
                  rTendik = sumCols(row, "AM", "AP") + sumCols(row, "BJ", "BU");
                  rPTK = rKS + rGuru + rTendik;
                  
                  rPns = sumArr(["AC","AG","AK","BD","BH","BK","BN","BQ","BT"]);
                  rPppk = sumArr(["AD","AH","AL","BE","BI","BL","BO","BR","BU"]);
                  rGty = sumArr(["AA","AE","AI","BB","BF"]);
                  rPty = sumArr(["AM","AN","AO","AP"]);
                  rGtt = sumArr(["AB","AF","AJ","BC","BG"]);
                  rPtt = sumArr(["BJ","BM","BP","BS"]);
              } else {
                  rMurid = parseFloat(String(row[letterToColIndex("HS")] || "").replace(/,/g, "")) || 0;
                  rKS = sumCols(row, "EE", "EG");
                  rGuru = sumCols(row, "EH", "FP");
                  rTendik = sumCols(row, "FQ", "HI");
                  rPTK = rKS + rGuru + rTendik;
                  
                  rCpns = sumCols(row, "HW", "IA");
                  rPns = sumArr(["EE","EH","EM","ER","EW","FB","FG","FL","FQ","FV","GA","GF","GK","GP","GU","GZ","HE"]);
                  rPppk = sumArr(["EF","EI","EN","ES","EX","FC","FH","FM","FR","FW","GB","GG","GL","GQ","GV","HA","HF"]);
                  rPppkPw = sumArr(["EJ","EO","ET","EY","FD","FI","FN","FS","FX","GC","GH","GM","GR","GW","HB","HG"]);
                  rGty = sumArr(["EK","EP","EU","EZ","FE","FJ","FO"]);
                  rPty = sumArr(["FT","FY","GD","GI","GN","GS","GX","HC","HH"]);
                  rGtt = sumArr(["EL","EQ","EV","FA","FF","FK","FP"]);
                  rPtt = sumArr(["FU","FZ","GE","GJ","GO","GT","GY","HD","HI"]);
              }

              var rJmlStatus = rCpns + rPns + rPppk + rPppkPw + rGty + rPty + rGtt + rPtt;

              sourceResult.push({
                  rowId: realRowNumber,
                  source: sourceLabel,
                  namaSekolah: rNama,
                  npsn: rNpsn,
                  bulan: String(row[idx.bulan]||""),
                  tahun: String(row[idx.tahun]||""),
                  jenjang: String(row[idx.jenjang]||""),
                  statusSekolah: (idx.statusSekolah > -1) ? row[idx.statusSekolah] : "",
                  rombel: (idx.rombel > -1) ? (parseInt(row[idx.rombel]) || 0) : 0,
                  murid: rMurid,
                  ks: rKS,
                  guru: rGuru,
                  tendik: rTendik,
                  ptk: rPTK,
                  cpns: rCpns,
                  pns: rPns,
                  pppk: rPppk,
                  pppkPw: rPppkPw,
                  gty: rGty,
                  pty: rPty,
                  gtt: rGtt,
                  ptt: rPtt,
                  jmlStatus: rJmlStatus,
                  fileUrl: (idx.file > -1) ? row[idx.file] : "",
                  tglKirim: cleanStringDate(row[col.tglKirim]),
                  userKirim: row[col.userKirim] || "-",
                  tglEdit: cleanStringDate(row[col.tglEdit]),
                  userEdit: row[col.userEdit] || "-",
                  tglVerif: cleanStringDate(row[col.tglVerif]),
                  verifikator: row[col.userVerif] || "-",
                  statusData: rStatusData,
                  keterangan: row[col.ket] || ""
              });
          }
      } catch (e) {}
      return sourceResult;
  };

  var dataPAUD = fetchDataSmart(KONFIG_LAPBUL.PAUD_DB, "Input PAUD", "PAUD");
  var dataSD = fetchDataSmart(KONFIG_LAPBUL.SD_DB, "Input SD", "SD");
  
  return dataPAUD.concat(dataSD);
}

/* ======================================================================
   2. MODUL: MASTER DATA & PENYIMPANAN
   ====================================================================== */
function getSekolahByNPSN(npsn) {
  try {
    const sheet = getSheet(KONFIG_LAPBUL.USER_DB, "Data_Sekolah");
    const data = sheet.getDataRange().getDisplayValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(npsn).trim()) {
        return {
          found: true,
          npsn: data[i][0],
          jenjang: data[i][1],
          nama_sekolah: data[i][2],
          status_sekolah: data[i][3]
        };
      }
    }
    return { found: false };
  } catch (e) { return { error: e.toString() }; }
}

/* ======================================================================
   MEMUAT MASTER SEKOLAH (DENGAN PELINDUNG FORMAT TANGGAL)
   ====================================================================== */
function getAllSchoolsList() {
  try {
    const sheet = getSheet(KONFIG_LAPBUL.USER_DB, "Data_Sekolah");
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) return [];

    // KITA KEMBALI MENGGUNAKAN getDisplayValues() AGAR AMAN DARI ERROR TANGGAL
    // Mengambil dari Kolom A (1) sampai Kolom P (16)
    const data = sheet.getRange(2, 1, lastRow - 1, 16).getDisplayValues(); 
    
    // Pelindung Format Tanggal
    const fmtDate = function(d) {
      if (!d) return "";
      var strD = String(d).trim(); // Paksa jadi teks agar tidak error
      if (strD.includes("-")) {
         var p = strD.split("-");
         if(p[2] && p[2].length === 4) return p[2]+"-"+p[1]+"-"+p[0]; 
      }
      return strD;
    };

    return data.map(function(r) {
      return {
        npsn: String(r[0]).trim(),
        jenjang: r[1],
        nama: r[2],
        status: r[3],
        yayasan: r[4],             // Kolom E
        no_sk_pendirian: r[5],     // Kolom F
        tgl_pendirian: fmtDate(r[6]), // Kolom G
        no_sk_ijin: r[7],          // Kolom H
        tgl_ijin: fmtDate(r[8]),      // Kolom I
        akreditasi: r[9],          // Kolom J
        skor: r[10],               // Kolom K
        no_sertifikat: r[11],      // Kolom L
        tgl_sertifikat: fmtDate(r[12]), // Kolom M (Tgl Sertifikat)
        alamat: r[13],             // Kolom N (Asumsi Alamat bergeser ke N)
        telepon: r[14],            // Kolom O
        email: r[15],              // Kolom P
        search_key: (String(r[0]) + " " + String(r[2])).toLowerCase()
      };
    });
  } catch (e) {
    Logger.log("Error Get Master: " + e.toString());
    return [];
  }
}

function simpanLapbulSD_Complex(form, fileData) {
  return prosesSimpanLengkap(KONFIG_LAPBUL.SD_DB, "Input SD", "SD", form, fileData);
}

function simpanLapbulPAUD(form, fileData) {
  return prosesSimpanLengkap(KONFIG_LAPBUL.PAUD_DB, "Input PAUD", "PAUD", form, fileData);
}

function prosesSimpanLengkap(dbKey, namaSheet, source, form, fileData) {
  try {
    var sheet = getSheet(dbKey, namaSheet);
    var userLogin = form.user_login || "System";
    
    var headers = sheet.getRange(1, 1, 1, 300).getValues()[0].map(function(h) { 
      return String(h).toLowerCase().trim(); 
    });
    
    // Cek duplikasi periode (NPSN + Bulan + Tahun)
    var idxNpsn = headers.indexOf("npsn");
    var idxBulan = headers.indexOf("bulan");
    var idxTahun = headers.indexOf("tahun");
    if (idxNpsn > -1 && idxBulan > -1 && idxTahun > -1) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        var rangeValues = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
        var formNpsn = String(form.npsn || "").trim();
        var formBulan = String(form.bulan || "").trim().toUpperCase();
        var formTahun = String(form.tahun || "").trim();
        
        for (var r = 0; r < rangeValues.length; r++) {
          var rowVal = rangeValues[r];
          var rowNpsn = String(rowVal[idxNpsn]).trim();
          var rowBulan = String(rowVal[idxBulan]).trim().toUpperCase();
          var rowTahun = String(rowVal[idxTahun]).trim();
          
          if (rowNpsn === formNpsn && rowBulan === formBulan && rowTahun === formTahun) {
            return { success: false, message: "Laporan untuk periode " + form.bulan + " " + form.tahun + " sudah ada. Silakan gunakan menu Edit jika ingin mengubah data." };
          }
        }
      }
    }

    var fileUrl = "";
    if (fileData && fileData.data) {
      var folderId = "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El"; 
      var fileName = "Laporan " + source + " - " + form.nama_sekolah + " - " + form.bulan + " " + form.tahun + ".pdf";
      fileUrl = uploadFileToDrive(fileData, folderId, fileName);
    }
    
    var rowData = new Array(headers.length).fill(null); 

    var isi = function(daftarNama, nilai) {
      if (!Array.isArray(daftarNama)) daftarNama = [daftarNama];
      var nilaiFinal = (nilai === null || nilai === undefined) ? "" : String(nilai);
      for (var i = 0; i < daftarNama.length; i++) {
        var idx = headers.indexOf(daftarNama[i].toLowerCase());
        if (idx > -1) { rowData[idx] = nilaiFinal; return; }
      }
    };

    isi(["nama sekolah", "nama"], form.nama_sekolah);
    isi(["npsn"], form.npsn);
    isi(["bulan"], form.bulan);
    isi(["tahun"], form.tahun);
    isi(["jenjang"], form.jenjang);
    isi(["status sekolah", "status"], form.status_sekolah);
    isi(["rombel", "total rombel", "jumlah rombel"], form.total_rombel || form.jumlah_rombel);

    if (source === "PAUD") {
        isi("0-1 L", form.u01_l); isi("0-1 P", form.u01_p);
        isi("1-2 L", form.u12_l); isi("1-2 P", form.u12_p);
        isi("2-3 L", form.u23_l); isi("2-3 P", form.u23_p);
        isi("3-4 L", form.u34_l); isi("3-4 P", form.u34_p);
        isi("4-5 L", form.u45_l); isi("4-5 P", form.u45_p);
        isi("5-6 L", form.u56_l); isi("5-6 P", form.u56_p);
        isi(["> 6 L", ">6 l"], form.u6_l);  isi(["> 6 P", ">6 p"], form.u6_p);
        isi("A L", form.kel_a_l); isi("A P", form.kel_a_p);
        isi("B L", form.kel_b_l); isi("B P", form.kel_b_p);
        isi("KS GTY", form.ks_gty); isi("KS GTT", form.ks_gtt); isi("KS PNS", form.ks_pns); isi("KS PPPK", form.ks_pppk);
        isi("GK GTY", form.gk_gty); isi("GK GTT", form.gk_gtt); isi("GK PNS", form.gk_pns); isi("GK PPPK", form.gk_pppk);
        isi("GP GTY", form.gp_gty); isi("GP GTT", form.gp_gtt); isi("GP PNS", form.gp_pns); isi("GP PPPK", form.gp_pppk);
        isi(["Penjaga", "Penjaga Sekolah"], form.td_pjg_pty);
        isi(["TAS", "Tenaga Administrasi", "Adm"], form.td_tas_pty);
        isi(["Pustakawan", "Tenaga Perpustakaan"], form.td_pust_pty);
        isi(["Tendik Lain", "Tendik Lainnya"], form.td_lain_pty);
        
        // Guru Mapel (kolom BB-BE / index 53-56) & Guru Lainnya (kolom BF-BI / index 57-60)
        var mapPAUDCol = function(idx, headerSearch, formVal) {
            if (headers[idx]) {
                isi([headers[idx], headerSearch], formVal);
            } else {
                rowData[idx] = (formVal === null || formVal === undefined) ? "" : String(formVal);
            }
        };
        mapPAUDCol(53, "GM GTY", form.gm_gty);
        mapPAUDCol(54, "GM GTT", form.gm_gtt);
        mapPAUDCol(55, "GM PNS", form.gm_pns);
        mapPAUDCol(56, "GM PPPK", form.gm_pppk);
        mapPAUDCol(57, "GL GTY", form.gl_gty);
        mapPAUDCol(58, "GL GTT", form.gl_gtt);
        mapPAUDCol(59, "GL PNS", form.gl_pns);
        mapPAUDCol(60, "GL PPPK", form.gl_pppk);

        // Tendik Extended (kolom BJ-BU / index 61-72)
        mapPAUDCol(61, "TD PJG PTT", form.td_pjg_ptt);
        mapPAUDCol(62, "TD PJG PNS", form.td_pjg_pns);
        mapPAUDCol(63, "TD PJG PPPK", form.td_pjg_pppk);
        mapPAUDCol(64, "TD TAS PTT", form.td_tas_ptt);
        mapPAUDCol(65, "TD TAS PNS", form.td_tas_pns);
        mapPAUDCol(66, "TD TAS PPPK", form.td_tas_pppk);
        mapPAUDCol(67, "TD PUST PTT", form.td_pust_ptt);
        mapPAUDCol(68, "TD PUST PNS", form.td_pust_pns);
        mapPAUDCol(69, "TD PUST PPPK", form.td_pust_pppk);
        mapPAUDCol(70, "TD LAIN PTT", form.td_lain_ptt);
        mapPAUDCol(71, "TD LAIN PNS", form.td_lain_pns);
        mapPAUDCol(72, "TD LAIN PPPK", form.td_lain_pppk);
    } else {
        for (var key in form) { isi([key, key.replace(/_/g, " ")], form[key]); }
    }

    isi(["dokumen", "file laporan", "link file"], fileUrl);
    
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    isi(["waktu kirim", "tgl kirim", "tanggal kirim", "timestamp"], "'" + now);
    isi(["user kirim", "user input", "pengirim"], userLogin);
    isi(["dibaca oleh", "read by"], ""); // Reset status baca
    isi(["status data"], "Diproses"); // Set status data ke "Diproses" agar terhitung di rekap/dashboard
    if (source === "PAUD" && rowData.length > 73) {
        rowData = rowData.slice(0, 73);
    }

    if (source === "PAUD") {
        var lastRow = sheet.getLastRow();
        sheet.insertRowAfter(lastRow);
        var newRowId = lastRow + 1;

        // Tulis part 1 (kolom 1 s/d 50, index 0 s/d 49)
        var part1 = rowData.slice(0, 50);
        sheet.getRange(newRowId, 1, 1, part1.length).setValues([part1]);

        // Tulis part 2 (kolom 53 s/d 61, index 52 s/d 60)
        if (rowData.length > 52) {
            var part2 = rowData.slice(52);
            sheet.getRange(newRowId, 53, 1, part2.length).setValues([part2]);
        }
    } else {
        // SD: Lewati kolom HR & HS (indeks 225 & 226, 1-based kolom 226 & 227) agar ArrayFormula di baris 1 tidak terblokir (#REF!)
        var lastRow = sheet.getLastRow();
        sheet.insertRowAfter(lastRow);
        var newRowId = lastRow + 1;

        // Tulis part 1 (kolom 1 s/d 225, index 0 s/d 224)
        var part1 = rowData.slice(0, 225);
        sheet.getRange(newRowId, 1, 1, part1.length).setValues([part1]);

        // Tulis part 2 (kolom 228 onwards, index 227 onwards)
        if (rowData.length > 227) {
            var part2 = rowData.slice(227);
            sheet.getRange(newRowId, 228, 1, part2.length).setValues([part2]);
        }
    }
    
    if (typeof updateDataSekolahMaster === 'function') {
        updateDataSekolahMaster(form);
    }

    if (typeof invalidateNotifCache === 'function') {
        invalidateNotifCache("User", form.nama_sekolah);
    }
    if (form.tahun && form.bulan && typeof invalidateLapbulMetricCache === "function") {
      invalidateLapbulMetricCache(form.tahun, form.bulan);
    }

    return { success: true, message: "Laporan berhasil disimpan! (" + userLogin + ")" };

  } catch (e) {
    return { success: false, message: "Error Server: " + e.toString() };
  }
}

function updateDataSekolahMaster(form) {
  try {
    const sheet = getSheet(KONFIG_LAPBUL.USER_DB, "Data_Sekolah");
    const data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(form.npsn).trim()) {
        var updateRange = sheet.getRange(i + 1, 5, 1, 12); 
        var updateValues = [[
          form.yayasan, form.no_sk_pendirian, form.tgl_pendirian, 
          form.no_sk_ijin, form.tgl_ijin, form.akreditasi, 
          form.skor, form.no_sertifikat, form.tgl_sertifikat, 
          form.alamat, form.telepon, form.email              
        ]];
        updateRange.setValues(updateValues);
        break; 
      }
    }
  } catch(e) {}
}

function uploadFileToDrive(fileData, folderId, fileName) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error Upload"; }
}

/* ======================================================================
   3. MODUL: EDIT DATA (GET DETAIL & UPDATE)
   ====================================================================== */
function getDetailRowSD(rowId) { return getDetailGeneral(KONFIG_LAPBUL.SD_DB, "Input SD", rowId); }
function getDetailRowPAUD(rowId) { return getDetailGeneral(KONFIG_LAPBUL.PAUD_DB, "Input PAUD", rowId); }

function getDetailGeneral(dbKey, namaSheet, rowId) {
  var result = {};
  try {
    var sheet = getSheet(dbKey, namaSheet);
    if (!sheet) return { error: "Sheet tidak ditemukan!" };

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = sheet.getRange(parseInt(rowId), 1, 1, lastCol).getDisplayValues()[0];
    
    for (var i = 0; i < headers.length; i++) { result[String(headers[i]).trim()] = data[i]; }
    result.ROW_ID = rowId;
    return result;
  } catch (e) { return { error: "Error Backend: " + e.toString() }; }
}

function updateLapbulSD(form, fileData) { return prosesUpdateLengkap(KONFIG_LAPBUL.SD_DB, "Input SD", form, fileData); }
function updateLapbulPAUD(form, fileData) { return prosesUpdateLengkap(KONFIG_LAPBUL.PAUD_DB, "Input PAUD", form, fileData); }

function prosesUpdateLengkap(dbKey, namaSheet, form, fileData) {
  try {
    var sheet = getSheet(dbKey, namaSheet);
    var rowId = parseInt(form.EDIT_ROW_ID);
    
    var fileUrl = form.file_url_lama || ""; 
    if (fileData && fileData.data) {
       var folderId = "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El"; 
       fileUrl = uploadFileToDrive(fileData, folderId, "Laporan " + namaSheet + " - " + form.nama_sekolah + " - " + form.bulan + " " + form.tahun + " (Revisi)");
    }

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var currentRowData = sheet.getRange(rowId, 1, 1, lastCol).getValues()[0];
    var newRowData = [];

    var now = new Date();
    var strTglEdit = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var strUserEdit = form.user_login || "Admin";

    for (var i = 0; i < headers.length; i++) {
        var rawHeader = String(headers[i]).toLowerCase().trim();
        var keyForm = rawHeader.replace(/\s+/g, '_'); 
        
        if (i === 50 && namaSheet === "Input PAUD") {
            newRowData.push("");
        }
        else if (i === 51 && namaSheet === "Input PAUD") {
            newRowData.push("");
        }
        else if (rawHeader.includes("tgl edit") || rawHeader.includes("tanggal edit") || rawHeader.includes("update")) newRowData.push("'" + strTglEdit); 
        else if (rawHeader.includes("user edit") || rawHeader.includes("penyunting")) newRowData.push("'" + strUserEdit); 
        else if (rawHeader.includes("status data") || rawHeader === "status") newRowData.push("Diproses"); 
        else if (rawHeader.includes("dokumen") || rawHeader.includes("file")) newRowData.push(fileUrl);
        else if (rawHeader.includes("dibaca oleh") || rawHeader.includes("read by")) newRowData.push(""); // Reset status baca
        else if (i === 53 && namaSheet === "Input PAUD") {
            newRowData.push(form.gm_gty !== undefined ? form.gm_gty : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 54 && namaSheet === "Input PAUD") {
            newRowData.push(form.gm_gtt !== undefined ? form.gm_gtt : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 55 && namaSheet === "Input PAUD") {
            newRowData.push(form.gm_pns !== undefined ? form.gm_pns : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 56 && namaSheet === "Input PAUD") {
            newRowData.push(form.gm_pppk !== undefined ? form.gm_pppk : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 57 && namaSheet === "Input PAUD") {
            newRowData.push(form.gl_gty !== undefined ? form.gl_gty : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 58 && namaSheet === "Input PAUD") {
            newRowData.push(form.gl_gtt !== undefined ? form.gl_gtt : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 59 && namaSheet === "Input PAUD") {
            newRowData.push(form.gl_pns !== undefined ? form.gl_pns : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 60 && namaSheet === "Input PAUD") {
            newRowData.push(form.gl_pppk !== undefined ? form.gl_pppk : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        // Tendik Extended (kolom BJ-BU / index 61-72)
        else if (i === 61 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_pjg_ptt !== undefined ? form.td_pjg_ptt : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 62 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_pjg_pns !== undefined ? form.td_pjg_pns : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 63 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_pjg_pppk !== undefined ? form.td_pjg_pppk : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 64 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_tas_ptt !== undefined ? form.td_tas_ptt : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 65 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_tas_pns !== undefined ? form.td_tas_pns : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 66 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_tas_pppk !== undefined ? form.td_tas_pppk : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 67 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_pust_ptt !== undefined ? form.td_pust_ptt : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 68 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_pust_pns !== undefined ? form.td_pust_pns : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 69 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_pust_pppk !== undefined ? form.td_pust_pppk : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 70 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_lain_ptt !== undefined ? form.td_lain_ptt : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 71 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_lain_pns !== undefined ? form.td_lain_pns : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (i === 72 && namaSheet === "Input PAUD") {
            newRowData.push(form.td_lain_pppk !== undefined ? form.td_lain_pppk : (currentRowData[i] !== undefined ? currentRowData[i] : ""));
        }
        else if (form[keyForm] !== undefined) {
             var val = form[keyForm];
             if (rawHeader.includes("tgl") || rawHeader.includes("tanggal")) newRowData.push("'" + val); 
             else newRowData.push(val);
        }
        else newRowData.push(currentRowData[i]);
    }

    if (namaSheet === "Input PAUD" && newRowData.length > 73) {
        newRowData = newRowData.slice(0, 73);
    }

    if (namaSheet === "Input PAUD") {
        // Tulis part 1 (kolom 1 s/d 50, index 0 s/d 49)
        var part1 = newRowData.slice(0, 50);
        sheet.getRange(rowId, 1, 1, part1.length).setValues([part1]);

        // Tulis part 2 (kolom 53 s/d 61, index 52 s/d 60)
        if (newRowData.length > 52) {
            var part2 = newRowData.slice(52);
            sheet.getRange(rowId, 53, 1, part2.length).setValues([part2]);
        }
    } else {
        // SD: Lewati kolom HR & HS (indeks 225 & 226, 1-based kolom 226 & 227) agar ArrayFormula di baris 1 tidak terblokir (#REF!)
        // Tulis part 1 (kolom 1 s/d 225, index 0 s/d 224)
        var part1 = newRowData.slice(0, 225);
        sheet.getRange(rowId, 1, 1, part1.length).setValues([part1]);

        // Tulis part 2 (kolom 228 onwards, index 227 onwards)
        if (newRowData.length > 227) {
            var part2 = newRowData.slice(227);
            sheet.getRange(rowId, 228, 1, part2.length).setValues([part2]);
        }
    }
    SpreadsheetApp.flush(); 
    
    if (typeof invalidateNotifCache === 'function') {
        invalidateNotifCache("User", form.nama_sekolah);
    }

    return { 
        success: true, message: "Data berhasil diperbarui!",
        newData: { tglEdit: strTglEdit, userEdit: strUserEdit, statusData: "Diproses", fileUrl: fileUrl }
    };
  } catch (e) { return { success: false, message: "Gagal Update: " + e.toString() }; }
}

function processDeleteData(source, rowId, inputCode, userLogin) {
  try {
    var now = new Date();
    var serverCode = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd"); 
    if (String(inputCode).trim() !== serverCode) return { success: false, message: "Kode Keamanan Salah!" };

    var config = source === 'SD' 
      ? { dbKey: KONFIG_LAPBUL.SD_DB, sheetName: "Input SD", trashName: "Trash", folderId: "1MpEgpCDrTX-SHjdNIa3aUpKUyYZpejrb" }
      : { dbKey: KONFIG_LAPBUL.PAUD_DB, sheetName: "Input PAUD", trashName: "Trash", folderId: "1EUIOthRbotJQlSphxVZ-QAdewe17UCOU" };
 
    var sheetMain = getSheet(config.dbKey, config.sheetName);
    var sheetTrash = getSheet(config.dbKey, config.trashName);
    if (!sheetTrash) {
      var ss = getDB(config.dbKey);
      sheetTrash = ss.insertSheet(config.trashName);
    }
    
    var r = parseInt(rowId);
    var lastCol = sheetMain.getLastColumn();
    var rowValues = sheetMain.getRange(r, 1, 1, lastCol).getValues()[0];
    
    var fileUrl = "";
    var headers = sheetMain.getRange(1, 1, 1, lastCol).getValues()[0];
    for(var h=0; h<headers.length; h++) {
       if(String(headers[h]).toLowerCase().includes("file")) { fileUrl = rowValues[h]; break; }
    }

    var moveStatus = "File tidak dipindah";
    if (fileUrl && fileUrl.includes("drive.google.com")) {
       try {
         var fileId = fileUrl.match(/[-\w]{25,}/); 
         if (fileId) { DriveApp.getFileById(fileId[0]).moveTo(DriveApp.getFolderById(config.folderId)); moveStatus = "File di-Trash"; }
       } catch (err) { moveStatus = "Gagal pindah file"; }
    }

    var trashData = rowValues.slice(); 
    trashData.push("Dihapus: " + userLogin, "'" + Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"), moveStatus);
    sheetTrash.appendRow(trashData);
    sheetMain.deleteRow(r);

    if (typeof invalidateNotifCache === 'function') {
        var schoolName = "";
        var idxNama = headers.map(function(h) { return String(h).toLowerCase().trim(); }).indexOf("nama sekolah");
        if (idxNama === -1) idxNama = headers.map(function(h) { return String(h).toLowerCase().trim(); }).indexOf("nama");
        if (idxNama > -1) schoolName = rowValues[idxNama];
        invalidateNotifCache("User", schoolName);
    }

    return { success: true, message: "Data terhapus permanen." };
  } catch (e) { return { success: false, message: "Error System: " + e.toString() }; }
}

function processVerifikasiLapbul(source, rowId, status, keterangan, userLogin) {
  try {
    var config = source === 'SD' 
      ? { dbKey: KONFIG_LAPBUL.SD_DB, sheetName: "Input SD", colStatus: 219, colKet: 225, colTglVerif: 223, colUserVerif: 224 }
      : { dbKey: KONFIG_LAPBUL.PAUD_DB, sheetName: "Input PAUD", colStatus: 49, colKet: 50, colTglVerif: 47, colUserVerif: 48 };
 
    var sheet = getSheet(config.dbKey, config.sheetName);
    var r = parseInt(rowId);

    var now = new Date();
    var strTgl = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    sheet.getRange(r, config.colStatus).setValue(status);           
    sheet.getRange(r, config.colKet).setValue(keterangan);          
    sheet.getRange(r, config.colTglVerif).setValue("'" + strTgl);   
    sheet.getRange(r, config.colUserVerif).setValue(userLogin);     

    // Reset status baca agar User melihat notifikasi verifikasi baru
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var idxRead = headers.indexOf("dibaca oleh") > -1 ? headers.indexOf("dibaca oleh") : headers.indexOf("read by");
    if (idxRead > -1) {
        sheet.getRange(r, idxRead + 1).setValue("");
    }

    if (typeof invalidateNotifCache === 'function') {
        var idxNama = headers.indexOf("nama sekolah") > -1 ? headers.indexOf("nama sekolah") : headers.indexOf("nama");
        var schoolName = (idxNama > -1) ? sheet.getRange(r, idxNama + 1).getDisplayValue() : "";
        invalidateNotifCache("User", schoolName);
    }
    try {
      var tahunRow = sheet.getRange(r, 4).getDisplayValue();
      if (tahunRow && typeof invalidateLapbulMetricCacheForYear === "function") {
        invalidateLapbulMetricCacheForYear(tahunRow);
      }
    } catch (eInv) {}

    return { 
      success: true, message: "Berhasil verifikasi",
      newData: { status: status, ket: keterangan, tgl: strTgl, user: userLogin }
    };
  } catch (e) { return { success: false, message: "Gagal Verifikasi: " + e.toString() }; }
}

/* ======================================================================
   4. MODUL: STATUS PENGIRIMAN (HALAMAN LAPBUL_STATUS)
   ====================================================================== */
function getRekapLapbulStatus(filterTahun) {
  var result = { rows: [] };
  
  var fetchData = function(dbKey, sheetName, defaultJenjang) {
    var temp = [];
    try {
      var sheet = getSheet(dbKey, sheetName);
      if (!sheet) return [];
      
      var data = sheet.getDataRange().getDisplayValues();
      if (data.length < 3) return []; 

      for (var i = 2; i < data.length; i++) {
        var row = data[i];
        var rTahun = String(row[3] || "").trim(); 
        if (filterTahun && rTahun !== String(filterTahun)) continue;

        var cleanRow = [row[0], row[1], String(row[2] || defaultJenjang).toUpperCase().trim(), rTahun];
        for(var c = 4; c < row.length; c++) { cleanRow.push(row[c]); }
        temp.push(cleanRow);
      }
    } catch (e) {}
    return temp;
  };

  try {
    var rowsSD = fetchData(KONFIG_LAPBUL.SD_DB, "Status SD", "SD");
    var rowsPAUD = fetchData(KONFIG_LAPBUL.PAUD_DB, "Status PAUD", "PAUD");
    result.rows = rowsSD.concat(rowsPAUD);
  } catch(e) { result.error = e.toString(); }
  return result;
}

/* ======================================================================
   5. MODUL DASHBOARD: METRIK LAPBUL (VAKSIN BASELINE ABSOLUT)
   ====================================================================== */
function getLapbulMetric_SD(tahun, bulan) {
  return processSheetDashboard(KONFIG_LAPBUL.SD_DB, "Status SD", tahun, bulan, ["SD"]);
}

function getLapbulMetric_PAUD(tahun, bulan) {
  return processSheetDashboard(KONFIG_LAPBUL.PAUD_DB, "Status PAUD", tahun, bulan, ["TK", "KB", "SPS", "TPA"]);
}

function processSheetDashboard(dbKey, sheetName, tahun, bulan, targetJenjangArray) {
  var cacheKey = lapbulMetricCacheKey(dbKey, sheetName, tahun, bulan, targetJenjangArray);
  return getCachedJsonString(cacheKey, function() {
    return processSheetDashboardCore_(dbKey, sheetName, tahun, bulan, targetJenjangArray);
  }, 300);
}

function processSheetDashboardCore_(dbKey, sheetName, tahun, bulan, targetJenjangArray) {
  var result = { recent: [] };

  targetJenjangArray.forEach(function(j) {
    result[j.toLowerCase()] = { 
        total:0, sudah:0, belum:0, persen:0, 
        disetujui:0, diproses:0, revisi:0, ditolak:0,
        listBelum: [] 
    };
  });

  try {
    var schoolMap = {};
        
    // VAKSIN 1: TARIK MASTER SEKOLAH SEBAGAI BASELINE ABSOLUT
    // Ini menjamin "Total Sekolah" tidak akan pernah berkurang meski sekolah tsb pasif 1 tahun penuh
    try {
        var sheetMaster = getSheet(KONFIG_LAPBUL.USER_DB, "Data_Sekolah");
        if (sheetMaster) {
            var masterData = sheetMaster.getDataRange().getDisplayValues();
            for (var m = 1; m < masterData.length; m++) {
               var rStat = String(masterData[m][3] || "").toLowerCase();
               // Jangan hitung sekolah yang sudah tutup/nonaktif
               if(rStat.indexOf("tutup") > -1 || rStat.indexOf("non") > -1) continue; 

               var mJenjang = String(masterData[m][1] || "").trim().toUpperCase();
               if (targetJenjangArray.indexOf(mJenjang) > -1) {
                   var mNama = String(masterData[m][2] || "").trim();
                   var mNpsn = String(masterData[m][0] || "").trim();
                   var sKey = mNpsn ? mNpsn : mNama;
                   
                   schoolMap[sKey] = {
                       nama: mNama,
                       jenjang: mJenjang.toLowerCase(),
                       status: "-" // Secara bawaan divonis Belum Lapor
                   };
               }
            }
        }
    } catch(em) { Logger.log("Gagal muat Master Sekolah: " + em.toString()); }

    // VAKSIN 2: TARIK DATA TRANSAKSI & TIMPA STATUSNYA
    var sheet = getSheet(dbKey, sheetName);
    
    if (sheet) {
        var data = sheet.getDataRange().getDisplayValues();
        if (data.length >= 3) { 
            // Penerjemah Bulan (1 -> Index Kolom)
            var bIndex = parseInt(bulan, 10);
            if (isNaN(bIndex)) {
                var months = ["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
                bIndex = months.indexOf(String(bulan).toLowerCase()) + 1;
            }
            
            if (bIndex >= 1 && bIndex <= 12) {
                var idxStatus = bIndex + 3; // Index kolom status bulan bersangkutan
                
                for (var i = 2; i < data.length; i++) {
                  var row = data[i];
                  var rNama = String(row[0]).trim();
                  var rNpsn = String(row[1]).trim();
                  var rJenjang = String(row[2]).trim().toUpperCase();
                  var rTahun = String(row[3]).trim();

                  if (rTahun !== String(tahun).trim()) continue;
                  if (targetJenjangArray.indexOf(rJenjang) === -1) continue;

                  var rawStatus = String(row[idxStatus] || "").trim();
                  var schoolKey = rNpsn ? rNpsn : rNama;

                  if (!schoolMap[schoolKey]) {
                      // Safety-net: Jika sekolah tidak terdaftar di master tapi ada di transaksi
                      schoolMap[schoolKey] = {
                          nama: rNama,
                          jenjang: rJenjang.toLowerCase(),
                          status: rawStatus
                      };
                  } else {
                      // Timpa status default dengan status dari sheet
                      var oldStatus = schoolMap[schoolKey].status.toLowerCase();
                      if (oldStatus === "" || oldStatus === "-" || oldStatus === "0") {
                          schoolMap[schoolKey].status = rawStatus;
                      }
                  }
                }
            }
        }
    }

    // 3. PENGHITUNGAN MATEMATIS KONSISTEN (TOTAL = SUDAH + BELUM)
    for (var sk in schoolMap) {
        var sData = schoolMap[sk];
        var stats = result[sData.jenjang];
        var st = sData.status.toLowerCase();

        stats.total++; // Menghitung total base absolut dari Master

        if (st === "" || st === "-" || st === "0") {
          stats.belum++;
          stats.listBelum.push(sData.nama); 
        } else {
          stats.sudah++;
          
          if (st.includes('revisi') || st.includes('perbaiki')) stats.revisi++;
          else if (st.includes('tolak') || st.includes('x') || st.includes('salah')) stats.ditolak++;
          else if (st.includes('ok') || st.includes('setuju') || st.includes('valid')) stats.disetujui++;
          else stats.diproses++;

          if (result.recent.length < 10) {
             result.recent.push({ sekolah: sData.nama, jenjang: sData.jenjang.toUpperCase(), status: sData.status });
          }
        }
    }

    // 4. FINALISASI PERSENTASE & SORTING
    targetJenjangArray.forEach(function(j) {
       var k = j.toLowerCase();
       var s = result[k];
       s.persen = s.total === 0 ? 0 : Math.round((s.sudah / s.total) * 100);
       s.listBelum.sort(); 
    });
  } catch (e) { result.error = e.toString(); }

  return JSON.stringify(result);
}

/* ======================================================================
   6. MODULE: NOTIFIKASI LAPBUL (GLOBAL)
   ====================================================================== */
function getNotifikasiLapbul(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var notifList = [];
    var unreadCount = 0;

    var fetchNotifSource = function(dbKey, sheetName, sourceLabel) {
      try {
        var sheet = getSheet(dbKey, sheetName);
        if (!sheet) return;

        var lastRow = sheet.getLastRow();
        if (lastRow < 2) return;

        var lastCol = sheet.getLastColumn();
        var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
        
        var idxRead = headers.indexOf("dibaca oleh") > -1 ? headers.indexOf("dibaca oleh") : headers.indexOf("read by");
        if (idxRead === -1) {
          var newCol = lastCol + 1;
          sheet.getRange(1, newCol).setValue("dibaca oleh");
          SpreadsheetApp.flush();
          headers.push("dibaca oleh");
          idxRead = headers.length - 1;
          lastCol = newCol;
        }

        var idx = {
          nama: headers.indexOf("nama sekolah") > -1 ? headers.indexOf("nama sekolah") : headers.indexOf("nama"),
          bulan: headers.indexOf("bulan"),
          tahun: headers.indexOf("tahun"),
          status: headers.indexOf("status data") > -1 ? headers.indexOf("status data") : headers.indexOf("status"),
          tglKirim: headers.indexOf("tgl kirim") > -1 ? headers.indexOf("tgl kirim") : headers.indexOf("waktu kirim"),
          tglVerif: headers.indexOf("tgl verif") > -1 ? headers.indexOf("tgl verif") : headers.indexOf("waktu verif"),
          readBy: idxRead
        };

        var readByMissing = false;

        var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
        
        data.forEach(function(row, i) {
          var rowNum = i + 2;
          var status = String(row[idx.status] || "Diproses").trim();
          var isDiproses = (status === "Diproses" || status === "");
          var isTarget = false;
          var rNama = String(row[idx.nama] || "").trim();

          if (isAdmin) {
            isTarget = isDiproses;
          } else {
            isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);
          }

          if (isTarget) {
            var isRead = false;
            if (!readByMissing) {
                var readBy = String(row[idx.readBy] || "").trim();
                var readByList = readBy === "" ? [] : readBy.split(",");
                if (isAdmin && readByList.indexOf("Admin") > -1) isRead = true;
                if (!isAdmin && readByList.indexOf("User") > -1) isRead = true;
            }

            
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
                  rowId: rowNum,
                  source: sourceLabel, // SD atau PAUD
                  namaSd: rNama,
                  kriteria: "Laporan Bulan " + row[idx.bulan] + " " + row[idx.tahun],
                  status: status,
                  waktu: (idx.tglVerif > -1 && row[idx.tglVerif] && !isDiproses) ? row[idx.tglVerif] : row[idx.tglKirim],
                  isRead: isRead
                });
            }
          }
        });
      } catch (e) {}
    };

    fetchNotifSource(KONFIG_LAPBUL.SD_DB, "Input SD", "SD");
    fetchNotifSource(KONFIG_LAPBUL.PAUD_DB, "Input PAUD", "PAUD");

    // Urutkan (Paling baru dulu)
    notifList.sort(function(a, b) {
        return parseSiabaDateTime(b.waktu) - parseSiabaDateTime(a.waktu);
    });

    return {
      count: unreadCount,
      recent: notifList
    };
  } catch (e) {
    return { count: 0, recent: [] };
  }
}

function tandaiNotifLapbulDibaca(rowId, source, role) {
  try {
    var dbKey = (source === "SD") ? KONFIG_LAPBUL.SD_DB : KONFIG_LAPBUL.PAUD_DB;
    var sheetName = (source === "SD") ? "Input SD" : "Input PAUD";
    
    var sheet = getSheet(dbKey, sheetName);
    var rIdx = parseInt(rowId);
    
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
    var idxRead = headers.indexOf("dibaca oleh") > -1 ? headers.indexOf("dibaca oleh") : headers.indexOf("read by");
    
    if (idxRead === -1) {
      var newCol = lastCol + 1;
      sheet.getRange(1, newCol).setValue("dibaca oleh");
      SpreadsheetApp.flush();
      headers.push("dibaca oleh");
      idxRead = headers.length - 1;
    }

    var currentReadBy = String(sheet.getRange(rIdx, idxRead + 1).getDisplayValue() || "").trim();
    var readMark = (role === "Admin") ? "Admin" : "User";
    
    if (currentReadBy === "") {
        sheet.getRange(rIdx, idxRead + 1).setValue(readMark);
    } else {
        var list = currentReadBy.split(",");
        if (list.indexOf(readMark) === -1) {
            list.push(readMark);
            sheet.getRange(rIdx, idxRead + 1).setValue(list.join(","));
        }
    }
    return true;
  } catch (e) { return false; }
}

function tandaiSemuaNotifLapbulDibaca(role, unit) {
  try {
    var rLower = String(role || "").toLowerCase();
    var isAdmin = (rLower.indexOf('admin') > -1 || rLower.indexOf('verifikator') > -1 || rLower.indexOf('korwil') > -1);
    var readMark = isAdmin ? "Admin" : "User";

    var processSheet = function(dbKey, sheetName) {
      var sheet = getSheet(dbKey, sheetName);
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;

      var lastCol = sheet.getLastColumn();
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
      var idxRead = headers.indexOf("dibaca oleh") > -1 ? headers.indexOf("dibaca oleh") : headers.indexOf("read by");
      var idxStatus = headers.indexOf("status data") > -1 ? headers.indexOf("status data") : headers.indexOf("status");
      var idxNama = headers.indexOf("nama sekolah") > -1 ? headers.indexOf("nama sekolah") : headers.indexOf("nama");
      
      if (idxRead === -1) {
        var newCol = lastCol + 1;
        sheet.getRange(1, newCol).setValue("dibaca oleh");
        SpreadsheetApp.flush();
        headers.push("dibaca oleh");
        idxRead = headers.length - 1;
        lastCol = newCol;
      }

      var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
      var range = sheet.getRange(2, idxRead + 1, lastRow - 1, 1);
      var values = range.getValues();

      for (var i = 0; i < data.length; i++) {
        var status = String(data[i][idxStatus] || "Diproses").trim();
        var isDiproses = (status === "Diproses" || status === "");
        var rNama = String(data[i][idxNama] || "").trim();
        
        var isTarget = false;
        if (isAdmin) isTarget = isDiproses;
        else isTarget = (rNama.toUpperCase() === String(unit).trim().toUpperCase() && !isDiproses);

        if (isTarget) {
          var current = String(values[i][0]).trim();
          if (current === "") values[i][0] = readMark;
          else {
            var list = current.split(",");
            if (list.indexOf(readMark) === -1) {
              list.push(readMark);
              values[i][0] = list.join(",");
            }
          }
        }
      }
      range.setValues(values);
    };

    processSheet(KONFIG_LAPBUL.SD_DB, "Input SD");
    processSheet(KONFIG_LAPBUL.PAUD_DB, "Input PAUD");
    return true;
  } catch (e) { return false; }
}