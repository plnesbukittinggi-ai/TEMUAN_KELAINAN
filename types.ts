
export enum AppRole {
  INSPEKSI = 'INSPEKSI',
  EKSEKUSI = 'EKSEKUSI',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER'
}

export interface Pekerjaan {
  id: string;
  name: string;
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
  text: string; // Diambil dari kolom 'name' di sheet
  idPekerjaan: string; // Relasi ke Pekerjaan.id
}

export interface TemuanData {
  id: string; 
  tanggal: string;
  pekerjaan: string;
  inspektor1: string;
  inspektor2: string;
  ulp: string;
  noTiang: string;
  noWO: string;
  feeder: string;
  alamat: string; // Lokasi deskriptif / patokan
  lokasi: string; // Field fallback atau koordinat string
  geotag?: string; // Koordinat GPS (Latitude, Longitude)
  fotoTemuan: string; 
  keterangan: string;
  status: 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM' | 'TIDAK DAPAT IZIN' | 'KENDALA MATERIAL';
  prioritas: number; // 1, 2, or 3 stars
  tanggalEksekusi?: string;
  fotoEksekusi?: string;
  timEksekusi?: string;
}

export interface LoginSession {
  role: AppRole;
  ulp?: string;
  pekerjaan?: string; // Nama pekerjaan (untuk display)
  idPekerjaan?: string; // ID pekerjaan (untuk filter)
  inspektor1?: string;
  inspektor2?: string;
  team?: string;
}
