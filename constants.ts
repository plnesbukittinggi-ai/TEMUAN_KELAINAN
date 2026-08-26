
import { Inspector, ULP, Feeder, Keterangan, Pekerjaan, Yandal, Har, Row, Tujuan, InisiasiUnit } from './types';

export const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw_8wCUk4EZcTVwxG3oryedtEEOc24glOKgpug5zPY3S3E7QuDXuzohnMpp_W_jajIN/exec';

export const INISIASI_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1UggAs9yHMHIvtEWENTIrHL7DbaLhoK3OHEZEjWf9zVs/edit?usp=drive_link';
export const INISIASI_SPREADSHEET_ID = '1UggAs9yHMHIvtEWENTIrHL7DbaLhoK3OHEZEjWf9zVs';
export const INISIASI_CSV_URL = `https://docs.google.com/spreadsheets/d/${INISIASI_SPREADSHEET_ID}/export?format=csv&sheet=inisiasi`;
export const INISIASI_GVIZ_URL = `https://docs.google.com/spreadsheets/d/${INISIASI_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=inisiasi`;

export const INITIAL_INISIASI_UNITS: InisiasiUnit[] = [
  {
    id: 'UL1',
    kodeUL: 'BKT',
    namaUL: 'UL BUKITTINGGI',
    idSpreadsheet: '18l5JQiQQTJTuxaT-_hzCUTa6pn_udWbZTHwTNbd0PjA',
    urlGAS: 'https://script.google.com/macros/s/AKfycbw_8wCUk4EZcTVwxG3oryedtEEOc24glOKgpug5zPY3S3E7QuDXuzohnMpp_W_jajIN/exec',
    folderIdFoto: '1wq_Wr8UnxVYRYesuDUyqSNrsca2ZILOB'
  },
  {
    id: 'UL2',
    kodeUL: 'PDG',
    namaUL: 'UL PADANG',
    idSpreadsheet: '1LesWHqok_o5gd_nTthxnEdipp5K1Ut152OD7ZTZZUBI',
    urlGAS: 'https://script.google.com/macros/s/AKfycbzXGSO1FqX-nvh1t2-7go73WH7XYc-KNrg0IItyvz3moIOz9_A6RNKeoLM6PTG8Ply0/exec',
    folderIdFoto: '130Qb4x-zr4F5vpNkpsEN4c-ma7sYCP9T'
  },
  {
    id: 'UL3',
    kodeUL: 'SLK',
    namaUL: 'UL SOLOK',
    idSpreadsheet: '',
    urlGAS: '',
    folderIdFoto: ''
  },
  {
    id: 'UL4',
    kodeUL: 'PYK',
    namaUL: 'UL PAYAKUMBUH',
    idSpreadsheet: '1ty7KRfyjJ1Fh2r5QYAV6yZ8KPZKLAgqPo_AkHxMdSXM',
    urlGAS: 'https://script.google.com/macros/s/AKfycbwsVbQlqm3gCRPEjLpZF_ur99mr3tthR0N_a_3i0sNzplGLaa2cGpgWDahUwwl4EE4leQ/exec',
    folderIdFoto: '1x0zEnSdMoFP_NP6DSCgRkxA5v2hcS5WQ'
  }
];

export const APP_VERSION = '3.0.0';

export const INITIAL_YANDAL: Yandal[] = [
  { id: 'y1', name: 'ALDI', ulpId: 'u6' },
  { id: 'y3', name: 'ANDRI', ulpId: 'u6' },
  { id: 'y7', name: 'ARIF', ulpId: 'u6' },
  { id: 'y11', name: 'DEDI', ulpId: 'u6' },
];

export const INITIAL_HAR: Har[] = [
  { id: 'h1', name: 'TIM HAR 1', ulpId: 'u6' },
  { id: 'h2', name: 'TIM HAR 2', ulpId: 'u6' },
];

export const INITIAL_ROW: Row[] = [
  { id: 'r1', name: 'TIM ROW 1', ulpId: 'u6' },
  { id: 'r2', name: 'TIM ROW 2', ulpId: 'u6' },
];

export const INITIAL_TUJUAN: Tujuan[] = [
  { id: 't1', name: 'YANDAL' },
  { id: 't2', name: 'ROW' },
  { id: 't3', name: 'HAR' },
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

export const ADMIN_PASSWORDS_BY_UL: Record<string, string> = {
  'UL BUKITTINGGI': 'Admbkt',
  'UL PADANG': 'Admpdg',
  'UL PAYAKUMBUH': 'Admpyk',
  'UL SOLOK': 'Admslk'
};

export const getAdminPasswordForUnit = (unitName?: string): string => {
  if (!unitName) return 'Admbkt';
  const upper = unitName.toUpperCase();
  if (upper.includes('BUKITTINGGI') || upper.includes('BKT')) return 'Admbkt';
  if (upper.includes('PADANG') || upper.includes('PDG')) return 'Admpdg';
  if (upper.includes('PAYAKUMBUH') || upper.includes('PYK')) return 'Admpyk';
  if (upper.includes('SOLOK') || upper.includes('SLK')) return 'Admslk';
  return ADMIN_PASSWORDS_BY_UL[unitName] || 'Admbkt';
};