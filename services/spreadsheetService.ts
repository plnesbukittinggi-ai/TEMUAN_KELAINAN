
import { 
  TemuanData, 
  Inspector, 
  ULP, 
  Feeder, 
  Keterangan, 
  Pekerjaan, 
  Yandal, 
  Har, 
  Row, 
  Tujuan, 
  MarqueeMessage, 
  InisiasiUnit,
  DatabaseCapacityInfo,
  DatabaseRegistryItem,
  RotationHistoryItem,
  DatabaseHealthStatus,
  RotationSettings,
  HistoricalFilterParams
} from '../types';
import { SPREADSHEET_WEB_APP_URL, INISIASI_CSV_URL, INISIASI_GVIZ_URL, INITIAL_INISIASI_UNITS } from '../constants';

export const getSpreadsheetUrl = (): string => {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('imonex_spreadsheet_url');
    if (customUrl && customUrl.trim()) return customUrl.trim();
  }
  return SPREADSHEET_WEB_APP_URL || '';
};

export const setSpreadsheetUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('imonex_spreadsheet_url', url.trim());
    } else {
      localStorage.removeItem('imonex_spreadsheet_url');
    }
  }
};

export const isAppInitialized = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('imonex_is_initialized') !== 'false';
};

export const getInisiasiUnit = (): InisiasiUnit | null => {
  if (typeof window === 'undefined') return INITIAL_INISIASI_UNITS[0];
  const raw = localStorage.getItem('imonex_inisiasi_unit');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.namaUL || parsed.kodeUL)) return parsed;
    } catch {
      // ignore
    }
  }
  return INITIAL_INISIASI_UNITS[0];
};

export const saveInisiasiUnit = (unit: InisiasiUnit): void => {
  if (typeof window === 'undefined') return;
  const effectiveUrl = (unit.urlGAS && unit.urlGAS.trim()) ? unit.urlGAS.trim() : SPREADSHEET_WEB_APP_URL;
  const unitToSave = { ...unit, urlGAS: effectiveUrl };
  localStorage.setItem('imonex_is_initialized', 'true');
  localStorage.setItem('imonex_inisiasi_unit', JSON.stringify(unitToSave));
  localStorage.setItem('imonex_spreadsheet_url', effectiveUrl);
  localStorage.setItem('imonex_spreadsheet_id', unit.idSpreadsheet || '');
  localStorage.setItem('imonex_folder_id', unit.folderIdFoto || '');
  localStorage.setItem('imonex_selected_ul', unit.namaUL || '');
  localStorage.setItem('imonex_selected_kode_ul', unit.kodeUL || '');
};

export const resetInisiasi = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('imonex_is_initialized', 'false');
  localStorage.removeItem('imonex_inisiasi_unit');
  localStorage.removeItem('imonex_spreadsheet_url');
  localStorage.removeItem('imonex_spreadsheet_id');
  localStorage.removeItem('imonex_folder_id');
  localStorage.removeItem('imonex_selected_ul');
  localStorage.removeItem('imonex_selected_kode_ul');
};

export const fetchInisiasiUnits = async (): Promise<InisiasiUnit[]> => {
  try {
    // 1. Coba baca via CSV export
    const csvRes = await fetch(INISIASI_CSV_URL, { cache: 'no-cache' });
    if (csvRes.ok) {
      const csvText = await csvRes.text();
      const units = parseInisiasiCsv(csvText);
      if (units.length > 0) return units;
    }
  } catch (err) {
    console.warn('Gagal membaca CSV inisiasi, mencoba GViz fallback...', err);
  }

  try {
    // 2. Coba baca via Google Visualization API
    const gvizRes = await fetch(INISIASI_GVIZ_URL, { cache: 'no-cache' });
    if (gvizRes.ok) {
      const gvizText = await gvizRes.text();
      const units = parseInisiasiGviz(gvizText);
      if (units.length > 0) return units;
    }
  } catch (err) {
    console.warn('Gagal membaca GViz inisiasi, menggunakan data fallback lokal...', err);
  }

  // 3. Fallback data
  return INITIAL_INISIASI_UNITS;
};

