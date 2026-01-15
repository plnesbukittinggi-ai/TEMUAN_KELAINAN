
import React, { useState, useEffect, useMemo } from 'react';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
// Fix casing mismatch: modified import casing to match 'services/ReportService.ts' to resolve the casing conflict reported by TypeScript.
import { ReportService } from '../services/ReportService';

interface AdminPageProps {
  data: TemuanData[];
  ulpList: ULP[];
  inspectors: Inspector[];
  feeders: Feeder[];
  pekerjaanList: Pekerjaan[];
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
  data, ulpList, inspectors, feeders, pekerjaanList, onBack,
}) => {
  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState<string>('Menganalisis performa data...');
  
  // States for Dashboard Global Filters (Default current month/year)
  const [dashFilterMonth, setDashFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [dashFilterYear, setDashFilterYear] = useState<number>(new Date().getFullYear());
  const [dashFilterUlp, setDashFilterUlp] = useState<string>('');
  const [dashFilterPekerjaan, setDashFilterPekerjaan] = useState<string>('');

  // States for Data Table Filters
  const [filterFeeder, setFilterFeeder] = useState<string>('');
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Helper to parse "DD/MM/YYYY, HH.mm.ss"
  const parseIndoDate = (dateStr: string) => {
    try {
      if (!dateStr) return new Date(0);
      const datePart = dateStr.split(',')[0].trim();
      const [day, month, year] = datePart.split('/').map(Number);
      return new Date(year, month - 1, day);
    } catch (e) {
      return new Date(0);
    }
  };

  // Filtered data specifically for Dashboard Analytics
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

  // Use Gemini AI for automated performance insights
  useEffect(() => {
    if (tab === 'DASHBOARD' && dashboardData.length > 0) {
      getDashboardInsights(dashboardData).then(setAiInsight);
    } else if (tab === 'DASHBOARD') {
      setAiInsight("Tidak ada data temuan untuk periode yang dipilih.");
    }
  }, [tab, dashboardData]);

  // --- Dashboard Calculations ---
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

  const interactiveStats = useMemo(() => {
    const total = dashboardData.length;
    const done = dashboardData.filter(d => d.status === 'SUDAH EKSEKUSI').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress };
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

  // --- Data Table Filters ---
  const filteredData = data.filter(item => {
    const matchFeeder = !filterFeeder || item.feeder === filterFeeder;
    const matchPekerjaan = !filterPekerjaan || item.pekerjaan === filterPekerjaan;
    
    let matchDate = true;
    const itemDate = parseIndoDate(item.tanggal);
    
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

  const handleDownloadExcel = async () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data untuk diunduh sesuai filter terpilih.");
      return;
    }
    
    setIsExporting(true);
    try {
      const periodeStr = filterStartDate && filterEndDate 
        ? `${new Date(filterStartDate).toLocaleDateString('id-ID')} - ${new Date(filterEndDate).toLocaleDateString('id-ID')}`
        : MONTHS.find(m => m.val === dashFilterMonth)?.label + ' ' + dashFilterYear;

      const filters = {
        feeder: filterFeeder || 'SEMUA FEEDER',
        pekerjaan: filterPekerjaan || 'SEMUA PEKERJAAN',
        bulan: periodeStr,
        inspektor1: filteredData[0]?.inspektor1 || '-',
        inspektor2: filteredData[0]?.inspektor2 || '-'
      };
      await ReportService.downloadExcel(filteredData, filters);
    } catch (error) {
      console.error("Export Error:", error);
      alert("Gagal mengunduh file Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">←</button>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Panel Admin</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kontrol & Rekapitulasi Analitik</p>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl mb-8 shadow-sm overflow-x-auto">
        {['DASHBOARD', 'DATA', 'KELOLA'].map(t => (
          <button 
            key={t} onClick={() => setTab(t as any)}
            className={`flex-1 py-3 px-4 text-[9px] font-black rounded-xl transition-all tracking-widest uppercase whitespace-nowrap ${tab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'DASHBOARD' && (
        <div className="space-y-6 animate-fade-in">
          {/* Global Dashboard Filters */}
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Periode Analitik</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <select 
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                value={dashFilterMonth} onChange={(e) => setDashFilterMonth(Number(e.target.value))}
              >
                {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <select 
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
                value={dashFilterYear} onChange={(e) => setDashFilterYear(Number(e.target.value))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select 
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                value={dashFilterUlp} onChange={(e) => setDashFilterUlp(e.target.value)}
              >
                <option value="">-- Semua Unit --</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <select 
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                value={dashFilterPekerjaan} onChange={(e) => setDashFilterPekerjaan(e.target.value)}
              >
                <option value="">-- Semua Pekerjaan --</option>
                {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* AI Intelligence Analysis */}
          <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">🤖</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">AI Intelligence Analysis</p>
                </div>
                <p className="text-sm font-semibold leading-relaxed italic opacity-90">"{aiInsight}"</p>
             </div>
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tierStats.map((tier, idx) => (
              <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{tier.label}</p>
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-baseline gap-1">
                    <h4 className="text-xl font-black text-slate-900">{tier.total}</h4>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">TITIK</span>
                  </div>
                  <span className="text-[10px] font-black text-indigo-600">{tier.pct}%</span>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase mb-2">
                  <span>Temuan: {tier.total}</span>
                  <span>Eksekusi: {tier.done}</span>
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden bg-slate-100`}>
                  <div className={`h-full ${tier.color}`} style={{ width: `${tier.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">🏆 Top 10 Feeder Temuan</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Periode Terpilih</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-400">{interactiveStats.progress}%</span>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Eksekusi</p>
                </div>
             </div>
             <div className="space-y-3">
                {topTenFeeders.length > 0 ? topTenFeeders.map((feeder, idx) => (
                   <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                      <div className="flex-1">
                         <div className="flex justify-between items-center mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-tight">{feeder.name}</p>
                            <p className="text-[9px] font-black text-indigo-400">{feeder.done}/{feeder.total}</p>
                         </div>
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(feeder.done / feeder.total) * 100}%` }}></div>
                         </div>
                      </div>
                   </div>
                )) : <p className="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">Tidak ada data untuk periode ini</p>}
             </div>
          </div>
        </div>
      )}

      {tab === 'DATA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Penyaringan & Ekspor</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterFeeder} onChange={(e) => setFilterFeeder(e.target.value)}>
                <option value="">-- Semua Feeder --</option>
                {Array.from(new Set(data.map(d => d.feeder))).sort().map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterPekerjaan} onChange={(e) => setFilterPekerjaan(e.target.value)}>
                <option value="">-- Semua Jenis Pekerjaan --</option>
                {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Dari Tanggal</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Sampai Tanggal</label>
                  <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
               </div>
            </div>
            <button onClick={handleDownloadExcel} disabled={isExporting} className="w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-emerald-600 text-white shadow-lg active:scale-95 transition-all">
              {isExporting ? 'Mengekspor...' : '📥 Download Laporan (.XLSX)'}
            </button>
            {(filterFeeder || filterPekerjaan || filterStartDate || filterEndDate) && (
              <button onClick={() => { setFilterFeeder(''); setFilterPekerjaan(''); setFilterStartDate(''); setFilterEndDate(''); }} className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Bersihkan Filter</button>
            )}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-400 text-[9px] uppercase font-black tracking-widest">
                    <th className="p-4">Pekerjaan</th>
                    <th className="p-4">Tiang</th>
                    <th className="p-4">Feeder</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.length > 0 ? filteredData.slice(0, 50).map((item) => (
                    <tr key={item.id} className="text-[10px] font-bold text-slate-700">
                      <td className="p-4 whitespace-nowrap">{item.pekerjaan}</td>
                      <td className="p-4 uppercase">{item.noTiang}</td>
                      <td className="p-4 truncate max-w-[80px]">{item.feeder}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${item.status === 'SUDAH EKSEKUSI' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-700'}`}>
                          {item.status.split(' ')[0]}
                        </span>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={4} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Data Kosong</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
