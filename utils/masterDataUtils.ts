import {
  Inspector,
  ULP,
  Feeder,
  Pekerjaan,
  Keterangan,
  Yandal,
  Har,
  Row,
  Tujuan,
  MarqueeMessage,
  TemuanData
} from '../types';
import {
  INITIAL_INSPECTORS,
  INITIAL_ULP,
  INITIAL_FEEDERS,
  INITIAL_PEKERJAAN,
  INITIAL_KETERANGAN,
  INITIAL_YANDAL,
  INITIAL_HAR,
  INITIAL_ROW,
  INITIAL_TUJUAN
} from '../constants';

export interface MasterDataSnapshot {
  inspectors: Inspector[];
  ulpList: ULP[];
  feeders: Feeder[];
  yandalList: Yandal[];
  harList: Har[];
  rowList: Row[];
  tujuanList: Tujuan[];
  pekerjaanList: Pekerjaan[];
  keteranganList: Keterangan[];
  marqueeMessages: MarqueeMessage[];
}

export const DEFAULT_MASTER_DATA: MasterDataSnapshot = {
  inspectors: INITIAL_INSPECTORS,
  ulpList: INITIAL_ULP,
  feeders: INITIAL_FEEDERS,
  yandalList: INITIAL_YANDAL,
  harList: INITIAL_HAR,
  rowList: INITIAL_ROW,
  tujuanList: INITIAL_TUJUAN,
  pekerjaanList: INITIAL_PEKERJAAN,
  keteranganList: INITIAL_KETERANGAN,
  marqueeMessages: []
};

export const normalizeString = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

export const normalizeText = (val: unknown): string => {
  return normalizeString(val).replace(/\s+/g, ' ').toLowerCase();
};

export const normalizeKey = (val: unknown): string => {
  return normalizeString(val).toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Extracts raw array from common GAS/GViz/JSON shapes ({ headers, values }, Array, { data: Array })
 */
export const extractRawArray = (input: any): any[] | null => {
  if (!input) return null;

  if (input.headers && Array.isArray(input.values)) {
    return input.values.map((row: any[]) => {
      const obj: any = {};
      row.forEach((cell, i) => {
        const header = input.headers[i];
        if (header !== undefined && header !== null) {
          obj[String(header)] = cell;
        }
      });
      return obj;
    });
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (input.data && Array.isArray(input.data)) {
    return input.data;
  }

  return null;
};

/**
 * Finds a field/dataset inside a raw config payload flexibly (case-insensitive, ignoring List suffix).
 */
export const findDataInConfig = (obj: any, targetKey: string): any => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;

  const lowerTarget = targetKey.toLowerCase().replace(/list$/, '');
  const keys = Object.keys(obj);

  // 1. Direct match (case-insensitive, ignoring 'List' suffix)
  let foundKey = keys.find(k => k.toLowerCase().replace(/list$/, '') === lowerTarget);
  if (foundKey !== undefined) return obj[foundKey];

  // 2. Partial match
  foundKey = keys.find(k => k.toLowerCase().includes(lowerTarget));
  if (foundKey !== undefined) return obj[foundKey];

  // 3. One-level nested search (e.g., obj.data.feeders)
  for (const k of keys) {
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      const deepResult = findDataInConfig(obj[k], targetKey);
      if (deepResult !== undefined) return deepResult;
    }
  }

  return undefined;
};

const getFieldByAliases = (item: Record<string, any>, aliases: string[]): any => {
  const entries = Object.entries(item);
  for (const alias of aliases) {
    const aliasNorm = normalizeKey(alias);
    const match = entries.find(([k]) => normalizeKey(k) === aliasNorm);
    if (match && match[1] !== undefined && match[1] !== null && String(match[1]).trim() !== '') {
      return match[1];
    }
  }
  return undefined;
};

export const normalizeInspectors = (input: any): Inspector[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idInspektor', 'id_inspektor'])) || `INS-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'namaInspektor', 'nama_inspektor', 'inspektor']));
      if (!name) return null;
      return { id, name };
    })
    .filter((x): x is Inspector => x !== null);
};

export const normalizeUlpList = (input: any): ULP[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idUlp', 'id_ulp', 'ulpId', 'ulp_id', 'kode'])) || `ULP-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'namaUlp', 'nama_ulp', 'ulp', 'unit']));
      if (!name) return null;
      return { id, name };
    })
    .filter((x): x is ULP => x !== null);
};

