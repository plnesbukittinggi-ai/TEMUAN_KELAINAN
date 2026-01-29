
import React, { useState, useEffect, useMemo } from 'react';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan, Keterangan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
// Fix: Use lowercase casing for reportService import to match the file name 'reportService.ts' and avoid casing conflict errors in build environment.
import { ReportService } from '../services/reportService';
import { SpreadsheetService } from '../services/spreadsheetService';

interface AdminPageProps {
  data: TemuanData[];
  ulpList: ULP[];
  inspectors: Inspector[];
  feeders: Feeder[];
  pekerjaanList: Pekerjaan[];
  keteranganList: Keterangan[];
  onBack: () => void;
  onUpdateInspectors: (data: Inspector[]) => void;
  onUpdateUlp: (data: ULP[]) => void;
  onUpdateFeeders: (data: Feeder[]) => void;
}

const MONTHS = [
  { val: 1, label: 'Januari' }, { val: 2, label: 'Februari' }, { val: 3, label: 'Maret' },
  { val: 4, label: 'April' }, { val: 5, label: 'Mei' }, { val: 6, label: 'Juni' },
  { val: 7, label: 'Juli' }, { val: 8, label: 'Agustus' }, { val: 9, label: 'September' },
  { val: 10, label: 'Oktober' }, { val: 11, label: 'November' }, { val: 12, label: 'Desember' }
];

