/* ======================================================================
   MODUL E-MADING (MAJALAH DINDING DIGITAL) - BACKEND
   Spreadsheet ID: SPREADSHEET_IDS.EMADING_DB
   Folder Upload ID: FOLDER_CONFIG.EMADING_DOCS
   ====================================================================== */

const KONFIG_EMADING = {
  DB_KEY: "EMADING_DB",
  SHEET_ARTIKEL: "Artikel",
  SHEET_KOMENTAR: "Komentar",
  SHEET_SUKA: "Suka",
  get FOLDER_ID() { return FOLDER_CONFIG.EMADING_DOCS; }
};

/**
 * Helper untuk memastikan sheet yang dibutuhkan sudah terbentuk beserta header-nya
 */
function inisialisasiSheetEmading() {
  try {
    var ss = getDB(KONFIG_EMADING.DB_KEY);
    
    // 1. Sheet Artikel
    var sheetArtikel = ss.getSheetByName(KONFIG_EMADING.SHEET_ARTIKEL);
    if (!sheetArtikel) {
      sheetArtikel = ss.insertSheet(KONFIG_EMADING.SHEET_ARTIKEL);
      var headerArtikel = [
        "ID", "Judul", "Isi", "Kategori", "Pengunggah", "UserLogin", 
        "UnitKerja", "FotoUrl", "VideoUrl", "LampiranUrl", "LampiranNama", 
        "TglPosting", "Status", "JumlahSuka", "JumlahKomentar", "Tags"
      ];
      sheetArtikel.appendRow(headerArtikel);
      sheetArtikel.getRange(1, 1, 1, headerArtikel.length).setFontWeight("bold").setBackground("#800000").setFontColor("#ffffff");
    }

    // 2. Sheet Komentar
    var sheetKomentar = ss.getSheetByName(KONFIG_EMADING.SHEET_KOMENTAR);
    if (!sheetKomentar) {
      sheetKomentar = ss.insertSheet(KONFIG_EMADING.SHEET_KOMENTAR);
      var headerKomentar = ["ID_Komentar", "ID_Artikel", "NamaKomentator", "UserLogin", "UnitKerja", "IsiKomentar", "TglKomentar"];
      sheetKomentar.appendRow(headerKomentar);
      sheetKomentar.getRange(1, 1, 1, headerKomentar.length).setFontWeight("bold").setBackground("#800000").setFontColor("#ffffff");
    }

    // 3. Sheet Suka
    var sheetSuka = ss.getSheetByName(KONFIG_EMADING.SHEET_SUKA);
    if (!sheetSuka) {
      sheetSuka = ss.insertSheet(KONFIG_EMADING.SHEET_SUKA);
      var headerSuka = ["ID_Artikel", "Username", "TglSuka"];
      sheetSuka.appendRow(headerSuka);
      sheetSuka.getRange(1, 1, 1, headerSuka.length).setFontWeight("bold").setBackground("#800000").setFontColor("#ffffff");
    }

    return true;
  } catch (e) {
    Logger.log("Error inisialisasiSheetEmading: " + e.message);
    return false;
  }
}

/**
 * Helper mengambil instance sheet yang otomatis diinisialisasi jika belum ada
 */
function getSheetEmading(sheetName) {
  var ss = getDB(KONFIG_EMADING.DB_KEY);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) {
    inisialisasiSheetEmading();
    sh = ss.getSheetByName(sheetName);
  }
  return sh;
}

/**
 * Mengambil daftar artikel untuk tampilan E-Mading (Feed)
 * Support filter Kategori, Pencarian kata kunci, dan Unit Kerja
 */
