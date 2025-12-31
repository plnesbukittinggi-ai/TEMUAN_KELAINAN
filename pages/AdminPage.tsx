
import React, { useState, useEffect } from 'react';
import { TemuanData, ULP, Inspector, Feeder } from '../types';
import { getDashboardInsights } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AdminPageProps {
  data: TemuanData[];
  ulpList: ULP[];
  inspectors: Inspector[];
  feeders: Feeder[];
  onBack: () => void;
  onUpdateInspectors: (data: Inspector[]) => void;
  onUpdateUlp: (data: ULP[]) => void;
  onUpdateFeeders: (data: Feeder[]) => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ 
  data, ulpList, inspectors, feeders, onBack,
  onUpdateInspectors, onUpdateUlp, onUpdateFeeders
}) => {
  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState<string>('Menganalisis data sistem...');

  useEffect(() => {
    if (tab === 'DASHBOARD' && data.length > 0) {
      getDashboardInsights(data).then(setAiInsight);
    }
  }, [tab, data]);

  const statsByUlp = ulpList.map(u => {
    const ulpData = data.filter(d => d.ulp === u.name);
    const done = ulpData.filter(d => d.status === 'SUDAH EKSEKUSI').length;
    const total = ulpData.length;
    return { name: u.name, done, total, pct: total > 0 ? (done / total) * 100 : 0 };
  });

  const totalDone = data.filter(d => d.status === 'SUDAH EKSEKUSI').length;
  const totalButuhPadam = data.filter(d => d.status === 'BUTUH PADAM').length;
  const totalPending = data.filter(d => d.status === 'BELUM EKSEKUSI').length;

  const pieData = [
    { name: 'SUDAH EKSEKUSI', value: totalDone, color: '#10B981' },
    { name: 'BUTUH PADAM', value: totalButuhPadam, color: '#F59E0B' },
    { name: 'BELUM EKSEKUSI', value: totalPending, color: '#6366F1' }
  ];

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl">←</button>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Administrasi Sistem</h2>
      </div>

      <div className="flex bg-white border border-slate-200 p-1 rounded-xl mb-8">
        {[
          { id: 'DASHBOARD', label: 'Ringkasan' },
          { id: 'DATA', label: 'Database' },
          { id: 'KELOLA', label: 'Master' }
        ].map(t => (
          <button 
            key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all tracking-wide ${tab === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'DASHBOARD' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">AI Performance Insights</p>
                </div>
                <p className="text-sm font-medium leading-relaxed opacity-95">"{aiInsight}"</p>
             </div>
             <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Laporan</p>
               <div>
                 <p className="text-3xl font-bold text-slate-900">{data.length}</p>
                 <p className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">Temuan Terdaftar</p>
               </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Efisiensi</p>
               <div>
                 <p className="text-3xl font-bold text-emerald-600">{Math.round((totalDone/data.length)*100 || 0)}%</p>
                 <p className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">Tingkat Perbaikan</p>
               </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-2">
              <p className="text-[11px] text-slate-500 font-bold uppercase text-center mb-6 tracking-widest">Alokasi Status Temuan</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-5 mt-4">
                 {pieData.map(item => (
                   <div key={item.name} className="flex items-center gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <p className="text-[11px] text-slate-500 font-bold mb-6 uppercase tracking-widest">Performansi Per Unit (ULP)</p>
             <div className="space-y-5">
                {statsByUlp.map(s => (
                  <div key={s.name}>
                    <div className="flex justify-between text-[11px] mb-2 font-bold uppercase">
                      <span className="text-slate-700">{s.name}</span>
                      <span className="text-indigo-600">{s.done} / {s.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }}></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {tab === 'DATA' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                  <th className="p-4">Tiang</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.id} className="text-xs hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800 uppercase">{item.noTiang}</td>
                    <td className="p-4 text-slate-500 font-medium">{item.ulp}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${item.status === 'SUDAH EKSEKUSI' ? 'text-emerald-600 bg-emerald-50' : item.status === 'BUTUH PADAM' ? 'text-amber-600 bg-amber-50' : 'text-indigo-600 bg-indigo-50'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'KELOLA' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-4">Daftar Inspektur Resmi</h3>
             <div className="flex flex-wrap gap-2">
                {inspectors.map(i => <span key={i.id} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 uppercase">{i.name}</span>)}
                <button className="px-3 py-1.5 border border-dashed border-indigo-300 text-indigo-600 rounded-lg text-[10px] font-bold">+ TAMBAH</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
