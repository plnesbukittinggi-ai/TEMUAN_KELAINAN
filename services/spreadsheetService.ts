
import { TemuanData, Inspector, ULP, Feeder, Keterangan } from '../types';
import { SPREADSHEET_WEB_APP_URL } from '../constants';

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
      await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addTemuan', data }),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Gagal mengirim data ke server.' };
    }
  },

  async updateEksekusi(data: TemuanData): Promise<ApiResponse> {
    try {
      await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateEksekusi', data }),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Gagal memperbarui data eksekusi.' };
    }
  }
};