function getDaftarArtikelEmading(filterObj) {
  try {
    inisialisasiSheetEmading();
    var sheet = getSheetEmading(KONFIG_EMADING.SHEET_ARTIKEL);
    var data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return JSON.stringify([]);

    var f = filterObj || {};
    var kategoriFilter = f.kategori ? String(f.kategori).trim().toLowerCase() : "";
    var unitFilter = f.unitKerja ? String(f.unitKerja).trim().toLowerCase() : "";
    var searchFilter = f.search ? String(f.search).trim().toLowerCase() : "";
    var statusFilter = f.status ? String(f.status).trim() : "Dipublikasikan"; // default feed hanya tampilkan yang dipublikasikan

    var result = [];

    // Looping mundur agar artikel terbaru tampil paling awal
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      var id = String(row[0] || "").trim();
      var judul = String(row[1] || "").trim();
      if (!id || !judul) continue;

      var isi = String(row[2] || "");
      var kategori = String(row[3] || "Umum").trim();
      var pengunggah = String(row[4] || "Anonim").trim();
      var userLogin = String(row[5] || "").trim();
      var unitKerja = String(row[6] || "-").trim();
      var rawFoto = String(row[7] || "").trim();
      var fotoList = [];
      if (rawFoto) {
        var splitFotos = rawFoto.split(/\s*,\s*|\s*\|\s*|\n+/);
        fotoList = splitFotos.map(function(f) {
          f = f.trim();
          if (f && f.indexOf('drive.google.com') > -1) {
            var matchId = f.match(/id=([a-zA-Z0-9_-]+)/) || f.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (matchId && matchId[1]) {
              return "https://lh3.googleusercontent.com/d/" + matchId[1] + "=w1200";
            }
          }
          return f;
        }).filter(function(f) { return f.length > 0; });
      }

      var videoUrl = String(row[8] || "").trim();
      var lampiranUrl = String(row[9] || "").trim();
      var lampiranNama = String(row[10] || "").trim();
      var tglPosting = String(row[11] || "").trim();
      var status = String(row[12] || "Dipublikasikan").trim();
      var jmlSuka = parseInt(row[13]) || 0;
      var jmlKomentar = parseInt(row[14]) || 0;
      var tags = String(row[15] || "").trim();
      var rawPosisi = String(row[16] || "").trim();
      var posisiFoto = "awal";
      var posisiFotoList = ["awal", "tengah", "akhir"];
      var posisiVideo = "akhir";

      if (rawPosisi) {
        if (rawPosisi.startsWith("{") && rawPosisi.endsWith("}")) {
          try {
            var metaPos = JSON.parse(rawPosisi);
            if (metaPos.fotos && Array.isArray(metaPos.fotos)) {
              posisiFotoList = metaPos.fotos;
              posisiFoto = posisiFotoList[0] || "awal";
            }
            if (metaPos.video) {
              posisiVideo = metaPos.video;
            }
          } catch(ePos) {}
        } else {
          posisiFoto = rawPosisi.toLowerCase();
          posisiFotoList = [posisiFoto, "tengah", "akhir"];
        }
      }

      // Filter status jika bukan 'SEMUA'
      if (statusFilter !== "SEMUA" && status !== statusFilter) {
        continue;
      }

      // Filter kategori
      if (kategoriFilter && kategori.toLowerCase() !== kategoriFilter) {
        continue;
      }

      // Filter unit kerja
      if (unitFilter && unitKerja.toLowerCase().indexOf(unitFilter) === -1) {
        continue;
      }

      // Filter pencarian (judul / isi / nama pengunggah / tags)
      if (searchFilter) {
        var gabung = (judul + " " + isi + " " + pengunggah + " " + tags).toLowerCase();
        if (gabung.indexOf(searchFilter) === -1) {
          continue;
        }
      }

      result.push({
        rowBaris: i + 1,
        id: id,
        judul: judul,
        isi: isi,
        kategori: kategori,
        pengunggah: pengunggah,
        userLogin: userLogin, // untuk identifikasi otorisasi edit/hapus
        unitKerja: unitKerja,
        fotoUrl: fotoList[0] || "",
        fotoList: fotoList,
        posisiFoto: posisiFoto,
        posisiFotoList: posisiFotoList,
        posisiVideo: posisiVideo,
        videoUrl: videoUrl,
        lampiranUrl: lampiranUrl,
        lampiranNama: lampiranNama,
        tglPosting: tglPosting,
        status: status,
        jmlSuka: jmlSuka,
        jmlKomentar: jmlKomentar,
        tags: tags
      });
    }

    return JSON.stringify(result);
  } catch (e) {
    Logger.log("Error getDaftarArtikelEmading: " + e.message);
    return JSON.stringify({ error: "Gagal memuat artikel: " + e.message });
  }
}

/**
 * Mengambil detail satu artikel berdasarkan ID
 */
