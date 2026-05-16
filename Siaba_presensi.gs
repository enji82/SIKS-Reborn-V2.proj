/* ======================================================================
   SIABA PRESENSI HARIAN - DISPLAY VALUES VERSION
   (BAB VIII COMPLIANT)
   ====================================================================== */

function getSiabaFilters() {
  return JSON.stringify(getLookupFilters());
}

function getSiabaPresensiHarian(filterTahun, filterBulan, filterUnit) {
  try {
    const sheetLookup = getSheet("SIABA_LOOKUP_DB", "Lookup Siaba");
    const dataLookup = sheetLookup.getDataRange().getDisplayValues();
    
    let targetId = "", customSheet = "";
    for (let i = 1; i < dataLookup.length; i++) {
        if (dataLookup[i][0] == filterTahun && dataLookup[i][1] == filterBulan) {
            targetId = dataLookup[i][2];
            customSheet = dataLookup[i][3];     
            break; 
        }
    }
    
    if (!targetId) return JSON.stringify({ error: "Data Periode " + filterBulan + " " + filterTahun + " belum tersedia." });

    const ssTarget = getDBById(targetId);
    let sheetTarget = customSheet ? ssTarget.getSheetByName(customSheet) : ssTarget.getSheets()[0];
    if (!sheetTarget) sheetTarget = ssTarget.getSheetByName("Data Siaba");
    if (!sheetTarget) return JSON.stringify({ error: "Sheet data tidak ditemukan di file target." });

    const lastRow = sheetTarget.getLastRow();
    const lastCol = sheetTarget.getLastColumn(); 
    if (lastCol < 87) return JSON.stringify({ error: "Format kolom sheet tidak sesuai (Min 87 Kolom)." });

    const allData = sheetTarget.getRange(1, 1, lastRow, lastCol).getDisplayValues();
    const headerRow = allData[0].slice(3, 87); 
    const rawRows = allData.slice(1);

    let cleanRows = [];
    let effectiveUnit = filterUnit;
    if (filterUnit === "USER") {
      // dashGetMyUnit harus tersedia secara global atau dilempar dari client
      try { effectiveUnit = dashGetMyUnit(); } catch(e) { effectiveUnit = "SEMUA"; }
    }

    for (let i = 0; i < rawRows.length; i++) {
        let r = rawRows[i];
        if (effectiveUnit === "SEMUA" || effectiveUnit === "" || r[2] === effectiveUnit) {
            cleanRows.push(r);
        }
    }

    cleanRows.sort((a, b) => {
        let tpA = parseInt(a[5]) || 0; let tpB = parseInt(b[5]) || 0;
        if (tpB !== tpA) return tpB - tpA; 
        let taA = parseInt(a[20]) || 0; let taB = parseInt(b[20]) || 0;
        if (taB !== taA) return taB - taA; 
        let plaA = parseInt(a[22]) || 0; let plaB = parseInt(b[22]) || 0;
        if (plaB !== plaA) return plaB - plaA; 
        let laA = parseInt(a[24]) || 0; let laB = parseInt(b[24]) || 0;
        return laB - laA; 
    });

    const finalData = cleanRows.map(row => {
        let dataD_CI = row.slice(3, 87); 
        let unitMeta = row[2];           
        return dataD_CI.concat([unitMeta]); 
    });

    return JSON.stringify({
      headers: headerRow,
      rows: finalData
    });

  } catch (e) {
    return JSON.stringify({ error: "Error Server: " + e.message });
  }
}

/* ======================================================================
   SIABA APEL & UPACARA - DISPLAY VALUES VERSION
   (BAB VIII COMPLIANT)
   ====================================================================== */

function getSiabaApelFilters() {
  return JSON.stringify(getLookupFilters());
}

