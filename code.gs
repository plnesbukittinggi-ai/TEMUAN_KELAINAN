/**
 * ============================================================================
 * I-MONEX (INSPEKSI - MONITORING & EXECUTION)
 * GOOGLE APPS SCRIPT BACKEND
 * AUTOMATIC SPREADSHEET ROTATION & HISTORICAL DATABASE INTEGRATION ENGINE
 * ============================================================================
 */

// Fallback Folder Google Drive untuk Penyimpanan Foto (sesuai FOLDER_ID script lama)
const DEFAULT_FOLDER_ID = "130Qb4x-zr4F5vpNkpsEN4c-ma7sYCP9T";

// Konfigurasi Kapasitas & Batas Rotasi Google Sheets
const DEFAULT_MAX_CELLS = 10000000; // Batas resmi Google Sheets: 10 Juta Sel
const DEFAULT_WARNING_THRESHOLD = 80; // 80% Peringatan
const DEFAULT_ROTATION_THRESHOLD = 85; // 85% Rotasi Otomatis Diperlukan
const DEFAULT_CRITICAL_THRESHOLD = 95; // 95% Kritis

// Nama Sheet Internal Registry & Monitoring
const SHEET_REGISTRY = "__IMONEX_DB_REGISTRY";
const SHEET_ROTATION_LOG = "__IMONEX_ROTATION_LOG";
const SHEET_CONFIG = "__IMONEX_CONFIG";

/**
 * ============================================================================
 * HANDLER UTAMA: GET REQUEST
 * ============================================================================
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || 'getAll';
  
  try {
    const controllerSs = SpreadsheetApp.getActiveSpreadsheet();
    const ulInfo = getUlIdentity(controllerSs);
    ensureRegistry(controllerSs, ulInfo);
    ensureLogSheet(controllerSs);
    ensureConfigSheet(controllerSs);
    
    // 1. GET ALL (DATA AKTIF + MASTER DATA + STATUS DATABASE)
    if (action === 'getAll') {
      const activeEntry = getActiveDatabaseEntry(controllerSs);
      const activeSs = openDatabaseSpreadsheet(activeEntry.databaseId, controllerSs);
      
      // Ambil data Temuan dari database ACTIVE (diberikan metadata sumber)
      const rawActiveTemuan = getSheetData(activeSs, 'Temuan') || [];
      const activeTemuan = rawActiveTemuan.map(row => {
        return Object.assign({}, row, {
          sourceSpreadsheetId: activeEntry.databaseId,
          sourceDatabaseSequence: activeEntry.sequence,
          sourceDatabaseStatus: 'ACTIVE',
          sourceDatabaseName: activeEntry.databaseName
        });
      });
      
      // Master data diambil dari Controller Spreadsheet (Single Source of Truth)
      const res = {
        allData: activeTemuan,
        inspectors: getSheetData(controllerSs, 'Inspectors') || [],
        ulpList: getSheetData(controllerSs, 'ULP') || [],
        feeders: getSheetData(controllerSs, 'Feeders') || [],
        yandalList: getSheetData(controllerSs, 'Yandal') || [],
        pekerjaanList: getSheetData(controllerSs, 'Pekerjaan') || [],
        marqueeMessages: getSheetData(controllerSs, 'Messages') || [],
        keteranganList: getKeteranganMappedData(controllerSs) || [],
        harList: getSheetData(controllerSs, 'HAR') || [],
        rowList: getSheetData(controllerSs, 'ROW') || [],
        tujuanList: getSheetData(controllerSs, 'Tujuan') || [],
        // Database Capacity & Registry Summary
        databaseCapacity: getDatabaseCapacityMetrics(controllerSs, activeSs, activeEntry),
        databaseRegistry: getRegistryEntries(controllerSs)
      };
      
      return jsonResponse(res);
    }
    
    // 2. GET DATABASE STATUS & CAPACITY
    if (action === 'getDatabaseStatus' || action === 'checkDatabaseCapacity') {
      const forceRecalc = params.force === 'true';
      const activeEntry = getActiveDatabaseEntry(controllerSs);
      const activeSs = openDatabaseSpreadsheet(activeEntry.databaseId, controllerSs);
      const capacityInfo = getDatabaseCapacityMetrics(controllerSs, activeSs, activeEntry, forceRecalc);
      const registryList = getRegistryEntries(controllerSs);
      
      return jsonResponse({
        success: true,
        capacity: capacityInfo,
        registry: registryList
      });
    }
    
    // 3. GET DATABASE REGISTRY LIST
    if (action === 'getDatabaseRegistry') {
      const registryList = getRegistryEntries(controllerSs);
      return jsonResponse({
        success: true,
        data: registryList
      });
    }
    
    // 4. GET HISTORICAL DATA (VIRTUAL AGGREGATION DARI DATABASE ARSIP)
    if (action === 'getHistoricalData') {
      const filters = {
        startDate: params.filterStartDate || params.startDate || '',
        endDate: params.filterEndDate || params.endDate || '',
        ulp: params.filterUlp || params.ulp || '',
        feeder: params.filterFeeder || params.feeder || '',
        status: params.filterStatus || params.status || '',
        pekerjaan: params.filterPekerjaan || params.pekerjaan || '',
        search: params.search || '',
        limit: params.limit ? parseInt(params.limit, 10) : 0,
        page: params.page ? parseInt(params.page, 10) : 1
      };
      
      const historicalData = getHistoricalDataByFilter(controllerSs, filters);
      return jsonResponse({
        success: true,
        data: historicalData,
        count: historicalData.length
      });
    }
    
    // 5. GET ROTATION HISTORY LOG
    if (action === 'getRotationHistory') {
      const history = getRotationHistoryLogs(controllerSs);
      return jsonResponse({
        success: true,
        data: history
      });
    }
    
    return errorResponse("Action not found: " + action);
  } catch (err) {
    return errorResponse("GET Error: " + err.toString());
  }
}

/**
 * ============================================================================
 * HANDLER UTAMA: POST REQUEST
 * ============================================================================
 */
