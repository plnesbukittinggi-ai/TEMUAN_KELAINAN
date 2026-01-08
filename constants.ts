
import { Inspector, ULP, Feeder, Keterangan } from './types';

export const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzdwwoI_Ejc-3QLhFafDBZXp8yukSps3ZtHJqXicm4h0KHiwPhk_vAByiUXAYytlioB/exec';

export const APP_VERSION = '1.0.4';

export const INITIAL_INSPECTORS: Inspector[] = [
  { id: '1', name: 'Ahmad Subarjo' },
  { id: '2', name: 'Budi Santoso' }
];

export const INITIAL_ULP: ULP[] = [
  { id: 'ULP-01', name: 'ULP Bukittinggi' },
  { id: 'ULP-02', name: 'ULP Padang Luar' }
];

export const INITIAL_FEEDERS: Feeder[] = [
  { id: 'F-01', name: 'Feeder Jam Gadang', ulpId: 'ULP-01' },
  { id: 'F-02', name: 'Feeder Pasar Atas', ulpId: 'ULP-01' },
  { id: 'F-03', name: 'Feeder Koto Baru', ulpId: 'ULP-02' }
];

export const INITIAL_KETERANGAN: Keterangan[] = [
  // Contoh data awal (akan digantikan oleh data dari Spreadsheet)
  // JTM Tier 1 (ID Pekerjaan diasumsikan: PEK01)
  { id: 'K01', text: 'Pohon mendekati jaringan (ROW)', idPekerjaan: 'PEK01' },
  { id: 'K02', text: 'Tiang Miring', idPekerjaan: 'PEK01' },
  { id: 'K03', text: 'Isolator Flash', idPekerjaan: 'PEK01' },
  
  // GARDU Tier 1 (ID Pekerjaan diasumsikan: PEK03)
  { id: 'K08', text: 'Level Oli Rendah', idPekerjaan: 'PEK03' },
  { id: 'K09', text: 'Bushing Kotor', idPekerjaan: 'PEK03' }
];

export const ADMIN_PASSWORD = 'Admbkt';
