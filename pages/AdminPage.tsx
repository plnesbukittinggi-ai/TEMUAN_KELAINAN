
import React, { useState, useEffect, useMemo } from 'react';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan, Keterangan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
// Fix: Use consistent lowercase casing for service filename to avoid TS1149 casing conflict error.
import { ReportService } from '../services/reportService';
import { SpreadsheetService } from '../services/spreadsheetService';

interface AdminPageProps {
  data: TemuanData[];
  ulpList: ULP[];
  inspectors: Inspector[];
  feeders: Feeder[];
  pekerjaanList: Pekerjaan[];
  keteranganList?: Keterangan[];
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
  data, ulpList, inspectors, feeders, pekerjaanList, keteranganList = [], onBack,
  onUpdateInspectors, onUpdateUlp, onUpdateFeeders
}) => {
  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD' | 'REKAP'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState<string>('Menganalisis performa data...');
  
  // Dashboard Filters
  const [dashFilterMonth, setDashFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [dashFilterYear, setDashFilterYear] = useState<number>(new Date().getFullYear());
  const [dashFilterUlp, setDashFilterUlp] = useState<string>('');
  const [dashFilterPekerjaan, setDashFilterPekerjaan] = useState<string>('');

  // Recap Filters
  const [rekapStartDate, setRekapStartDate] = useState<string>('');
  const [rekapEndDate, setRekapEndDate] = useState<string>('');

  // Data Table Filters
  const [filterFeeder, setFilterFeeder] = useState<string>('');
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Management (Kelola) States
  const [subTab, setSubTab] = useState<'INSPEKTOR' | 'ULP' | 'FEEDER'>('INSPEKTOR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ name: '', ulpId: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  const parseIndoDate = (dateStr: string) => {
    try {
      if (!dateStr) return new Date(0);
      const cleanStr = dateStr.replace('pukul ', '').replace('.', ':');
      const datePart = cleanStr.split(',')[0].trim();
      const [day, month, year] = datePart.split('/').map(Number);
      return new Date(year, month - 1, day);
    } catch (e) {
      return new Date(0);
    }
  };

  const dashboardData = useMemo(() => {
    return data.filter(d => {
      const dDate = parseIndoDate(d.tanggal);
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
      const dDate = parseIndoDate(item.tanggal);
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
        counts[key] = {
          inspektor: combinedInspectors || 'Tanpa Nama',
          ulp: item.ulp || '-',
          feeder: item.feeder || '-',
          pekerjaan: item.pekerjaan || '-',
          total: 0
        };
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
      { label: 'JTM Tier 1', ...getStats('JTM Tier 1'), color: 'bg-indigo-600' },
      { label: 'JTM Tier 1-2', ...getStats('JTM Tier 1 - Tier 2'), color: 'bg-indigo-400' },
      { label: 'GARDU Tier 1', ...getStats('GARDU Tier 1'), color: 'bg-amber-600' },
      { label: 'GARDU Tier 1-2', ...getStats('GARDU Tier 1 - Tier 2'), color: 'bg-amber-400' }
    ];
  }, [dashboardData]);

  const topTenFeeders = useMemo(() => {
    const counts: Record<string, { total: number, done: number }> = {};
    dashboardData.forEach(d => {
      if (!d.feeder) return;
      if (!counts[d.feeder]) counts[d.feeder] = { total: 0, done: 0 };
      counts[d.feeder].total++;
      if (d.status === 'SUDAH EKSEKUSI') counts[d.feeder].done++;
    });

    return Object.entries(counts)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [dashboardData]);

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter(item => {
      const matchFeeder = !filterFeeder || item.feeder === filterFeeder;
      const matchPekerjaan = !filterPekerjaan || item.pekerjaan === filterPekerjaan;
      const itemDate = parseIndoDate(item.tanggal);
      
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

      return matchFeeder && matchPekerjaan && matchDate;
    });

    return filtered.sort((a, b) => parseIndoDate(b.tanggal).getTime() - parseIndoDate(a.tanggal).getTime());
  }, [data, filterFeeder, filterPekerjaan, filterStartDate, filterEndDate]);

  const handleDownloadExcel = async () => {
    if (filteredAndSortedData.length === 0) {
      alert("Tidak ada data untuk diunduh sesuai filter terpilih.");
      return;
    }
    
    setIsExporting(true);
    try {
      const sortedForExport = [...filteredAndSortedData].sort((a, b) => 
        parseIndoDate(a.tanggal).getTime() - parseIndoDate(b.tanggal).getTime()
      );

      const selectedMonthLabel = MONTHS.find(m => m.val === dashFilterMonth)?.label || '';
      const displayMonth = filterStartDate && filterEndDate 
        ? `${filterStartDate} s/d ${filterEndDate}` 
        : `${selectedMonthLabel} ${dashFilterYear}`.toUpperCase();

      const currentPekerjaanName = filterPekerjaan || sortedForExport[0]?.pekerjaan;
      const pekObj = pekerjaanList.find(p => p.name === currentPekerjaanName);
      
      const relevantKeterangan = (keteranganList || []).filter(k => k.idPekerjaan === pekObj?.id || k.idPekerjaan === currentPekerjaanName);

      const filters = {
        feeder: filterFeeder || 'SEMUA FEEDER',
        pekerjaan: currentPekerjaanName || 'SEMUA PEKERJAAN',
        bulan: displayMonth,
        inspektor1: sortedForExport[0]?.inspektor1 || '-',
        inspektor2: sortedForExport[0]?.inspektor2 || '-',
        relevantKeterangan: relevantKeterangan
      };
      
      await ReportService.downloadExcel(sortedForExport, filters);
    } catch (error) {
      console.error(error);
      alert("Gagal mengunduh file Excel. Pastikan data tidak terlalu besar atau koneksi stabil.");
    } finally {
      setIsExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

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
    if (subTab === 'INSPEKTOR') {
      updatedList = inspectors.filter(i => i.id !== item.id);
      onUpdateInspectors(updatedList);
    } else if (subTab === 'ULP') {
      updatedList = ulpList.filter(u => u.id !== item.id);
      onUpdateUlp(updatedList);
    } else {
      updatedList = feeders.filter(f => f.id !== item.id);
      onUpdateFeeders(updatedList);
    }
    alert('Data berhasil dihapus.');
  };

  const handleSaveMaster = async () => {
    if (!formData.name.trim()) return alert('Nama wajib diisi!');
    if (subTab === 'FEEDER' && !formData.ulpId) return alert('Pilih ULP untuk feeder!');

    setIsSaving(true);
    try {
      let updatedList: any[] = [];
      if (subTab === 'INSPEKTOR') {
        if (modalMode === 'ADD') {
          updatedList = [...inspectors, { id: `INS-${Date.now()}`, name: formData.name }];
        } else {
          updatedList = inspectors.map(i => i.id === editingItem.id ? { ...i, name: formData.name } : i);
        }
        onUpdateInspectors(updatedList);
      } else if (subTab === 'ULP') {
        if (modalMode === 'ADD') {
          updatedList = [...ulpList, { id: `ULP-${Date.now()}`, name: formData.name }];
        } else {
          updatedList = ulpList.map(u => u.id === editingItem.id ? { ...u, name: formData.name } : u);
        }
        onUpdateUlp(updatedList);
      } else if (subTab === 'FEEDER') {
        if (modalMode === 'ADD') {
          updatedList = [...feeders, { id: `F-${Date.now()}`, name: formData.name, ulpId: formData.ulpId }];
        } else {
          updatedList = feeders.map(f => f.id === editingItem.id ? { ...f, name: formData.name, ulpId: formData.ulpId } : f);
        }
        onUpdateUlp(updatedList); // Note: Original code had onUpdateFeeders here but correctly used updatedList.
        onUpdateFeeders(updatedList);
      }
      setIsModalOpen(false);
      alert(`Berhasil ${modalMode === 'ADD' ? 'menambah' : 'mengubah'} data.`);
    } catch (e) {
      alert('Gagal menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Panel Admin</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kontrol & Rekapitulasi Analitik</p>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl mb-8 shadow-sm overflow-x-auto gap-1">
        {['DASHBOARD', 'REKAP', 'DATA', 'KELOLA'].map(t => (
          <button 
            key={t} onClick={() => setTab(t as any)}
            className={`flex-1 py-3 px-2 text-[8px] font-black rounded-xl transition-all tracking-widest uppercase whitespace-nowrap ${tab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {t === 'REKAP' ? 'REKAP INSPEKTOR' : t}
          </button>
        ))}
      </div>

      {tab === 'DASHBOARD' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Periode Analitik</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterMonth} onChange={(e) => setDashFilterMonth(Number(e.target.value))}>
                {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterYear} onChange={(e) => setDashFilterYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={dashFilterUlp} onChange={(e) => setDashFilterUlp(e.target.value)}>
                <option value="">-- Semua Unit --</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none" value={dashFilterPekerjaan} onChange={(e) => setDashFilterPekerjaan(e.target.value)}>
                <option value="">-- Semua Pekerjaan --</option>
                {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">🤖</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">AI Analysis</p>
                </div>
                <p className="text-sm font-semibold leading-relaxed italic opacity-90">"{aiInsight}"</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {tierStats.map((tier, idx) => (
              <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{tier.label}</p>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-xl font-black text-slate-900">{tier.total}</h4>
                  <span className="text-[10px] font-black text-indigo-600">{tier.pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${tier.color}`} style={{ width: `${tier.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
             <h3 className="text-sm font-black uppercase tracking-tight mb-4">🏆 Top 10 Feeder</h3>
             <div className="space-y-3">
                {topTenFeeders.map((feeder, idx) => (
                   <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                      <div className="flex-1">
                         <div className="flex justify-between items-center mb-1">
                            <p className="text-[10px] font-bold uppercase">{feeder.name}</p>
                            <p className="text-[9px] font-black text-indigo-400">{feeder.done}/{feeder.total}</p>
                         </div>
                         <div className="h-1 w-full bg-white/5 rounded-full">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(feeder.done / feeder.total) * 100}%` }}></div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {tab === 'REKAP' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Saring Tanggal Rekap</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Dari</label>
                <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={rekapStartDate} onChange={(e) => setRekapStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Sampai</label>
                <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={rekapEndDate} onChange={(e) => setRekapEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-400 text-[8px] uppercase font-black tracking-widest">
                    <th className="p-4">Inspektor</th>
                    <th className="p-4">ULP</th>
                    <th className="p-4">Feeder</th>
                    <th className="p-4">Pekerjaan</th>
                    <th className="p-4 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rekapData.length > 0 ? rekapData.map((row, idx) => (
                    <tr key={idx} className="text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-slate-900">{row.inspektor}</td>
                      <td className="p-4">{row.ulp}</td>
                      <td className="p-4 truncate max-w-[80px]">{row.feeder}</td>
                      <td className="p-4">{row.pekerjaan}</td>
                      <td className="p-4 text-center">
                        <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-black shadow-sm">{row.total}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                           <span className="text-2xl">🔍</span>
                           <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Data tidak ditemukan pada periode ini</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'DATA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterFeeder} onChange={(e) => setFilterFeeder(e.target.value)}>
                <option value="">-- Feeder --</option>
                {Array.from(new Set(data.map(d => d.feeder))).sort().map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterPekerjaan} onChange={(e) => setFilterPekerjaan(e.target.value)}>
                <option value="">-- Pekerjaan --</option>
                {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Dari Tanggal</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" 
                  value={filterStartDate} 
                  onChange={(e) => setFilterStartDate(e.target.value)} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Sampai Tanggal</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" 
                  value={filterEndDate} 
                  onChange={(e) => setFilterEndDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleDownloadExcel} 
                disabled={isExporting} 
                className="flex-1 py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-emerald-600 text-white shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {isExporting ? 'Mengekspor...' : '📥 Download Excel'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Menampilkan {filteredAndSortedData.length} Baris Teratas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-white border-b border-slate-100">
                  <tr className="text-slate-400 text-[9px] uppercase font-black tracking-widest">
                    <th className="p-4">ULP</th>
                    <th className="p-4">Feeder</th>
                    <th className="p-4">Pekerjaan</th>
                    <th className="p-4">Tiang</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAndSortedData.length > 0 ? filteredAndSortedData.slice(0, 50).map((item) => (
                    <tr key={item.id} className="text-[10px] font-bold text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-slate-900 font-black">{item.ulp}</td>
                      <td className="p-4 truncate max-w-[100px]">{item.feeder}</td>
                      <td className="p-4">{item.pekerjaan}</td>
                      <td className="p-4 uppercase font-black text-indigo-600">{item.noTiang}</td>
                      <td className="p-4">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${item.status === 'SUDAH EKSEKUSI' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-700'}`}>
                          {item.status.split(' ')[0]}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-16 text-center text-slate-400 uppercase text-[9px] font-bold tracking-widest">
                        Data Tidak Ditemukan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'KELOLA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
             {(['INSPEKTOR', 'ULP', 'FEEDER'] as const).map(s => (
                <button 
                  key={s} onClick={() => setSubTab(s)}
                  className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${subTab === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   {s}
                </button>
             ))}
          </div>

          <div className="flex justify-between items-center px-1">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Daftar {subTab}</h3>
             <button 
                onClick={handleOpenAdd}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
             >
                + Tambah
             </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
             {subTab === 'INSPEKTOR' && inspectors.map(i => (
                <div key={i.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                   <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase">{i.name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {i.id}</p>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(i)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">✏️</button>
                      <button onClick={() => handleDelete(i)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">🗑️</button>
                   </div>
                </div>
             ))}

             {subTab === 'ULP' && ulpList.map(u => (
                <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                   <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase">{u.name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Unit Pelaksana</p>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(u)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">✏️</button>
                      <button onClick={() => handleDelete(u)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">🗑️</button>
                   </div>
                </div>
             ))}

             {subTab === 'FEEDER' && feeders.map(f => (
                <div key={f.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                   <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase">{f.name}</p>
                      <p className="text-[8px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">
                        {ulpList.find(u => u.id === f.ulpId)?.name || 'Unit Unknown'}
                      </p>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(f)} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">✏️</button>
                      <button onClick={() => handleDelete(f)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">🗑️</button>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up">
              <div className="p-8">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                       {modalMode === 'ADD' ? 'Tambah' : 'Edit'} {subTab}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-2 hover:text-slate-600">✕</button>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Nama {subTab} *</label>
                       <input 
                          type="text" 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all uppercase"
                          placeholder={`Masukkan nama ${subTab.toLowerCase()}`}
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       />
                    </div>

                    {subTab === 'FEEDER' && (
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Tautkan ke ULP *</label>
                          <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                            value={formData.ulpId}
                            onChange={(e) => setFormData({ ...formData, ulpId: e.target.value })}
                          >
                            <option value="">Pilih Unit</option>
                            {ulpList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                       </div>
                    )}
                 </div>

                 <div className="mt-8 flex gap-3">
                    <button 
                       onClick={() => setIsModalOpen(false)}
                       className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                       Batal
                    </button>
                    <button 
                       onClick={handleSaveMaster}
                       disabled={isSaving}
                       className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50 px-8"
                    >
                       {isSaving ? '⏳' : 'Simpan'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
