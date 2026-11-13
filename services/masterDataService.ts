import { TemuanData } from '../types';
import {
  DEFAULT_MASTER_DATA,
  MasterDataSnapshot,
  findDataInConfig,
  normalizeInspectors,
  normalizeUlpList,
  normalizeFeeders,
  normalizeYandalList,
  normalizeHarList,
  normalizeRowList,
  normalizeTujuanList,
  normalizePekerjaanList,
  normalizeKeteranganList,
  normalizeMarqueeMessages,
  normalizeAllData
} from '../utils/masterDataUtils';
import { getInisiasiUnit, getSpreadsheetUrl } from './spreadsheetService';

const MASTER_CACHE_PREFIX = 'imonex_master_cache_v2_';
const ALLDATA_CACHE_PREFIX = 'imonex_alldata_cache_v2_';
const LEGACY_CACHE_KEY = 'imonex_cached_config';
const LEGACY_TIMESTAMP_KEY = 'imonex_cache_timestamp';

export interface ValidatedMasterResult {
  snapshot: MasterDataSnapshot;
  allData: TemuanData[] | null;
  isComplete: boolean;
  missingCoreKeys: string[];
  hasAnyValidData: boolean;
}

export interface SyncStatusResult {
  status: 'SUCCESS' | 'PARTIAL' | 'OFFLINE_CACHED' | 'ERROR' | 'STALE_IGNORED';
  source?: 'GAS' | 'GVIZ' | 'CACHE';
  snapshot: MasterDataSnapshot;
  allData: TemuanData[] | null;
  timestamp: number;
  message: string;
  isOffline: boolean;
  missingCoreKeys?: string[];
}

interface StoredMasterCache {
  version: number;
  scope: string;
  urlGAS: string;
  timestamp: number;
  masterData: MasterDataSnapshot;
}

interface StoredAllDataCache {
  version: number;
  scope: string;
  timestamp: number;
  allData: TemuanData[];
}

export const getActiveMasterCacheScope = (): string => {
  if (typeof window === 'undefined') return 'DEFAULT';
  const unit = getInisiasiUnit();
  const kode = unit?.kodeUL?.trim() || unit?.id?.trim();
  const spreadId = unit?.idSpreadsheet?.trim() || localStorage.getItem('imonex_spreadsheet_id')?.trim();
  const rawScope = kode || spreadId || 'DEFAULT';
  return rawScope.toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
};

const getMasterCacheKey = (scope: string) => `${MASTER_CACHE_PREFIX}${scope}`;
const getAllDataCacheKey = (scope: string) => `${ALLDATA_CACHE_PREFIX}${scope}`;

const isNonEmptyArray = <T>(arr: T[] | undefined | null): arr is T[] =>
  Array.isArray(arr) && arr.length > 0;

const pickSafeList = <T>(incoming: T[], prev: T[], fallback: T[]): T[] => {
  if (isNonEmptyArray(incoming)) return incoming;
  if (isNonEmptyArray(prev)) return prev;
  return fallback;
};

/**
 * Normalizes and validates an incoming payload from GAS / GViz / Legacy Cache
 * and merges safely with the previous valid MasterDataSnapshot.
 * Never removes existing valid options due to temporary empty server lists.
 */
