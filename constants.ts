
import { Inspector, ULP, Feeder, Keterangan, Pekerjaan } from './types';

export const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxbx5jjaOHOPtUBatlAjTYaGnDXJKUB96p8fsU9-myfN7N0qtmDDQWzOeZe6Jj5uPsG/exec';

export const APP_VERSION = '1.0.5';

export const INITIAL_PEKERJAAN: Pekerjaan[] = [
  { id: 'PEK01', name: 'JTM Tier 1' },
  { id: 'PEK02', name: 'JTM Tier 1 - Tier 2' },
  { id: 'PEK03', name: 'GARDU Tier 1' },
  { id: 'PEK04', name: 'GARDU Tier 1 - Tier 2' }
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
  // JTM Tier 1
  { id: 'K01', text: 'Pohon mendekati jaringan (ROW)', idPekerjaan: 'PEK01' },
  { id: 'K02', text: 'Tiang Miring', idPekerjaan: 'PEK01' },
  { id: 'K03', text: 'Isolator Flash', idPekerjaan: 'PEK01' },
  
  // GARDU Tier 1
  { id: 'K08', text: 'Level Oli Rendah', idPekerjaan: 'PEK03' },
  { id: 'K09', text: 'Bushing Kotor', idPekerjaan: 'PEK03' }
];

export const ADMIN_PASSWORD = 'Admbkt';