export const normalizeFeeders = (input: any): Feeder[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idFeeder', 'id_feeder'])) || `F-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'feeder', 'penyulang', 'namaFeeder', 'nama_feeder', 'namaPenyulang', 'nama_penyulang']));
      const ulpId = normalizeString(getFieldByAliases(item, ['ulpId', 'ulp_id', 'idUlp', 'id_ulp', 'ulp', 'namaUlp', 'nama_ulp', 'unit']));
      if (!name) return null;
      return { id, name, ulpId };
    })
    .filter((x): x is Feeder => x !== null);
};

export const normalizeYandalList = (input: any): Yandal[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idYandal', 'id_yandal'])) || `Y-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'yandal', 'namaYandal', 'nama_yandal']));
      const ulpId = normalizeString(getFieldByAliases(item, ['ulpId', 'ulp_id', 'idUlp', 'id_ulp', 'ulp', 'namaUlp', 'nama_ulp', 'unit']));
      if (!name) return null;
      return { id, name, ulpId };
    })
    .filter((x): x is Yandal => x !== null);
};

export const normalizeHarList = (input: any): Har[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idHar', 'id_har'])) || `H-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'har', 'teamHar', 'namaHar', 'nama_har']));
      const ulpId = normalizeString(getFieldByAliases(item, ['ulpId', 'ulp_id', 'idUlp', 'id_ulp', 'ulp', 'namaUlp', 'nama_ulp']));
      if (!name) return null;
      return { id, name, ulpId };
    })
    .filter((x): x is Har => x !== null);
};

export const normalizeRowList = (input: any): Row[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idRow', 'id_row'])) || `R-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'row', 'teamRow', 'namaRow', 'nama_row']));
      const ulpId = normalizeString(getFieldByAliases(item, ['ulpId', 'ulp_id', 'idUlp', 'id_ulp', 'ulp', 'namaUlp', 'nama_ulp']));
      if (!name) return null;
      return { id, name, ulpId };
    })
    .filter((x): x is Row => x !== null);
};

export const normalizeTujuanList = (input: any): Tujuan[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idTujuan', 'id_tujuan'])) || `T-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'tujuan', 'teamTujuan', 'team_tujuan', 'timTujuan', 'tim_tujuan', 'text']));
      if (!name) return null;
      return { id, name };
    })
    .filter((x): x is Tujuan => x !== null);
};

export const normalizePekerjaanList = (input: any): Pekerjaan[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idPekerjaan', 'id_pekerjaan', 'kode', 'kodePekerjaan'])) || `PEK-${idx + 1}`;
      const name = normalizeString(getFieldByAliases(item, ['name', 'nama', 'pekerjaan', 'namaPekerjaan', 'nama_pekerjaan', 'jenisPekerjaan', 'jenis_pekerjaan']));
      if (!name) return null;
      return { id, name };
    })
    .filter((x): x is Pekerjaan => x !== null);
};

export const normalizeKeteranganList = (input: any): Keterangan[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id', 'idKeterangan', 'id_keterangan'])) || `K-${idx + 1}`;
      // Supports both GAS `text` field and sheet/GViz `name` column
      const text = normalizeString(getFieldByAliases(item, ['text', 'name', 'nama', 'keterangan', 'kelainan', 'kategoriKelainan', 'kategori_kelainan', 'uraian']));
      const idPekerjaan = normalizeString(getFieldByAliases(item, ['idPekerjaan', 'id_pekerjaan', 'pekerjaanId', 'pekerjaan_id', 'idpek', 'pekerjaan', 'jenisPekerjaan', 'jenis_pekerjaan']));
      if (!text) return null;
      return { id, text, idPekerjaan };
    })
    .filter((x): x is Keterangan => x !== null);
};

export const normalizeMarqueeMessages = (input: any): MarqueeMessage[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const id = normalizeString(getFieldByAliases(item, ['id'])) || `M-${idx + 1}`;
      const text = normalizeString(getFieldByAliases(item, ['text', 'name', 'nama', 'pesan', 'message']));
      const rawActive = getFieldByAliases(item, ['isActive', 'is_active', 'active', 'aktif']);
      const isActive = rawActive === true || String(rawActive).toUpperCase() === 'TRUE' || rawActive === 1;
      if (!text) return null;
      return { id, text, isActive };
    })
    .filter((x): x is MarqueeMessage => x !== null);
};