function doPost(e) {
  let contents;
  try {
    contents = JSON.parse(e.postData.contents);
  } catch (err) {
    return errorResponse("Invalid JSON format");
  }
  
  const controllerSs = SpreadsheetApp.getActiveSpreadsheet();
  const ulInfo = getUlIdentity(controllerSs);
  ensureRegistry(controllerSs, ulInfo);
  ensureLogSheet(controllerSs);
  ensureConfigSheet(controllerSs);
  
  const action = contents.action;
  const data = contents.data;
  
  // --------------------------------------------------------------------------
  // 1. TAMBAH TEMUAN (KE ACTIVE DATABASE DENGAN PENGECEKAN AMBANG BATAS ROTASI)
  // --------------------------------------------------------------------------
  if (action === 'addTemuan') {
    return handleAddTemuan(controllerSs, data, ulInfo);
  }
  
  // --------------------------------------------------------------------------
  // 2. UPDATE EKSEKUSI (ROUTING KE DATABASE ASAL BERDASARKAN ID & METADATA)
  // --------------------------------------------------------------------------
  if (action === 'updateEksekusi') {
    return handleUpdateEksekusi(controllerSs, data, ulInfo);
  }
  
  // --------------------------------------------------------------------------
  // 3. DELETE TEMUAN (MENGHAPUS RECORD DARI DATABASE ASAL)
  // --------------------------------------------------------------------------
  if (action === 'deleteTemuans') {
    return handleDeleteTemuans(controllerSs, data, ulInfo);
  }
  
  // --------------------------------------------------------------------------
  // 4. UPDATE MASTER DATA (PADA CONTROLLER / PRIMARY SOURCE)
  // --------------------------------------------------------------------------
  if (action === 'updateMaster') {
    return handleUpdateMaster(controllerSs, contents.sheetName, contents.data);
  }
  
  // --------------------------------------------------------------------------
  // 5. MANUAL SPREADSHEET ROTATION (SUPER ADMIN TRIGGERED)
  // --------------------------------------------------------------------------
  if (action === 'rotateDatabase') {
    const triggeredBy = contents.triggeredBy || 'SUPER_ADMIN';
    const reason = contents.reason || 'Manual rotation requested by Super Admin';
    return handleManualRotation(controllerSs, ulInfo, triggeredBy, reason);
  }
  
  // --------------------------------------------------------------------------
  // 6. UPDATE ROTATION SETTINGS (SUPER ADMIN)
  // --------------------------------------------------------------------------
  if (action === 'updateRotationSettings') {
    return handleUpdateRotationSettings(controllerSs, contents.settings || data);
  }
  
  return errorResponse("Unknown action: " + action);
}

/**
 * ============================================================================
 * BAGIAN: FUNGSI HANDLER TRANSAKSI
 * ============================================================================
 */

function handleAddTemuan(controllerSs, data, ulInfo) {
  if (!data || !data.id) {
    return errorResponse("Data temuan tidak valid (id wajib ada)");
  }
  
  // Periksa apakah rotasi otomatis diperlukan sebelum menyimpan transaksi
  const config = getConfig(controllerSs);
  let activeEntry = getActiveDatabaseEntry(controllerSs);
  let activeSs = openDatabaseSpreadsheet(activeEntry.databaseId, controllerSs);
  
  if (config.autoRotationEnabled) {
    const capacity = calculateDatabaseCapacity(activeSs);
    if (capacity.capacityPercent >= config.rotationThreshold) {
      // Ambang batas tercapai -> Lakukan rotasi otomatis yang aman
      const rotationResult = executeDatabaseRotation(controllerSs, ulInfo, 'SYSTEM_AUTO_THRESHOLD', 'Kapasitas mencapai ' + capacity.capacityPercent + '%');
      if (rotationResult.success) {
        activeEntry = getActiveDatabaseEntry(controllerSs);
        activeSs = openDatabaseSpreadsheet(activeEntry.databaseId, controllerSs);
      }
    }
  }
  
  const sheet = activeSs.getSheetByName('Temuan');
  if (!sheet) return errorResponse("Sheet 'Temuan' tidak ditemukan pada database aktif");
  
  // Simpan foto temuan ke Drive jika berupa base64
  if (data.fotoTemuan && data.fotoTemuan.indexOf('data:image') === 0) {
    const folderId = getDriveFolderId(controllerSs);
    data.fotoTemuan = saveToDrive(data.fotoTemuan, "TEMUAN_" + data.id + "_" + (data.noTiang || "UNTITLED"), folderId);
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => {
    const headerName = h.toString().trim();
    const lowerHeader = headerName.toLowerCase();
    
    if (lowerHeader === 'prioritas') return data['prioritas'] !== undefined ? data['prioritas'] : "";
    return data[headerName] !== undefined ? data[headerName] : (data[lowerHeader] !== undefined ? data[lowerHeader] : "");
  });
  
  sheet.appendRow(newRow);
  
  // Perbarui total record di registry
  updateRegistryRecordCount(controllerSs, activeEntry.databaseId);
  
  return successResponse("Temuan berhasil ditambahkan ke database " + activeEntry.databaseName);
}

