const FOLDER_ID = "1wq_Wr8UnxVYRYesuDUyqSNrsca2ZILOB";
  
/**
 * Handler untuk request GET
 */
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'getAll') {
      const res = {
        allData: getSheetData(ss, 'Temuan') || [],
        inspectors: getSheetData(ss, 'Inspectors') || [],
        ulpList: getSheetData(ss, 'ULP') || [],
        feeders: getSheetData(ss, 'Feeders') || [],
        yandalList: getSheetData(ss, 'Yandal') || [],
        pekerjaanList: getSheetData(ss, 'Pekerjaan') || [],
        marqueeMessages: getSheetData(ss, 'Messages') || [],
        keteranganList: getKeteranganMappedData(ss) || [],
        harList: getSheetData(ss, 'HAR') || [],
        rowList: getSheetData(ss, 'ROW') || [],
        tujuanList: getSheetData(ss, 'Tujuan') || []
      };
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return errorResponse("Action not found");
  } catch (err) {
    return errorResponse(err.toString());
  }
}

/**
 * Handler untuk request POST
 */
function doPost(e) {
  let contents;
  try {
    contents = JSON.parse(e.postData.contents);
  } catch (err) {
    return errorResponse("Invalid JSON format");
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = contents.action;
  const data = contents.data;
  
  // 1. TAMBAH TEMUAN
  if (action === 'addTemuan') {
    const sheet = ss.getSheetByName('Temuan');
    if (!sheet) return errorResponse("Sheet 'Temuan' tidak ditemukan");
    
    if (data.fotoTemuan && data.fotoTemuan.indexOf('data:image') === 0) {
      data.fotoTemuan = saveToDrive(data.fotoTemuan, "TEMUAN_" + data.id + "_" + (data.noTiang || "UNTITLED"));
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(h => {
      const headerName = h.toString().trim();
      const lowerHeader = headerName.toLowerCase();
      
      // Map prioritas explicitly with fallback to support different casing in spreadsheet
      if (lowerHeader === 'prioritas') return data['prioritas'] !== undefined ? data['prioritas'] : "";
      
      // Fallback for other fields
      return data[headerName] !== undefined ? data[headerName] : (data[lowerHeader] !== undefined ? data[lowerHeader] : "");
    });
    
    sheet.appendRow(newRow);
    return successResponse("Temuan berhasil ditambahkan");
  }
  
  // 2. UPDATE EKSEKUSI (SANGAT DIOPTIMALKAN - BATCH SAVE)
  if (action === 'updateEksekusi') {
    const sheet = ss.getSheetByName('Temuan');
    if (!sheet) return errorResponse("Sheet 'Temuan' tidak ditemukan");
    
    // Process photos if they are base64 strings
    if (data.fotoTemuan && data.fotoTemuan.indexOf('data:image') === 0) {
      data.fotoTemuan = saveToDrive(data.fotoTemuan, "TEMUAN_" + data.id + "_" + (data.noTiang || "UNTITLED"));
    }
    
    if (data.fotoEksekusi && data.fotoEksekusi.indexOf('data:image') === 0) {
      data.fotoEksekusi = saveToDrive(data.fotoEksekusi, "DONE_" + data.id);
    }
    
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.findIndex(h => h.toString().trim().toLowerCase().replace(/\s/g, '') === 'id');
    
    if (idIdx === -1) return errorResponse("Kolom header 'id' tidak ditemukan");

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIdx].toString() === data.id.toString()) {
        const currentRow = rows[i];
        
        headers.forEach((h, colIdx) => {
          const headerName = h.toString().trim();
          const lowerHeader = headerName.toLowerCase();
          
          if (lowerHeader === 'prioritas') {
             if (data['prioritas'] !== undefined) {
               currentRow[colIdx] = data['prioritas'];
             }
          } else {
             const val = data[headerName] !== undefined ? data[headerName] : (data[lowerHeader] !== undefined ? data[lowerHeader] : null);
             if (val !== null) {
               currentRow[colIdx] = val;
             }
          }
        });
        
        // OPTIMIZATION: Update seluruh baris sekaligus dalam 1 API call ke Google Sheets.
        // Sebelumnya memanggil .setValue() satu per satu di dalam loop headers (sangat lambat dan sering timeout).
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([currentRow]);
        return successResponse("Data berhasil diperbarui");
      }
    }
    return errorResponse("Data ID " + data.id + " tidak ditemukan");
  }

  // 3. UPDATE MASTER DATA
  if (action === 'updateMaster') {
    const sheetName = contents.sheetName; 
    const newList = contents.data; 
    
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return errorResponse("Sheet '" + sheetName + "' tidak ditemukan");
    
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) return errorResponse("Sheet '" + sheetName + "' tidak memiliki kolom (header kosong)");
    
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).clearContent();
    }
    
    if (newList && newList.length > 0) {
      const rowsToAppend = newList.map(item => {
        return headers.map(h => {
          const key = h.toString().trim();
          const lowerKey = key.toLowerCase();
          
          if (item[key] !== undefined) return item[key];
          if (item[lowerKey] !== undefined) return item[lowerKey];
          
          // Case-insensitive fallback search
          const actualKey = Object.keys(item).find(k => k.toLowerCase() === lowerKey);
          return actualKey ? item[actualKey] : "";
        });
      });
      sheet.getRange(2, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }
    
    return successResponse("Master data " + sheetName + " berhasil diperbarui");
  }

  // 4. DELETE TEMUANS
  if (action === 'deleteTemuans') {
    const sheet = ss.getSheetByName('Temuan');
    if (!sheet) return errorResponse("Sheet 'Temuan' tidak ditemukan");
    
    if (!data || !data.ids || !Array.isArray(data.ids)) {
      return errorResponse("Parameter ids tidak valid atau kosong");
    }
    
    const deleteIds = data.ids.map(function(id) { return id.toString(); });
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const idIdx = headers.findIndex(function(h) {
      return h.toString().trim().toLowerCase().replace(/\s/g, '') === 'id';
    });
    
    if (idIdx === -1) return errorResponse("Kolom header 'id' tidak ditemukan");
    
    let deletedCount = 0;
    // Loop backwards to safely delete rows without changing other rows' row numbers
    for (let i = rows.length - 1; i >= 1; i--) {
      const rowId = rows[i][idIdx].toString();
      if (deleteIds.indexOf(rowId) !== -1) {
        sheet.deleteRow(i + 1);
        deletedCount++;
      }
    }
    return successResponse(deletedCount + " data temuan berhasil dihapus");
  }

  return errorResponse("Unknown action");
}

