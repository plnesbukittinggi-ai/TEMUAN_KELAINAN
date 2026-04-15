
import { Inspector, ULP, Feeder, Keterangan, Pekerjaan, Yandal } from './types';

export const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw_8wCUk4EZcTVwxG3oryedtEEOc24glOKgpug5zPY3S3E7QuDXuzohnMpp_W_jajIN/exec';

export const APP_VERSION = '2.0.2';

export const INITIAL_YANDAL: Yandal[] = [
  { id: 'y1', name: 'ALDI', ulpId: 'u6' },
  { id: 'y3', name: 'ANDRI', ulpId: 'u6' },
  { id: 'y7', name: 'ARIF', ulpId: 'u6' },
  { id: 'y11', name: 'DEDI', ulpId: 'u6' },
];

export const INITIAL_PEKERJAAN: Pekerjaan[] = [
  { id: 'PEK01', name: 'JTM TIER 1' },
  { id: 'PEK02', name: 'JTM TIER 1 & 2' },
  { id: 'PEK03', name: 'GARDU TIER 1' },
  { id: 'PEK04', name: 'GARDU TIER 1 & 2' }
];

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
  // JTM TIER 1
  { id: 'K01', text: 'Pohon mendekati jaringan (ROW)', idPekerjaan: 'PEK01' },
  { id: 'K02', text: 'Tiang Miring', idPekerjaan: 'PEK01' },
  { id: 'K03', text: 'Isolator Flash', idPekerjaan: 'PEK01' },
  
  // GARDU TIER 1
  { id: 'K08', text: 'Level Oli Rendah', idPekerjaan: 'PEK03' },
  { id: 'K09', text: 'Bushing Kotor', idPekerjaan: 'PEK03' }
];

export const ADMIN_PASSWORD = 'Admbkt';