function handleUpdateEksekusi(controllerSs, data, ulInfo) {
  if (!data || !data.id) {
    return errorResponse("Data eksekusi tidak valid (id wajib ada)");
  }
  
  // Cari sumber spreadsheet di mana record berada (Historical Routing)
  const source = findTemuanSource(controllerSs, data.id, data.sourceSpreadsheetId);
  if (!source) {
    return errorResponse("Data ID " + data.id + " tidak ditemukan di database aktif maupun arsip");
  }
  
  const sheet = source.sheet;
  const folderId = getDriveFolderId(controllerSs);
  
  if (data.fotoTemuan && data.fotoTemuan.indexOf('data:image') === 0) {
    data.fotoTemuan = saveToDrive(data.fotoTemuan, "TEMUAN_" + data.id + "_" + (data.noTiang || "UNTITLED"), folderId);
  }
  
  if (data.fotoEksekusi && data.fotoEksekusi.indexOf('data:image') === 0) {
    data.fotoEksekusi = saveToDrive(data.fotoEksekusi, "DONE_" + data.id, folderId);
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const currentRow = sheet.getRange(source.rowIndex, 1, 1, headers.length).getValues()[0];
  
  headers.forEach((h, colIdx) => {
    const headerName = h.toString().trim();
    const lowerHeader = headerName.toLowerCase();
    
    if (lowerHeader === 'prioritas') {
      if (data['prioritas'] !== undefined) currentRow[colIdx] = data['prioritas'];
    } else {
      const val = data[headerName] !== undefined ? data[headerName] : (data[lowerHeader] !== undefined ? data[lowerHeader] : null);
      if (val !== null) currentRow[colIdx] = val;
    }
  });
  
  // Simpan baris dalam 1 batch call
  sheet.getRange(source.rowIndex, 1, 1, headers.length).setValues([currentRow]);
  
  return successResponse("Data ID " + data.id + " berhasil diperbarui pada database " + source.databaseName);
}

function handleDeleteTemuans(controllerSs, data, ulInfo) {
  if (!data || !data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
    return errorResponse("Parameter ids tidak valid atau kosong");
  }
  
  const deleteIds = data.ids.map(id => id.toString());
  const registries = getRegistryEntries(controllerSs);
  let totalDeleted = 0;
  
  // Telusuri seluruh database terkait untuk menghapus data dari sumber aslinya
  for (let r = 0; r < registries.length; r++) {
    const entry = registries[r];
    try {
      const ss = openDatabaseSpreadsheet(entry.databaseId, controllerSs);
      const sheet = ss.getSheetByName('Temuan');
      if (!sheet) continue;
      
      const rows = sheet.getDataRange().getValues();
      if (rows.length < 2) continue;
      
      const headers = rows[0];
      const idIdx = headers.findIndex(h => h.toString().trim().toLowerCase().replace(/\s/g, '') === 'id');
      if (idIdx === -1) continue;
      
      let deletedInThisDb = 0;
      for (let i = rows.length - 1; i >= 1; i--) {
        const rowId = rows[i][idIdx].toString();
        if (deleteIds.indexOf(rowId) !== -1) {
          sheet.deleteRow(i + 1);
          deletedInThisDb++;
          totalDeleted++;
        }
      }
      
      if (deletedInThisDb > 0) {
        updateRegistryRecordCount(controllerSs, entry.databaseId);
      }
    } catch (e) {
      console.warn("Gagal mengecek hapus di DB: " + entry.databaseId + " - " + e.toString());
    }
  }
  
  return successResponse(totalDeleted + " data temuan berhasil dihapus dari database sumber");
}

function handleUpdateMaster(controllerSs, sheetName, newList) {
  if (!sheetName) return errorResponse("Parameter sheetName wajib ada");
  
  const sheet = controllerSs.getSheetByName(sheetName);
  if (!sheet) return errorResponse("Sheet '" + sheetName + "' tidak ditemukan pada controller");
  
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return errorResponse("Sheet '" + sheetName + "' tidak memiliki header");
  
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
        
        const actualKey = Object.keys(item).find(k => k.toLowerCase() === lowerKey);
        return actualKey ? item[actualKey] : "";
      });
    });
    sheet.getRange(2, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
  
  return successResponse("Master data " + sheetName + " berhasil diperbarui");
}

function handleManualRotation(controllerSs, ulInfo, triggeredBy, reason) {
  const result = executeDatabaseRotation(controllerSs, ulInfo, triggeredBy, reason);
  if (result.success) {
    return jsonResponse({
      success: true,
      message: "Rotasi database berhasil dilakukan.",
      data: result.newDatabase
    });
  } else {
    return errorResponse("Rotasi database gagal: " + result.errorMessage);
  }
}

function handleUpdateRotationSettings(controllerSs, settings) {
  if (!settings) return errorResponse("Parameter settings tidak valid");
  
  const sheet = controllerSs.getSheetByName(SHEET_CONFIG);
  if (!sheet) return errorResponse("Sheet konfigurasi tidak ditemukan");
  
  const keys = ['autoRotationEnabled', 'warningThreshold', 'rotationThreshold', 'criticalThreshold'];
  const values = sheet.getDataRange().getValues();
  
  keys.forEach(k => {
    if (settings[k] !== undefined) {
      let found = false;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0].toString() === k) {
          sheet.getRange(i + 1, 2).setValue(settings[k].toString());
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([k, settings[k].toString()]);
      }
    }
  });
  
  return successResponse("Pengaturan rotasi database berhasil disimpan");
}

/**
 * ============================================================================
 * BAGIAN: ENGINE ROTASI DATABASE (AUTOMATIC SPREADSHEET ROTATION)
 * ============================================================================
 */

