
export enum AppRole {
  INSPEKSI = 'INSPEKSI',
  EKSEKUSI = 'EKSEKUSI',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER'
}

export interface Inspector {
  id: string;
  name: string;
}

export interface ULP {
  id: string;
  name: string;
}

export interface Feeder {
  id: string;
  name: string;
  ulpId: string;
}

export interface Keterangan {
  id: string;
  text: string;
}

export interface TemuanData {
  id: string; 
  tanggal: string;
  pekerjaan: string; // NEW
  inspektor1: string;
  inspektor2: string;
  ulp: string;
  noTiang: string;
  noWO: string;
  feeder: string;
  lokasi: string;
  geotag?: string;
  fotoTemuan: string; 
  keterangan: string;
  status: 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM';
  tanggalEksekusi?: string;
  fotoEksekusi?: string;
  timEksekusi?: string;
}

export interface LoginSession {
  role: AppRole;
  ulp?: string;
  pekerjaan?: string; // NEW
  inspektor1?: string;
  inspektor2?: string;
  team?: string;
}