function getSiabaDataApel(filterTahun, filterBulan, filterUnit) {
  try {
    const sheetLookup = getSheet("SIABA_LOOKUP_DB", "Lookup Siaba");
    const dataLookup = sheetLookup.getDataRange().getDisplayValues();
    
    let targetId = "";
    for (let i = 1; i < dataLookup.length; i++) {
        if (dataLookup[i][0] == filterTahun && dataLookup[i][1] == filterBulan) {
            targetId = dataLookup[i][2]; 
            break; 
        }
    }

    const ssTarget = getDBById(targetId);
    const sheetTarget = ssTarget.getSheetByName("Data Apel");
    if (!sheetTarget) return JSON.stringify({ error: `Sheet "Data Apel" tidak ditemukan.` });

    const allData = sheetTarget.getDataRange().getDisplayValues();
    
    const headerData = allData[0].slice(3, 42); 
    
    allData.shift(); 
    
    let result = [];
    let effectiveUnit = filterUnit;
    if (filterUnit === "USER") effectiveUnit = dashGetMyUnit();
    
    for (let i = 0; i < allData.length; i++) {
        let row = allData[i];
        if (row.length < 3) continue;
        
        let rowUnit = row[2]; 
        
        if (effectiveUnit === "SEMUA" || effectiveUnit === "" || rowUnit == effectiveUnit) {
             let dataCells = row.slice(3, 42); 
             result.push(dataCells.concat([rowUnit]));
        }
    }
    
    return JSON.stringify({
      headers: headerData,
      rows: result
    });

  } catch (e) {
    return JSON.stringify({ error: "SYSTEM ERROR: " + e.message });
  }
}

/* ======================================================================
   SIABA TIDAK PRESENSI (SMART CACHE SUPPORT - BAB VIII COMPLIANT)
   ====================================================================== */

function getSiabaTidakFilters() {
  return JSON.stringify(getLookupFilters());
}

function getSiabaTidakData(filterTahun, filterBulan, filterUnit) {
  try {
    const sheetLookup = getSheet("SIABA_LOOKUP_DB", "Lookup Siaba");
    const dataLookup = sheetLookup.getDataRange().getDisplayValues();
    let targetId = "";
    
    for (let i = 1; i < dataLookup.length; i++) {
        if (dataLookup[i][0] == filterTahun && dataLookup[i][1] == filterBulan) {
            targetId = dataLookup[i][2]; 
            break; 
        }
    }

    if (!targetId) return JSON.stringify({ error: `Data ${filterBulan} ${filterTahun} belum ada di Lookup.` });

    let ssTarget;
    try { ssTarget = getDBById(targetId); }
    catch(e) { return JSON.stringify({ error: e.message }); }

    const TARGET_SHEET_NAME = "Data Alpa";
    const sheetTarget = ssTarget.getSheetByName(TARGET_SHEET_NAME);

    if (!sheetTarget) return JSON.stringify({ error: `Sheet "${TARGET_SHEET_NAME}" tidak ditemukan di file target.` });

    const maxCol = sheetTarget.getLastColumn();
    if (maxCol < 4) return JSON.stringify({ error: `Sheet Data Alpa kolom < 4.` });

    // Terverifikasi BAB VIII
    const allData = sheetTarget.getDataRange().getDisplayValues();
    const headerData = allData[0].slice(3); 
    
    allData.shift(); 
    
    let result = [];
    for (let i = 0; i < allData.length; i++) {
        let row = allData[i];
        if (row.length < 3) continue;
        
        let rowUnit = row[2]; 
        if (filterUnit === "SEMUA" || rowUnit == filterUnit) {
            let rowData = row.slice(3, 3 + headerData.length);
            rowData.push(rowUnit);
            
            result.push(rowData);
        }
    }

    if (result.length > 0) {
        result.sort((a, b) => {
            const valA = parseInt(a[2]) || 0;
            const valB = parseInt(b[2]) || 0;
            return valB - valA; 
        });
    }
    
    return JSON.stringify({
      headers: headerData,
      rows: result
    });

  } catch (e) {
    return JSON.stringify({ error: "SYSTEM ERROR: " + e.message });
  }
}

/* ======================================================================
   SIABA TERLAMBAT (SMART CACHE SUPPORT - BAB VIII COMPLIANT)
   ====================================================================== */