function executeDatabaseRotation(controllerSs, ulInfo, triggeredBy, reason) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000); // 30 Detik Lock Timeout
  
  if (!hasLock) {
    return {
      success: false,
      errorMessage: "Proses rotasi database lain sedang berlangsung. Mohon tunggu beberapa saat."
    };
  }
  
  let newSpreadsheet = null;
  const currentActive = getActiveDatabaseEntry(controllerSs);
  const nextSeq = (currentActive.sequence || 1) + 1;
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  const formattedSeq = nextSeq < 10 ? ("00" + nextSeq) : (nextSeq < 100 ? ("0" + nextSeq) : nextSeq);
  const newName = "I-MONEX DB " + (ulInfo.kodeUL || 'UL') + " SEQ " + formattedSeq;
  
  try {
    // 1. Dapatkan kapasitas database sebelum rotasi
    const activeSs = openDatabaseSpreadsheet(currentActive.databaseId, controllerSs);
    const capacityBefore = calculateDatabaseCapacity(activeSs).capacityPercent;
    
    // 2. Buat Spreadsheet Baru Menggunakan Template I-MONEX
    newSpreadsheet = SpreadsheetApp.create(newName);
    const newId = newSpreadsheet.getId();
    const newUrl = newSpreadsheet.getUrl();
    
    // 3. Gandakan Struktur Sheet Temuan (Header Saja, Kosongkan Baris Transaksi)
    const activeTemuanSheet = activeSs.getSheetByName('Temuan') || controllerSs.getSheetByName('Temuan');
    if (!activeTemuanSheet) {
      throw new Error("Sheet 'Temuan' template tidak ditemukan pada database acuan");
    }
    
    const temuanHeader = activeTemuanSheet.getRange(1, 1, 1, activeTemuanSheet.getLastColumn()).getValues();
    const newTemuanSheet = newSpreadsheet.getActiveSheet();
    newTemuanSheet.setName('Temuan');
    newTemuanSheet.getRange(1, 1, 1, temuanHeader[0].length).setValues(temuanHeader);
    newTemuanSheet.getRange(1, 1, 1, temuanHeader[0].length).setFontWeight("bold");
    
    // 4. Salin Master Data Sheets ke Spreadsheet Baru (Agar Mandiri & Kompatibel)
    const masterSheetNames = ['Inspectors', 'ULP', 'Feeders', 'Keterangan', 'Yandal', 'HAR', 'ROW', 'Pekerjaan', 'Tujuan', 'Messages'];
    masterSheetNames.forEach(sName => {
      const sourceMaster = controllerSs.getSheetByName(sName) || activeSs.getSheetByName(sName);
      if (sourceMaster && sourceMaster.getLastColumn() > 0) {
        const targetSheet = newSpreadsheet.insertSheet(sName);
        const data = sourceMaster.getDataRange().getValues();
        if (data.length > 0) {
          targetSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
          targetSheet.getRange(1, 1, 1, data[0].length).setFontWeight("bold");
        }
      }
    });
    
    // 5. Verifikasi Keberadaan Spreadsheet Baru
    const verifySs = SpreadsheetApp.openById(newId);
    if (!verifySs || !verifySs.getSheetByName('Temuan')) {
      throw new Error("Verifikasi spreadsheet baru gagal. Sheet 'Temuan' tidak dapat dibaca.");
    }
    
    // 6. Registrasi ke Sheet __IMONEX_DB_REGISTRY
    const registrySheet = controllerSs.getSheetByName(SHEET_REGISTRY);
    const nowIso = new Date().toISOString();
    
    // Ubah status database lama menjadi ARCHIVE
    const regValues = registrySheet.getDataRange().getValues();
    for (let r = 1; r < regValues.length; r++) {
      if (regValues[r][3].toString() === currentActive.databaseId) {
        registrySheet.getRange(r + 1, 7).setValue('ARCHIVE'); // DATABASE_STATUS
        registrySheet.getRange(r + 1, 11).setValue(nowIso);    // ARCHIVED_AT
        break;
      }
    }
    
    // Tambah baris database baru sebagai ACTIVE
    registrySheet.appendRow([
      ulInfo.id,
      ulInfo.kodeUL,
      ulInfo.namaUL,
      newId,
      newName,
      newUrl,
      'ACTIVE',
      nextSeq,
      nowIso, // CREATED_AT
      nowIso, // ACTIVATED_AT
      '',     // ARCHIVED_AT
      0,      // TOTAL_RECORDS
      0,      // USED_CELLS
      0,      // CAPACITY_PERCENT
      nowIso  // LAST_SYNC
    ]);
    
    // 7. Catat Ke Log Rotasi
    const logSheet = controllerSs.getSheetByName(SHEET_ROTATION_LOG);
    const logId = "ROT-" + Date.now();
    logSheet.appendRow([
      logId,
      ulInfo.id,
      ulInfo.kodeUL,
      ulInfo.namaUL,
      currentActive.databaseId,
      currentActive.databaseName,
      newId,
      newName,
      nowIso,
      capacityBefore,
      triggeredBy,
      'SUCCESS',
      reason || 'Rotasi berhasil diselesaikan'
    ]);
    
    lock.releaseLock();
    
    return {
      success: true,
      newDatabase: {
        databaseId: newId,
        databaseName: newName,
        databaseUrl: newUrl,
        sequence: nextSeq
      }
    };
  } catch (err) {
    console.error("Gagal melakukan rotasi database:", err);
    
    // Catat log kegagalan rotasi
    try {
      const logSheet = controllerSs.getSheetByName(SHEET_ROTATION_LOG);
      if (logSheet) {
        logSheet.appendRow([
          "ERR-" + Date.now(),
          ulInfo.id,
          ulInfo.kodeUL,
          ulInfo.namaUL,
          currentActive.databaseId,
          currentActive.databaseName,
          newSpreadsheet ? newSpreadsheet.getId() : '',
          newName,
          new Date().toISOString(),
          0,
          triggeredBy,
          'FAILED',
          err.toString()
        ]);
      }
    } catch (logErr) {
      console.warn("Gagal menulis log error:", logErr);
    }
    
    lock.releaseLock();
    
    return {
      success: false,
      errorMessage: err.toString()
    };
  }
}

