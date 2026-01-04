
import React, { useState, useEffect } from 'react';
import { TemuanData, ULP, Inspector, Feeder } from '../types';
import { getDashboardInsights } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

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
}) => {
  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState<string>('Menganalisis performa data...');

  useEffect(() => {
    if (tab === 'DASHBOARD' && data.length > 0) {
      getDashboardInsights(data).then(setAiInsight);
    }
  }, [tab, data]);

  // Statistik Per Pekerjaan per ULP
  const workTypes = ['JTR T1', 'JTR T2', 'GARDU T1', 'GARDU T2'];
  const statsWorkByUlp = ulpList.map(u => {
    const result: any = { name: u.name.replace('ULP ', '') };
    workTypes.forEach(w => {
      result[w] = data.filter(d => d.ulp === u.name && d.pekerjaan === w).length;
    });
    return result;
  });

  // Statistik Per ULP (Penyelesaian)
  const statsByUlp = ulpList.map(u => {
    const ulpData = data.filter(d => d.ulp === u.name);
    const done = ulpData.filter(d => d.status === 'SUDAH EKSEKUSI').length;
    const total = ulpData.length;
    return { name: u.name, done, total, pct: total > 0 ? (done / total) * 100 : 0 };
  });

  // Statistik Per Feeder (Top 5)
  const feederCounts = data.reduce((acc: any, curr) => {
    acc[curr.feeder] = (acc[curr.feeder] || 0) + 1;
    return acc;
  }, {});
  const statsByFeeder = Object.keys(feederCounts)
    .map(f => ({ name: f, count: feederCounts[f] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalDone = data.filter(d => d.status === 'SUDAH EKSEKUSI').length;
  const totalButuhPadam = data.filter(d => d.status === 'BUTUH PADAM').length;
  const totalPending = data.filter(d => d.status === 'BELUM EKSEKUSI').length;

  const pieData = [
    { name: 'SUDAH', value: totalDone, color: '#10B981' },
    { name: 'PADAM', value: totalButuhPadam, color: '#F59E0B' },
    { name: 'BELUM', value: totalPending, color: '#6366F1' }
  ];

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">←</button>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Dashboard Admin</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Analitik Data Real-time</p>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl mb-8 shadow-sm">
        {['DASHBOARD', 'DATA', 'KELOLA'].map(t => (
          <button 
            key={t} onClick={() => setTab(t as any)}
            className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all tracking-widest uppercase ${tab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'DASHBOARD' && (
        <div className="space-y-6 animate-fade-in">
          {/* AI Insights Card */}
          <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">🤖</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">AI Intelligence Analysis</p>
                </div>
                <p className="text-sm font-semibold leading-relaxed leading-relaxed italic opacity-90">"{aiInsight}"</p>
             </div>
             <div className="absolute bottom-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          {/* New Chart: Pekerjaan per ULP */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] text-slate-400 font-black uppercase mb-8 tracking-widest text-center">Volume Pekerjaan Per Unit</p>
             <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsWorkByUlp} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '20px' }} />
                    <Bar dataKey="JTR T1" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={8} />
                    <Bar dataKey="JTR T2" fill="#818CF8" radius={[4, 4, 0, 0]} barSize={8} />
                    <Bar dataKey="GARDU T1" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={8} />
                    <Bar dataKey="GARDU T2" fill="#D97706" radius={[4, 4, 0, 0]} barSize={8} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Per ULP Performance */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] text-slate-400 font-black uppercase mb-6 tracking-widest">Penyelesaian Per Unit (ULP)</p>
             <div className="space-y-6">
                {statsByUlp.map(s => (
                  <div key={s.name}>
                    <div className="flex justify-between text-[10px] mb-2 font-black uppercase">
                      <span className="text-slate-700">{s.name}</span>
                      <span className="text-indigo-600">{Math.round(s.pct)}% ({s.done}/{s.total})</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                      <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${s.pct}%` }}></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Top 5 Feeder */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <p className="text-[10px] text-slate-400 font-black uppercase mb-6 tracking-widest">Top 5 Feeder Kelainan Terbanyak</p>
             <div className="space-y-3">
                {statsByFeeder.map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-xl font-black text-[10px] ${i === 0 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <p className="text-xs font-black text-slate-800 uppercase">{f.name}</p>
                    </div>
                    <p className="text-xs font-black text-indigo-600">{f.count}</p>
                  </div>
                ))}
                {statsByFeeder.length === 0 && <p className="text-center text-[10px] text-slate-400 py-4 uppercase font-bold">Belum ada data</p>}
             </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-400 font-black uppercase mb-6 tracking-widest text-center">Alokasi Status Laporan</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* FIX: Move cornerRadius to Pie component as Cell does not support it */}
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={55} 
                    outerRadius={80} 
                    paddingAngle={8} 
                    dataKey="value" 
                    stroke="none"
                    cornerRadius={6}
                  >
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === 'DATA' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
                  <th className="p-4">Jenis</th>
                  <th className="p-4">Aset</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((item) => (
                  <tr key={item.id} className="text-[11px] font-bold text-slate-700">
                    <td className="p-4"><span className="text-indigo-600">{item.pekerjaan}</span></td>
                    <td className="p-4 uppercase">{item.noTiang}</td>
                    <td className="p-4 opacity-50">{item.ulp.replace('ULP ', '')}</td>
                    <td className="p-4 text-[9px] uppercase">{item.status.split(' ')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
