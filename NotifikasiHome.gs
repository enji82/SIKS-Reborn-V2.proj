/**
 * NotifikasiHome.gs - ENGINE CHECKER DOKUMEN BELUM DIUNGGAH
 * Digunakan untuk menampilkan pesan berjalan (marquee) di Halaman Beranda (Home).
 */

function getMissingDocumentsReport(username, role, unit) {
  try {
    var uName = String(username || "").trim();
    var uRole = String(role || "").toLowerCase();
    var uUnit = String(unit || "").trim();
    
    // 1. Jika admin/korwil/verifikator, tidak perlu cek dokumen
    var isAdmin = (uRole.indexOf('admin') > -1 || uRole.indexOf('verifikator') > -1 || uRole.indexOf('korwil') > -1);
    if (isAdmin) {
      return { show: false };
    }
    
    // 2. Identifikasi jenjang dan status sekolah secara presisi dari database Data_Sekolah
    var isSD = false;
    var isPAUD = false;
    var isSDNegeri = false;
    
    var infoSekolah = getSekolahByNPSN(uName);
    if (infoSekolah && infoSekolah.found) {
      var jenjang = String(infoSekolah.jenjang).toUpperCase().trim();
      var status = String(infoSekolah.status_sekolah).toLowerCase().trim();
      
      if (jenjang.indexOf("SD") > -1) {
        isSD = true;
        if (status.indexOf("negeri") > -1) {
          isSDNegeri = true;
        }
      } else {
        isPAUD = true;
      }
    } else {
      // Fallback jika tidak ditemukan di Data_Sekolah
      isPAUD = (uRole.indexOf('paud') > -1 || uRole.indexOf('tk') > -1 || uUnit.toLowerCase().indexOf('paud') > -1 || uUnit.toLowerCase().indexOf('tk ') > -1);
      isSD = (uRole.indexOf('sd') > -1 || uUnit.toLowerCase().indexOf('sd') > -1);
      isSDNegeri = isSD && !isPAUD && (uUnit.toLowerCase().indexOf('sdn') > -1 || uUnit.toLowerCase().indexOf('negeri') > -1 || uName.toLowerCase().indexOf('sdn') > -1);
    }
    
    var missingLapbul = [];
    var missingSiaba = [];
    var missingSK = false;
    
    var today = new Date();
    var currentYear = today.getFullYear();
    var currentMonth = today.getMonth(); // 0 = Jan, 11 = Dec
    
    // Daftar bulan Indonesia
    var arrBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    // Tentukan bulan wajib lapor di tahun berjalan
    // Secara default, bulan yang wajib lapor adalah bulan berjalan dikurangi 1 (Januari s.d. bulan sebelum saat ini)
    var targetBulanLimit = currentMonth; 
    if (targetBulanLimit < 0) targetBulanLimit = 0;
    
    // A. CEK LAPORAN BULANAN (SD & PAUD)
    var dbKeyLapbul = isPAUD ? "LAPBUL_PAUD_DB" : "LAPBUL_SD_DB";
    var sheetNameLapbul = isPAUD ? "Input PAUD" : "Input SD";
    
    var sheetLapbul = null;
    try {
      sheetLapbul = getSheet(dbKeyLapbul, sheetNameLapbul);
    } catch(e) {
      Logger.log("Sheet Lapbul tidak dapat dibuka: " + e.message);
    }
    
    var uploadedMonthsLapbul = [];
    if (sheetLapbul) {
      var lastRow = sheetLapbul.getLastRow();
      if (lastRow >= 2) {
        var headers = sheetLapbul.getRange(1, 1, 1, sheetLapbul.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var idxNpsn = headers.indexOf("npsn");
        var idxBulan = headers.indexOf("bulan");
        var idxTahun = headers.indexOf("tahun");
        var idxStatus = headers.indexOf("status data") > -1 ? headers.indexOf("status data") : headers.indexOf("status");
        
        if (idxNpsn > -1 && idxBulan > -1 && idxTahun > -1) {
          var data = sheetLapbul.getRange(2, 1, lastRow - 1, sheetLapbul.getLastColumn()).getDisplayValues();
          data.forEach(function(row) {
            var rowNpsn = String(row[idxNpsn]).trim().replace(/\.0+$/, "");
            var rowTahun = String(row[idxTahun]).trim();
            var rowBulan = String(row[idxBulan]).trim();
            var rowStatus = idxStatus > -1 ? String(row[idxStatus]).toLowerCase() : "";
            
            if ((rowNpsn === uName || row.indexOf(uName) > -1) && rowTahun === String(currentYear) && !rowStatus.includes("hapus") && !rowStatus.includes("delete")) {
              uploadedMonthsLapbul.push(rowBulan.toLowerCase());
            }
          });
        }
      }
    }
    
    for (var i = 0; i < targetBulanLimit; i++) {
      var bName = arrBulan[i];
      if (uploadedMonthsLapbul.indexOf(bName.toLowerCase()) === -1) {
        missingLapbul.push(bName + " " + currentYear);
      }
    }
    
    // B. CEK SK PEMBAGIAN TUGAS (Khusus SD)
    var skSemesterAktif = "";
    var skTahunAjaranAktif = "";
    if (isSD) {
      // Tentukan Semester & Tahun Ajaran Aktif
      // Juli - Desember: Ganjil (cth: 2026/2027)
      // Januari - Juni: Genap (cth: 2025/2026)
      if (currentMonth >= 6) { // Juli s.d. Desember
        skSemesterAktif = "Ganjil";
        skTahunAjaranAktif = currentYear + "/" + (currentYear + 1);
      } else {
        skSemesterAktif = "Genap";
        skTahunAjaranAktif = (currentYear - 1) + "/" + currentYear;
      }
      
      var sheetSK = null;
      try {
        sheetSK = getSheet("SK_DATA_DB", "Unggah_SK");
      } catch(e) {
        Logger.log("Sheet SK tidak dapat dibuka: " + e.message);
      }
      
      var hasSK = false;
      if (sheetSK) {
        var lastRowSK = sheetSK.getLastRow();
        if (lastRowSK >= 2) {
          var headersSK = sheetSK.getRange(1, 1, 1, sheetSK.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
          var idxNpsnSK = headersSK.indexOf("npsn");
          if (idxNpsnSK === -1) idxNpsnSK = 17; // fallback ke kolom ke-18 (R)
          
          var idxSemesterSK = headersSK.indexOf("semester");
          var idxTahunSK = headersSK.indexOf("tahun ajaran") > -1 ? headersSK.indexOf("tahun ajaran") : headersSK.indexOf("tahun");
          var idxStatusSK = headersSK.indexOf("status data") > -1 ? headersSK.indexOf("status data") : headersSK.indexOf("status");
          
          var dataSK = sheetSK.getRange(2, 1, lastRowSK - 1, sheetSK.getLastColumn()).getDisplayValues();
          for (var j = 0; j < dataSK.length; j++) {
            var row = dataSK[j];
            var rowNpsn = String(row[idxNpsnSK]).trim().replace(/\.0+$/, "");
            var rowSemester = idxSemesterSK > -1 ? String(row[idxSemesterSK]).trim() : "";
            var rowTahun = idxTahunSK > -1 ? String(row[idxTahunSK]).trim() : "";
            var rowStatus = idxStatusSK > -1 ? String(row[idxStatusSK]).toLowerCase() : "";
            
            var npsnMengandung = (rowNpsn === uName) || (row.indexOf(uName) > -1);
            
            if (npsnMengandung && 
                rowSemester.toLowerCase() === skSemesterAktif.toLowerCase() && 
                rowTahun.replace(/\s+/g, '') === skTahunAjaranAktif.replace(/\s+/g, '') &&
                !rowStatus.includes("hapus") && !rowStatus.includes("delete")) {
              hasSK = true;
              break;
            }
          }
        }
      }
      if (!hasSK) {
        missingSK = true;
      }
    }
    
    // C. CEK REKAP SIABA (Khusus SD Negeri)
    if (isSDNegeri) {
      var sheetSiaba = null;
      try {
        sheetSiaba = getSheet("ARSIP_SIABA_DB", "arsip_siaba");
      } catch(e) {
        Logger.log("Sheet SIABA tidak dapat dibuka: " + e.message);
      }
      
      var uploadedMonthsSiaba = [];
      if (sheetSiaba) {
        var lastRowSiaba = sheetSiaba.getLastRow();
        if (lastRowSiaba >= 2) {
          var headersSiaba = sheetSiaba.getRange(1, 1, 1, sheetSiaba.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
          var idxNpsnSiaba = headersSiaba.indexOf("npsn");
          if (idxNpsnSiaba === -1) {
            idxNpsnSiaba = headersSiaba.indexOf("unit kerja") > -1 ? headersSiaba.indexOf("unit kerja") : 0;
          }
          var idxBulanSiaba = headersSiaba.indexOf("bulan");
          var idxTahunSiaba = headersSiaba.indexOf("tahun");
          
          var dataSiaba = sheetSiaba.getRange(2, 1, lastRowSiaba - 1, sheetSiaba.getLastColumn()).getDisplayValues();
          dataSiaba.forEach(function(row) {
            var rowIden = String(row[idxNpsnSiaba]).trim().replace(/\.0+$/, "").toLowerCase();
            var rowTahun = String(row[idxTahunSiaba]).trim();
            var rowBulan = String(row[idxBulanSiaba]).trim();
            
            var matchesNpsnOrUnit = (rowIden === uName.toLowerCase()) || 
                                    (rowIden === uUnit.toLowerCase()) || 
                                    (row.indexOf(uName) > -1);
            
            if (matchesNpsnOrUnit && rowTahun === String(currentYear)) {
              uploadedMonthsSiaba.push(rowBulan.toLowerCase());
            }
          });
        }
      }
      
      for (var i = 0; i < targetBulanLimit; i++) {
        var bName = arrBulan[i];
        if (uploadedMonthsSiaba.indexOf(bName.toLowerCase()) === -1) {
          missingSiaba.push(bName + " " + currentYear);
        }
      }
    }
    
    // Susun kalimat peringatan
    var messages = [];
    if (missingSK) {
      messages.push("Anda belum mengunggah SK Pembagian Tugas Semester " + skSemesterAktif + " TA " + skTahunAjaranAktif + ".");
    }
    if (missingLapbul.length > 0) {
      messages.push("Anda belum mengunggah Laporan Bulan " + formatListSentence_(missingLapbul) + ".");
    }
    if (missingSiaba.length > 0) {
      messages.push("Anda belum mengirimkan rekap SIABA bulan " + formatListSentence_(missingSiaba) + ".");
    }
    
    return {
      show: true,
      hasWarning: messages.length > 0,
      warnings: messages,
      messageHtml: messages.join(" ")
    };
    
  } catch (e) {
    Logger.log("Error getMissingDocumentsReport: " + e.toString());
    return { show: false, error: e.toString() };
  }
}

// Helper: Merangkai array menjadi kalimat terpisah koma dan diakhiri "dan"
function formatListSentence_(arr) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + " dan " + arr[1];
  return arr.slice(0, -1).join(", ") + ", dan " + arr[arr.length - 1];
}
