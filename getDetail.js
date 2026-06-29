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