function getSiabaTerlambatFilters() {
  try {
    const sheet = getSheet("SIABA_TA_PA", "Rekap_Terlambat");
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) return JSON.stringify({ years: [] });
    
    const data = sheet.getRange(3, 1, lastRow - 2, 1).getDisplayValues();
    
    let years = new Set();
    data.forEach(row => {
      if (row[0]) years.add(row[0]); 
    });

    return JSON.stringify({
      years: Array.from(years).sort().reverse()
    });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function getSiabaTerlambatData(filterTahun, filterUnit) {
  try {
    const sheet = getSheet("SIABA_TA_PA", "Rekap_Terlambat");
    const maxCol = sheet.getLastColumn(); 
    const lastRow = sheet.getLastRow();
    
    // Terverifikasi BAB VIII
    const headerRange = sheet.getRange(1, 3, 2, maxCol - 2).getDisplayValues();
    const headerTop = headerRange[0]; 
    const headerSub = headerRange[1]; 

    if (lastRow < 3) return JSON.stringify({ error: "Data Kosong" });

    // Terverifikasi BAB VIII
    const rawData = sheet.getRange(3, 1, lastRow - 2, maxCol).getDisplayValues();
    
    let result = [];
    
    for (let i = 0; i < rawData.length; i++) {
        let row = rawData[i];
        
        let rowTahun = String(row[0]).trim(); 
        let rowUnit  = String(row[1]).toUpperCase().trim(); 
        
        if (rowTahun == String(filterTahun).trim()) {
             let rowDisplay = row.slice(2); 
             rowDisplay.push(rowUnit); 
             result.push(rowDisplay);
        }
    }

    if (result.length > 0) {
        result.sort((a, b) => {
            let idxTotal = a.length - 2; 
            let valA = parseInt(String(a[idxTotal]).replace(/\./g,'')) || 0;
            let valB = parseInt(String(b[idxTotal]).replace(/\./g,'')) || 0;
            return valB - valA; 
        });
    }

    return JSON.stringify({
      headerTop: headerTop,
      headerSub: headerSub,
      rows: result
    });

  } catch (e) {
    return JSON.stringify({ error: "SYSTEM ERROR: " + e.message });
  }
}

/* ======================================================================
   SIABA PULANG AWAL (BAB VIII COMPLIANT)
   ====================================================================== */

function getSiabaPulangFilters() {
  try {
    const sheet = getSheet("SIABA_TA_PA", "Rekap_Pulang_Awal"); 
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) return JSON.stringify({ years: [] });
    
    // Terverifikasi BAB VIII
    const data = sheet.getRange(3, 1, lastRow - 2, 1).getDisplayValues();
    let years = new Set();
    data.forEach(row => { if (row[0]) years.add(row[0]); });

    return JSON.stringify({
      years: Array.from(years).sort().reverse()
    });
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

function getSiabaPulangData(filterTahun, filterUnit) {
  try {
    const sheet = getSheet("SIABA_TA_PA", "Rekap_Pulang_Awal"); 
    const maxCol = sheet.getLastColumn(); 
    const lastRow = sheet.getLastRow();

    // Terverifikasi BAB VIII
    const headerRange = sheet.getRange(1, 3, 2, maxCol - 2).getDisplayValues();
    const headerTop = headerRange[0]; 
    const headerSub = headerRange[1]; 

    if (lastRow < 3) return JSON.stringify({ error: "Data Kosong" });

    // Terverifikasi BAB VIII
    const rawData = sheet.getRange(3, 1, lastRow - 2, maxCol).getDisplayValues();
    
    let result = [];
    
    for (let i = 0; i < rawData.length; i++) {
        let row = rawData[i];
        
        let rowTahun = String(row[0]).trim(); 
        let rowUnit  = String(row[1]).toUpperCase().trim(); 
        
        if (rowTahun == String(filterTahun).trim()) {
             let rowDisplay = row.slice(2); 
             rowDisplay.push(rowUnit);
             result.push(rowDisplay);
        }
    }

    if (result.length > 0) {
        result.sort((a, b) => {
            let idxTotal = a.length - 2; 
            let valA = parseInt(String(a[idxTotal]).replace(/\./g,'')) || 0;
            let valB = parseInt(String(b[idxTotal]).replace(/\./g,'')) || 0;
            return valB - valA; 
        });
    }

    return JSON.stringify({
      headerTop: headerTop,
      headerSub: headerSub,
      rows: result
    });

  } catch (e) {
    return JSON.stringify({ error: "SYSTEM ERROR: " + e.message });
  }
}

/* ======================================================================
   SIABA UNDUH REKAP (DRIVE API - NO SPREADSHEET READS)
   ====================================================================== */

function getSiabaUnduhData(folderId) {
  const ROOT_ID = FOLDER_CONFIG.SIABA_REKAP_ARCHIVE; 
  let targetId = folderId || ROOT_ID;
  let folder;

  try {
    folder = DriveApp.getFolderById(targetId);
  } catch(e) {
    return { error: "Folder tidak ditemukan atau akses ditolak." };
  }

  let parentId = null;
  let isRoot = (targetId === ROOT_ID);
  
  if (!isRoot) {
    let parents = folder.getParents();
    if (parents.hasNext()) parentId = parents.next().getId();
  }

  let items = [];

  let subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
     let f = subfolders.next();
     items.push({
       id: f.getId(),
       name: f.getName(),
       type: 'folder',
       mimeType: 'application/vnd.google-apps.folder',
       size: '-',
       date: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"),
       url: f.getUrl()
     });
  }

  let files = folder.getFiles();
  while (files.hasNext()) {
     let f = files.next();
     let size = (f.getSize() / 1024).toFixed(0) + " KB";
     if (f.getSize() > 1024 * 1024) size = (f.getSize() / (1024*1024)).toFixed(1) + " MB";

     items.push({
       id: f.getId(),
       name: f.getName(),
       type: 'file',
       mimeType: f.getMimeType(),
       size: size,
       date: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"),
       url: f.getUrl()
     });
  }

  const URUTAN_BULAN = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
  ];

  items.sort((a, b) => {
     if (a.type !== b.type) {
         return a.type === 'folder' ? -1 : 1;
     }

     let nameA = a.name.toUpperCase().trim();
     let nameB = b.name.toUpperCase().trim();

     let idxA = URUTAN_BULAN.indexOf(nameA);
     let idxB = URUTAN_BULAN.indexOf(nameB);

     if (idxA > -1 && idxB > -1) {
         return idxA - idxB;
     }

     return nameA.localeCompare(nameB, undefined, {numeric: true, sensitivity: 'base'});
  });

  return {
    currentId: targetId,
    currentName: folder.getName(),
    parentId: parentId,
    isRoot: isRoot,
    items: items
  };
}