/**
 * ============================================================================
 * BAGIAN: HISTORICAL DATABASE AGGREGATION & ROUTING
 * ============================================================================
 */

function getHistoricalDataByFilter(controllerSs, filters) {
  const registries = getRegistryEntries(controllerSs);
  const archiveDatabases = registries.filter(r => r.databaseStatus === 'ARCHIVE');
  const results = [];
  
  const matchStartDate = filters.startDate ? new Date(filters.startDate) : null;
  const matchEndDate = filters.endDate ? new Date(filters.endDate) : null;
  if (matchStartDate) matchStartDate.setHours(0, 0, 0, 0);
  if (matchEndDate) matchEndDate.setHours(23, 59, 59, 999);
  
  for (let d = 0; d < archiveDatabases.length; d++) {
    const dbEntry = archiveDatabases[d];
    try {
      const ss = openDatabaseSpreadsheet(dbEntry.databaseId, controllerSs);
      const sheet = ss.getSheetByName('Temuan');
      if (!sheet) continue;
      
      const rows = sheet.getDataRange().getValues();
      if (rows.length < 2) continue;
      
      const headers = rows.shift().map(h => h.toString().trim().toLowerCase());
      
      rows.forEach(r => {
        const rowObj = {};
        headers.forEach((h, i) => {
          if (h) rowObj[h] = r[i];
        });
        
        // Metadata Sumber Database
        rowObj.sourceSpreadsheetId = dbEntry.databaseId;
        rowObj.sourceDatabaseSequence = dbEntry.sequence;
        rowObj.sourceDatabaseStatus = 'ARCHIVE';
        rowObj.sourceDatabaseName = dbEntry.databaseName;
        
        // Filter Tanggal
        if (matchStartDate || matchEndDate) {
          const rowDate = parseDateString(rowObj.tanggal);
          if (matchStartDate && rowDate < matchStartDate) return;
          if (matchEndDate && rowDate > matchEndDate) return;
        }
        
        // Filter ULP
        if (filters.ulp && rowObj.ulp && rowObj.ulp !== filters.ulp) return;
        
        // Filter Feeder
        if (filters.feeder && rowObj.feeder && rowObj.feeder !== filters.feeder) return;
        
        // Filter Status
        if (filters.status && rowObj.status && rowObj.status !== filters.status) return;
        
        // Filter Pekerjaan
        if (filters.pekerjaan && rowObj.pekerjaan && rowObj.pekerjaan !== filters.pekerjaan) return;
        
        // Filter Search Text
        if (filters.search) {
          const s = filters.search.toLowerCase();
          const strVal = [rowObj.notiang, rowObj.feeder, rowObj.keterangan, rowObj.alamat, rowObj.ulp].join(' ').toLowerCase();
          if (strVal.indexOf(s) === -1) return;
        }
        
        results.push(rowObj);
      });
    } catch (err) {
      console.warn("Gagal membaca database arsip: " + dbEntry.databaseId + " - " + err.toString());
    }
  }
  
  return results;
}

