
import { Inspector, ULP, Feeder, Keterangan } from './types';

/**
 * CARA SETUP:
 * 1. Buka Google Spreadsheet.
 * 2. Buat sheet: 'Temuan', 'Inspectors', 'ULP', 'Feeders', 'Keterangan'.
 * 3. Masukkan kode Apps Script yang disediakan.
 * 4. Deploy sebagai Web App dengan akses "Anyone".
 * 5. Tempel URL-nya di bawah ini.
 */
export const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby4sFdS5hPHSrvgYeHKFlYvZ_-voSHRBAHaXE9TkUnzh1rNqBqL37yUBi9WoKDevvaC/exec';

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
  { id: 'K-01', text: 'Pohon mendekati jaringan (ROW)' },
  { id: 'K-02', text: 'Tiang Miring' },
  { id: 'K-03', text: 'Isolator Flash' },
  { id: 'K-04', text: 'Andongan Kendor' },
  { id: 'K-05', text: 'Jumperan Terbakar' }
];

export const ADMIN_PASSWORD = 'Admbkt';