function getDetailArtikelEmading(idArtikel) {
  try {
    var sheet = getSheetEmading(KONFIG_EMADING.SHEET_ARTIKEL);
    var data = sheet.getDataRange().getDisplayValues();
    var cleanId = String(idArtikel).trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[0]).trim() === cleanId) {
        var rawFoto = String(row[7] || "").trim();
        var fotoList = [];
        if (rawFoto) {
          var splitFotos = rawFoto.split(/\s*,\s*|\s*\|\s*|\n+/);
          fotoList = splitFotos.map(function(f) {
            f = f.trim();
            if (f && f.indexOf('drive.google.com') > -1) {
              var mId = f.match(/id=([a-zA-Z0-9_-]+)/) || f.match(/\/d\/([a-zA-Z0-9_-]+)/);
              if (mId && mId[1]) {
                return "https://lh3.googleusercontent.com/d/" + mId[1] + "=w1200";
              }
            }
            return f;
          }).filter(function(f) { return f.length > 0; });
        }

        var rawPosisi = String(row[16] || "").trim();
        var posisiFoto = "awal";
        var posisiFotoList = ["awal", "tengah", "akhir"];
        var posisiVideo = "akhir";

        if (rawPosisi) {
          if (rawPosisi.startsWith("{") && rawPosisi.endsWith("}")) {
            try {
              var metaPos = JSON.parse(rawPosisi);
              if (metaPos.fotos && Array.isArray(metaPos.fotos)) {
                posisiFotoList = metaPos.fotos;
                posisiFoto = posisiFotoList[0] || "awal";
              }
              if (metaPos.video) {
                posisiVideo = metaPos.video;
              }
            } catch(ePos) {}
          } else {
            posisiFoto = rawPosisi.toLowerCase();
            posisiFotoList = [posisiFoto, "tengah", "akhir"];
          }
        }

        return JSON.stringify({
          rowBaris: i + 1,
          id: row[0],
          judul: row[1],
          isi: row[2],
          kategori: row[3],
          pengunggah: row[4],
          userLogin: row[5],
          unitKerja: row[6],
          fotoUrl: fotoList[0] || "",
          fotoList: fotoList,
          posisiFoto: posisiFoto,
          posisiFotoList: posisiFotoList,
          posisiVideo: posisiVideo,
          videoUrl: row[8],
          lampiranUrl: row[9],
          lampiranNama: row[10],
          tglPosting: row[11],
          status: row[12],
          jmlSuka: parseInt(row[13]) || 0,
          jmlKomentar: parseInt(row[14]) || 0,
          tags: row[15]
        });
      }
    }
    return JSON.stringify({ error: "Artikel tidak ditemukan." });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * Menyimpan artikel baru atau update artikel yang sudah ada
 */