function findTemuanSource(controllerSs, temuanId, preferredSpreadsheetId) {
  const targetIdStr = temuanId.toString().trim();
  const registries = getRegistryEntries(controllerSs);
  
  // 1. Coba Spreadsheet Pilihan (Jika frontend telah mengirimkan sourceSpreadsheetId)
  if (preferredSpreadsheetId) {
    try {
      const ss = openDatabaseSpreadsheet(preferredSpreadsheetId, controllerSs);
      const sheet = ss.getSheetByName('Temuan');
      if (sheet) {
        const rows = sheet.getDataRange().getValues();
        if (rows.length >= 2) {
          const headers = rows[0];
          const idIdx = headers.findIndex(h => h.toString().trim().toLowerCase().replace(/\s/g, '') === 'id');
          if (idIdx !== -1) {
            for (let i = 1; i < rows.length; i++) {
              if (rows[i][idIdx].toString().trim() === targetIdStr) {
                const reg = registries.find(r => r.databaseId === preferredSpreadsheetId);
                return {
                  spreadsheet: ss,
                  sheet: sheet,
                  rowIndex: i + 1,
                  databaseId: preferredSpreadsheetId,
                  databaseName: reg ? reg.databaseName : 'Database',
                  sequence: reg ? reg.sequence : 1
                };
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Pencarian pada preferredSpreadsheetId gagal, lanjut pencarian registry...");
    }
  }
  
  // 2. Coba Database ACTIVE Terlebih Dahulu
  const activeEntry = getActiveDatabaseEntry(controllerSs);
  try {
    const ss = openDatabaseSpreadsheet(activeEntry.databaseId, controllerSs);
    const sheet = ss.getSheetByName('Temuan');
    if (sheet) {
      const rows = sheet.getDataRange().getValues();
      if (rows.length >= 2) {
        const headers = rows[0];
        const idIdx = headers.findIndex(h => h.toString().trim().toLowerCase().replace(/\s/g, '') === 'id');
        if (idIdx !== -1) {
          for (let i = 1; i < rows.length; i++) {
            if (rows[i][idIdx].toString().trim() === targetIdStr) {
              return {
                spreadsheet: ss,
                sheet: sheet,
                rowIndex: i + 1,
                databaseId: activeEntry.databaseId,
                databaseName: activeEntry.databaseName,
                sequence: activeEntry.sequence
              };
            }
          }
        }
      }
    }
  } catch (e) {}
  
  // 3. Telusuri Seluruh Database Arsip
  for (let r = 0; r < registries.length; r++) {
    const entry = registries[r];
    if (entry.databaseId === activeEntry.databaseId) continue;
    
    try {
      const ss = openDatabaseSpreadsheet(entry.databaseId, controllerSs);
      const sheet = ss.getSheetByName('Temuan');
      if (!sheet) continue;
      
      const rows = sheet.getDataRange().getValues();
      if (rows.length < 2) continue;
      
      const headers = rows[0];
      const idIdx = headers.findIndex(h => h.toString().trim().toLowerCase().replace(/\s/g, '') === 'id');
      if (idIdx === -1) continue;
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIdx].toString().trim() === targetIdStr) {
          return {
            spreadsheet: ss,
            sheet: sheet,
            rowIndex: i + 1,
            databaseId: entry.databaseId,
            databaseName: entry.databaseName,
            sequence: entry.sequence
          };
        }
      }
    } catch (e) {}
  }
  
  return null;
}

/**
 * ============================================================================
 * BAGIAN: DETEKSI KAPASITAS & REGISTRY MANAGEMENT
 * ============================================================================
 */

function calculateDatabaseCapacity(ss) {
  let totalAllocatedCells = 0;
  let totalUsedCells = 0;
  const sheets = ss.getSheets();
  let totalTemuanRecords = 0;
  
  sheets.forEach(sheet => {
    // Lewati sheet internal
    if (sheet.getName().indexOf('__IMONEX') === 0) return;
    
    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();
    totalAllocatedCells += (maxRows * maxCols);
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    totalUsedCells += (lastRow * lastCol);
    
    if (sheet.getName() === 'Temuan') {
      totalTemuanRecords = Math.max(0, lastRow - 1);
    }
  });
  
  // Gunakan grid allocated cells sebagai acuan batas Google Sheets (10 Juta Sel)
  const capacityPercent = Math.min(100, Math.round((totalAllocatedCells / DEFAULT_MAX_CELLS) * 10000) / 100);
  
  return {
    totalSheets: sheets.length,
    totalCellsAllocated: totalAllocatedCells,
    totalCellsUsed: totalUsedCells,
    capacityPercent: capacityPercent,
    recordsCount: totalTemuanRecords
  };
}

function getDatabaseCapacityMetrics(controllerSs, activeSs, activeEntry, forceRecalc) {
  const config = getConfig(controllerSs);
  const capacity = calculateDatabaseCapacity(activeSs);
  const ulInfo = getUlIdentity(controllerSs);
  const registries = getRegistryEntries(controllerSs);
  
  let status = 'NORMAL';
  if (capacity.capacityPercent >= config.criticalThreshold) {
    status = 'CRITICAL';
  } else if (capacity.capacityPercent >= config.rotationThreshold) {
    status = 'ROTATION_REQUIRED';
  } else if (capacity.capacityPercent >= config.warningThreshold) {
    status = 'WARNING';
  }
  
  let totalHistoricalRecords = 0;
  registries.forEach(r => {
    totalHistoricalRecords += (r.totalRecords || 0);
  });
  
  return {
    ulId: ulInfo.id,
    kodeUL: ulInfo.kodeUL,
    namaUL: ulInfo.namaUL,
    controllerDatabaseId: controllerSs.getId(),
    activeDatabaseId: activeEntry.databaseId,
    activeDatabaseName: activeEntry.databaseName,
    activeDatabaseUrl: activeEntry.databaseUrl,
    totalSheets: capacity.totalSheets,
    totalCellsAllocated: capacity.totalCellsAllocated,
    totalCellsUsed: capacity.totalCellsUsed,
    capacityPercent: capacity.capacityPercent,
    maxCells: DEFAULT_MAX_CELLS,
    status: status,
    warningThreshold: config.warningThreshold,
    rotationThreshold: config.rotationThreshold,
    criticalThreshold: config.criticalThreshold,
    autoRotationEnabled: config.autoRotationEnabled,
    activeRecordsCount: capacity.recordsCount,
    totalHistoricalRecordsCount: totalHistoricalRecords,
    totalDatabasesCount: registries.length,
    lastChecked: new Date().toISOString()
  };
}

function ensureRegistry(controllerSs, ulInfo) {
  let sheet = controllerSs.getSheetByName(SHEET_REGISTRY);
  if (!sheet) {
    sheet = controllerSs.insertSheet(SHEET_REGISTRY);
    const headers = [
      'UL_ID', 'KODE_UL', 'NAMA_UL', 'DATABASE_ID', 'DATABASE_NAME', 'DATABASE_URL',
      'DATABASE_STATUS', 'SEQUENCE', 'CREATED_AT', 'ACTIVATED_AT', 'ARCHIVED_AT',
      'TOTAL_RECORDS', 'USED_CELLS', 'CAPACITY_PERCENT', 'LAST_SYNC'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    
    // Baris Pertama: Controller Spreadsheet sebagai Database Awal (Sequence 1)
    const nowIso = new Date().toISOString();
    const capacity = calculateDatabaseCapacity(controllerSs);
    sheet.appendRow([
      ulInfo.id,
      ulInfo.kodeUL,
      ulInfo.namaUL,
      controllerSs.getId(),
      controllerSs.getName() || ("I-MONEX DB " + ulInfo.kodeUL + " SEQ 001"),
      controllerSs.getUrl(),
      'ACTIVE',
      1,
      nowIso,
      nowIso,
      '',
      capacity.recordsCount,
      capacity.totalCellsUsed,
      capacity.capacityPercent,
      nowIso
    ]);
  }
}

function ensureLogSheet(controllerSs) {
  let sheet = controllerSs.getSheetByName(SHEET_ROTATION_LOG);
  if (!sheet) {
    sheet = controllerSs.insertSheet(SHEET_ROTATION_LOG);
    const headers = [
      'LOG_ID', 'UL_ID', 'KODE_UL', 'NAMA_UL',
      'PREVIOUS_DATABASE_ID', 'PREVIOUS_DATABASE_NAME',
      'NEW_DATABASE_ID', 'NEW_DATABASE_NAME',
      'TIMESTAMP', 'CAPACITY_BEFORE', 'TRIGGERED_BY', 'STATUS', 'ERROR_MESSAGE'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
}

function ensureConfigSheet(controllerSs) {
  let sheet = controllerSs.getSheetByName(SHEET_CONFIG);
  if (!sheet) {
    sheet = controllerSs.insertSheet(SHEET_CONFIG);
    sheet.getRange(1, 1, 1, 2).setValues([['KEY', 'VALUE']]);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold");
    sheet.appendRow(['autoRotationEnabled', 'true']);
    sheet.appendRow(['warningThreshold', DEFAULT_WARNING_THRESHOLD.toString()]);
    sheet.appendRow(['rotationThreshold', DEFAULT_ROTATION_THRESHOLD.toString()]);
    sheet.appendRow(['criticalThreshold', DEFAULT_CRITICAL_THRESHOLD.toString()]);
  }
}

function getConfig(controllerSs) {
  const sheet = controllerSs.getSheetByName(SHEET_CONFIG);
  const cfg = {
    autoRotationEnabled: true,
    warningThreshold: DEFAULT_WARNING_THRESHOLD,
    rotationThreshold: DEFAULT_ROTATION_THRESHOLD,
    criticalThreshold: DEFAULT_CRITICAL_THRESHOLD
  };
  
  if (!sheet) return cfg;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const k = values[i][0].toString().trim();
    const v = values[i][1].toString().trim();
    if (k === 'autoRotationEnabled') cfg.autoRotationEnabled = (v === 'true' || v === 'TRUE');
    if (k === 'warningThreshold') cfg.warningThreshold = parseFloat(v) || DEFAULT_WARNING_THRESHOLD;
    if (k === 'rotationThreshold') cfg.rotationThreshold = parseFloat(v) || DEFAULT_ROTATION_THRESHOLD;
    if (k === 'criticalThreshold') cfg.criticalThreshold = parseFloat(v) || DEFAULT_CRITICAL_THRESHOLD;
  }
  return cfg;
}

function getRegistryEntries(controllerSs) {
  const sheet = controllerSs.getSheetByName(SHEET_REGISTRY);
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  
  const headers = values[0].map(h => h.toString().toLowerCase().replace(/_/g, ''));
  const idIdx = headers.indexOf('databaseid');
  const nameIdx = headers.indexOf('databasename');
  const urlIdx = headers.indexOf('databaseurl');
  const statusIdx = headers.indexOf('databasestatus');
  const seqIdx = headers.indexOf('sequence');
  const createdIdx = headers.indexOf('createdat');
  const actIdx = headers.indexOf('activatedat');
  const archIdx = headers.indexOf('archivedat');
  const recordsIdx = headers.indexOf('totalrecords');
  const cellsIdx = headers.indexOf('usedcells');
  const capIdx = headers.indexOf('capacitypercent');
  const syncIdx = headers.indexOf('lastsync');
  const ulIdIdx = headers.indexOf('ulid');
  const kodeUlIdx = headers.indexOf('kodeul');
  const namaUlIdx = headers.indexOf('namaul');
  
  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const dbId = idIdx !== -1 ? row[idIdx].toString() : '';
    if (!dbId) continue;
    
    results.push({
      ulId: ulIdIdx !== -1 ? row[ulIdIdx].toString() : '',
      kodeUL: kodeUlIdx !== -1 ? row[kodeUlIdx].toString() : '',
      namaUL: namaUlIdx !== -1 ? row[namaUlIdx].toString() : '',
      databaseId: dbId,
      databaseName: nameIdx !== -1 ? row[nameIdx].toString() : 'Database',
      databaseUrl: urlIdx !== -1 ? row[urlIdx].toString() : '',
      databaseStatus: statusIdx !== -1 ? row[statusIdx].toString() : 'ACTIVE',
      sequence: seqIdx !== -1 ? parseInt(row[seqIdx] || '1', 10) : 1,
      createdAt: createdIdx !== -1 ? row[createdIdx].toString() : '',
      activatedAt: actIdx !== -1 ? row[actIdx].toString() : '',
      archivedAt: archIdx !== -1 ? row[archIdx].toString() : '',
      totalRecords: recordsIdx !== -1 ? parseInt(row[recordsIdx] || '0', 10) : 0,
      usedCells: cellsIdx !== -1 ? parseInt(row[cellsIdx] || '0', 10) : 0,
      capacityPercent: capIdx !== -1 ? parseFloat(row[capIdx] || '0') : 0,
      lastSync: syncIdx !== -1 ? row[syncIdx].toString() : ''
    });
  }
  
  return results;
}

function getActiveDatabaseEntry(controllerSs) {
  const entries = getRegistryEntries(controllerSs);
  const active = entries.find(e => e.databaseStatus === 'ACTIVE');
  if (active) return active;
  
  // Fallback: Jadikan Controller Spreadsheet sebagai active database
  const ulInfo = getUlIdentity(controllerSs);
  return {
    ulId: ulInfo.id,
    kodeUL: ulInfo.kodeUL,
    namaUL: ulInfo.namaUL,
    databaseId: controllerSs.getId(),
    databaseName: controllerSs.getName() || "I-MONEX DB Controller",
    databaseUrl: controllerSs.getUrl(),
    databaseStatus: 'ACTIVE',
    sequence: 1,
    createdAt: new Date().toISOString(),
    activatedAt: new Date().toISOString(),
    totalRecords: 0,
    usedCells: 0,
    capacityPercent: 0,
    lastSync: new Date().toISOString()
  };
}

function openDatabaseSpreadsheet(dbId, controllerSs) {
  if (!dbId || dbId === controllerSs.getId()) {
    return controllerSs;
  }
  try {
    return SpreadsheetApp.openById(dbId);
  } catch (e) {
    console.warn("Gagal membuka spreadsheet " + dbId + ", menggunakan controller sebagai fallback:", e);
    return controllerSs;
  }
}

function getRotationHistoryLogs(controllerSs) {
  const sheet = controllerSs.getSheetByName(SHEET_ROTATION_LOG);
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  
  const results = [];
  for (let i = values.length - 1; i >= 1; i--) {
    const r = values[i];
    results.push({
      id: r[0].toString(),
      ulId: r[1] ? r[1].toString() : '',
      kodeUL: r[2] ? r[2].toString() : '',
      namaUL: r[3] ? r[3].toString() : '',
      previousDatabaseId: r[4] ? r[4].toString() : '',
      previousDatabaseName: r[5] ? r[5].toString() : '',
      newDatabaseId: r[6] ? r[6].toString() : '',
      newDatabaseName: r[7] ? r[7].toString() : '',
      timestamp: r[8] ? r[8].toString() : '',
      capacityBefore: r[9] ? parseFloat(r[9]) : 0,
      triggeredBy: r[10] ? r[10].toString() : '',
      status: r[11] ? r[11].toString() : 'SUCCESS',
      errorMessage: r[12] ? r[12].toString() : ''
    });
  }
  return results;
}

function updateRegistryRecordCount(controllerSs, dbId) {
  try {
    const ss = openDatabaseSpreadsheet(dbId, controllerSs);
    const sheet = ss.getSheetByName('Temuan');
    const records = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
    const capacity = calculateDatabaseCapacity(ss);
    
    const regSheet = controllerSs.getSheetByName(SHEET_REGISTRY);
    if (!regSheet) return;
    
    const values = regSheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][3].toString() === dbId) {
        regSheet.getRange(i + 1, 12).setValue(records); // TOTAL_RECORDS
        regSheet.getRange(i + 1, 13).setValue(capacity.totalCellsUsed); // USED_CELLS
        regSheet.getRange(i + 1, 14).setValue(capacity.capacityPercent); // CAPACITY_PERCENT
        regSheet.getRange(i + 1, 15).setValue(new Date().toISOString()); // LAST_SYNC
        break;
      }
    }
  } catch (e) {
    console.warn("Update registry count failed:", e);
  }
}

