/**
 * NotifikasiHome.gs - ENGINE CHECKER DOKUMEN BELUM DIUNGGAH
 * Digunakan untuk menampilkan pesan berjalan (marquee) di Halaman Beranda (Home).
 *
 * PETA KOLOM SHEET (0-based index, sesuai SK.gs & definisi masing-masing module):
 *   Unggah_SK   : B(1)=NamaSD, C(2)=TahunAjaran, D(3)=Semester, J(9)=Status, R(17)=NPSN
 *   Input SD/PAUD: header-based detection (NPSN, Bulan, Tahun, Status)
 *   arsip_siaba : header-based detection (NPSN/UnitKerja, Bulan, Tahun)
 */

/**
 * Helper: normalisasi NPSN - hapus semua non-digit dan strip apostrop
 */
function cleanNpsn_(val) {
  return String(val || "").trim().replace(/^'+/, "").replace(/\.0+$/, "").trim();
}

/**
 * Helper: normalisasi Tahun Ajaran (agar 2026/2027, 2026-2027, "2026 2027" semua cocok)
 */
function cleanTa_(val) {
  return String(val || "").trim().replace(/[\s\-]+/g, "/");
}

/**
 * Helper: normalisasi Semester
 * "Semester 1", "Semester Ganjil", "1", "Ganjil" → "ganjil"
 * "Semester 2", "Semester Genap",  "2", "Genap"  → "genap"
 */
function normSemester_(val) {
  var s = String(val || "").toLowerCase().trim();
  if (s === "ganjil" || s === "1" || s === "semester 1" || s === "semester ganjil") return "ganjil";
  if (s === "genap"  || s === "2" || s === "semester 2" || s === "semester genap")  return "genap";
  return s;
}

function getMissingDocumentsReport(username, role, unit) {
  try {
    var uName = cleanNpsn_(username); // NPSN numerik sudah dibersihkan
    var uRole = String(role || "").toLowerCase();
    var uUnit = String(unit || "").trim();

    Logger.log("=== getMissingDocumentsReport ===");
    Logger.log("NPSN: [" + uName + "] | Role: " + uRole + " | Unit: " + uUnit);

    // 1. Admin/korwil/verifikator: skip semua pengecekan
    var isAdmin = (uRole.indexOf('admin') > -1 || uRole.indexOf('verifikator') > -1 || uRole.indexOf('korwil') > -1);
    if (isAdmin) return { show: false };

    // 2. Identifikasi jenjang dari master Data_Sekolah
    var isSD = false;
    var isPAUD = false;
    var isSDNegeri = false;

    var infoSekolah = getSekolahByNPSN(uName);
    if (infoSekolah && infoSekolah.found) {
      var jenjang = String(infoSekolah.jenjang || "").toUpperCase().trim();
      var status  = String(infoSekolah.status_sekolah || "").toLowerCase().trim();
      Logger.log("Data_Sekolah: jenjang=[" + jenjang + "] status=[" + status + "]");
      if (jenjang.indexOf("SD") > -1) {
        isSD = true;
        if (status.indexOf("negeri") > -1) isSDNegeri = true;
      } else {
        isPAUD = true;
      }
    } else {
      // Fallback berbasis teks role/unit
      isPAUD = (uRole.indexOf('paud') > -1 || uRole.indexOf('tk') > -1
             || uUnit.toLowerCase().indexOf('paud') > -1 || uUnit.toLowerCase().indexOf('tk ') > -1);
      isSD   = !isPAUD && (uRole.indexOf('sd') > -1 || uUnit.toLowerCase().indexOf('sd') > -1);
      isSDNegeri = isSD && (uUnit.toLowerCase().indexOf('sdn') > -1
                         || uUnit.toLowerCase().indexOf('negeri') > -1
                         || uName.toLowerCase().indexOf('sdn') > -1);
      Logger.log("Fallback: isSD=" + isSD + " isPAUD=" + isPAUD + " isSDNegeri=" + isSDNegeri);
    }

    var today        = new Date();
    var currentYear  = today.getFullYear();
    var currentMonth = today.getMonth(); // 0=Jan
    var arrBulan     = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    var targetBulanLimit = currentMonth; // Jan s.d. bulan sebelum sekarang

    var missingLapbul = [];
    var missingSiaba  = [];
    var missingSK     = false;

    // =====================================================================
    // A. LAPORAN BULANAN (SD & PAUD)
    // =====================================================================
    var dbKeyLapbul    = isPAUD ? "LAPBUL_PAUD_DB" : "LAPBUL_SD_DB";
    var sheetNameLapbul = isPAUD ? "Input PAUD" : "Input SD";

    var uploadedLapbul = [];
    try {
      var sheetLapbul = getSheet(dbKeyLapbul, sheetNameLapbul);
      var rawLapbul   = sheetLapbul.getDataRange().getDisplayValues();
      if (rawLapbul.length >= 2) {
        var hdr = rawLapbul[0].map(function(h){ return String(h).toLowerCase().trim(); });
        var iN = hdr.indexOf("npsn");        if (iN < 0) iN = 0;
        var iB = hdr.indexOf("bulan");       if (iB < 0) iB = 1;
        var iT = hdr.indexOf("tahun");       if (iT < 0) iT = 2;
        var iS = hdr.indexOf("status data"); if (iS < 0) iS = hdr.indexOf("status");

        for (var r = 1; r < rawLapbul.length; r++) {
          var row = rawLapbul[r];
          var rNpsn  = cleanNpsn_(row[iN]);
          var rTahun = String(row[iT] || "").trim();
          var rBulan = String(row[iB] || "").trim();
          var rStat  = iS > -1 ? String(row[iS] || "").toLowerCase() : "";

          if (rNpsn === uName && rTahun === String(currentYear)
              && !rStat.includes("hapus") && !rStat.includes("delete")) {
            uploadedLapbul.push(rBulan.toLowerCase());
          }
        }
      }
    } catch(e) { Logger.log("Lapbul error: " + e.message); }

    for (var i = 0; i < targetBulanLimit; i++) {
      var bLabel = arrBulan[i];
      if (uploadedLapbul.indexOf(bLabel.toLowerCase()) === -1) {
        missingLapbul.push(bLabel + " " + currentYear);
      }
    }
    Logger.log("Lapbul terunggah: " + JSON.stringify(uploadedLapbul));
    Logger.log("Lapbul kurang  : " + JSON.stringify(missingLapbul));

    // =====================================================================
    // B. SK PEMBAGIAN TUGAS (hanya SD)
    //    PETA KOLOM FIXED (sesuai processManualForm di SK.gs):
    //      idx 1  = Nama SD
    //      idx 2  = Tahun Ajaran  (string, "2026/2027")
    //      idx 3  = Semester      (string, "Ganjil" / "Genap")
    //      idx 9  = Status        (string, "Diproses" / "Disetujui" / "Hapus")
    //      idx 17 = NPSN          (stored as "'NPSN" → cleaned to "NPSN")
    // =====================================================================
    var skSemester = "";
    var skTA       = "";
    if (isSD) {
      if (currentMonth >= 6) {
        skSemester = "Ganjil";
        skTA       = currentYear + "/" + (currentYear + 1);
      } else {
        skSemester = "Genap";
        skTA       = (currentYear - 1) + "/" + currentYear;
      }
      Logger.log("Target SK: Semester=[" + skSemester + "] TA=[" + skTA + "]");

      var hasSK = false;
      try {
        var sheetSK = getSheet("SK_DATA_DB", "Unggah_SK");
        var rawSK   = sheetSK.getDataRange().getDisplayValues();

        // Baris 0 = header, abaikan saja – pakai indeks kolom FIXED
        for (var j = 1; j < rawSK.length; j++) {
          var row       = rawSK[j];
          var rNpsn     = cleanNpsn_(row[17]);          // kolom R (idx 17)
          var rTA       = cleanTa_(row[2]);              // kolom C (idx 2)
          var rSemester = String(row[3] || "").trim();   // kolom D (idx 3)
          var rStatus   = String(row[9] || "").toLowerCase(); // kolom J (idx 9)

          Logger.log("SK row " + (j+1) + ": NPSN=[" + rNpsn + "] TA=[" + rTA + "] Sem=[" + rSemester + "] Stat=[" + rStatus + "]");

          var npsnMatch = (rNpsn === uName);
          var taMatch   = (rTA   === cleanTa_(skTA));
          var semMatch  = (normSemester_(rSemester) === normSemester_(skSemester));
          var notHapus  = (!rStatus.includes("hapus") && !rStatus.includes("delete"));

          if (npsnMatch && taMatch && semMatch && notHapus) {
            hasSK = true;
            Logger.log("✅ SK DITEMUKAN di baris " + (j + 1));
            break;
          }
        }
      } catch(e) { Logger.log("SK error: " + e.message); }

      if (!hasSK) missingSK = true;
      Logger.log("Hasil cek SK: missingSK=" + missingSK);
    }

    var uploadedSiaba = [];
    // =====================================================================
    // C. REKAP SIABA (hanya SD Negeri)
    // =====================================================================
    if (isSDNegeri) {
      try {
        var sheetSiaba = getSheet("ARSIP_SIABA_DB", "arsip_siaba");
        var rawSiaba   = sheetSiaba.getDataRange().getDisplayValues();
        if (rawSiaba.length >= 2) {
          var hdrS = rawSiaba[0].map(function(h){ return String(h).toLowerCase().trim(); });
          var iNS  = hdrS.indexOf("npsn");  if (iNS < 0) iNS = 8;
          var iBS  = hdrS.indexOf("bulan"); if (iBS < 0) iBS = 1;
          var iTS  = hdrS.indexOf("tahun"); if (iTS < 0) iTS = 2;

          for (var m = 1; m < rawSiaba.length; m++) {
            var row    = rawSiaba[m];
            var rNpsn  = cleanNpsn_(row[iNS]);
            var rUnit  = String(row[0] || "").trim().toLowerCase();
            var rTahun = String(row[iTS] || "").trim();
            var rBulan = String(row[iBS] || "").trim();

            var siabaMatch = (rNpsn === uName) || (rUnit === uUnit.toLowerCase());
            if (siabaMatch && rTahun === String(currentYear)) {
              uploadedSiaba.push(rBulan.toLowerCase());
            }
          }
        }
      } catch(e) { Logger.log("SIABA error: " + e.message); }

      for (var i = 0; i < targetBulanLimit; i++) {
        var bLabel = arrBulan[i];
        if (uploadedSiaba.indexOf(bLabel.toLowerCase()) === -1) {
          missingSiaba.push(bLabel + " " + currentYear);
        }
      }
      Logger.log("SIABA kurang: " + JSON.stringify(missingSiaba));
    }

    // =====================================================================
    // Susun kalimat peringatan
    // =====================================================================
    var messages = [];
    if (missingSK) {
      messages.push("Anda belum mengunggah SK Pembagian Tugas Semester " + skSemester + " TA " + skTA + ".");
    }
    if (missingLapbul.length > 0) {
      messages.push("Anda belum mengunggah Laporan Bulan " + formatListSentence_(missingLapbul) + ".");
    }
    if (missingSiaba.length > 0) {
      messages.push("Anda belum mengirimkan rekap SIABA bulan " + formatListSentence_(missingSiaba) + ".");
    }

    Logger.log("Pesan akhir: " + messages.join(" | "));

    return {
      show: true,
      hasWarning: messages.length > 0,
      warnings: messages,
      messageHtml: messages.join(" | "),
      // Rich metadata tambahan untuk view Beranda
      isSD: isSD,
      isSDNegeri: isSDNegeri,
      isPAUD: isPAUD,
      missingSK: missingSK,
      skSemester: skSemester,
      skTA: skTA,
      uploadedLapbul: uploadedLapbul,
      uploadedSiaba: uploadedSiaba,
      currentMonth: currentMonth,
      currentYear: currentYear
    };

  } catch (e) {
    Logger.log("FATAL getMissingDocumentsReport: " + e.toString());
    return { show: false, error: e.toString() };
  }
}

// Helper: "A, B, dan C"
function formatListSentence_(arr) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + " dan " + arr[1];
  return arr.slice(0, -1).join(", ") + ", dan " + arr[arr.length - 1];
}