function simpanArtikelEmading(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    inisialisasiSheetEmading();
    var sheet = getSheetEmading(KONFIG_EMADING.SHEET_ARTIKEL);
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");

    var targetFolder = DriveApp.getFolderById(KONFIG_EMADING.FOLDER_ID);

    // 1. Upload Foto (Mendukung hingga 3 foto)
    var listFotoUrl = [];

    // Ambil existing foto jika ada
    if (payload.existingFotoUrls && Array.isArray(payload.existingFotoUrls)) {
      listFotoUrl = payload.existingFotoUrls.filter(function(url) { return url && url.trim().length > 0; });
    } else if (payload.existingFotoUrl) {
      listFotoUrl = [payload.existingFotoUrl.trim()];
    }

    // Upload file foto baru jika dikirim
    var filesToUpload = [];
    if (payload.fotoFiles && Array.isArray(payload.fotoFiles)) {
      filesToUpload = payload.fotoFiles;
    } else if (payload.fotoFile && payload.fotoFile.data) {
      filesToUpload = [payload.fotoFile];
    }

    for (var fIdx = 0; fIdx < filesToUpload.length; fIdx++) {
      var fItem = filesToUpload[fIdx];
      if (fItem && fItem.data) {
        try {
          var extFoto = (fItem.name || "foto.jpg").split('.').pop();
          var timeStampStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss") + "_" + (fIdx + 1);
          var namaFoto = "FOTO_MADING_" + timeStampStr + "." + extFoto;
          var blobFoto = Utilities.newBlob(Utilities.base64Decode(fItem.data), fItem.mimeType || "image/jpeg", namaFoto);
          var fileFotoDrive = targetFolder.createFile(blobFoto);
          fileFotoDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          var lh3Url = "https://lh3.googleusercontent.com/d/" + fileFotoDrive.getId() + "=w1200";
          listFotoUrl.push(lh3Url);
        } catch (errFoto) {
          Logger.log("Gagal upload foto ke-" + (fIdx + 1) + ": " + errFoto.message);
        }
      }
    }

    var fotoUrlMerged = listFotoUrl.join(", ");

    // Susun metadata posisi (format JSON string untuk kolom 17)
    var posisiFotoList = payload.posisiFotoList || [payload.posisiFoto || "awal", "tengah", "akhir"];
    var posisiVideo = payload.posisiVideo || "akhir";
    var posisiMetadataJson = JSON.stringify({
      fotos: posisiFotoList,
      video: posisiVideo
    });

    // 2. Upload Lampiran Berkas Dokumen (PDF, Docx, Zip dll) jika ada
    var lampiranUrl = payload.existingLampiranUrl || "";
    var lampiranNama = payload.existingLampiranNama || "";
    if (payload.lampiranFile && payload.lampiranFile.data) {
      try {
        var extLampiran = payload.lampiranFile.name.split('.').pop();
        var timeStampDoc = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
        var namaLampiranBaru = "LAMPIRAN_MADING_" + timeStampDoc + "." + extLampiran;
        var blobLampiran = Utilities.newBlob(Utilities.base64Decode(payload.lampiranFile.data), payload.lampiranFile.mimeType, namaLampiranBaru);
        var fileLampiranDrive = targetFolder.createFile(blobLampiran);
        fileLampiranDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        lampiranUrl = fileLampiranDrive.getUrl();
        lampiranNama = payload.lampiranFile.name; // Simpan nama asli untuk tampilan tombol unduh
      } catch (errLamp) {
        Logger.log("Gagal upload lampiran mading: " + errLamp.message);
      }
    }

    var idArtikel = payload.id ? String(payload.id).trim() : "";
    var statusPublikasi = payload.status || "Dipublikasikan"; // langsung aktif/terpublikasi

    // Format Link Video jika YouTube agar menjadi embed standard
    var videoUrl = String(payload.videoUrl || "").trim();

    // Sanitasi Isi Artikel: Hapus potensi embed base64 image yang tidak sengaja ter-paste ke teks
    var isiArtikel = String(payload.isi || "");
    isiArtikel = isiArtikel.replace(/src="data:image\/[^;]+;base64,[^"]+"/gi, 'src="" alt="gambar-dihapus"');
    if (isiArtikel.length > 48000) {
      isiArtikel = isiArtikel.substring(0, 48000);
    }

    if (idArtikel) {
      // === MODE EDIT ARTIKEL ===
      var data = sheet.getDataRange().getDisplayValues();
      var rowIndex = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === idArtikel.toLowerCase()) {
          rowIndex = i + 1;
          // Validasi Hak Akses: Hanya pembuat atau role admin yang berhak
          var pembuat = String(data[i][5] || "").trim().toLowerCase();
          var userReq = String(payload.userLogin || "").trim().toLowerCase();
          var roleReq = String(payload.userRole || "").trim().toLowerCase();
          var isAdminRole = roleReq.indexOf("admin") !== -1 || roleReq.indexOf("verifikator") !== -1 || roleReq.indexOf("korwil") !== -1;

          if (!isAdminRole && pembuat && userReq && pembuat !== userReq) {
            return JSON.stringify({ error: "Anda tidak memiliki hak akses untuk mengedit artikel ini." });
          }
          break;
        }
      }

      if (rowIndex === -1) {
        return JSON.stringify({ error: "Artikel (" + idArtikel + ") tidak ditemukan untuk diupdate." });
      }

      // Update kolom: Judul, Isi, Kategori, Pengunggah, UnitKerja, FotoUrl, VideoUrl, LampiranUrl, LampiranNama, Tags, PosisiFoto
      sheet.getRange(rowIndex, 2).setValue(payload.judul);
      sheet.getRange(rowIndex, 3).setValue(isiArtikel);
      sheet.getRange(rowIndex, 4).setValue(payload.kategori);
      sheet.getRange(rowIndex, 5).setValue(payload.pengunggah);
      if (fotoUrlMerged) sheet.getRange(rowIndex, 8).setValue(fotoUrlMerged);
      sheet.getRange(rowIndex, 9).setValue(videoUrl);
      if (lampiranUrl) {
        sheet.getRange(rowIndex, 10).setValue(lampiranUrl);
        sheet.getRange(rowIndex, 11).setValue(lampiranNama);
      }
      sheet.getRange(rowIndex, 16).setValue(payload.tags || "");
      sheet.getRange(rowIndex, 17).setValue(posisiMetadataJson);

      return JSON.stringify({ success: true, message: "Sukses: Artikel berhasil diperbarui!", id: idArtikel });

    } else {
      // === MODE TAMBAH ARTIKEL BARU ===
      var newId = "MDG-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + "-" + Math.floor(100 + Math.random() * 900);

      var newRow = [
        newId,
        payload.judul,
        isiArtikel,
        payload.kategori || "Umum",
        payload.pengunggah || "Anonim",
        payload.userLogin || "",
        payload.unitKerja || "-",
        fotoUrlMerged,
        videoUrl,
        lampiranUrl,
        lampiranNama,
        timestamp,
        statusPublikasi, // Dipublikasikan langsung
        0, // Suka awal
        0, // Komentar awal
        payload.tags || "",
        posisiMetadataJson
      ];

      sheet.appendRow(newRow);
      return JSON.stringify({ success: true, message: "Sukses: Artikel berhasil dipublikasikan!", id: newId });
    }

  } catch (e) {
    Logger.log("Error simpanArtikelEmading: " + e.message);
    return JSON.stringify({ error: "Gagal menyimpan artikel: " + e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Takedown / Menghapus artikel
 * Pembuat artikel & Admin dapat menghapus artikel
 */
function hapusArtikelEmading(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var sheet = getSheetEmading(KONFIG_EMADING.SHEET_ARTIKEL);
    var data = sheet.getDataRange().getDisplayValues();
    var idTarget = String(payload.id).trim();
    var userLogin = String(payload.userLogin).trim();
    var userRole = String(payload.userRole).trim().toLowerCase();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === idTarget) {
        var pemilik = String(data[i][5] || "").trim().toLowerCase();
        var userLoginLower = userLogin.toLowerCase();
        var isAdminRole = userRole.indexOf("admin") !== -1 || userRole.indexOf("verifikator") !== -1 || userRole.indexOf("korwil") !== -1;

        if (!isAdminRole && pemilik !== userLoginLower) {
          return JSON.stringify({ error: "Akses ditolak: Anda bukan pembuat artikel ini dan bukan Admin." });
        }

        // Hapus baris artikel
        sheet.deleteRow(i + 1);

        // Bersihkan data like & komentar terkait di latar belakang
        try {
          bersihkanDataTerkaitMading(idTarget);
        } catch (eClean) {
          Logger.log("Gagal membersihkan data komentar/suka: " + eClean.message);
        }

        return JSON.stringify({ success: true, message: "Sukses: Artikel berhasil dihapus." });
      }
    }

    return JSON.stringify({ error: "Artikel tidak ditemukan." });
  } catch (e) {
    return JSON.stringify({ error: "Gagal menghapus: " + e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper menghapus komentar dan record like saat artikel dihapus
 */
function bersihkanDataTerkaitMading(idArtikel) {
  var ss = getDB(KONFIG_EMADING.DB_KEY);
  
  // 1. Komentar
  var shKom = ss.getSheetByName(KONFIG_EMADING.SHEET_KOMENTAR);
  if (shKom) {
    var dataK = shKom.getDataRange().getDisplayValues();
    for (var k = dataK.length - 1; k >= 1; k--) {
      if (String(dataK[k][1]).trim() === idArtikel) {
        shKom.deleteRow(k + 1);
      }
    }
  }

  // 2. Suka
  var shSuka = ss.getSheetByName(KONFIG_EMADING.SHEET_SUKA);
  if (shSuka) {
    var dataS = shSuka.getDataRange().getDisplayValues();
    for (var s = dataS.length - 1; s >= 1; s--) {
      if (String(dataS[s][0]).trim() === idArtikel) {
        shSuka.deleteRow(s + 1);
      }
    }
  }
}

/**
 * Toggle Suka (Like / Unlike)
 */
function toggleSukaEmading(idArtikel, username) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    inisialisasiSheetEmading();
    var sheetSuka = getSheetEmading(KONFIG_EMADING.SHEET_SUKA);
    var dataSuka = sheetSuka.getDataRange().getDisplayValues();

    var cleanId = String(idArtikel).trim();
    var cleanUser = String(username).trim();
    var isLiked = false;
    var rowToDelete = -1;

    for (var i = 1; i < dataSuka.length; i++) {
      if (String(dataSuka[i][0]).trim() === cleanId && String(dataSuka[i][1]).trim() === cleanUser) {
        isLiked = true;
        rowToDelete = i + 1;
        break;
      }
    }

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");

    if (isLiked) {
      // Batalkan Like
      sheetSuka.deleteRow(rowToDelete);
    } else {
      // Berikan Like
      sheetSuka.appendRow([cleanId, cleanUser, timestamp]);
    }

    // Hitung ulang total like untuk artikel tersebut & perbarui di Sheet Artikel
    var countLike = 0;
    var freshData = sheetSuka.getDataRange().getDisplayValues();
    for (var j = 1; j < freshData.length; j++) {
      if (String(freshData[j][0]).trim() === cleanId) {
        countLike++;
      }
    }

    var sheetArt = getSheetEmading(KONFIG_EMADING.SHEET_ARTIKEL);
    var dataArt = sheetArt.getDataRange().getDisplayValues();
    for (var a = 1; a < dataArt.length; a++) {
      if (String(dataArt[a][0]).trim() === cleanId) {
        sheetArt.getRange(a + 1, 14).setValue(countLike);
        break;
      }
    }

    return JSON.stringify({
      success: true,
      liked: !isLiked,
      totalSuka: countLike
    });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Memeriksa status suka user pada artikel
 */
function cekStatusSukaEmading(idArtikel, username) {
  try {
    var sheetSuka = getSheetEmading(KONFIG_EMADING.SHEET_SUKA);
    var data = sheetSuka.getDataRange().getDisplayValues();
    var cleanId = String(idArtikel).trim();
    var cleanUser = String(username).trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === cleanId && String(data[i][1]).trim() === cleanUser) {
        return JSON.stringify({ liked: true });
      }
    }
    return JSON.stringify({ liked: false });
  } catch (e) {
    return JSON.stringify({ liked: false, error: e.message });
  }
}

/**
 * Mengambil daftar komentar artikel
 */
function getKomentarEmading(idArtikel) {
  try {
    var sheet = getSheetEmading(KONFIG_EMADING.SHEET_KOMENTAR);
    var data = sheet.getDataRange().getDisplayValues();
    var cleanId = String(idArtikel).trim();
    var hasil = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === cleanId) {
        hasil.push({
          rowBaris: i + 1,
          idKomentar: data[i][0],
          idArtikel: data[i][1],
          namaKomentator: data[i][2],
          userLogin: data[i][3],
          unitKerja: data[i][4],
          isiKomentar: data[i][5],
          tglKomentar: data[i][6]
        });
      }
    }

    return JSON.stringify(hasil);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * Menambahkan komentar pada artikel (langsung aktif)
 */
function kirimKomentarEmading(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    inisialisasiSheetEmading();
    var sheetKom = getSheetEmading(KONFIG_EMADING.SHEET_KOMENTAR);
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var newIdKom = "KOM-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + "-" + Math.floor(10 + Math.random() * 90);

    var cleanId = String(payload.idArtikel).trim();
    var barisBaru = [
      newIdKom,
      cleanId,
      payload.namaKomentator || "Anonim",
      payload.userLogin || "",
      payload.unitKerja || "-",
      payload.isiKomentar,
      timestamp
    ];

    sheetKom.appendRow(barisBaru);

    // Hitung total komentar dan update di Sheet Artikel
    var countKom = 0;
    var dataKom = sheetKom.getDataRange().getDisplayValues();
    for (var k = 1; k < dataKom.length; k++) {
      if (String(dataKom[k][1]).trim() === cleanId) {
        countKom++;
      }
    }

    var sheetArt = getSheetEmading(KONFIG_EMADING.SHEET_ARTIKEL);
    var dataArt = sheetArt.getDataRange().getDisplayValues();
    for (var a = 1; a < dataArt.length; a++) {
      if (String(dataArt[a][0]).trim() === cleanId) {
        sheetArt.getRange(a + 1, 15).setValue(countKom);
        break;
      }
    }

    return JSON.stringify({
      success: true,
      message: "Komentar berhasil dikirim!",
      totalKomentar: countKom
    });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menghapus komentar (oleh pembuat komentar atau admin)
 */
function hapusKomentarEmading(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheetKom = getSheetEmading(KONFIG_EMADING.SHEET_KOMENTAR);
    var data = sheetKom.getDataRange().getDisplayValues();
    var idKom = String(payload.idKomentar).trim();
    var userLogin = String(payload.userLogin).trim();
    var userRole = String(payload.userRole).trim().toLowerCase();
    var idArtikel = "";

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === idKom) {
        var pemilik = String(data[i][3] || "").trim().toLowerCase();
        var userLoginLower = userLogin.toLowerCase();
        var isAdminRole = userRole.indexOf("admin") !== -1 || userRole.indexOf("verifikator") !== -1 || userRole.indexOf("korwil") !== -1;
        idArtikel = String(data[i][1]).trim();

        if (!isAdminRole && pemilik !== userLoginLower) {
          return JSON.stringify({ error: "Anda tidak memiliki izin menghapus komentar ini." });
        }
        sheetKom.deleteRow(i + 1);
        break;
      }
    }

    if (idArtikel) {
      // Update count komentar di artikel
      var count = 0;
      var fresh = sheetKom.getDataRange().getDisplayValues();
      for (var j = 1; j < fresh.length; j++) {
        if (String(fresh[j][1]).trim() === idArtikel) count++;
      }
      var sheetArt = getSheetEmading(KONFIG_EMADING.SHEET_ARTIKEL);
      var dArt = sheetArt.getDataRange().getDisplayValues();
      for (var a = 1; a < dArt.length; a++) {
        if (String(dArt[a][0]).trim() === idArtikel) {
          sheetArt.getRange(a + 1, 15).setValue(count);
          break;
        }
      }
    }

    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mengambil ringkasan statistik infografis data publik (PTK, Murid, Sekolah)
 * serta rincian tabel per Jenjang & Status dengan akselerasi CacheService
 */
/**
 * Mengambil ringkasan statistik infografis data publik (PTK, Murid, Sekolah)
/**
 * STATISTIK PENDIDIKAN KORWIL SECANG (PUBLIC LANDING PORTAL)
 * Menghitung Rombel, Murid, Guru, dan Tendik secara valid murni dari database
 * hasil tambah data laporan bulan (Input SD & Input PAUD) pada periode bulan lalu.
 * Apabila sekolah belum mengunggah laporan pada periode bulan lalu, datanya TIDAK dihitung (0).
 */
function getInfografisPublicData() {
  var cacheKey = "SIKS_LANDING_STATISTIK_V5";
  try {
    var cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (eCache) {
    Logger.log("Cache get error: " + eCache.message);
  }

  try {
    var result = {
      totalSekolah: 0,
      totalPtk: 0,
      totalMurid: 0,
      tableData: [
        { jenjang: "SD", status: "Negeri", sekolah: 0, rombel: 0, murid: 0, guru: 0, tendik: 0, sudahLapor: 0, progress: 0 },
        { jenjang: "SD", status: "Swasta", sekolah: 0, rombel: 0, murid: 0, guru: 0, tendik: 0, sudahLapor: 0, progress: 0 },
        { jenjang: "TK", status: "Swasta", sekolah: 0, rombel: 0, murid: 0, guru: 0, tendik: 0, sudahLapor: 0, progress: 0 },
        { jenjang: "KB", status: "Swasta", sekolah: 0, rombel: 0, murid: 0, guru: 0, tendik: 0, sudahLapor: 0, progress: 0 },
        { jenjang: "SPS", status: "Swasta", sekolah: 0, rombel: 0, murid: 0, guru: 0, tendik: 0, sudahLapor: 0, progress: 0 }
      ]
    };

    // 1. TENTUKAN PERIODE LAPORAN BULAN LALU
    var listBulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var skrg = new Date();
    var blnLaluIdx = skrg.getMonth() - 1; // 0-based
    var thnLalu = skrg.getFullYear();
    if (blnLaluIdx < 0) {
      blnLaluIdx = 11;
      thnLalu = thnLalu - 1;
    }
    var namaBulanLalu = listBulanIndo[blnLaluIdx];
    result.periodeLaporan = namaBulanLalu + " " + thnLalu;

    // 2. AMBIL BASELINE JUMLAH LEMBAGA DARI Data_Sekolah (USER_DB)
    var masterSekolahMap = {}; // key: NPSN atau nama sekolah -> { jenjang, status, indexTableData }
    try {
      var shSekolah = getSheet("USER_DB", "Data_Sekolah");
      if (shSekolah) {
        var dSek = shSekolah.getDataRange().getDisplayValues();
        var cntSDN = 0, cntSDS = 0, cntTK = 0, cntKB = 0, cntSPS = 0;
        for (var s = 1; s < dSek.length; s++) {
          var npsnSek = String(dSek[s][0] || "").trim();
          var jnj = String(dSek[s][1] || "").trim().toUpperCase();
          var namaSek = String(dSek[s][2] || "").trim().toUpperCase();
          var stt = String(dSek[s][3] || "").trim().toUpperCase();
          
          if (stt.indexOf("TUTUP") > -1 || stt.indexOf("NON") > -1) continue;

          var targetIdx = -1;
          if (jnj === "SD") {
            if (stt.indexOf("NEGERI") > -1) {
              cntSDN++;
              targetIdx = 0;
            } else {
              cntSDS++;
              targetIdx = 1;
            }
          } else if (jnj === "TK") {
            cntTK++;
            targetIdx = 2;
          } else if (jnj === "KB") {
            cntKB++;
            targetIdx = 3;
          } else if (jnj === "SPS" || jnj === "TPA") {
            cntSPS++;
            targetIdx = 4;
          }

          var schoolInfo = {
            npsn: npsnSek,
            nama: namaSek,
            jenjang: jnj,
            status: stt,
            targetIdx: targetIdx
          };

          if (npsnSek) masterSekolahMap[npsnSek] = schoolInfo;
          if (namaSek) masterSekolahMap[namaSek] = schoolInfo;
        }

        result.tableData[0].sekolah = cntSDN;
        result.tableData[1].sekolah = cntSDS;
        result.tableData[2].sekolah = cntTK;
        result.tableData[3].sekolah = cntKB;
        result.tableData[4].sekolah = cntSPS;
      }
    } catch (eSek) {
      Logger.log("Err Baseline Sekolah: " + eSek.message);
      result.tableData[0].sekolah = 22;
      result.tableData[1].sekolah = 5;
      result.tableData[2].sekolah = 20;
      result.tableData[3].sekolah = 13;
      result.tableData[4].sekolah = 6;
    }

    // 3. TARIK DAN AKUMULASIKAN DATA LAPORAN BULAN LALU DARI DATABASE
    // Hanya sekolah yang sudah mengunggah laporan periode bulan lalu yang dihitung.
    // Jika belum lapor, datanya otomatis 0.
    var processedSchools = {}; // Mencegah duplikasi hitungan jika ada re-submit di bulan yang sama

    try {
      if (typeof getLapbulKelolaData === "function") {
        var rawLapbul = getLapbulKelolaData("", namaBulanLalu.toLowerCase(), String(thnLalu), "", "");
        if (rawLapbul && Array.isArray(rawLapbul)) {
          rawLapbul.forEach(function (item) {
            var npsnKey = String(item.npsn || "").trim();
            var namaKey = String(item.namaSekolah || "").trim().toUpperCase();
            var sttData = String(item.statusData || "").toLowerCase();

            // Abaikan jika statusnya Dihapus atau kosong
            if (sttData.indexOf("hapus") > -1 || sttData === "-" || sttData === "") return;

            var uniqueKey = (npsnKey || namaKey);
            if (!uniqueKey || processedSchools[uniqueKey]) return;
            processedSchools[uniqueKey] = true;

            // Cari mapping jenjang dan status dari Master Sekolah
            var info = masterSekolahMap[npsnKey] || masterSekolahMap[namaKey];
            var targetIdx = -1;

            if (info && info.targetIdx > -1) {
              targetIdx = info.targetIdx;
            } else {
              // Fallback deteksi jika tidak ada di mapping master
              var jnj = String(item.jenjang || "").toUpperCase().trim();
              var sttSek = String(item.statusSekolah || "").toUpperCase().trim();
              if (jnj === "SD") {
                targetIdx = (sttSek.indexOf("NEGERI") > -1) ? 0 : 1;
              } else if (jnj === "TK") {
                targetIdx = 2;
              } else if (jnj === "KB") {
                targetIdx = 3;
              } else if (jnj === "SPS" || jnj === "TPA") {
                targetIdx = 4;
              }
            }

            if (targetIdx >= 0 && targetIdx < 5) {
              var targetRow = result.tableData[targetIdx];

              var valRombel = parseInt(item.rombel) || 0;
              var valMurid = parseInt(item.murid) || 0;
              var valKS = parseInt(item.ks) || 0;
              var valGuru = parseInt(item.guru) || 0;
              var valTendik = parseInt(item.tendik) || 0;

              // Tambahkan ke akumulasi
              targetRow.rombel += valRombel;
              targetRow.murid += valMurid;
              targetRow.guru += (valKS + valGuru); // Kepala sekolah dihitung dalam jumlah guru
              targetRow.tendik += valTendik;
              targetRow.sudahLapor += 1;
            }
          });
        }
      }
    } catch (eLapbul) {
      Logger.log("Err Kalkulasi Lapbul Bulan Lalu: " + eLapbul.message);
    }

    // 4. HITUNG PERSENTASE PROGRESS PENGIRIMAN
    for (var idxRow = 0; idxRow < 5; idxRow++) {
      var row = result.tableData[idxRow];
      var totSek = row.sekolah || 0;
      var sudLapor = row.sudahLapor || 0;
      row.progress = totSek > 0 ? Math.round((sudLapor / totSek) * 100) : 0;
      row.progress = Math.min(100, row.progress);
    }

    // 5. HITUNG AKUMULASI TOTAL CARD METRIK ATAS
    result.totalSekolah = result.tableData.reduce(function (acc, r) { return acc + (r.sekolah || 0); }, 0);
    result.totalPtk = result.tableData.reduce(function (acc, r) { return acc + (r.guru || 0) + (r.tendik || 0); }, 0);
    result.totalMurid = result.tableData.reduce(function (acc, r) { return acc + (r.murid || 0); }, 0);

    var totalSudahLapor = result.tableData.reduce(function (acc, r) { return acc + (r.sudahLapor || 0); }, 0);
    result.totalSudahLapor = totalSudahLapor;
    result.totalProgress = result.totalSekolah > 0 ? Math.round((totalSudahLapor / result.totalSekolah) * 100) : 0;

    var resString = JSON.stringify({ success: true, data: result });

    // Simpan ke CacheService selama 10 menit (600 detik) agar tetap responsif dan selalu sinkron saat ada data baru
    try {
      CacheService.getScriptCache().put(cacheKey, resString, 600);
    } catch (ePut) {
      Logger.log("Cache put error: " + ePut.message);
    }

    return resString;
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

