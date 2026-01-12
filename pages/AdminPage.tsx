
import React, { useState, useEffect } from 'react';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
import { ReportService } from '../services/reportService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

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
  
  const [filterFeeder, setFilterFeeder] = useState<string>('');
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  
  useEffect(() => {
    if (tab === 'DASHBOARD' && data.length > 0) {
      getDashboardInsights(data).then(setAiInsight);
    }
  }, [tab, data]);

  const workTypes = pekerjaanList.length > 0 ? pekerjaanList.map(p => p.name) : ['JTM Tier 1', 'JTM Tier 1 - Tier 2', 'GARDU Tier 1', 'GARDU Tier 1 - Tier 2'];
  const statsWorkByUlp = ulpList.map(u => {
    const result: any = { name: u.name.replace('ULP ', '') };
    workTypes.forEach(w => {
      result[w] = data.filter(d => d.ulp === u.name && d.pekerjaan === w).length;
    });
    return result;
  });

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
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kontrol & Rekapitulasi</p>
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
          <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">🤖</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">AI Intelligence Analysis</p>
                </div>
                <p className="text-sm font-semibold leading-relaxed italic opacity-90">"{aiInsight}"</p>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] text-slate-400 font-black uppercase mb-8 tracking-widest text-center">Volume Pekerjaan Per Unit</p>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsWorkByUlp} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={8} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis fontSize={8} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
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
                    <th className="p-4">Jenis</th>
                    <th className="p-4">Aset</th>
                    <th className="p-4">Alamat</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.length > 0 ? filteredData.map((item) => (
                    <tr key={item.id} className="text-[11px] font-bold text-slate-700">
                      <td className="p-4"><span className="text-indigo-600">{item.pekerjaan}</span></td>
                      <td className="p-4 uppercase">{item.noTiang}</td>
                      <td className="p-4 truncate max-w-[100px]">{item.alamat || "-"}</td>
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