function getUlIdentity(controllerSs) {
  // 1. Coba baca dari sheet inisiasi jika ada di spreadsheet ini
  const inisiasiSheet = controllerSs.getSheetByName('inisiasi');
  if (inisiasiSheet) {
    const rows = inisiasiSheet.getDataRange().getValues();
    if (rows.length >= 2) {
      const myId = controllerSs.getId();
      for (let i = 1; i < rows.length; i++) {
        const spreadId = (rows[i][3] || '').toString().trim();
        if (spreadId === myId) {
          return {
            id: (rows[i][0] || 'UL1').toString().trim(),
            kodeUL: (rows[i][1] || 'BKT').toString().trim(),
            namaUL: (rows[i][2] || 'UL BUKITTINGGI').toString().trim()
          };
        }
      }
    }
  }
  
  // 2. Fallback deteksi berdasarkan nama file atau default
  const ssName = (controllerSs.getName() || '').toUpperCase();
  if (ssName.includes('PADANG') || ssName.includes('PDG')) {
    return { id: 'UL2', kodeUL: 'PDG', namaUL: 'UL PADANG' };
  } else if (ssName.includes('PAYAKUMBUH') || ssName.includes('PYK')) {
    return { id: 'UL4', kodeUL: 'PYK', namaUL: 'UL PAYAKUMBUH' };
  } else if (ssName.includes('SOLOK') || ssName.includes('SLK')) {
    return { id: 'UL3', kodeUL: 'SLK', namaUL: 'UL SOLOK' };
  }
  
  return { id: 'UL1', kodeUL: 'BKT', namaUL: 'UL BUKITTINGGI' };
}