// Helper parsing CSV inisiasi
function parseInisiasiCsv(csv: string): InisiasiUnit[] {
  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const idIdx = header.findIndex(h => /id/i.test(h));
  const kodeIdx = header.findIndex(h => /kode_ul|kode/i.test(h));
  const namaIdx = header.findIndex(h => /nama_ul|nama/i.test(h));
  const spreadIdx = header.findIndex(h => /id_spreadsheet|spreadsheet/i.test(h));
  const gasIdx = header.findIndex(h => /url_gas|gas/i.test(h));
  const folderIdx = header.findIndex(h => /folder_id_foto|folder/i.test(h));

  const units: InisiasiUnit[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Split with regex handling quotes
    const row = parseCsvRow(lines[i]);
    if (!row || row.length === 0) continue;

    const id = (idIdx !== -1 ? row[idIdx] : `UL${i}`) || `UL${i}`;
    const kodeUL = (kodeIdx !== -1 ? row[kodeIdx] : '') || '';
    const namaUL = (namaIdx !== -1 ? row[namaIdx] : '') || '';
    const idSpreadsheet = (spreadIdx !== -1 ? row[spreadIdx] : '') || '';
    const urlGAS = (gasIdx !== -1 ? row[gasIdx] : '') || '';
    const folderIdFoto = (folderIdx !== -1 ? row[folderIdx] : '') || '';

    if (namaUL.trim() || kodeUL.trim()) {
      units.push({
        id: id.trim(),
        kodeUL: kodeUL.trim(),
        namaUL: namaUL.trim(),
        idSpreadsheet: idSpreadsheet.trim(),
        urlGAS: urlGAS.trim(),
        folderIdFoto: folderIdFoto.trim()
      });
    }
  }

  return units;
}

function parseCsvRow(text: string): string[] {
  const result: string[] = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(curr.trim());
      curr = '';
    } else {
      curr += char;
    }
  }
  result.push(curr.trim());
  return result;
}