function getKeteranganMappedData(ss) {
  const sheet = ss.getSheetByName('Keterangan');
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => h.toString().toLowerCase().replace(/\s/g, ''));
  
  const idIdx = headers.indexOf('id');
  const nameIdx = headers.indexOf('name');
  const idPekerjaanIdx = headers.indexOf('idpekerjaan');

  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    const id = idIdx !== -1 ? row[idIdx] : row[0];
    const text = nameIdx !== -1 ? row[nameIdx] : row[1];
    const idPekerjaan = idPekerjaanIdx !== -1 ? row[idPekerjaanIdx] : row[2];

    if (!text) continue;

    results.push({
      id: id.toString().trim(),
      text: text.toString().trim(),
      idPekerjaan: idPekerjaan.toString().trim()
    });
  }
  
  return results;
}

function saveToDrive(base64, fileName) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const contentType = base64.substring(5, base64.indexOf(';'));
    const bytes = Utilities.base64Decode(base64.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    
    // Set permission can be slow; folder-level public permission is recommended.
    // We keep this to ensure the file is shared, but error-handled gracefully.
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn("Set sharing failed, relying on folder-level sharing: " + e.toString());
    }
    
    return file.getUrl();
  } catch (e) {
    return "Error Drive: " + e.toString();
  }
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return null;
  const d = sheet.getDataRange().getValues();
  if (d.length < 2) return [];
  
  const h = d.shift().map(header => header.toString().trim().toLowerCase()); // Normalize keys to lowercase
  
  return d.map(r => {
    let o = {};
    h.forEach((k, i) => {
      if (k) o[k] = r[i];
    });
    return o;
  });
}

function successResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({success: true, message: msg}))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({success: false, message: msg}))
    .setMimeType(ContentService.MimeType.JSON);
}
