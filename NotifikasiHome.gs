/**
 * NotifikasiHome.gs - ENGINE CHECKER DOKUMEN BELUM DIUNGGAH
 * Digunakan untuk menampilkan pesan berjalan (marquee) di Halaman Beranda (Home).
 */

function getMissingDocumentsReport(username, role, unit) {
  try {
    var uName = String(username || "").trim();
    var uRole = String(role || "").toLowerCase();
    var uUnit = String(unit || "").trim();
    
    Logger.log("=== RUN getMissingDocumentsReport ===");
    Logger.log("User: " + uName + " | Role: " + uRole + " | Unit: " + uUnit);
    
    // 1. Jika admin/korwil/verifikator, tidak perlu cek dokumen
    var isAdmin = (uRole.indexOf('admin') > -1 || uRole.indexOf('verifikator') > -1 || uRole.indexOf('korwil') > -1);
    if (isAdmin) {
      Logger.log("User is Admin/Verifikator/Korwil. Bypassing check.");
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
      
      Logger.log("Database Data_Sekolah Match -> Jenjang: " + jenjang + " | Status: " + status);
      
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
      Logger.log("NPSN not found in Data_Sekolah. Using text-based fallback.");
      isPAUD = (uRole.indexOf('paud') > -1 || uRole.indexOf('tk') > -1 || uUnit.toLowerCase().indexOf('paud') > -1 || uUnit.toLowerCase().indexOf('tk ') > -1);
      isSD = (uRole.indexOf('sd') > -1 || uUnit.toLowerCase().indexOf('sd') > -1);
      isSDNegeri = isSD && !isPAUD && (uUnit.toLowerCase().indexOf('sdn') > -1 || uUnit.toLowerCase().indexOf('negeri') > -1 || uName.toLowerCase().indexOf('sdn') > -1);
    }
    
    Logger.log("Identifikasi Akhir -> isSD: " + isSD + " | isPAUD: " + isPAUD + " | isSDNegeri: " + isSDNegeri);
    
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
    
    Logger.log("Periode Deteksi -> Tahun: " + currentYear + " | Bulan Indeks: " + currentMonth + " | Limit Bulan Pengecekan: " + targetBulanLimit);
    
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
      var dataLapbul = sheetLapbul.getDataRange().getDisplayValues();
      if (dataLapbul.length >= 2) {
        var headers = dataLapbul[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var idxNpsn = headers.indexOf("npsn");
        var idxBulan = headers.indexOf("bulan");
        var idxTahun = headers.indexOf("tahun");
        var idxStatus = headers.indexOf("status data") > -1 ? headers.indexOf("status data") : headers.indexOf("status");
        
        // Fallbacks jika index headers tidak cocok
        if (idxNpsn === -1) idxNpsn = 0;
        if (idxBulan === -1) idxBulan = 1;
        if (idxTahun === -1) idxTahun = 2;
        
        for (var k = 1; k < dataLapbul.length; k++) {
          var row = dataLapbul[k];
          var rowNpsn = idxNpsn < row.length ? String(row[idxNpsn]).trim().replace(/\.0+$/, "") : "";
          var rowTahun = idxTahun < row.length ? String(row[idxTahun]).trim() : "";
          var rowBulan = idxBulan < row.length ? String(row[idxBulan]).trim() : "";
          var rowStatus = (idxStatus > -1 && idxStatus < row.length) ? String(row[idxStatus]).toLowerCase() : "";
          
          var isMatch = (rowNpsn === uName) || (row.indexOf(uName) > -1);
          if (isMatch && rowTahun === String(currentYear) && !rowStatus.includes("hapus") && !rowStatus.includes("delete")) {
            uploadedMonthsLapbul.push(rowBulan.toLowerCase());
          }
        }
      }
    }
    
    for (var i = 0; i < targetBulanLimit; i++) {
      var bName = arrBulan[i];
      if (uploadedMonthsLapbul.indexOf(bName.toLowerCase()) === -1) {
        missingLapbul.push(bName + " " + currentYear);
      }
    }
    Logger.log("Lapbul Terunggah: " + JSON.stringify(uploadedMonthsLapbul) + " | Missing: " + JSON.stringify(missingLapbul));
    
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
      
      Logger.log("Target SK Aktif -> Semester: " + skSemesterAktif + " | TA: " + skTahunAjaranAktif);
      
      var sheetSK = null;
      try {
        sheetSK = getSheet("SK_DATA_DB", "Unggah_SK");
      } catch(e) {
        Logger.log("Sheet SK tidak dapat dibuka: " + e.message);
      }
      
      var hasSK = false;
      if (sheetSK) {
        var dataSK = sheetSK.getDataRange().getDisplayValues();
        if (dataSK.length >= 2) {
          var headersSK = dataSK[0].map(function(h) { return String(h).toLowerCase().trim(); });
          var idxNpsnSK = headersSK.indexOf("npsn");
          var idxSemesterSK = headersSK.indexOf("semester");
          var idxTahunSK = headersSK.indexOf("tahun ajaran") > -1 ? headersSK.indexOf("tahun ajaran") : headersSK.indexOf("tahun");
          var idxStatusSK = headersSK.indexOf("status data") > -1 ? headersSK.indexOf("status data") : headersSK.indexOf("status");
          
          // Fallbacks jika index headers tidak cocok
          if (idxNpsnSK === -1) idxNpsnSK = 17; // kolom ke-18
          if (idxTahunSK === -1) idxTahunSK = 2; // kolom ke-3
          if (idxSemesterSK === -1) idxSemesterSK = 3; // kolom ke-4
          
          for (var j = 1; j < dataSK.length; j++) {
            var row = dataSK[j];
            var rowNpsn = idxNpsnSK < row.length ? String(row[idxNpsnSK]).trim().replace(/\.0+$/, "") : "";
            var rowSemester = idxSemesterSK < row.length ? String(row[idxSemesterSK]).trim() : "";
            var rowTahun = idxTahunSK < row.length ? String(row[idxTahunSK]).trim() : "";
            var rowStatus = (idxStatusSK > -1 && idxStatusSK < row.length) ? String(row[idxStatusSK]).toLowerCase() : "";
            
            var npsnMengandung = (rowNpsn === uName) || (row.indexOf(uName) > -1);
            
            // Normalize spaces and slashes for TA comparison (e.g. 2026/2027 vs 2026-2027 or spaces)
            var normRowTahun = rowTahun.replace(/[-\s]/g, '/');
            var normTargetTahun = skTahunAjaranAktif.replace(/[-\s]/g, '/');
            
            if (npsnMengandung && 
                rowSemester.toLowerCase() === skSemesterAktif.toLowerCase() && 
                normRowTahun === normTargetTahun &&
                !rowStatus.includes("hapus") && !rowStatus.includes("delete")) {
              hasSK = true;
              Logger.log("SK Ditemukan pada baris " + (j + 1) + " -> No SK: " + row[4]);
              break;
            }
          }
        }
      }
      if (!hasSK) {
        missingSK = true;
      }
      Logger.log("Hasil Cek SK -> missingSK: " + missingSK);
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
        var dataSiaba = sheetSiaba.getDataRange().getDisplayValues();
        if (dataSiaba.length >= 2) {
          var headersSiaba = dataSiaba[0].map(function(h) { return String(h).toLowerCase().trim(); });
          var idxNpsnSiaba = headersSiaba.indexOf("npsn");
          var idxBulanSiaba = headersSiaba.indexOf("bulan");
          var idxTahunSiaba = headersSiaba.indexOf("tahun");
          
          // Fallbacks jika index headers tidak cocok
          if (idxNpsnSiaba === -1) idxNpsnSiaba = 8;
          if (idxBulanSiaba === -1) idxBulanSiaba = 1;
          if (idxTahunSiaba === -1) idxTahunSiaba = 2;
          
          for (var m = 1; m < dataSiaba.length; m++) {
            var row = dataSiaba[m];
            var rowNpsn = idxNpsnSiaba < row.length ? String(row[idxNpsnSiaba]).trim().replace(/\.0+$/, "").toLowerCase() : "";
            var rowTahun = idxTahunSiaba < row.length ? String(row[idxTahunSiaba]).trim() : "";
            var rowBulan = idxBulanSiaba < row.length ? String(row[idxBulanSiaba]).trim() : "";
            var rowUnit = row[0] ? String(row[0]).trim().toLowerCase() : "";
            
            var matchesNpsnOrUnit = (rowNpsn === uName.toLowerCase()) || 
                                    (rowUnit === uUnit.toLowerCase()) || 
                                    (row.indexOf(uName) > -1);
            
            if (matchesNpsnOrUnit && rowTahun === String(currentYear)) {
              uploadedMonthsSiaba.push(rowBulan.toLowerCase());
            }
          }
        }
      }
      
      for (var i = 0; i < targetBulanLimit; i++) {
        var bName = arrBulan[i];
        if (uploadedMonthsSiaba.indexOf(bName.toLowerCase()) === -1) {
          missingSiaba.push(bName + " " + currentYear);
        }
      }
      Logger.log("SIABA Terunggah: " + JSON.stringify(uploadedMonthsSiaba) + " | Missing: " + JSON.stringify(missingSiaba));
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
    
    Logger.log("Final Messages: " + messages.join(" | "));
    
    return {
      show: true,
      hasWarning: messages.length > 0,
      warnings: messages,
      messageHtml: messages.join(" | ")
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
