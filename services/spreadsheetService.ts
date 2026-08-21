
import { TemuanData, Inspector, ULP, Feeder, Keterangan, Pekerjaan, Yandal, Har, Row, Tujuan, MarqueeMessage, InisiasiUnit } from '../types';
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
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('imonex_is_initialized') === 'true' && !!localStorage.getItem('imonex_spreadsheet_url');
};

export const getInisiasiUnit = (): InisiasiUnit | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('imonex_inisiasi_unit');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
};

export const saveInisiasiUnit = (unit: InisiasiUnit): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('imonex_is_initialized', 'true');
  localStorage.setItem('imonex_inisiasi_unit', JSON.stringify(unit));
  localStorage.setItem('imonex_spreadsheet_url', unit.urlGAS || '');
  localStorage.setItem('imonex_spreadsheet_id', unit.idSpreadsheet || '');
  localStorage.setItem('imonex_folder_id', unit.folderIdFoto || '');
  localStorage.setItem('imonex_selected_ul', unit.namaUL || '');
  localStorage.setItem('imonex_selected_kode_ul', unit.kodeUL || '');
};

export const resetInisiasi = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('imonex_is_initialized');
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
}

export interface ApiResponse {
  success: boolean;
  message?: string;
}

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
            allData
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
            return cached;
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
        return JSON.parse(text);
      } catch (e) {
        if (text.includes('"success":true')) return { success: true };
        throw new Error('Respon server tidak valid');
      }
    } catch (error: any) {
      console.error('Add Temuan Error:', error);
      return { success: false, message: 'Gagal mengirim data. Periksa koneksi atau URL Script.' };
    }
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
        throw new Error('Respon server tidak valid');
      }
    } catch (error: any) {
      console.error('Update Eksekusi Error:', error);
      return { success: false, message: 'Gagal memperbarui data. Periksa koneksi atau URL Script.' };
    }
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
        throw new Error('Respon server tidak valid');
      }
    } catch (error: any) {
      console.error('Update Master Error:', error);
      return { success: false, message: 'Gagal memperbarui master data.' };
    }
  },

  async deleteTemuans(ids: string[]): Promise<ApiResponse> {
    const url = getSpreadsheetUrl();
    if (!url) return { success: false, message: 'URL Spreadsheet belum diatur' };

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'deleteTemuans', data: { ids } }),
      });
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        if (text.includes('"success":true')) return { success: true };
        throw new Error('Respon server tidak valid');
      }
    } catch (error: any) {
      console.error('Delete Temuans Error:', error);
      return { success: false, message: 'Gagal menghapus data. Periksa koneksi atau URL Script.' };
    }
  }
};
