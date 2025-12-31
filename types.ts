
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
  id: string; // KODE
  tanggal: string;
  inspektor1: string;
  inspektor2: string;
  ulp: string;
  noTiang: string;
  noWO: string;
  feeder: string;
  lokasi: string;
  geotag?: string;
  fotoTemuan: string; // Base64 or URL
  keterangan: string;
  status: 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM';
  // Execution data
  tanggalEksekusi?: string;
  fotoEksekusi?: string;
  timEksekusi?: string;
}

export interface LoginSession {
  role: AppRole;
  ulp?: string;
  inspektor1?: string;
  inspektor2?: string;
  team?: string;
}
