
import { TemuanData, Inspector, ULP, Feeder, Keterangan, Yandal } from '../types';
import { SPREADSHEET_WEB_APP_URL } from '../constants';

export interface AppConfig {
  inspectors: Inspector[];
  ulpList: ULP[];
  feeders: Feeder[];
  yandalList: Yandal[];
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
      if (!SPREADSHEET_WEB_APP_URL || SPREADSHEET_WEB_APP_URL.includes('YOUR_URL')) {
        throw new Error("URL Spreadsheet belum dikonfigurasi di constants.ts");
      }

      const response = await fetch(`${SPREADSHEET_WEB_APP_URL}?action=getAll`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`Server Merespon: ${response.status}`);
      
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Spreadsheet Fetch Error:', error);
      throw error;
    }
  },

  async addTemuan(data: TemuanData): Promise<ApiResponse> {
    try {
      const response = await fetch(SPREADSHEET_WEB_APP_URL, {
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
    try {
      const response = await fetch(SPREADSHEET_WEB_APP_URL, {
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

  async updateMasterData(sheetName: 'Inspectors' | 'ULP' | 'Feeders' | 'Yandal', data: any[]): Promise<ApiResponse> {
    try {
      const response = await fetch(SPREADSHEET_WEB_APP_URL, {
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
  }
};