export const normalizeAllData = (input: any): TemuanData[] => {
  const raw = extractRawArray(input);
  if (!raw) return [];

  return raw.map((item, index) => {
    const newItem: any = {};
    newItem.id = item?.id || item?.ID || `item-${index}`;

    for (const key in item) {
      const val = item[key];
      const lowerKey = key.toLowerCase().replace(/_/g, '').replace(/\s/g, '');

      let mappedKey = key;
      if (lowerKey === 'ulpid' || lowerKey === 'idulp') mappedKey = 'ulpId';
      else if (lowerKey === 'idpekerjaan') mappedKey = 'idPekerjaan';
      else if (lowerKey === 'notiang') mappedKey = 'noTiang';
      else if (lowerKey === 'nowo') mappedKey = 'noWO';
      else if (lowerKey === 'fototemuan') mappedKey = 'fotoTemuan';
      else if (lowerKey === 'fotoeksekusi') mappedKey = 'fotoEksekusi';
      else if (lowerKey === 'timeksekusi') mappedKey = 'timEksekusi';
      else if (lowerKey === 'tanggaleksekusi') mappedKey = 'tanggalEksekusi';
      else if (lowerKey === 'namayandal1') mappedKey = 'namaYandal1';
      else if (lowerKey === 'namayandal2') mappedKey = 'namaYandal2';
      else if (lowerKey === 'nama' || lowerKey === 'name') mappedKey = 'name';
      else if (lowerKey === 'isactive') mappedKey = 'isActive';
      else if (lowerKey === 'har') mappedKey = 'HAR';
      else if (lowerKey === 'row') mappedKey = 'ROW';
      else if (lowerKey === 'teamtujuan') mappedKey = 'Team_Tujuan';

      let finalVal = val;
      if (mappedKey === 'isActive') {
        finalVal = val === true || val === 'TRUE' || val === 'true';
      }
      newItem[mappedKey] = finalVal;
    }
    return newItem as TemuanData;
  });
};

/**
 * Resolves an ULP record from ulpList by matching either normalized ID or normalized Name.
 */
export const resolveUlp = (ulpList: ULP[], sessionUlp?: string): ULP | undefined => {
  if (!sessionUlp || !Array.isArray(ulpList) || ulpList.length === 0) return undefined;

  const targetText = normalizeText(sessionUlp);
  const targetKey = normalizeKey(sessionUlp);
  if (!targetKey && !targetText) return undefined;

  return (
    ulpList.find(u => normalizeText(u.name) === targetText || normalizeText(u.id) === targetText) ||
    ulpList.find(u => normalizeKey(u.name) === targetKey || normalizeKey(u.id) === targetKey)
  );
};

/**
 * Checks whether an item's ulpId (or fallback ulp field) belongs to the user's ULP
 * using normalized ID and name matching.
 */
export const matchesUlpRelation = (
  itemUlpRef: string | undefined,
  ulpList: ULP[],
  sessionUlp?: string,
  extraFallbackRef?: string
): boolean => {
  if (!sessionUlp) return false;

  const candidateRefs = [itemUlpRef, extraFallbackRef]
    .map(v => normalizeString(v))
    .filter(Boolean);

  if (candidateRefs.length === 0) return false;

  const matchedUlp = resolveUlp(ulpList, sessionUlp);

  const targetTexts = new Set<string>();
  const targetKeys = new Set<string>();

  const addTarget = (val?: string) => {
    const t = normalizeText(val);
    const k = normalizeKey(val);
    if (t) targetTexts.add(t);
    if (k) targetKeys.add(k);
  };

  addTarget(sessionUlp);
  if (matchedUlp) {
    addTarget(matchedUlp.id);
    addTarget(matchedUlp.name);
  }

  for (const ref of candidateRefs) {
    if (targetTexts.has(normalizeText(ref)) || targetKeys.has(normalizeKey(ref))) {
      return true;
    }
  }

  return false;
};

/**
 * Filters feeders (Penyulang) strictly for the user's ULP using normalized ID and name matching.
 */
export const filterFeedersByUlp = (
  feeders: Feeder[],
  ulpList: ULP[],
  sessionUlp?: string
): Feeder[] => {
  if (!sessionUlp || !Array.isArray(feeders)) return [];
  return feeders.filter(f =>
    matchesUlpRelation(f.ulpId, ulpList, sessionUlp, (f as any).ulp || (f as any).namaUlp)
  );
};

/**
 * Filters Yandal personnel for the user's ULP using normalized ID and name matching.
 */
