
export enum AppRole {
  INSPEKSI = 'INSPEKSI',
  EKSEKUSI = 'EKSEKUSI',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
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

export interface Yandal {
  id: string;
  name: string;
  ulpId: string;
}

export interface Har {
  id: string;
  name: string;
  ulpId: string;
}

export interface Row {
  id: string;
  name: string;
  ulpId: string;
}

export interface Tujuan {
  id: string;
  name: string;
}

export interface Keterangan {
  id: string;
  text: string; // Diambil dari kolom 'name' di sheet
  idPekerjaan: string; // Relasi ke Pekerjaan.id
}

export interface MarqueeMessage {
  id: string;
  text: string;
  isActive: boolean;
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
  catatan?: string;
  tanggalEksekusi?: string;
  fotoEksekusi?: string;
  timEksekusi?: string;
  namaYandal1?: string;
  namaYandal2?: string;
  HAR?: string;
  ROW?: string;
  Team_Tujuan?: string;
  // Metadata for Automatic Rotation & Historical Database Integration
  sourceSpreadsheetId?: string;
  sourceDatabaseSequence?: number;
  sourceDatabaseStatus?: 'ACTIVE' | 'ARCHIVE';
  sourceDatabaseName?: string;
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

export interface InisiasiUnit {
  id: string;
  kodeUL: string;
  namaUL: string;
  idSpreadsheet: string;
  urlGAS: string;
  folderIdFoto: string;
}

export type DatabaseHealthStatus = 'NORMAL' | 'WARNING' | 'ROTATION_REQUIRED' | 'CRITICAL';

export interface DatabaseRegistryItem {
  ulId: string;
  kodeUL: string;
  namaUL: string;
  databaseId: string;
  databaseName: string;
  databaseUrl: string;
  databaseStatus: 'ACTIVE' | 'ARCHIVE' | 'ERROR';
  sequence: number;
  createdAt: string;
  activatedAt: string;
  archivedAt?: string;
  totalRecords: number;
  usedCells: number;
  capacityPercent: number;
  lastSync: string;
}

export interface RotationHistoryItem {
  id: string;
  ulId: string;
  kodeUL: string;
  namaUL: string;
  previousDatabaseId: string;
  previousDatabaseName: string;
  newDatabaseId: string;
  newDatabaseName: string;
  timestamp: string;
  capacityBefore: number;
  triggeredBy: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

export interface DatabaseCapacityInfo {
  ulId: string;
  kodeUL: string;
  namaUL: string;
  controllerDatabaseId: string;
  activeDatabaseId: string;
  activeDatabaseName: string;
  activeDatabaseUrl: string;
  totalSheets: number;
  totalCellsAllocated: number;
  totalCellsUsed: number;
  capacityPercent: number;
  maxCells: number; // 10,000,000
  status: DatabaseHealthStatus;
  warningThreshold: number; // default 80
  rotationThreshold: number; // default 85
  criticalThreshold: number; // default 95
  autoRotationEnabled: boolean;
  activeRecordsCount: number;
  totalHistoricalRecordsCount: number;
  totalDatabasesCount: number;
  lastChecked: string;
}

export interface RotationSettings {
  autoRotationEnabled?: boolean;
  warningThreshold?: number;
  rotationThreshold?: number;
  criticalThreshold?: number;
}

export interface HistoricalFilterParams {
  filterStartDate?: string;
  filterEndDate?: string;
  filterUlp?: string;
  filterFeeder?: string;
  filterStatus?: string;
  filterPekerjaan?: string;
  search?: string;
  limit?: number;
  page?: number;
}

