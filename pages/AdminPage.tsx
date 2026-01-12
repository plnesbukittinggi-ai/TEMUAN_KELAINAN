
import React, { useState, useEffect, useMemo } from 'react';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
// Import using lowercase filename to match project conventions and prevent casing conflicts
import { ReportService } from '../services/reportService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell, PieChart, Pie 
} from 'recharts';

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

const AdminPage: React.FC<AdminPageProps> = ({ 
  data, ulpList, inspectors, feeders, pekerjaanList, onBack,
}) => {
  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState<string>('Menganalisis performa data...');
  
  // States for Dashboard Filters
  const [dashFilterUlp, setDashFilterUlp] = useState<string>('');
  const [dashFilterPekerjaan, setDashFilterPekerjaan] = useState<string>('');

  // States for Data Table Filters
  const [filterFeeder, setFilterFeeder] = useState<string>('');
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  
  useEffect(() => {
    if (tab === 'DASHBOARD' && data.length > 0) {
      getDashboardInsights(data).then(setAiInsight);
    }
  }, [tab, data]);

  // --- Analitik: Total Per Jenis Pekerjaan Utama ---
  const tierStats = useMemo(() => {
    const findCount = (name: string) => data.filter(d => d.pekerjaan === name).length;
    return [
      { label: 'JTM Tier 1', count: findCount('JTM Tier 1'), color: 'bg-indigo-600' },
      { label: 'JTM Tier 1-2', count: findCount('JTM Tier 1 - Tier 2'), color: 'bg-indigo-400' },
      { label: 'GARDU Tier 1', count: findCount('GARDU Tier 1'), color: 'bg-amber-600' },
      { label: 'GARDU Tier 1-2', count: findCount('GARDU Tier 1 - Tier 2'), color: 'bg-amber-400' }
    ];
  }, [data]);

  // --- Analitik: Filter Statistik Interaktif ---
  const interactiveStats = useMemo(() => {
    const filtered = data.filter(d => {
      const matchUlp = !dashFilterUlp || d.ulp === dashFilterUlp;
      const matchPek = !dashFilterPekerjaan || d.pekerjaan === dashFilterPekerjaan;
      return matchUlp && matchPek;
    });
    const total = filtered.length;
    const done = filtered.filter(d => d.status === 'SUDAH EKSEKUSI').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress };
  }, [data, dashFilterUlp, dashFilterPekerjaan]);

  // --- Analitik: Top 10 Feeder ---
  const topTenFeeders = useMemo(() => {
    const counts: Record<string, { total: number, done: number }> = {};
    data.forEach(d => {
      if (!d.feeder) return;
      if (!counts[d.feeder]) counts[d.feeder] = { total: 0, done: 0 };
      counts[d.feeder].total++;
      if (d.status === 'SUDAH EKSEKUSI') counts[d.feeder].done++;
    });

    return Object.entries(counts)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [data]);

  const workTypes = pekerjaanList.length > 0 ? pekerjaanList.map(p => p.name) : ['JTM Tier 1', 'JTM Tier 1 - Tier 2', 'GARDU Tier 1', 'GARDU Tier 1 - Tier 2'];
  
  const statsWorkByUlp = useMemo(() => {
    return ulpList.map(u => {
      const result: any = { name: u.name.replace('ULP ', '') };
      workTypes.forEach(w => {
        result[w] = data.filter(d => d.ulp === u.name && d.pekerjaan === w).length;
      });
      return result;
    });
  }, [data, ulpList, workTypes]);

  const filteredData = data.filter(item => {
    const matchFeeder = !filterFeeder || item.feeder === filterFeeder;
    const matchPekerjaan = !filterPekerjaan || item.pekerjaan === filterPekerjaan;
    return matchFeeder && matchPekerjaan;
  });

  const handleDownloadExcel = async () => {
    if (filteredData.length === 0) {
      alert("Tidak ada data untuk diunduh sesuai filter terpilih.");
      return;
    }
    
    setIsExporting(true);
    try {
      const filters = {
        feeder: filterFeeder || 'SEMUA FEEDER',
        pekerjaan: filterPekerjaan || 'SEMUA PEKERJAAN',
        bulan: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
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
          {/* 🤖 AI Intelligence Analysis */}
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

          {/* 📊 Tier Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tierStats.map((tier, idx) => (
              <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{tier.label}</p>
                <div className="flex items-baseline gap-1">
                  <h4 className="text-2xl font-black text-slate-900">{tier.count}</h4>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Temuan</span>
                </div>
                <div className={`h-1.5 w-full mt-3 rounded-full overflow-hidden bg-slate-100`}>
                  <div className={`h-full ${tier.color}`} style={{ width: '60%' }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* 🔍 Interactive Filter Summary */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Filter Statistik</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Detail Per Unit & Pekerjaan</p>
               </div>
               <div className="text-right">
                  <span className="text-xs font-black text-indigo-600">{interactiveStats.progress}%</span>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Eksekusi</p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
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

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Temuan</p>
                  <p className="text-2xl font-black text-indigo-700">{interactiveStats.total}</p>
               </div>
               <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Sudah Eksekusi</p>
                  <p className="text-2xl font-black text-emerald-700">{interactiveStats.done}</p>
               </div>
            </div>
          </div>

          {/* 🏆 Top 10 Feeders */}
          <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
             <div className="mb-6">
                <h3 className="text-sm font-black uppercase tracking-tight">🏆 Top 10 Feeder Temuan</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Peringkat Feeder Terpadat</p>
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
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${(feeder.done / feeder.total) * 100}%` }}
                            ></div>
                         </div>
                      </div>
                   </div>
                )) : (
                  <p className="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">Tidak Ada Data Feeder</p>
                )}
             </div>
          </div>

          {/* 📊 Volume Chart Per Unit */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
             <div className="mb-8">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Volume Per Unit</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Komposisi Pekerjaan Per ULP</p>
             </div>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsWorkByUlp} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={8} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis fontSize={8} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: 'bold', paddingTop: '20px' }} />
                    {workTypes.map((type, idx) => (
                      <Bar key={type} dataKey={type} fill={['#6366F1', '#818CF8', '#F59E0B', '#D97706'][idx % 4]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {tab === 'DATA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ekspor Laporan & Filter</p>
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
            <button onClick={handleDownloadExcel} disabled={isExporting} className="w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] bg-emerald-600 text-white shadow-lg active:scale-95 transition-all">
              {isExporting ? 'Mengekspor...' : '📥 Download Data (.XLSX)'}
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
                    <th className="p-4">Feeder</th>
                    <th className="p-4">Tiang</th>
                    <th className="p-4">Alamat</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.length > 0 ? filteredData.map((item) => (
                    <tr key={item.id} className="text-[11px] font-bold text-slate-700">
                      <td className="p-4"><span className="text-indigo-600">{item.feeder}</span></td>
                      <td className="p-4 uppercase">{item.noTiang}</td>
                      <td className="p-4 truncate max-w-[100px]">{item.lokasi || "-"}</td>
                      <td className="p-4">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${item.status === 'SUDAH EKSEKUSI' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {item.status.split(' ')[0]}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="p-10 text-center text-slate-400">Data Kosong</td></tr>
                  )}
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