export const validateAndMergeMasterPayload = (
  rawPayload: any,
  lastValidSnapshot: MasterDataSnapshot
): ValidatedMasterResult => {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {
      snapshot: lastValidSnapshot,
      allData: null,
      isComplete: false,
      missingCoreKeys: ['payload'],
      hasAnyValidData: false
    };
  }

  if (rawPayload.success === false || rawPayload.error) {
    return {
      snapshot: lastValidSnapshot,
      allData: null,
      isComplete: false,
      missingCoreKeys: ['server_error'],
      hasAnyValidData: false
    };
  }

  const rawInspectors = findDataInConfig(rawPayload, 'inspectors');
  const rawUlp = findDataInConfig(rawPayload, 'ulpList');
  const rawFeeders = findDataInConfig(rawPayload, 'feeders');
  const rawYandal = findDataInConfig(rawPayload, 'yandalList');
  const rawHar = findDataInConfig(rawPayload, 'harList');
  const rawRow = findDataInConfig(rawPayload, 'rowList');
  const rawTujuan = findDataInConfig(rawPayload, 'tujuanList');
  const rawPekerjaan = findDataInConfig(rawPayload, 'pekerjaanList');
  const rawKeterangan = findDataInConfig(rawPayload, 'keteranganList');
  const rawMarquee = findDataInConfig(rawPayload, 'marqueeMessages');
  const rawAllData = findDataInConfig(rawPayload, 'allData');

  const parsedInspectors = normalizeInspectors(rawInspectors);
  const parsedUlp = normalizeUlpList(rawUlp);
  const parsedFeeders = normalizeFeeders(rawFeeders);
  const parsedYandal = normalizeYandalList(rawYandal);
  const parsedHar = normalizeHarList(rawHar);
  const parsedRow = normalizeRowList(rawRow);
  const parsedTujuan = normalizeTujuanList(rawTujuan);
  const parsedPekerjaan = normalizePekerjaanList(rawPekerjaan);
  const parsedKeterangan = normalizeKeteranganList(rawKeterangan);
  const parsedMarquee = normalizeMarqueeMessages(rawMarquee);

  // Core master datasets required for a response to be considered COMPLETE for cache replacement
  const missingCoreKeys: string[] = [];
  if (parsedInspectors.length === 0) missingCoreKeys.push('inspectors');
  if (parsedUlp.length === 0) missingCoreKeys.push('ulpList');
  if (parsedFeeders.length === 0) missingCoreKeys.push('feeders');
  if (parsedPekerjaan.length === 0) missingCoreKeys.push('pekerjaanList');
  if (parsedKeterangan.length === 0) missingCoreKeys.push('keteranganList');

  const isComplete = missingCoreKeys.length === 0;
  const hasAnyValidData =
    parsedInspectors.length > 0 ||
    parsedUlp.length > 0 ||
    parsedFeeders.length > 0 ||
    parsedPekerjaan.length > 0 ||
    parsedKeterangan.length > 0 ||
    parsedYandal.length > 0 ||
    parsedTujuan.length > 0;

  // Rule 3: Never remove already-available valid options just because server returned empty temporarily
  const mergedSnapshot: MasterDataSnapshot = {
    inspectors: pickSafeList(parsedInspectors, lastValidSnapshot.inspectors, DEFAULT_MASTER_DATA.inspectors),
    ulpList: pickSafeList(parsedUlp, lastValidSnapshot.ulpList, DEFAULT_MASTER_DATA.ulpList),
    feeders: pickSafeList(parsedFeeders, lastValidSnapshot.feeders, DEFAULT_MASTER_DATA.feeders),
    yandalList: pickSafeList(parsedYandal, lastValidSnapshot.yandalList, DEFAULT_MASTER_DATA.yandalList),
    harList: pickSafeList(parsedHar, lastValidSnapshot.harList, DEFAULT_MASTER_DATA.harList),
    rowList: pickSafeList(parsedRow, lastValidSnapshot.rowList, DEFAULT_MASTER_DATA.rowList),
    tujuanList: pickSafeList(parsedTujuan, lastValidSnapshot.tujuanList, DEFAULT_MASTER_DATA.tujuanList),
    pekerjaanList: pickSafeList(parsedPekerjaan, lastValidSnapshot.pekerjaanList, DEFAULT_MASTER_DATA.pekerjaanList),
    keteranganList: pickSafeList(parsedKeterangan, lastValidSnapshot.keteranganList, DEFAULT_MASTER_DATA.keteranganList),
    marqueeMessages: pickSafeList(parsedMarquee, lastValidSnapshot.marqueeMessages, DEFAULT_MASTER_DATA.marqueeMessages)
  };

  let parsedAllData: TemuanData[] | null = null;
  if (rawAllData !== undefined && rawAllData !== null) {
    const normalizedTemuan = normalizeAllData(rawAllData);
    // Accept allData if it has items OR if the overall response was complete & rawAllData is an explicit array
    if (normalizedTemuan.length > 0 || (isComplete && Array.isArray(rawAllData))) {
      parsedAllData = normalizedTemuan;
    }
  }

  return {
    snapshot: mergedSnapshot,
    allData: parsedAllData,
    isComplete,
    missingCoreKeys,
    hasAnyValidData
  };
};