function getDriveFolderId(controllerSs) {
  // Coba cari dari sheet inisiasi
  const inisiasiSheet = controllerSs.getSheetByName('inisiasi');
  if (inisiasiSheet) {
    const rows = inisiasiSheet.getDataRange().getValues();
    const myId = controllerSs.getId();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][3] || '').toString().trim() === myId) {
        const folder = (rows[i][5] || '').toString().trim();
        if (folder) return folder;
      }
    }
  }
  return DEFAULT_FOLDER_ID;
}

/**
 * ============================================================================
 * BAGIAN: FUNGSI BANTUAN GOOGLE DRIVE & DATA UTILITY
 * ============================================================================
 */

function saveToDrive(base64, fileName, customFolderId) {
  try {
    const folderId = customFolderId || DEFAULT_FOLDER_ID;
    const folder = DriveApp.getFolderById(folderId);
    const contentType = base64.substring(5, base64.indexOf(';'));
    const bytes = Utilities.base64Decode(base64.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    const file = folder.createFile(blob);
    
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn("Set sharing warning: " + e.toString());
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
  
  const h = d.shift().map(header => header.toString().trim().toLowerCase());
  
  return d.map(r => {
    let o = {};
    h.forEach((k, i) => {
      if (k) o[k] = r[i];
    });
    return o;
  });
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

function parseDateString(dateStr) {
  if (!dateStr) return new Date(0);
  if (dateStr instanceof Date) return dateStr;
  
  const s = dateStr.toString().trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  
  try {
    const clean = s.replace('pukul ', '').replace(/\./g, ':');
    const parts = clean.split(',');
    const dPart = parts[0].trim().split(/[\/\-]/);
    if (dPart.length === 3) {
      return new Date(parseInt(dPart[2], 10), parseInt(dPart[1], 10) - 1, parseInt(dPart[0], 10));
    }
  } catch (e) {}
  
  return new Date(0);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