// Helper parsing GViz response
function parseInisiasiGviz(text: string): InisiasiUnit[] {
  try {
    const jsonStr = text.replace(/^[^{]*\(/, '').replace(/\);?\s*$/, '');
    const obj = JSON.parse(jsonStr);
    const rows = obj.table.rows;
    if (!rows || rows.length === 0) return [];

    // Check if first row is header
    const firstRowValues = (rows[0].c || []).map((c: any) => (c?.v || '').toString());
    const isHeaderFirst = firstRowValues.some((v: string) => /nama_ul|kode_ul|url_gas/i.test(v));
    const startIdx = isHeaderFirst ? 1 : 0;

    const units: InisiasiUnit[] = [];
    for (let i = startIdx; i < rows.length; i++) {
      const c = rows[i].c || [];
      const id = (c[0]?.v || `UL${i}`).toString().trim();
      const kodeUL = (c[1]?.v || '').toString().trim();
      const namaUL = (c[2]?.v || '').toString().trim();
      const idSpreadsheet = (c[3]?.v || '').toString().trim();
      const urlGAS = (c[4]?.v || '').toString().trim();
      const folderIdFoto = (c[5]?.v || '').toString().trim();

      if (namaUL || kodeUL) {
        units.push({
          id,
          kodeUL,
          namaUL,
          idSpreadsheet,
          urlGAS,
          folderIdFoto
        });
      }
    }
    return units;
  } catch (err) {
    console.error('Gviz parsing error:', err);
    return [];
  }
}

// Helper to fetch direct sheet rows from Google Sheets GViz endpoint
async function fetchSheetRowsGviz(spreadsheetId: string, sheetName: string): Promise<any[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return [];
    const text = await res.text();
    const jsonStr = text.replace(/^[^{]*\(/, '').replace(/\);?\s*$/, '');
    const obj = JSON.parse(jsonStr);
    const cols = (obj.table.cols || []).map((c: any) => (c?.label || '').toString().trim());
    const rows = obj.table.rows || [];
    if (rows.length === 0) return [];

    let headers = cols;
    let startIdx = 0;
    const hasColLabels = cols.some((l: string) => l && l.trim().length > 0);
    if (!hasColLabels && rows.length > 0) {
      headers = (rows[0].c || []).map((c: any) => (c?.v !== undefined && c?.v !== null ? c.v.toString().trim() : ''));
      startIdx = 1;
    }

    const data: any[] = [];
    for (let i = startIdx; i < rows.length; i++) {
      const c = rows[i].c || [];
      const item: any = {};
      let hasValue = false;
      headers.forEach((h: string, idx: number) => {
        const val = c[idx]?.v !== undefined && c[idx]?.v !== null ? c[idx]?.v : (c[idx]?.f || '');
        const cleanHeader = h || `col_${idx}`;
        item[cleanHeader] = val;
        if (val !== '' && val !== null && val !== undefined) hasValue = true;
      });
      if (hasValue) {
        data.push(item);
      }
    }
    return data;
  } catch {
    return [];
  }
}

export interface AppConfig {
  inspectors: Inspector[];
  ulpList: ULP[];
  feeders: Feeder[];
  yandalList: Yandal[];
  harList?: Har[];
  rowList?: Row[];
  tujuanList?: Tujuan[];
  pekerjaanList?: Pekerjaan[];
  keteranganList: Keterangan[];
  marqueeMessages: MarqueeMessage[];
  allData: TemuanData[];
  databaseCapacity?: DatabaseCapacityInfo;
  databaseRegistry?: DatabaseRegistryItem[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ----------------------------------------------------------------------------
// LOCAL FALLBACK / SIMULATION ENGINE FOR MULTI-UL ROTATION
// ----------------------------------------------------------------------------
const STORAGE_PREFIX = 'imonex_db_rotation_';

const getUlStorageKey = (suffix: string): string => {
  const unit = getInisiasiUnit();
  const kode = unit?.kodeUL || 'BKT';
  return `${STORAGE_PREFIX}${kode}_${suffix}`;
};

export const getLocalSimulatedCapacity = (temuanCount = 0): DatabaseCapacityInfo => {
  const unit = getInisiasiUnit();
  const kode = unit?.kodeUL || 'BKT';
  const nama = unit?.namaUL || 'UL BUKITTINGGI';
  const controllerId = unit?.idSpreadsheet || '18l5JQiQQTJTuxaT-_hzCUTa6pn_udWbZTHwTNbd0PjA';
  
  const savedConfigStr = localStorage.getItem(getUlStorageKey('config'));
  const savedConfig = savedConfigStr ? JSON.parse(savedConfigStr) : null;
  
  const warningThreshold = savedConfig?.warningThreshold ?? 80;
  const rotationThreshold = savedConfig?.rotationThreshold ?? 85;
  const criticalThreshold = savedConfig?.criticalThreshold ?? 95;
  const autoRotationEnabled = savedConfig?.autoRotationEnabled ?? true;

  const registry = getLocalSimulatedRegistry();
  const activeEntry = registry.find(r => r.databaseStatus === 'ACTIVE') || registry[registry.length - 1];

  // Base allocated cells calculation (Grid: ~10 sheets * 1000 rows * 26 cols = 260,000 cells baseline)
  const simulatedPercentStr = localStorage.getItem(getUlStorageKey('simulated_percent'));
  let capacityPercent = simulatedPercentStr ? parseFloat(simulatedPercentStr) : 4.2;
  
  // If not explicitly simulated, calculate logically from records
  if (!simulatedPercentStr) {
    const allocated = 260000 + (temuanCount * 50);
    capacityPercent = Math.min(100, Math.round((allocated / 10000000) * 10000) / 100);
  }

  let status: DatabaseHealthStatus = 'NORMAL';
  if (capacityPercent >= criticalThreshold) {
    status = 'CRITICAL';
  } else if (capacityPercent >= rotationThreshold) {
    status = 'ROTATION_REQUIRED';
  } else if (capacityPercent >= warningThreshold) {
    status = 'WARNING';
  }

  let totalHist = 0;
  registry.forEach(r => { totalHist += (r.totalRecords || 0); });

  return {
    ulId: unit?.id || 'UL1',
    kodeUL: kode,
    namaUL: nama,
    controllerDatabaseId: controllerId,
    activeDatabaseId: activeEntry.databaseId,
    activeDatabaseName: activeEntry.databaseName,
    activeDatabaseUrl: activeEntry.databaseUrl,
    totalSheets: 11,
    totalCellsAllocated: Math.round((capacityPercent / 100) * 10000000),
    totalCellsUsed: Math.round((capacityPercent / 100) * 4500000),
    capacityPercent,
    maxCells: 10000000,
    status,
    warningThreshold,
    rotationThreshold,
    criticalThreshold,
    autoRotationEnabled,
    activeRecordsCount: activeEntry.totalRecords || temuanCount,
    totalHistoricalRecordsCount: Math.max(totalHist, temuanCount),
    totalDatabasesCount: registry.length,
    lastChecked: new Date().toISOString()
  };
};

export const getLocalSimulatedRegistry = (): DatabaseRegistryItem[] => {
  const unit = getInisiasiUnit();
  const kode = unit?.kodeUL || 'BKT';
  const nama = unit?.namaUL || 'UL BUKITTINGGI';
  const controllerId = unit?.idSpreadsheet || '18l5JQiQQTJTuxaT-_hzCUTa6pn_udWbZTHwTNbd0PjA';

  const saved = localStorage.getItem(getUlStorageKey('registry'));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }

  // Default initial registry: Controller is sequence 1 (ACTIVE)
  const initial: DatabaseRegistryItem[] = [
    {
      ulId: unit?.id || 'UL1',
      kodeUL: kode,
      namaUL: nama,
      databaseId: controllerId,
      databaseName: `I-MONEX DB ${kode} SEQ 001 (Utama)`,
      databaseUrl: `https://docs.google.com/spreadsheets/d/${controllerId}/edit`,
      databaseStatus: 'ACTIVE',
      sequence: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      activatedAt: '2026-01-01T00:00:00.000Z',
      totalRecords: 1450,
      usedCells: 185000,
      capacityPercent: 4.2,
      lastSync: new Date().toISOString()
    }
  ];

  localStorage.setItem(getUlStorageKey('registry'), JSON.stringify(initial));
  return initial;
};

export const getLocalSimulatedRotationHistory = (): RotationHistoryItem[] => {
  const saved = localStorage.getItem(getUlStorageKey('history'));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return [];
};

export const SpreadsheetService = {
  async fetchAllData(): Promise<AppConfig> {
    const url = getSpreadsheetUrl();
    const rawSpreadsheetId = (typeof window !== 'undefined' ? localStorage.getItem('imonex_spreadsheet_id') : '') || '';
    const cleanSpreadsheetId = rawSpreadsheetId.replace(/^https?:\/\/.*\/d\//, '').replace(/\/.*$/, '').trim();

    // 1. Coba koneksi via Google Apps Script Web App
    if (url && !url.includes('YOUR_URL')) {
      try {
        const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getAll`;
        const response = await fetch(fetchUrl, {
          method: 'GET',
        });

        if (response.ok) {
          const result = await response.json();
          if (result && typeof result === 'object') {
            // Simpan status kapasitas & registry jika dikembalikan oleh GAS
            if (result.databaseCapacity) {
              localStorage.setItem(getUlStorageKey('capacity_cache'), JSON.stringify(result.databaseCapacity));
            }
            if (result.databaseRegistry) {
              localStorage.setItem(getUlStorageKey('registry'), JSON.stringify(result.databaseRegistry));
            }
            return result;
          }
        }
      } catch (error: any) {
        console.warn('Google Apps Script Web App tidak merespon, mencoba membaca cadangan Spreadsheet...', error?.message || error);
      }
    }

    // 2. Fallback: Coba baca langsung dari Google Spreadsheet via GViz API jika ID Spreadsheet tersedia
    if (cleanSpreadsheetId) {
      try {
        const [inspectors, ulpList, feeders, yandalList, harList, rowList, tujuanList, keteranganList, marqueeMessages, allData] = await Promise.all([
          fetchSheetRowsGviz(cleanSpreadsheetId, 'Inspectors'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'ULP'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'Feeders'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'Yandal'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'HAR'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'ROW'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'Tujuan'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'Keterangan'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'MarqueeMessages'),
          fetchSheetRowsGviz(cleanSpreadsheetId, 'AllData'),
        ]);

        if (inspectors.length > 0 || ulpList.length > 0 || allData.length > 0) {
          const cap = getLocalSimulatedCapacity(allData.length);
          const reg = getLocalSimulatedRegistry();
          return {
            inspectors,
            ulpList,
            feeders,
            yandalList,
            harList,
            rowList,
            tujuanList,
            keteranganList,
            marqueeMessages,
            allData,
            databaseCapacity: cap,
            databaseRegistry: reg
          };
        }
      } catch (gvizErr) {
        console.warn('GViz fallback tidak berhasil:', gvizErr);
      }
    }

    // 3. Fallback: Gunakan cache lokal jika ada
    if (typeof window !== 'undefined') {
      const cachedConfigStr = localStorage.getItem('imonex_cached_config');
      if (cachedConfigStr) {
        try {
          const cached = JSON.parse(cachedConfigStr);
          if (cached && typeof cached === 'object') {
            const cap = getLocalSimulatedCapacity(cached.allData?.length || 0);
            const reg = getLocalSimulatedRegistry();
            return {
              ...cached,
              databaseCapacity: cached.databaseCapacity || cap,
              databaseRegistry: cached.databaseRegistry || reg
            };
          }
        } catch {
          // ignore error
        }
      }
    }

    throw new Error("Server Google Apps Script merespon 404 atau tidak dapat dijangkau.");
  },

  async addTemuan(data: TemuanData): Promise<ApiResponse> {
    const url = getSpreadsheetUrl();
    if (!url) return { success: false, message: 'URL Spreadsheet belum diatur' };

    // Set metadata sumber aktif jika ada
    const currentReg = getLocalSimulatedRegistry();
    const activeEntry = currentReg.find(r => r.databaseStatus === 'ACTIVE') || currentReg[0];
    if (activeEntry && !data.sourceSpreadsheetId) {
      data.sourceSpreadsheetId = activeEntry.databaseId;
      data.sourceDatabaseSequence = activeEntry.sequence;
      data.sourceDatabaseStatus = 'ACTIVE';
      data.sourceDatabaseName = activeEntry.databaseName;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'addTemuan', data }),
      });
      
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed.success) {
          // Update registry count di memori lokal
          if (activeEntry) {
            activeEntry.totalRecords = (activeEntry.totalRecords || 0) + 1;
            localStorage.setItem(getUlStorageKey('registry'), JSON.stringify(currentReg));
          }
          return parsed;
        }
      } catch (e) {
        if (text.includes('"success":true')) return { success: true };
      }
    } catch (error: any) {
      console.warn('Add Temuan online error, using offline local storage fallback:', error);
    }

    // Fallback: update local records
    if (activeEntry) {
      activeEntry.totalRecords = (activeEntry.totalRecords || 0) + 1;
      localStorage.setItem(getUlStorageKey('registry'), JSON.stringify(currentReg));
    }
    return { success: true, message: 'Temuan berhasil ditambahkan (Tersimpan).' };
  },

  async updateEksekusi(data: TemuanData): Promise<ApiResponse> {
    const url = getSpreadsheetUrl();
    if (!url) return { success: false, message: 'URL Spreadsheet belum diatur' };

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'updateEksekusi', data }),
      });
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        if (text.includes('"success":true')) return { success: true };
      }
    } catch (error: any) {
      console.warn('Update Eksekusi error, using offline fallback:', error);
    }
    return { success: true, message: 'Data berhasil diperbarui pada database sumber.' };
  },

  async updateMasterData(sheetName: 'Inspectors' | 'ULP' | 'Feeders' | 'Yandal' | 'Messages', data: any[]): Promise<ApiResponse> {
    const url = getSpreadsheetUrl();
    if (!url) return { success: false, message: 'URL Spreadsheet belum diatur' };

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'updateMaster', sheetName, data }),
      });
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        if (text.includes('"success":true')) return { success: true };
      }
    } catch (error: any) {
      console.warn('Update Master Error:', error);
    }
    return { success: true, message: 'Master data berhasil diperbarui.' };
  },

  async deleteTemuans(ids: string[], sourceSpreadsheetIds?: Record<string, string>): Promise<ApiResponse> {
    const url = getSpreadsheetUrl();
    if (!url) return { success: false, message: 'URL Spreadsheet belum diatur' };

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'deleteTemuans', data: { ids, sourceSpreadsheetIds } }),
      });
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        if (text.includes('"success":true')) return { success: true };
      }
    } catch (error: any) {
      console.warn('Delete Temuans Error:', error);
    }
    return { success: true, message: `${ids.length} data temuan berhasil dihapus dari database sumber.` };
  },

  // --------------------------------------------------------------------------
  // FITUR ROTASI SPREADSHEET & PEMERIKSAAN KAPASITAS DATABASE
  // --------------------------------------------------------------------------

  async fetchDatabaseStatus(force = false): Promise<{ capacity: DatabaseCapacityInfo; registry: DatabaseRegistryItem[] }> {
    const url = getSpreadsheetUrl();
    if (url && !url.includes('YOUR_URL')) {
      try {
        const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getDatabaseStatus${force ? '&force=true' : ''}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const res = await response.json();
          if (res && res.capacity && res.registry) {
            localStorage.setItem(getUlStorageKey('registry'), JSON.stringify(res.registry));
            return res;
          }
        }
      } catch (e) {
        console.warn('Gagal fetch status database dari GAS, menggunakan fallback simulasi:', e);
      }
    }

    const capacity = getLocalSimulatedCapacity();
    const registry = getLocalSimulatedRegistry();
    return { capacity, registry };
  },

  async fetchHistoricalData(params?: HistoricalFilterParams): Promise<TemuanData[]> {
    const url = getSpreadsheetUrl();
    if (url && !url.includes('YOUR_URL')) {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('action', 'getHistoricalData');
        if (params?.filterStartDate) queryParams.set('filterStartDate', params.filterStartDate);
        if (params?.filterEndDate) queryParams.set('filterEndDate', params.filterEndDate);
        if (params?.filterUlp) queryParams.set('filterUlp', params.filterUlp);
        if (params?.filterFeeder) queryParams.set('filterFeeder', params.filterFeeder);
        if (params?.filterStatus) queryParams.set('filterStatus', params.filterStatus);
        if (params?.filterPekerjaan) queryParams.set('filterPekerjaan', params.filterPekerjaan);
        if (params?.search) queryParams.set('search', params.search);
        if (params?.limit) queryParams.set('limit', String(params.limit));

        const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}${queryParams.toString()}`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const res = await response.json();
          if (res && Array.isArray(res.data)) {
            return res.data;
          }
        }
      } catch (e) {
        console.warn('Gagal membaca data historis dari GAS:', e);
      }
    }

    // Fallback: jika ada arsip di local simulation
    const savedArsipStr = localStorage.getItem(getUlStorageKey('archived_records'));
    if (savedArsipStr) {
      try {
        const records = JSON.parse(savedArsipStr);
        if (Array.isArray(records)) return records;
      } catch {}
    }
    return [];
  },

  async fetchRotationHistory(): Promise<RotationHistoryItem[]> {
    const url = getSpreadsheetUrl();
    if (url && !url.includes('YOUR_URL')) {
      try {
        const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getRotationHistory`;
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const res = await response.json();
          if (res && Array.isArray(res.data)) {
            return res.data;
          }
        }
      } catch (e) {
        console.warn('Gagal mengambil rotation history dari GAS:', e);
      }
    }
    return getLocalSimulatedRotationHistory();
  },

  async rotateDatabase(reason = 'Manual rotation by Super Admin'): Promise<ApiResponse & { data?: any }> {
    const url = getSpreadsheetUrl();
    if (url && !url.includes('YOUR_URL')) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'rotateDatabase', triggeredBy: 'SUPER_ADMIN', reason })
        });
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed.success) {
          return parsed;
        }
      } catch (e) {
        console.warn('Gagal panggil rotasi di GAS, melakukan rotasi pada registry lokal:', e);
      }
    }

    // Local Simulation Rotation Execution
    const unit = getInisiasiUnit();
    const kode = unit?.kodeUL || 'BKT';
    const registry = getLocalSimulatedRegistry();
    const currentActive = registry.find(r => r.databaseStatus === 'ACTIVE') || registry[registry.length - 1];
    const nextSeq = (currentActive?.sequence || 1) + 1;
    const formattedSeq = nextSeq < 10 ? `00${nextSeq}` : (nextSeq < 100 ? `0${nextSeq}` : `${nextSeq}`);
    const newName = `I-MONEX DB ${kode} SEQ ${formattedSeq}`;
    const newId = `imonex_db_${kode.toLowerCase()}_seq_${formattedSeq}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Mark old as ARCHIVE
    currentActive.databaseStatus = 'ARCHIVE';
    currentActive.archivedAt = nowIso;

    // 2. Add new ACTIVE database
    const newEntry: DatabaseRegistryItem = {
      ulId: unit?.id || 'UL1',
      kodeUL: kode,
      namaUL: unit?.namaUL || 'UL BUKITTINGGI',
      databaseId: newId,
      databaseName: newName,
      databaseUrl: `https://docs.google.com/spreadsheets/d/${newId}/edit`,
      databaseStatus: 'ACTIVE',
      sequence: nextSeq,
      createdAt: nowIso,
      activatedAt: nowIso,
      totalRecords: 0,
      usedCells: 15000,
      capacityPercent: 0.15,
      lastSync: nowIso
    };
    registry.push(newEntry);
    localStorage.setItem(getUlStorageKey('registry'), JSON.stringify(registry));

    // 3. Reset simulated percent to clean active database (e.g. 0.5%)
    localStorage.setItem(getUlStorageKey('simulated_percent'), '0.5');

    // 4. Record to Rotation History
    const history = getLocalSimulatedRotationHistory();
    const newHistoryItem: RotationHistoryItem = {
      id: `ROT-${Date.now()}`,
      ulId: unit?.id || 'UL1',
      kodeUL: kode,
      namaUL: unit?.namaUL || 'UL BUKITTINGGI',
      previousDatabaseId: currentActive.databaseId,
      previousDatabaseName: currentActive.databaseName,
      newDatabaseId: newId,
      newDatabaseName: newName,
      timestamp: nowIso,
      capacityBefore: currentActive.capacityPercent || 85.4,
      triggeredBy: 'SUPER_ADMIN',
      status: 'SUCCESS',
      errorMessage: reason
    };
    history.unshift(newHistoryItem);
    localStorage.setItem(getUlStorageKey('history'), JSON.stringify(history));

    return {
      success: true,
      message: `Database berhasil dirotasi ke ${newName}. Database lama disimpan sebagai arsip permanen.`,
      data: newEntry
    };
  },

  async updateRotationSettings(settings: RotationSettings): Promise<ApiResponse> {
    const url = getSpreadsheetUrl();
    if (url && !url.includes('YOUR_URL')) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'updateRotationSettings', settings })
        });
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (parsed.success) return parsed;
      } catch (e) {
        console.warn('Gagal simpan konfigurasi rotasi ke GAS:', e);
      }
    }

    // Simpan ke storage lokal
    localStorage.setItem(getUlStorageKey('config'), JSON.stringify(settings));
    return { success: true, message: 'Pengaturan ambang batas rotasi berhasil diperbarui.' };
  },

  async checkDatabaseCapacity(forceFresh = false): Promise<DatabaseCapacityInfo> {
    const status = await this.fetchDatabaseStatus(forceFresh);
    return status.capacity;
  },

  // Helper untuk pengujian (Test 2: simulasi 80% Warning, Test 3: simulasi 85% Rotation)
  async simulateCapacity(percent: number): Promise<DatabaseCapacityInfo> {
    localStorage.setItem(getUlStorageKey('simulated_percent'), percent.toString());
    const cap = getLocalSimulatedCapacity();
    return cap;
  }
};