const AdminPage: React.FC<AdminPageProps> = ({ 
  data, ulpList, inspectors, feeders, pekerjaanList, keteranganList, onBack,
  onUpdateInspectors, onUpdateUlp, onUpdateFeeders
}) => {
  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD' | 'REKAP'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState<string>('Menganalisis performa data...');
  
  const [dashFilterMonth, setDashFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [dashFilterYear, setDashFilterYear] = useState<number>(new Date().getFullYear());
  const [dashFilterUlp, setDashFilterUlp] = useState<string>('');
  const [dashFilterPekerjaan, setDashFilterPekerjaan] = useState<string>('');

  const [rekapStartDate, setRekapStartDate] = useState<string>('');
  const [rekapEndDate, setRekapEndDate] = useState<string>('');

  const [filterUlp, setFilterUlp] = useState<string>('');
  const [filterFeeder, setFilterFeeder] = useState<string>('');
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const [subTab, setSubTab] = useState<'INSPEKTOR' | 'ULP' | 'FEEDER'>('INSPEKTOR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ name: '', ulpId: '' });
  const [isSaving, setIsSaving] = useState(false);

  const formatDriveUrl = (url?: string) => {
    if (!url) return '';
    if (url.indexOf('data:image') === 0) return url;
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
  };
  
  const parseRobustDate = (dateStr: any): Date => {
    if (!dateStr) return new Date(0);
    if (dateStr instanceof Date) return dateStr;
    const s = String(dateStr).trim();
    const nativeDate = new Date(s);
    if (!isNaN(nativeDate.getTime())) return nativeDate;

    try {
      const clean = s.replace('pukul ', '').replace(/\./g, ':');
      const parts = clean.split(',');
      const dPart = parts[0].trim();
      const dParts = dPart.split(/[\/\-]/);
      if (dParts.length === 3) {
        const day = parseInt(dParts[0], 10);
        const month = parseInt(dParts[1], 10) - 1;
        const year = parseInt(dParts[2], 10);
        const tPart = parts[1] ? parts[1].trim() : null;
        if (tPart) {
          const tParts = tPart.split(':');
          return new Date(year, month, day, parseInt(tParts[0] || '0'), parseInt(tParts[1] || '0'), parseInt(tParts[2] || '0'));
        }
        return new Date(year, month, day);
      }
    } catch (e) { return new Date(0); }
    return new Date(0);
  };

  const dashboardData = useMemo(() => {
    return data.filter(d => {
      const dDate = parseRobustDate(d.tanggal);
      const matchMonth = dDate.getMonth() + 1 === dashFilterMonth;
      const matchYear = dDate.getFullYear() === dashFilterYear;
      const matchUlp = !dashFilterUlp || d.ulp === dashFilterUlp;
      const matchPek = !dashFilterPekerjaan || d.pekerjaan === dashFilterPekerjaan;
      return matchMonth && matchYear && matchUlp && matchPek;
    });
  }, [data, dashFilterMonth, dashFilterYear, dashFilterUlp, dashFilterPekerjaan]);

  const rekapData = useMemo(() => {
    const counts: Record<string, { inspektor: string, ulp: string, feeder: string, pekerjaan: string, total: number }> = {};
    data.forEach(item => {
      const dDate = parseRobustDate(item.tanggal);
      if (rekapStartDate) {
        const start = new Date(rekapStartDate);
        start.setHours(0,0,0,0);
        if (dDate < start) return;
      }
      if (rekapEndDate) {
        const end = new Date(rekapEndDate);
        end.setHours(23,59,59,999);
        if (dDate > end) return;
      }
      const inspectorArray = [item.inspektor1, item.inspektor2].filter(Boolean).sort();
      const combinedInspectors = inspectorArray.join(' & ');
      const key = `${combinedInspectors}|${item.ulp}|${item.feeder}|${item.pekerjaan}`;
      if (!counts[key]) {
        counts[key] = { inspektor: combinedInspectors || 'Tanpa Nama', ulp: item.ulp || '-', feeder: item.feeder || '-', pekerjaan: item.pekerjaan || '-', total: 0 };
      }
      counts[key].total++;
    });
    return Object.values(counts).sort((a, b) => a.inspektor.localeCompare(b.inspektor));
  }, [data, rekapStartDate, rekapEndDate]);

  useEffect(() => {
    if (tab === 'DASHBOARD' && dashboardData.length > 0) {
      getDashboardInsights(dashboardData).then(setAiInsight);
    } else if (tab === 'DASHBOARD') {
      setAiInsight("Tidak ada data temuan untuk periode yang dipilih.");
    }
  }, [tab, dashboardData]);

  const tierStats = useMemo(() => {
    const getStats = (name: string) => {
      const items = dashboardData.filter(d => d.pekerjaan === name);
      const total = items.length;
      const done = items.filter(d => d.status === 'SUDAH EKSEKUSI').length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { total, done, pct };
    };
    return [
      { label: 'JTM Tier 1', ...getStats('JTM Tier 1'), barColor: 'bg-white', bgColor: 'bg-blue-600', borderColor: 'border-blue-700', textColor: 'text-white', labelColor: 'text-blue-100' },
      { label: 'JTM Tier 1 & 2', ...getStats('JTM Tier 1 & 2'), barColor: 'bg-white', bgColor: 'bg-indigo-700', borderColor: 'border-indigo-800', textColor: 'text-white', labelColor: 'text-indigo-100' },
      { label: 'GARDU Tier 1', ...getStats('GARDU Tier 1'), barColor: 'bg-slate-900', bgColor: 'bg-amber-500', borderColor: 'border-amber-600', textColor: 'text-slate-900', labelColor: 'text-amber-900' },
      { label: 'GARDU Tier 1 & 2', ...getStats('GARDU Tier 1 & 2'), barColor: 'bg-slate-900', bgColor: 'bg-yellow-400', borderColor: 'border-yellow-500', textColor: 'text-slate-900', labelColor: 'text-yellow-900' }
    ];
  }, [dashboardData]);

  const topTenFeeders = useMemo(() => {
    const counts: Record<string, { name: string, total: number, done: number }> = {};
    dashboardData.forEach(item => {
      const name = item.feeder || 'Tanpa Feeder';
      if (!counts[name]) counts[name] = { name, total: 0, done: 0 };
      counts[name].total++;
      if (item.status === 'SUDAH EKSEKUSI') counts[name].done++;
    });
    // Sort primarily by highest percentage (done / total), then by total volume as a tie-breaker
    return Object.values(counts).sort((a, b) => {
      const pctA = a.total > 0 ? a.done / a.total : 0;
      const pctB = b.total > 0 ? b.done / b.total : 0;
      if (pctB !== pctA) return pctB - pctA;
      return b.total - a.total; // Tie-breaker by total volume
    }).slice(0, 10);
  }, [dashboardData]);

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter(item => {
      const matchUlp = !filterUlp || item.ulp === filterUlp;
      const matchFeeder = !filterFeeder || item.feeder === filterFeeder;
      const matchPekerjaan = !filterPekerjaan || item.pekerjaan === filterPekerjaan;
      const itemDate = parseRobustDate(item.tanggal);
      let matchDate = true;
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0,0,0,0);
        if (itemDate < start) matchDate = false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23,59,59,999);
        if (itemDate > end) matchDate = false;
      }
      return matchUlp && matchFeeder && matchPekerjaan && matchDate;
    });
    return filtered.sort((a, b) => parseRobustDate(b.tanggal).getTime() - parseRobustDate(a.tanggal).getTime());
  }, [data, filterUlp, filterFeeder, filterPekerjaan, filterStartDate, filterEndDate]);

  const handleDownloadExcel = async () => {
    if (filteredAndSortedData.length === 0) {
      alert("Tidak ada data untuk diunduh sesuai filter terpilih.");
      return;
    }
    setIsExporting(true);
    try {
      const sortedForExport = [...filteredAndSortedData].sort((a, b) => parseRobustDate(a.tanggal).getTime() - parseRobustDate(b.tanggal).getTime());
      const selectedMonthLabel = MONTHS.find(m => m.val === dashFilterMonth)?.label || '';
      const displayMonth = filterStartDate && filterEndDate ? `${filterStartDate} s/d ${filterEndDate}` : `${selectedMonthLabel} ${dashFilterYear}`.toUpperCase();
      const filters = { ulp: filterUlp || 'SEMUA UNIT', feeder: filterFeeder || 'SEMUA FEEDER', pekerjaan: filterPekerjaan || 'SEMUA PEKERJAAN', bulan: displayMonth, inspektor1: sortedForExport[0]?.inspektor1 || '-', inspektor2: sortedForExport[0]?.inspektor2 || '-' };
      await ReportService.downloadExcel(sortedForExport, filters);
    } catch (error) {
      alert("Gagal mengunduh file Excel.");
    } finally { setIsExporting(false); }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const resetDataFilters = () => {
    setFilterUlp('');
    setFilterFeeder('');
    setFilterPekerjaan('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleOpenAdd = () => {
    setModalMode('ADD');
    setEditingItem(null);
    setFormData({ name: '', ulpId: ulpList[0]?.id || '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setModalMode('EDIT');
    setEditingItem(item);
    setFormData({ name: item.name, ulpId: item.ulpId || '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Yakin ingin menghapus "${item.name}"?`)) return;
    let updatedList: any[] = [];
    let sheetName: 'Inspectors' | 'ULP' | 'Feeders';
    if (subTab === 'INSPEKTOR') {
      updatedList = inspectors.filter(i => i.id !== item.id);
      sheetName = 'Inspectors';
    } else if (subTab === 'ULP') {
      updatedList = ulpList.filter(u => u.id !== item.id);
      sheetName = 'ULP';
    } else {
      updatedList = feeders.filter(f => f.id !== item.id);
      sheetName = 'Feeders';
    }
    setIsSaving(true);
    try {
      await SpreadsheetService.updateMasterData(sheetName, updatedList);
      if (subTab === 'INSPEKTOR') onUpdateInspectors(updatedList);
      else if (subTab === 'ULP') onUpdateUlp(updatedList);
      else onUpdateFeeders(updatedList);
      alert('Data berhasil dihapus.');
    } catch (e) { alert('Gagal menghapus data di server.'); }
    finally { setIsSaving(false); }
  };

  const handleSaveMaster = async () => {
    if (!formData.name.trim()) return alert('Nama wajib diisi!');
    if (subTab === 'FEEDER' && !formData.ulpId) return alert('Pilih ULP untuk feeder!');
    setIsSaving(true);
    try {
      let updatedList: any[] = [];
      let sheetName: 'Inspectors' | 'ULP' | 'Feeders';
      if (subTab === 'INSPEKTOR') {
        sheetName = 'Inspectors';
        if (modalMode === 'ADD') {
          updatedList = [...inspectors, { id: `INS-${Date.now()}`, name: formData.name }];
        } else {
          updatedList = inspectors.map(i => i.id === editingItem.id ? { ...i, name: formData.name } : i);
        }
      } else if (subTab === 'ULP') {
        sheetName = 'ULP';
        if (modalMode === 'ADD') {
          updatedList = [...ulpList, { id: `ULP-${Date.now()}`, name: formData.name }];
        } else {
          updatedList = ulpList.map(u => u.id === editingItem.id ? { ...u, name: formData.name } : u);
        }
      } else {
        sheetName = 'Feeders';
        if (modalMode === 'ADD') {
          updatedList = [...feeders, { id: `F-${Date.now()}`, name: formData.name, ulpId: formData.ulpId }];
        } else {
          updatedList = feeders.map(f => f.id === editingItem.id ? { ...f, name: formData.name, ulpId: formData.ulpId } : f);
        }
      }
      const res = await SpreadsheetService.updateMasterData(sheetName, updatedList);
      if (res.success) {
        if (subTab === 'INSPEKTOR') onUpdateInspectors(updatedList);
        else if (subTab === 'ULP') onUpdateUlp(updatedList);
        else onUpdateFeeders(updatedList);
        setIsModalOpen(false);
        alert(`Berhasil ${modalMode === 'ADD' ? 'menambah' : 'mengubah'} data di Spreadsheet.`);
      } else { alert('Gagal menyimpan ke Spreadsheet.'); }
    } catch (e) { alert('Terjadi kesalahan sinkronisasi.'); }
    finally { setIsSaving(false); }
  };

  const currentFilteredFeedersInData = useMemo(() => {
    const relevantData = filterUlp ? data.filter(d => d.ulp === filterUlp) : data;
    const unique = Array.from(new Set(relevantData.map(d => d.feeder).filter(Boolean))).sort();
    return unique;
  }, [data, filterUlp]);

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all group">
          <span className="text-sm font-black text-slate-900 group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Logout</span>
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Panel Admin</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kontrol & Rekapitulasi Analitik</p>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl mb-8 shadow-sm overflow-x-auto gap-1">
        {['DASHBOARD', 'REKAP', 'DATA', 'KELOLA'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-3 px-2 text-[8px] font-black rounded-xl transition-all tracking-widest uppercase whitespace-nowrap ${tab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {t === 'REKAP' ? 'REKAP INSPEKTOR' : t}
          </button>
        ))}
      </div>

      {tab === 'DASHBOARD' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Saring Dashboard</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterMonth} onChange={(e) => setDashFilterMonth(Number(e.target.value))}>
                {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterYear} onChange={(e) => setDashFilterYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={dashFilterUlp} onChange={(e) => setDashFilterUlp(e.target.value)}>
                <option value="">Semua ULP</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={dashFilterPekerjaan} onChange={(e) => setDashFilterPekerjaan(e.target.value)}>
                <option value="">Semua Jenis Pekerjaan</option>
                {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">💡 AI Insights</p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{aiInsight}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {tierStats.map(s => (
              <div key={s.label} className={`${s.bgColor} border-2 ${s.borderColor} p-5 rounded-[2rem] shadow-xl transition-all hover:scale-[1.02]`}>
                 <div className="flex justify-between items-start mb-4">
                    <div className="text-left">
                       <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${s.labelColor}`}>Total Temuan</p>
                       <p className={`text-2xl font-black leading-none ${s.textColor}`}>{s.total}</p>
                    </div>
                    <div className="text-right">
                       <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${s.labelColor}`}>Eksekusi</p>
                       <p className={`text-2xl font-black leading-none ${s.textColor}`}>{s.done}</p>
                    </div>
                 </div>
                 <div className="w-full bg-black/10 h-2 rounded-full overflow-hidden mb-3">
                    <div className={`${s.barColor} h-full transition-all duration-1000`} style={{ width: `${s.pct}%` }}></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <p className={`text-[9px] font-black uppercase tracking-tight ${s.textColor}`}>{s.label}</p>
                    <p className={`text-[9px] font-black opacity-60 ${s.textColor}`}>{s.pct}%</p>
                 </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-6 rounded-[2.5rem] border-2 border-yellow-500 shadow-xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Top 10 Feeder (Berdasarkan Persentase)</h3>
                <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Selesai / Total</span>
             </div>
             <div className="space-y-4">
                {topTenFeeders.map((f, i) => {
                  const isTop3 = i < 3;
                  const pctValue = f.total > 0 ? Math.round((f.done / f.total) * 100) : 0;
                  return (
                    <div key={f.name} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${isTop3 ? 'bg-white/5 border border-yellow-500/30' : ''}`}>
                       <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black ${isTop3 ? 'bg-yellow-500 text-slate-900' : 'text-slate-400'}`}>{i+1}</span>
                       <div className="flex-1">
                          <div className="flex justify-between items-center mb-1.5">
                             <div className="flex flex-col">
                                <p className="text-[10px] font-black text-white uppercase">{f.name}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{pctValue}% Selesai</p>
                             </div>
                             <p className="text-[9px] font-black text-yellow-500 uppercase tracking-tighter">{f.done} / {f.total}</p>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden border border-white/5">
                             <div className="bg-yellow-500 h-full transition-all duration-700" style={{ width: `${pctValue}%` }}></div>
                          </div>
                       </div>
                    </div>
                  );
                })}
                {topTenFeeders.length === 0 && (
                   <p className="text-center py-4 text-[10px] font-bold text-slate-500 uppercase italic">Tidak ada data untuk periode ini</p>
                )}
             </div>
          </div>
        </div>
      )}

      {tab === 'REKAP' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Filter Rentang Waktu</p>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={rekapStartDate} onChange={(e) => setRekapStartDate(e.target.value)} />
              <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={rekapEndDate} onChange={(e) => setRekapEndDate(e.target.value)} />
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Inspektor</th>
                      <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {rekapData.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                         <td className="p-4">
                            <p className="text-[10px] font-black text-slate-900 uppercase">{r.inspektor}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{r.pekerjaan} • {r.feeder}</p>
                         </td>
                         <td className="p-4 text-center"><span className="inline-block bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black">{r.total}</span></td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {tab === 'DATA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center mb-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saring Data Laporan</p>
              {(filterUlp || filterFeeder || filterPekerjaan || filterStartDate || filterEndDate) && (<button onClick={resetDataFilters} className="text-[9px] font-black text-red-500 uppercase tracking-widest">Reset</button>)}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={filterUlp} onChange={(e) => setFilterUlp(e.target.value)}>
                   <option value="">Semua ULP</option>
                   {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={filterFeeder} onChange={(e) => setFilterFeeder(e.target.value)}>
                   <option value="">Semua Feeder</option>
                   {currentFilteredFeedersInData.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <select className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={filterPekerjaan} onChange={(e) => setFilterPekerjaan(e.target.value)}>
                 <option value="">Semua Jenis Pekerjaan</option>
                 {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><p className="text-[8px] font-black text-slate-300 uppercase ml-1">Tgl Mulai</p>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                </div>
                <div className="space-y-1"><p className="text-[8px] font-black text-slate-300 uppercase ml-1">Tgl Akhir</p>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                </div>
              </div>
            </div>
            <button onClick={handleDownloadExcel} disabled={isExporting} className={`w-full py-4 rounded-2xl shadow-lg font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 ${isExporting ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white active:scale-95'}`}>{isExporting ? '⏳ MENYIAPKAN FILE...' : '📗 DOWNLOAD LAPORAN EXCEL'}</button>
          </div>
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview {filteredAndSortedData.length} Data Terbaru</p></div>
             {filteredAndSortedData.slice(0, 50).map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
                   <div className="flex flex-col items-center flex-shrink-0"><div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden border border-slate-100"><img src={formatDriveUrl(item.fotoTemuan)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" /></div><p className="text-[7px] font-black uppercase text-slate-400 mt-1">Temuan</p></div>
                   {item.status === 'SUDAH EKSEKUSI' && item.fotoEksekusi && (<div className="flex flex-col items-center flex-shrink-0"><div className="w-14 h-14 bg-emerald-50 rounded-xl overflow-hidden border border-emerald-100"><img src={formatDriveUrl(item.fotoEksekusi)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" /></div><p className="text-[7px] font-black uppercase text-emerald-500 mt-1">Eksekusi</p></div>)}
                   <div className="flex-1 min-w-0"><div className="flex justify-between items-start"><p className="text-[10px] font-black text-slate-900 truncate uppercase">{item.noTiang} • {item.feeder}</p><span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase ${item.status === 'SUDAH EKSEKUSI' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>{item.status.split(' ')[0]}</span></div><p className="text-[9px] font-bold text-red-500 mt-0.5 truncate uppercase">{item.keterangan}</p><p className="text-[8px] text-slate-400 mt-1 font-bold uppercase tracking-widest">{parseRobustDate(item.tanggal).toLocaleDateString('id-ID')} | {item.ulp}</p></div>
                </div>
             ))}
          </div>
        </div>
      )}

      {tab === 'KELOLA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
             {(['INSPEKTOR', 'ULP', 'FEEDER'] as const).map(s => (<button key={s} onClick={() => setSubTab(s)} className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${subTab === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>))}
          </div>
          <div className="flex justify-between items-center px-1"><h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Daftar {subTab}</h3><button onClick={handleOpenAdd} disabled={isSaving} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50">{isSaving ? '⏳' : '+ Tambah'}</button></div>
          <div className="grid grid-cols-1 gap-3">
             {subTab === 'INSPEKTOR' && inspectors.map(i => (<div key={i.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all"><div><p className="text-[11px] font-black text-slate-900 uppercase">{i.name}</p><p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {i.id}</p></div><div className="flex gap-2"><button onClick={() => handleOpenEdit(i)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">✏️</button><button onClick={() => handleDelete(i)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">🗑️</button></div></div>))}
             {subTab === 'ULP' && ulpList.map(u => (<div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all"><div><p className="text-[11px] font-black text-slate-900 uppercase">{u.name}</p><p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Unit Pelaksana</p></div><div className="flex gap-2"><button onClick={() => handleOpenEdit(u)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">✏️</button><button onClick={() => handleDelete(u)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">🗑️</button></div></div>))}
             {subTab === 'FEEDER' && feeders.map(f => (<div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all"><div><p className="text-[11px] font-black text-slate-900 uppercase">{f.name}</p><p className="text-[8px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">{ulpList.find(u => u.id === f.ulpId)?.name || 'Unit Unknown'}</p></div><div className="flex gap-2"><button onClick={() => handleOpenEdit(f)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">✏️</button><button onClick={() => handleDelete(f)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">🗑️</button></div></div>))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up"><div className="p-8"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{modalMode === 'ADD' ? 'Tambah' : 'Edit'} {subTab}</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-2 hover:text-slate-600">✕</button></div>
                 <div className="space-y-4"><div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Nama {subTab} *</label><input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all uppercase" placeholder={`Masukkan nama ${subTab.toLowerCase()}`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                    {subTab === 'FEEDER' && (<div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Tautkan ke ULP *</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" value={formData.ulpId} onChange={(e) => setFormData({ ...formData, ulpId: e.target.value })}><option value="">Pilih Unit</option>{ulpList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>)}
                 </div>
                 <div className="mt-8 flex gap-3"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button><button onClick={handleSaveMaster} disabled={isSaving} className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 px-8">{isSaving ? '⏳' : 'Simpan'}</button></div>
              </div></div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
