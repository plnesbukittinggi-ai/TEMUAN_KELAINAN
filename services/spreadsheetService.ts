
import { TemuanData, Inspector, ULP, Feeder, Keterangan } from '../types';
import { SPREADSHEET_WEB_APP_URL } from '../constants';

/**
 * PENTING: SALIN DAN GANTI SEMUA KODE DI GOOGLE APPS SCRIPT ANDA DENGAN INI
 * -----------------------------------------------------------------------
 * const FOLDER_ID = "1wq_Wr8UnxVYRYesuDUyqSNrsca2ZILOB";
 * 
 * function doGet(e) {
 *   const action = e.parameter.action;
 *   const ss = SpreadsheetApp.getActiveSpreadsheet();
 *   if (action === 'getAll') {
 *     const res = {
 *       allData: getSheetData('Temuan') || [],
 *       inspectors: getSheetData('Inspectors') || [],
 *       ulpList: getSheetData('ULP') || [],
 *       feeders: getSheetData('Feeders') || [],
 *       keteranganList: getSheetData('Keterangan') || []
 *     };
 *     return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 * 
 * function doPost(e) {
 *   const contents = JSON.parse(e.postData.contents);
 *   const ss = SpreadsheetApp.getActiveSpreadsheet();
 *   const sheet = ss.getSheetByName('Temuan');
 *   const action = contents.action;
 *   const data = contents.data;
 *   
 *   if (action === 'addTemuan') {
 *     // KONVERSI BASE64 KE LINK DRIVE (TEMUAN)
 *     if (data.fotoTemuan && data.fotoTemuan.indexOf('data:image') === 0) {
 *       data.fotoTemuan = saveToDrive(data.fotoTemuan, "TEMUAN_" + data.id + "_" + data.noTiang);
 *     }
 *     
 *     const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 *     const newRow = headers.map(h => data[h] !== undefined ? data[h] : "");
 *     sheet.appendRow(newRow);
 *     return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
 *   }
 *   
 *   if (action === 'updateEksekusi') {
 *     // KONVERSI BASE64 KE LINK DRIVE (EKSEKUSI)
 *     if (data.fotoEksekusi && data.fotoEksekusi.indexOf('data:image') === 0) {
 *       data.fotoEksekusi = saveToDrive(data.fotoEksekusi, "DONE_" + data.id);
 *     }
 *     
 *     const rows = sheet.getDataRange().getValues();
 *     const headers = rows[0];
 *     const idIdx = headers.indexOf('id');
 *     
 *     for (let i = 1; i < rows.length; i++) {
 *       if (rows[i][idIdx].toString() === data.id.toString()) {
 *         headers.forEach((h, colIdx) => {
 *           if (data[h] !== undefined && data[h] !== null) {
 *             sheet.getRange(i + 1, colIdx + 1).setValue(data[h]);
 *           }
 *         });
 *         return ContentService.createTextOutput(JSON.stringify({status: 'success'})).setMimeType(ContentService.MimeType.JSON);
 *       }
 *     }
 *     return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 * 
 * function saveToDrive(base64, fileName) {
 *   try {
 *     const folder = DriveApp.getFolderById(FOLDER_ID);
 *     const contentType = base64.substring(5, base64.indexOf(';'));
 *     const bytes = Utilities.base64Decode(base64.split(',')[1]);
 *     const blob = Utilities.newBlob(bytes, contentType, fileName);
 *     const file = folder.createFile(blob);
 *     file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
 *     return file.getUrl(); // Mengembalikan URL file, bukan Base64
 *   } catch (e) {
 *     return "Error Drive: " + e.toString();
 *   }
 * }
 * 
 * function getSheetData(name) {
 *   const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
 *   if (!s) return null;
 *   const d = s.getDataRange().getValues();
 *   if (d.length < 2) return [];
 *   const h = d.shift();
 *   return d.map(r => {
 *     let o = {};
 *     h.forEach((k, i) => o[k] = r[i]);
 *     return o;
 *   });
 * }
 */

export interface AppConfig {
  inspectors: Inspector[];
  ulpList: ULP[];
  feeders: Feeder[];
  keteranganList: Keterangan[];
  allData: TemuanData[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
}

export const SpreadsheetService = {
  async fetchAllData(): Promise<AppConfig> {
    try {
      const response = await fetch(`${SPREADSHEET_WEB_APP_URL}?action=getAll`);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Fetch Error:', error);
      throw error;
    }
  },

  async addTemuan(data: TemuanData): Promise<ApiResponse> {
    try {
      await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify({ action: 'addTemuan', data }),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Gagal menghubungi server.' };
    }
  },

  async updateEksekusi(data: TemuanData): Promise<ApiResponse> {
    try {
      await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'updateEksekusi', data }),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Gagal memperbarui eksekusi.' };
    }
  }
};