/* ======================================================================
   SIABA UNDUH ARSIP (REKAP SIABA) - ROOT FOLDER KHUSUS
   ====================================================================== */

function getSiabaArsipData(folderId) {
  const ROOT_ID = FOLDER_CONFIG.SIABA_ARSIP_ROOT; 
  let targetId = folderId || ROOT_ID;
  let folder;

  try {
    folder = DriveApp.getFolderById(targetId);
  } catch(e) {
    return { error: "Folder tidak ditemukan atau akses ditolak." };
  }

  let parentId = null;
  let isRoot = (targetId === ROOT_ID);
  
  if (!isRoot) {
    let parents = folder.getParents();
    if (parents.hasNext()) parentId = parents.next().getId();
  }

  let items = [];

  // Mengambil Folder
  let subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
     let f = subfolders.next();
     items.push({
       id: f.getId(),
       name: f.getName(),
       type: 'folder',
       mimeType: 'application/vnd.google-apps.folder',
       size: '-',
       date: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"),
       url: f.getUrl()
     });
  }

  // Mengambil File
  let files = folder.getFiles();
  while (files.hasNext()) {
     let f = files.next();
     let size = (f.getSize() / 1024).toFixed(0) + " KB";
     if (f.getSize() > 1024 * 1024) size = (f.getSize() / (1024*1024)).toFixed(1) + " MB";

     items.push({
       id: f.getId(),
       name: f.getName(),
       type: 'file',
       mimeType: f.getMimeType(),
       size: size,
       date: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"),
       url: f.getUrl()
     });
  }

  // Urutkan Folder & File (Folder di atas)
  const URUTAN_BULAN = [
      "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
      "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
  ];

  items.sort((a, b) => {
     if (a.type !== b.type) {
         return a.type === 'folder' ? -1 : 1;
     }

     let nameA = a.name.toUpperCase().trim();
     let nameB = b.name.toUpperCase().trim();

     let idxA = URUTAN_BULAN.indexOf(nameA);
     let idxB = URUTAN_BULAN.indexOf(nameB);

     if (idxA > -1 && idxB > -1) {
         return idxA - idxB;
     }

     return nameA.localeCompare(nameB, undefined, {numeric: true, sensitivity: 'base'});
  });

  return {
    currentId: targetId,
    currentName: folder.getName(),
    parentId: parentId,
    isRoot: isRoot,
    items: items
  };
}