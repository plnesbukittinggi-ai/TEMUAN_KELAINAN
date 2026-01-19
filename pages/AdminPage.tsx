import React, { useState, useEffect, useMemo } from 'react';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan, Keterangan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
// Fixed: Already included file name 'file:///services/ReportService.ts' differs from file name 'file:///services/reportService.ts' only in casing.
// Using lowercase 'reportService' to match file system convention and resolve casing conflict.
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
  
  // Dashboard Filters
  const [dashFilterMonth, setDashFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [dashFilterYear, setDashFilterYear] = useState<number>(new Date().getFullYear());
  const [dashFilterUlp, setDashFilterUlp] = useState<string>('');
  const [dashFilterPekerjaan, setDashFilterPekerjaan] = useState<string>('');

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
  }, [data]);

  useEffect(() => {
    if (tab === 'DASHBOARD' && dashboardData.length > 0) {
      getDashboardInsights(dashboardData).then(setAiInsight);
    } else if (tab === 'DASHBOARD') {
      setAiInsight("Tidak ada data temuan untuk periode yang dipilih.");
    }
  }, [tab, dashboardData]);

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

  /**
   * Handler Unduhan Terpadu (Sheet Detail + Sheet Matrix)
   */
  const handleDownloadExcelCombined = async () => {
    if (filteredAndSortedData.length === 0) {
      alert("Tidak ada data untuk diunduh. Mohon sesuaikan filter.");
      return;
    }

    if (!filterPekerjaan) {
      alert("Mohon pilih 'Pekerjaan' terlebih dahulu agar sistem dapat menyusun kolom Matrix Temuan.");
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

      const filters = {
        feeder: filterFeeder || 'SEMUA FEEDER',
        pekerjaan: filterPekerjaan,
        bulan: displayMonth,
        inspektor1: sortedForExport[0]?.inspektor1 || '-',
        inspektor2: sortedForExport[0]?.inspektor2 || '-'
      };

      // Mencari kategori temuan berdasarkan pekerjaan yang dipilih
      const normalize = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetPekNorm = normalize(filterPekerjaan);
      const jobFindings = keteranganList.filter(k => {
        const kIdPekNorm = normalize(k.idPekerjaan);
        // Cek berdasarkan ID Pekerjaan atau Nama Pekerjaan
        const pekMatch = pekerjaanList.find(p => normalize(p.name) === targetPekNorm);
        return kIdPekNorm === targetPekNorm || (pekMatch && kIdPekNorm === normalize(pekMatch.id));
      });
      
      await ReportService.downloadCombinedExcel(sortedForExport, jobFindings, filters);
    } catch (error) {
      console.error("Gagal export:", error);
      alert("Terjadi kesalahan saat membuat file Excel. Pastikan data tidak korup.");
    } finally {
      setIsExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Kelola Handlers
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
    if (subTab === 'INSPEKTOR') updatedList = inspectors.filter(i => i.id !== item.id);
    else if (subTab === 'ULP') updatedList = ulpList.filter(u => u.id !== item.id);
    else updatedList = feeders.filter(f => f.id !== item.id);

    try {
      if (subTab === 'INSPEKTOR') onUpdateInspectors(updatedList);
      else if (subTab === 'ULP') onUpdateUlp(updatedList);
      else onUpdateFeeders(updatedList);
      alert('Data berhasil dihapus.');
    } catch (e) { alert('Gagal menghapus data.'); }
  };

  const handleSaveMaster = async () => {
    if (!formData.name.trim()) return alert('Nama wajib diisi!');
    if (subTab === 'FEEDER' && !formData.ulpId) return alert('Pilih ULP untuk feeder!');

    setIsSaving(true);
    try {
      let updatedList: any[] = [];
      if (subTab === 'INSPEKTOR') {
        if (modalMode === 'ADD') updatedList = [...inspectors, { id: `INS-${Date.now()}`, name: formData.name }];
        else updatedList = inspectors.map(i => i.id === editingItem.id ? { ...i, name: formData.name } : i);
        onUpdateInspectors(updatedList);
      } else if (subTab === 'ULP') {
        if (modalMode === 'ADD') updatedList = [...ulpList, { id: `ULP-${Date.now()}`, name: formData.name }];
        else updatedList = ulpList.map(u => u.id === editingItem.id ? { ...u, name: formData.name } : u);
        onUpdateUlp(updatedList);
      } else if (subTab === 'FEEDER') {
        if (modalMode === 'ADD') updatedList = [...feeders, { id: `F-${Date.now()}`, name: formData.name, ulpId: formData.ulpId }];
        else updatedList = feeders.map(f => f.id === editingItem.id ? { ...f, name: formData.name, ulpId: formData.ulpId } : f);
        onUpdateFeeders(updatedList);
      }
      setIsModalOpen(false);
      alert(`Berhasil ${modalMode === 'ADD' ? 'menambah' : 'mengubah'} data.`);
    } catch (e) { alert('Gagal menyimpan data.'); }
    finally { setIsSaving(false); }
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
        </div>
      )}

      {tab === 'DATA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterFeeder} onChange={(e) => setFilterFeeder(e.target.value)}>
                <option value="">-- Semua Feeder --</option>
                {Array.from(new Set(data.map(d => d.feeder))).sort().map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterPekerjaan} onChange={(e) => setFilterPekerjaan(e.target.value)}>
                <option value="">-- Pilih Pekerjaan --</option>
                {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
              <input type="date" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={handleDownloadExcelCombined} 
                disabled={isExporting} 
                className="w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] bg-slate-900 text-white shadow-2xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isExporting ? '⏳ Mengekspor...' : '📥 Download Laporan (2 Sheet)'}
              </button>
              <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider italic">
                * Menghasilkan file Excel dengan sheet Detail & Matrix Temuan
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
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
                  {filteredAndSortedData.slice(0, 50).map((item) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'REKAP' && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-slate-400 text-[8px] uppercase font-black tracking-widest">
                    <th className="p-4">Inspektor</th>
                    <th className="p-4">ULP</th>
                    <th className="p-4">Feeder</th>
                    <th className="p-4 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rekapData.map((row, idx) => (
                    <tr key={idx} className="text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-slate-900">{row.inspektor}</td>
                      <td className="p-4">{row.ulp}</td>
                      <td className="p-4">{row.feeder}</td>
                      <td className="p-4 text-center">
                        <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-black shadow-sm">{row.total}</span>
                      </td>
                    </tr>
                  ))}
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
                <button key={s} onClick={() => setSubTab(s)} className={`flex-1 py-2.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${subTab === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                   {s}
                </button>
             ))}
          </div>

          <div className="flex justify-between items-center px-1">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Daftar {subTab}</h3>
             <button onClick={handleOpenAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
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
             {/* ULP & FEEDER maps follow same pattern ... */}
          </div>
        </div>
      )}

      {/* Modal Management ... */}
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
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                    <button onClick={handleSaveMaster} disabled={isSaving} className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50 px-8">
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