export const filterYandalByUlp = (
  yandalList: Yandal[],
  ulpList: ULP[],
  sessionUlp?: string
): Yandal[] => {
  if (!sessionUlp || !Array.isArray(yandalList)) return [];
  return yandalList
    .filter(y => matchesUlpRelation(y.ulpId, ulpList, sessionUlp, (y as any).ulp || (y as any).namaUlp))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

/**
 * Resolves a Pekerjaan object by normalized ID or Name.
 */
export const resolvePekerjaan = (
  pekerjaanList: Pekerjaan[],
  idPekerjaan?: string,
  namaPekerjaan?: string
): Pekerjaan | undefined => {
  if (!Array.isArray(pekerjaanList) || pekerjaanList.length === 0) return undefined;

  const idKey = normalizeKey(idPekerjaan);
  const nameKey = normalizeKey(namaPekerjaan);

  if (idKey) {
    const byId = pekerjaanList.find(p => normalizeKey(p.id) === idKey);
    if (byId) return byId;
  }

  if (nameKey) {
    const byName = pekerjaanList.find(p => normalizeKey(p.name) === nameKey);
    if (byName) return byName;
  }

  if (idKey) {
    const byIdAsName = pekerjaanList.find(p => normalizeKey(p.name) === idKey);
    if (byIdAsName) return byIdAsName;
  }

  return undefined;
};

/**
 * Filters Kategori Kelainan (Keterangan) by Pekerjaan relation (idPekerjaan, plus normalized fallback to Pekerjaan name).
 */
export const filterKeteranganByPekerjaan = (
  keteranganList: Keterangan[],
  pekerjaanList: Pekerjaan[],
  idPekerjaan?: string,
  namaPekerjaan?: string,
  editFallbackText?: string
): Keterangan[] => {
  const list = Array.isArray(keteranganList) ? keteranganList.filter(k => normalizeString(k.text).length > 0) : [];
  const idNorm = normalizeKey(idPekerjaan);
  const nameNorm = normalizeKey(namaPekerjaan);

  if (idNorm === 'pln' || nameNorm === 'pln') {
    return list;
  }

  const canonicalPek = resolvePekerjaan(pekerjaanList, idPekerjaan, namaPekerjaan);

  const validTargetKeys = new Set<string>();
  if (canonicalPek?.id) validTargetKeys.add(normalizeKey(canonicalPek.id));
  if (canonicalPek?.name) validTargetKeys.add(normalizeKey(canonicalPek.name));
  if (idNorm) validTargetKeys.add(idNorm);
  if (nameNorm) validTargetKeys.add(nameNorm);

  let filtered: Keterangan[] = [];
  if (validTargetKeys.size > 0) {
    filtered = list.filter(k => {
      const rawRel = normalizeString(k.idPekerjaan);
      if (!rawRel) return false;

      // Support single ID or delimited multi-ID (e.g. "PEK01, PEK02")
      const tokens = rawRel
        .split(/[,;|]+/)
        .map(t => normalizeKey(t))
        .filter(Boolean);

      return tokens.some(tok => tok === 'all' || tok === 'umum' || validTargetKeys.has(tok));
    });
  }

  // Ensure existing value during edit mode remains selectable
  if (editFallbackText && normalizeString(editFallbackText)) {
    const fallbackNorm = normalizeText(editFallbackText);
    const alreadyPresent = filtered.some(k => normalizeText(k.text) === fallbackNorm);
    if (!alreadyPresent) {
      const found = list.find(k => normalizeText(k.text) === fallbackNorm);
      filtered = [
        ...filtered,
        found || {
          id: `edit-fallback-${fallbackNorm}`,
          text: normalizeString(editFallbackText),
          idPekerjaan: canonicalPek?.id || idPekerjaan || ''
        }
      ];
    }
  }

  return filtered;
};

/**
 * Returns valid Team Tujuan options with safe fallback to INITIAL_TUJUAN.
 */
export const getValidTujuanList = (tujuanList?: Tujuan[], editFallbackTujuan?: string): Tujuan[] => {
  const valid = Array.isArray(tujuanList)
    ? tujuanList.filter(t => t && normalizeString(t.name).length > 0)
    : [];

  const base = valid.length > 0 ? valid : INITIAL_TUJUAN;

  if (editFallbackTujuan && normalizeString(editFallbackTujuan)) {
    const fallbackNorm = normalizeText(editFallbackTujuan);
    const exists = base.some(t => normalizeText(t.name) === fallbackNorm);
    if (!exists) {
      return [...base, { id: `edit-tujuan-${fallbackNorm}`, name: normalizeString(editFallbackTujuan) }];
    }
  }

  return base;
};