// Monotonic Request ID + Single-flight Lock state
let latestRequestId = 0;
let inFlightSync: {
  requestId: number;
  scope: string;
  promise: Promise<SyncStatusResult>;
} | null = null;

export const MasterDataService = {
  getLatestRequestId(): number {
    return latestRequestId;
  },

  invalidatePendingRequests(): number {
    latestRequestId += 1;
    inFlightSync = null;
    return latestRequestId;
  },

  isSyncInProgress(): boolean {
    return inFlightSync !== null;
  },

  /**
   * Loads the last valid MasterDataSnapshot from unit-scoped cache, legacy cache, or baseline defaults.
   */
  loadLastValidMasterData(scope = getActiveMasterCacheScope()): {
    snapshot: MasterDataSnapshot;
    allData: TemuanData[] | null;
    hasValidCache: boolean;
    timestamp: number;
  } {
    if (typeof window === 'undefined') {
      return {
        snapshot: DEFAULT_MASTER_DATA,
        allData: null,
        hasValidCache: false,
        timestamp: 0
      };
    }

    let snapshot: MasterDataSnapshot = { ...DEFAULT_MASTER_DATA };
    let allData: TemuanData[] | null = null;
    let hasValidCache = false;
    let timestamp = 0;

    // 1. Try v2 scoped master cache (lightweight, immune to AllData quota failure)
    try {
      const rawMaster = localStorage.getItem(getMasterCacheKey(scope));
      if (rawMaster) {
        const parsed: StoredMasterCache = JSON.parse(rawMaster);
        if (parsed && parsed.masterData) {
          const validated = validateAndMergeMasterPayload(parsed.masterData, DEFAULT_MASTER_DATA);
          snapshot = validated.snapshot;
          hasValidCache = validated.hasAnyValidData;
          timestamp = parsed.timestamp || 0;
        }
      }
    } catch (err) {
      console.warn('Gagal membaca master cache v2:', err);
    }

    // 2. Try v2 scoped allData cache
    try {
      const rawAllData = localStorage.getItem(getAllDataCacheKey(scope));
      if (rawAllData) {
        const parsedAll: StoredAllDataCache = JSON.parse(rawAllData);
        if (parsedAll && Array.isArray(parsedAll.allData)) {
          allData = parsedAll.allData;
        }
      }
    } catch (err) {
      console.warn('Gagal membaca allData cache v2:', err);
    }

    // 3. Fallback / migration from legacy imonex_cached_config if v2 cache isn't present yet
    if (!hasValidCache) {
      try {
        const legacyStr = localStorage.getItem(LEGACY_CACHE_KEY);
        if (legacyStr) {
          const legacyRaw = JSON.parse(legacyStr);
          const validatedLegacy = validateAndMergeMasterPayload(legacyRaw, DEFAULT_MASTER_DATA);
          if (validatedLegacy.hasAnyValidData) {
            snapshot = validatedLegacy.snapshot;
            if (!allData && validatedLegacy.allData) {
              allData = validatedLegacy.allData;
            }
            hasValidCache = true;
            timestamp = Number(localStorage.getItem(LEGACY_TIMESTAMP_KEY) || 0);
            if (validatedLegacy.isComplete) {
              this.saveValidMasterCache(snapshot, scope, getSpreadsheetUrl());
            }
          }
        }
      } catch (err) {
        console.warn('Gagal membaca legacy cache:', err);
      }
    }

    return {
      snapshot,
      allData,
      hasValidCache,
      timestamp
    };
  },

  /**
   * Rule 1: Saves master data cache ONLY when validated complete.
   * Stores masterData separately from allData so large temuan lists never cause QuotaExceededError to drop masterData.
   */
  saveValidMasterCache(
    snapshot: MasterDataSnapshot,
    scope = getActiveMasterCacheScope(),
    urlGAS = getSpreadsheetUrl()
  ): boolean {
    if (typeof window === 'undefined') return false;

    // Verify completeness before overwriting cache
    const isComplete =
      snapshot.inspectors.length > 0 &&
      snapshot.ulpList.length > 0 &&
      snapshot.feeders.length > 0 &&
      snapshot.pekerjaanList.length > 0 &&
      snapshot.keteranganList.length > 0;

    if (!isComplete) {
      console.warn('Penulisan cache ditolak: master data belum lengkap.');
      return false;
    }

    const now = Date.now();
    const payload: StoredMasterCache = {
      version: 2,
      scope,
      urlGAS,
      timestamp: now,
      masterData: snapshot
    };

    try {
      localStorage.setItem(getMasterCacheKey(scope), JSON.stringify(payload));
      localStorage.setItem(LEGACY_TIMESTAMP_KEY, String(now));
      return true;
    } catch (err) {
      console.warn('Gagal menyimpan master cache:', err);
      return false;
    }
  },

  saveAllDataCache(allData: TemuanData[], scope = getActiveMasterCacheScope()): void {
    if (typeof window === 'undefined' || !Array.isArray(allData)) return;
    try {
      const payload: StoredAllDataCache = {
        version: 2,
        scope,
        timestamp: Date.now(),
        allData
      };
      localStorage.setItem(getAllDataCacheKey(scope), JSON.stringify(payload));
    } catch (err) {
      // Do not fail master data flow if allData is too large for localStorage quota
      console.warn('AllData terlalu besar untuk cache localStorage, master data tetap aman:', err);
    }
  },

  /**
   * Updates a specific entity in persisted master cache when modified in AdminPage.
   */
  updateCachedMasterEntity<K extends keyof MasterDataSnapshot>(
    key: K,
    data: MasterDataSnapshot[K],
    scope = getActiveMasterCacheScope()
  ): void {
    if (!Array.isArray(data) || data.length === 0) return;
    const current = this.loadLastValidMasterData(scope);
    const updated: MasterDataSnapshot = {
      ...current.snapshot,
      [key]: data
    };
    this.saveValidMasterCache(updated, scope);
  },

  /**
   * Executes a concurrency-locked, Request-ID guarded master data sync.
   * Rule 4: Prevents two sync processes from running concurrently for the same unit scope.
   * Rule 5: Uses monotonic requestId so stale responses cannot overwrite newer state or cache.
   */
  async syncMasterData(
    fetcher: () => Promise<{ source: 'GAS' | 'GVIZ'; raw: any }>,
    currentMemorySnapshot: MasterDataSnapshot,
    options?: { forceNew?: boolean }
  ): Promise<SyncStatusResult> {
    const scope = getActiveMasterCacheScope();

    // Rule 4: Deduplicate concurrent sync calls in the same unit scope
    if (inFlightSync && inFlightSync.scope === scope && !options?.forceNew) {
      return inFlightSync.promise;
    }

    const requestId = ++latestRequestId;

    const runSync = async (): Promise<SyncStatusResult> => {
      const cached = this.loadLastValidMasterData(scope);

      // Establish best known valid baseline (prefer non-default cached or current memory state)
      const baseline: MasterDataSnapshot = {
        inspectors: pickSafeList(currentMemorySnapshot.inspectors, cached.snapshot.inspectors, DEFAULT_MASTER_DATA.inspectors),
        ulpList: pickSafeList(currentMemorySnapshot.ulpList, cached.snapshot.ulpList, DEFAULT_MASTER_DATA.ulpList),
        feeders: pickSafeList(currentMemorySnapshot.feeders, cached.snapshot.feeders, DEFAULT_MASTER_DATA.feeders),
        yandalList: pickSafeList(currentMemorySnapshot.yandalList, cached.snapshot.yandalList, DEFAULT_MASTER_DATA.yandalList),
        harList: pickSafeList(currentMemorySnapshot.harList, cached.snapshot.harList, DEFAULT_MASTER_DATA.harList),
        rowList: pickSafeList(currentMemorySnapshot.rowList, cached.snapshot.rowList, DEFAULT_MASTER_DATA.rowList),
        tujuanList: pickSafeList(currentMemorySnapshot.tujuanList, cached.snapshot.tujuanList, DEFAULT_MASTER_DATA.tujuanList),
        pekerjaanList: pickSafeList(currentMemorySnapshot.pekerjaanList, cached.snapshot.pekerjaanList, DEFAULT_MASTER_DATA.pekerjaanList),
        keteranganList: pickSafeList(currentMemorySnapshot.keteranganList, cached.snapshot.keteranganList, DEFAULT_MASTER_DATA.keteranganList),
        marqueeMessages: pickSafeList(currentMemorySnapshot.marqueeMessages, cached.snapshot.marqueeMessages, DEFAULT_MASTER_DATA.marqueeMessages)
      };

      try {
        const { source, raw } = await fetcher();

        // Rule 5: Reject stale response if a newer request or unit switch occurred
        if (requestId !== latestRequestId || scope !== getActiveMasterCacheScope()) {
          return {
            status: 'STALE_IGNORED',
            snapshot: baseline,
            allData: null,
            timestamp: Date.now(),
            message: 'Respons lama diabaikan karena ada permintaan sinkronisasi lebih baru.',
            isOffline: false
          };
        }

        const validated = validateAndMergeMasterPayload(raw, baseline);

        // Rule 1: Only overwrite persisted master cache when response is complete & valid
        if (validated.isComplete) {
          this.saveValidMasterCache(validated.snapshot, scope, getSpreadsheetUrl());
          if (validated.allData) {
            this.saveAllDataCache(validated.allData, scope);
          }

          return {
            status: 'SUCCESS',
            source,
            snapshot: validated.snapshot,
            allData: validated.allData,
            timestamp: Date.now(),
            message: 'Data master berhasil dimuat & diverifikasi.',
            isOffline: false
          };
        }

        // Response was incomplete! DO NOT overwrite cache.
        console.warn('Respons server tidak lengkap, cache lama dipertahankan. Missing:', validated.missingCoreKeys);

        if (validated.hasAnyValidData) {
          // Safe merged state keeps all previous valid options while still preserving last valid cache untouched
          return {
            status: 'PARTIAL',
            source,
            snapshot: validated.snapshot,
            allData: validated.allData,
            timestamp: Date.now(),
            message: 'Respons server sebagian tidak lengkap; pilihan master yang ada tetap dipertahankan.',
            isOffline: false,
            missingCoreKeys: validated.missingCoreKeys
          };
        }

        // Completely unusable payload -> behave like failure & use last valid master data
        return {
          status: 'OFFLINE_CACHED',
          source: 'CACHE',
          snapshot: cached.hasValidCache ? cached.snapshot : baseline,
          allData: cached.allData,
          timestamp: cached.timestamp || Date.now(),
          message: 'Respons server tidak valid, menggunakan data master terakhir yang valid.',
          isOffline: true,
          missingCoreKeys: validated.missingCoreKeys
        };
      } catch (err: any) {
        // Rule 5: Ignore errors from outdated requests
        if (requestId !== latestRequestId || scope !== getActiveMasterCacheScope()) {
          return {
            status: 'STALE_IGNORED',
            snapshot: baseline,
            allData: null,
            timestamp: Date.now(),
            message: 'Permintaan lama dibatalkan.',
            isOffline: false
          };
        }

        console.warn('Sinkronisasi GAS gagal, menggunakan data master terakhir yang valid:', err?.message || err);

        // Rule 2: Fall back to last valid master data
        const fallbackSnapshot = cached.hasValidCache ? cached.snapshot : baseline;

        return {
          status: cached.hasValidCache ? 'OFFLINE_CACHED' : 'ERROR',
          source: 'CACHE',
          snapshot: fallbackSnapshot,
          allData: cached.allData,
          timestamp: cached.timestamp || Date.now(),
          message: err?.message || 'Gagal menghubungi server GAS, menggunakan data master terakhir yang valid.',
          isOffline: true
        };
      } finally {
        if (inFlightSync && inFlightSync.requestId === requestId) {
          inFlightSync = null;
        }
      }
    };

    const promise = runSync();
    inFlightSync = { requestId, scope, promise };
    return promise;
  }
};
