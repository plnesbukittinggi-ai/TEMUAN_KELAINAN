import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  RefreshCw, 
  ExternalLink, 
  Sliders, 
  History, 
  Layers, 
  BarChart3, 
  FileSpreadsheet, 
  ShieldCheck, 
  Sparkles,
  Info,
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import { 
  DatabaseCapacityInfo, 
  DatabaseRegistryItem, 
  RotationHistoryItem, 
  RotationSettings 
} from '../types';
import { SpreadsheetService, getInisiasiUnit } from '../services/spreadsheetService';

interface DatabaseManagementViewProps {
  currentRole?: string;
  onRefreshParentData?: () => void;
}

export const DatabaseManagementView: React.FC<DatabaseManagementViewProps> = ({ 
  currentRole, 
  onRefreshParentData 
}) => {
  const [capacityInfo, setCapacityInfo] = useState<DatabaseCapacityInfo | null>(null);
  const [registryList, setRegistryList] = useState<DatabaseRegistryItem[]>([]);
  const [rotationHistory, setRotationHistory] = useState<RotationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  
  // Settings form states
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [warningThreshold, setWarningThreshold] = useState<number>(80);
  const [rotationThreshold, setRotationThreshold] = useState<number>(85);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(95);
  const [settingsSavedAlert, setSettingsSavedAlert] = useState<string>('');

  // Manual rotation confirmation modal
  const [showRotateModal, setShowRotateModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [rotateReason, setRotateReason] = useState<string>('');

  const activeUnit = getInisiasiUnit();

  const loadDatabaseData = async (forceFresh = false) => {
    setIsLoading(true);
    try {
      const res = await SpreadsheetService.fetchDatabaseStatus(forceFresh);
      if (res && res.capacity) {
        setCapacityInfo(res.capacity);
        setAutoRotate(res.capacity.autoRotationEnabled);
        setWarningThreshold(res.capacity.warningThreshold);
        setRotationThreshold(res.capacity.rotationThreshold);
        setCriticalThreshold(res.capacity.criticalThreshold);
      }
      if (res && Array.isArray(res.registry)) {
        setRegistryList(res.registry);
      }
      
      const history = await SpreadsheetService.fetchRotationHistory();
      setRotationHistory(history);
    } catch (err) {
      console.error('Error loading database status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const handleManualCheckCapacity = async () => {
    setIsChecking(true);
    try {
      const fresh = await SpreadsheetService.checkDatabaseCapacity(true);
      setCapacityInfo(fresh);
      const res = await SpreadsheetService.fetchDatabaseStatus(true);
      if (res.registry) setRegistryList(res.registry);
      alert('Pemeriksaan kapasitas database selesai. Data real-time diperbarui.');
    } catch (err: any) {
      alert('Gagal memeriksa kapasitas: ' + (err?.message || err));
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (warningThreshold >= rotationThreshold) {
      alert('Ambang Peringatan (Warning) harus lebih kecil dari Ambang Rotasi!');
      return;
    }
    if (rotationThreshold >= criticalThreshold) {
      alert('Ambang Rotasi harus lebih kecil dari Ambang Kritis!');
      return;
    }

    setIsSavingSettings(true);
    try {
      const settings: RotationSettings = {
        autoRotationEnabled: autoRotate,
        warningThreshold: Number(warningThreshold),
        rotationThreshold: Number(rotationThreshold),
        criticalThreshold: Number(criticalThreshold)
      };
      await SpreadsheetService.updateRotationSettings(settings);
      setSettingsSavedAlert('Pengaturan ambang batas rotasi berhasil disimpan.');
      setTimeout(() => setSettingsSavedAlert(''), 3000);
      loadDatabaseData();
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + (err?.message || err));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTriggerRotation = async () => {
    if (confirmInput.trim().toUpperCase() !== 'ROTASI') {
      alert('Silakan ketik "ROTASI" untuk mengonfirmasi.');
      return;
    }

    setIsRotating(true);
    try {
      const res = await SpreadsheetService.rotateDatabase(rotateReason || 'Manual rotation requested by Super Admin');
      if (res.success) {
        alert('BERHASIL: ' + (res.message || 'Rotasi database berhasil diselesaikan.'));
        setShowRotateModal(false);
        setConfirmInput('');
        setRotateReason('');
        await loadDatabaseData(true);
        if (onRefreshParentData) onRefreshParentData();
      } else {
        alert('GAGAL ROTASI: ' + (res.message || 'Terjadi kesalahan sistem saat membuat spreadsheet baru.'));
      }
    } catch (err: any) {
      alert('ERROR: ' + (err?.message || err));
    } finally {
      setIsRotating(false);
    }
  };

  // Simulation test runner for Bagian 18 (Test 2 & Test 3)
  const handleSimulatePercent = async (percent: number, label: string) => {
    try {
      const updated = await SpreadsheetService.simulateCapacity(percent);
      setCapacityInfo(updated);
      alert(`Simulasi kapasitas ${percent}% (${label}) aktif. Perhatikan status indikator dan ambang batas.`);
      
      // If simulated at 85% and auto-rotation is on, test automatic rotation trigger
      if (percent >= 85 && autoRotate) {
        const wantAuto = window.confirm(
          `Kapasitas mencapai ${percent}% (Melebihi ambang batas ${rotationThreshold}%).\nApakah ingin memicu rotasi otomatis sesuai skenario Bagian 6 & 18?`
        );
        if (wantAuto) {
          setIsRotating(true);
          const res = await SpreadsheetService.rotateDatabase(`Automatic Threshold Simulation (${percent}%)`);
          if (res.success) {
            alert(`SISTEM ROTASI OTOMATIS BERHASIL:\n${res.message}\nDatabase baru telah aktif!`);
            await loadDatabaseData(true);
            if (onRefreshParentData) onRefreshParentData();
          }
          setIsRotating(false);
        }
      }
    } catch (err: any) {
      alert('Error simulasi: ' + err.toString());
    }
  };

  if (currentRole !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 bg-white rounded-3xl border border-red-100 shadow-sm text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Akses Dibatasi</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Menu Database Management hanya dapat diakses oleh peran <strong>Super Admin</strong> untuk menjaga integritas dan keamanan struktur database multi-unit.
        </p>
      </div>
    );
  }

  const capacityPercent = capacityInfo?.capacityPercent ?? 0;
  const status = capacityInfo?.status ?? 'NORMAL';

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'NORMAL':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          text: 'NORMAL (Aman)'
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          text: 'WARNING (Persiapan Rotasi)'
        };
      case 'ROTATION_REQUIRED':
        return {
          bg: 'bg-orange-50 text-orange-700 border-orange-200',
          dot: 'bg-orange-500 animate-ping',
          text: 'ROTATION REQUIRED (Perlu Rotasi)'
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500 animate-ping',
          text: 'CRITICAL (Mendekati Batas Google)'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          text: 'NORMAL'
        };
    }
  };

  const statusStyle = getStatusBadge(status);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="bg-[#003865] text-white p-6 rounded-[2rem] shadow-lg border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider text-cyan-200 mb-2 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>I-MONEX DATABASE ARCHITECTURE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-cyan-300" />
            <span>AUTOMATIC ROTATION &amp; REGISTRY</span>
          </h2>
          <p className="text-xs text-cyan-100 font-medium mt-1 max-w-2xl leading-relaxed">
            Unit Aktif: <strong className="text-white uppercase underline">{activeUnit?.namaUL || 'UL BUKITTINGGI'} ({activeUnit?.kodeUL || 'BKT'})</strong>.
            Sistem rotasi database bekerja mandiri per UL tanpa mencampuradukkan data atau konfigurasi unit lain.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadDatabaseData(true)}
            disabled={isLoading || isChecking}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer disabled:opacity-50"
            title="Muat Ulang Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleManualCheckCapacity}
            disabled={isChecking}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isChecking ? 'Memeriksa...' : 'Periksa Kapasitas'}</span>
          </button>

          <button
            onClick={() => setShowRotateModal(true)}
            disabled={isRotating}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            <span>Rotasi Manual</span>
          </button>
        </div>
      </div>

      {/* SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Kapasitas Status */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapasitas Database</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {capacityPercent.toFixed(2)}%
              </h3>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${statusStyle.bg}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></span>
              <span>{status}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  capacityPercent >= 95 ? 'bg-red-600' :
                  capacityPercent >= 85 ? 'bg-orange-500' :
                  capacityPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(3, capacityPercent))}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-400">
              <span>0%</span>
              <span className="text-amber-600 font-extrabold">{warningThreshold}% Warn</span>
              <span className="text-orange-600 font-extrabold">{rotationThreshold}% Rotate</span>
              <span>10M Sel</span>
            </div>
          </div>
        </div>

        {/* Card 2: Database Aktif */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Aktif</p>
              <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                SEQ {registryList.find(r => r.databaseStatus === 'ACTIVE')?.sequence || 1}
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-900 uppercase truncate mt-1" title={capacityInfo?.activeDatabaseName}>
              {capacityInfo?.activeDatabaseName || 'Memuat...'}
            </h4>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate" title={capacityInfo?.activeDatabaseId}>
              ID: {capacityInfo?.activeDatabaseId || '-'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold">Record Aktif:</span>
            <span className="font-black text-slate-900">{capacityInfo?.activeRecordsCount || 0} Temuan</span>
          </div>
        </div>

        {/* Card 3: Database Registry & Arsip */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Siklus Database UL</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{registryList.length}</span>
              <span className="text-xs font-bold text-slate-400">Spreadsheet</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              {registryList.filter(r => r.databaseStatus === 'ARCHIVE').length} Database Arsip • 1 Database Aktif
            </p>
          </div>
          <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold">Total Record Historis:</span>
            <span className="font-black text-indigo-600">{capacityInfo?.totalHistoricalRecordsCount || 0} Temuan</span>
          </div>
        </div>

        {/* Card 4: Sel Grid Terpakai */}
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alokasi Grid Sel</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              {(capacityInfo?.totalCellsAllocated || 0).toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              dari batas 10.000.000 sel Google
            </p>
          </div>
          <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[10px]">
            <span className="text-slate-500 font-bold">Sel Berisi Data:</span>
            <span className="font-black text-slate-900">{(capacityInfo?.totalCellsUsed || 0).toLocaleString('id-ID')} sel</span>
          </div>
        </div>
      </div>

      {/* QUICK SIMULATION TESTING PANEL (BAGIAN 18 TEST 2 & TEST 3) */}
      <div className="bg-gradient-to-r from-slate-900 to-[#002d59] p-5 rounded-[2rem] text-white shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-300" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              PANEL PENGUJIAN &amp; SIMULASI ROTASI (BAGIAN 18)
            </h3>
          </div>
          <span className="text-[9px] font-bold text-cyan-200 bg-white/10 px-2.5 py-0.5 rounded-full">
            Fitur Khusus Pengujian Super Admin
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
          <button
            type="button"
            onClick={() => handleSimulatePercent(4.2, 'Normal')}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-cyan-300 uppercase">TEST 1: Normal</div>
            <div className="text-xs font-bold text-white mt-1">Simulasi 4.2% (Normal)</div>
            <div className="text-[9px] text-slate-300 mt-0.5">Status NORMAL, input temuan normal</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulatePercent(80.5, 'Warning')}
            className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-amber-300 uppercase">TEST 2: Warning</div>
            <div className="text-xs font-bold text-amber-200 mt-1">Simulasi 80.5% (Warning)</div>
            <div className="text-[9px] text-amber-100/70 mt-0.5">Status berubah jadi WARNING</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulatePercent(85.5, 'Rotation Required')}
            className="p-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-orange-300 uppercase">TEST 3: Auto Rotation</div>
            <div className="text-xs font-bold text-orange-200 mt-1">Simulasi 85.5% (Rotasi)</div>
            <div className="text-[9px] text-orange-100/70 mt-0.5">Memicu rotasi spreadsheet otomatis</div>
          </button>

          <button
            type="button"
            onClick={() => handleSimulatePercent(96.0, 'Critical')}
            className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-black text-red-300 uppercase">TEST Kritis</div>
            <div className="text-xs font-bold text-red-200 mt-1">Simulasi 96% (Kritis)</div>
            <div className="text-[9px] text-red-100/70 mt-0.5">Mendekati limit Google Sheets</div>
          </button>
        </div>
      </div>

      {/* TWO COLUMNS: SETTINGS & REGISTRY TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: PENGATURAN ROTASI */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pengaturan Rotasi</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ambang Batas Kapasitas</p>
              </div>
            </div>

            {settingsSavedAlert && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settingsSavedAlert}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Toggle Auto Rotation */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs font-black text-slate-900 uppercase">Rotasi Otomatis</span>
                  <p className="text-[10px] text-slate-400 font-medium">Buat spreadsheet baru jika mencapai batas</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Warning Threshold */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Ambang Peringatan (Warning): {warningThreshold}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-0.5">
                  <span>50%</span>
                  <span className="text-amber-600 font-extrabold">{warningThreshold}%</span>
                  <span>90%</span>
                </div>
              </div>

              {/* Rotation Threshold */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Ambang Rotasi Otomatis: {rotationThreshold}%
                </label>
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={rotationThreshold}
                  onChange={(e) => setRotationThreshold(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-0.5">
                  <span>60%</span>
                  <span className="text-orange-600 font-extrabold">{rotationThreshold}%</span>
                  <span>95%</span>
                </div>
              </div>

              {/* Critical Threshold */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Ambang Kritis (Critical): {criticalThreshold}%
                </label>
                <input
                  type="range"
                  min="85"
                  max="99"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-0.5">
                  <span>85%</span>
                  <span className="text-red-600 font-extrabold">{criticalThreshold}%</span>
                  <span>99%</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </form>
          </div>

          <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-900 leading-relaxed">
            <span className="font-black">Aturan Keamanan:</span> Spreadsheet baru tidak akan diaktifkan sampai seluruh struktur sheet dan kolom diverifikasi lengkap.
          </div>
        </div>

        {/* RIGHT COLUMN: DAFTAR DATABASE REGISTRY */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Daftar Spreadsheet Database</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Sheet Internal: <span className="font-mono text-indigo-600">__IMONEX_DB_REGISTRY</span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">
                {registryList.length} Database Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-5 py-3 w-16">Seq</th>
                    <th className="px-5 py-3">Nama Database</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Record</th>
                    <th className="px-5 py-3 text-right">Kapasitas</th>
                    <th className="px-5 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registryList.map((db, idx) => {
                    const isActive = db.databaseStatus === 'ACTIVE';
                    const seqNum = db.sequence || (idx + 1);
                    const formattedSeq = seqNum < 10 ? `00${seqNum}` : `${seqNum}`;
                    
                    return (
                      <tr key={db.databaseId || idx} className={`hover:bg-slate-50/80 transition-colors ${isActive ? 'bg-cyan-50/20' : ''}`}>
                        <td className="px-5 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {formattedSeq}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                            <span>{db.databaseName}</span>
                            {isActive && <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-black">TERBARU</span>}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[200px]" title={db.databaseId}>
                            ID: {db.databaseId}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            Dibuat: {db.createdAt ? new Date(db.createdAt).toLocaleDateString('id-ID') : '-'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            <span>{db.databaseStatus}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-black text-slate-900">{db.totalRecords || 0}</span>
                          <span className="text-[9px] text-slate-400 block">Temuan</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-black text-slate-900">{(db.capacityPercent || 0).toFixed(2)}%</span>
                          <span className="text-[9px] text-slate-400 block">{(db.usedCells || 0).toLocaleString('id-ID')} sel</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <a
                            href={db.databaseUrl || `https://docs.google.com/spreadsheets/d/${db.databaseId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all"
                            title="Buka di Google Spreadsheet"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Seluruh spreadsheet arsip disimpan permanen untuk query data historis.</span>
            <span className="font-bold">Total: {registryList.length} Database</span>
          </div>
        </div>
      </div>

      {/* ROTATION HISTORY TABLE */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Riwayat Rotasi Database</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Sheet Internal: <span className="font-mono text-indigo-600">__IMONEX_ROTATION_LOG</span>
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase">
            {rotationHistory.length} Riwayat Tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3">Unit (UL)</th>
                <th className="px-5 py-3">Database Sebelumnya</th>
                <th className="px-5 py-3">Database Baru</th>
                <th className="px-5 py-3 text-center">Kapasitas Sebelum</th>
                <th className="px-5 py-3">Eksekutor</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rotationHistory.length > 0 ? (
                rotationHistory.map((h, i) => (
                  <tr key={h.id || i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-[11px]">
                        {h.timestamp ? new Date(h.timestamp).toLocaleDateString('id-ID') : '-'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {h.timestamp ? new Date(h.timestamp).toLocaleTimeString('id-ID') : ''}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-800 uppercase">{h.namaUL || h.kodeUL || 'UL BUKITTINGGI'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-700 truncate max-w-[160px]">{h.previousDatabaseName || '-'}</div>
                      <div className="text-[9px] font-mono text-slate-400 truncate max-w-[140px]">{h.previousDatabaseId}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-black text-emerald-700 uppercase truncate max-w-[160px] flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-emerald-600" />
                        <span>{h.newDatabaseName || '-'}</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 truncate max-w-[140px]">{h.newDatabaseId}</div>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-800">
                      {h.capacityBefore ? `${h.capacityBefore.toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold uppercase">{h.triggeredBy || 'SUPER_ADMIN'}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        h.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-wider">Belum ada aktivitas rotasi database</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Semua transaksi saat ini berjalan pada database awal (Sequence 001)</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR MANUAL ROTATION */}
      {showRotateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <RotateCw className="w-6 h-6 animate-spin-subtle" />
            </div>

            <div className="text-center">
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Konfirmasi Rotasi Database Manual
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Tindakan ini akan membuat spreadsheet baru untuk <strong>{activeUnit?.namaUL || 'UL BUKITTINGGI'}</strong>, mengalihkan seluruh transaksi baru ke database tersebut, dan mengarsipkan database sebelumnya.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
              <p className="font-black flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Ketentuan Penting:</span>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-800/90 pl-1">
                <li>Data transaksi lama TIDAK dihapus dan tetap dapat dicari di sistem.</li>
                <li>Database baru dimulai dengan transaksi kosong.</li>
                <li>Rotasi HANYA berlaku untuk UL yang sedang dipilih.</li>
              </ul>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                Alasan Rotasi (Opsional):
              </label>
              <input
                type="text"
                placeholder="Contoh: Pemeliharaan rutin / Pergantian tahun kerja"
                value={rotateReason}
                onChange={(e) => setRotateReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#003865]/20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                Ketik <strong className="text-red-600">ROTASI</strong> untuk melanjutkan:
              </label>
              <input
                type="text"
                placeholder="ROTASI"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-red-500/20 text-center"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRotateModal(false);
                  setConfirmInput('');
                  setRotateReason('');
                }}
                disabled={isRotating}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTriggerRotation}
                disabled={isRotating || confirmInput.trim().toUpperCase() !== 'ROTASI'}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isRotating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Lakukan Rotasi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DatabaseManagementView;
