
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Label
} from 'recharts';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan, Keterangan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
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

const getDefaultRekapDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatDate = (date: Date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay)
  };
};

const AdminPage: React.FC<AdminPageProps> = ({ 
  data, ulpList, inspectors, feeders, pekerjaanList, keteranganList, onBack,
  onUpdateInspectors, onUpdateUlp, onUpdateFeeders
}) => {
  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD' | 'REKAP' | 'REKAP_JENIS'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState<string>('Menganalisis performa data...');
  
  const [dashFilterMonth, setDashFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [dashFilterYear, setDashFilterYear] = useState<number>(new Date().getFullYear());
  const [dashFilterUlp, setDashFilterUlp] = useState<string>('');
  const [dashFilterPekerjaan, setDashFilterPekerjaan] = useState<string>('');

  const initialRekapDates = getDefaultRekapDates();
  const [rekapStartDate, setRekapStartDate] = useState<string>(initialRekapDates.start);
  const [rekapEndDate, setRekapEndDate] = useState<string>(initialRekapDates.end);

  const [rekapJenisMonth, setRekapJenisMonth] = useState<number>(new Date().getMonth() + 1);
  const [rekapJenisYear, setRekapJenisYear] = useState<number>(new Date().getFullYear());
  const [rekapJenisPekerjaan, setRekapJenisPekerjaan] = useState<string>('');
  const [rekapJenisUlp, setRekapJenisUlp] = useState<string>('');
  const [rekapJenisFeeder, setRekapJenisFeeder] = useState<string>('');

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

  const handleReset = () => {
    const dates = getDefaultRekapDates();
    setRekapStartDate(dates.start);
    setRekapEndDate(dates.end);
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

  const statusSummary = useMemo(() => {
    const counts = {
      'BELUM EKSEKUSI': 0,
      'SUDAH EKSEKUSI': 0,
      'BUTUH PADAM': 0,
      'TIDAK DAPAT IZIN': 0,
      'KENDALA MATERIAL': 0,
    };
    dashboardData.forEach(d => {
      if (counts[d.status as keyof typeof counts] !== undefined) {
        counts[d.status as keyof typeof counts]++;
      }
    });
    
    const chartData = [
      { name: 'Belum Eksekusi', value: counts['BELUM EKSEKUSI'], color: '#6366f1' },
      { name: 'Sudah Eksekusi', value: counts['SUDAH EKSEKUSI'], color: '#10b981' },
      { name: 'Butuh Padam', value: counts['BUTUH PADAM'], color: '#f59e0b' },
      { name: 'Tidak Izin', value: counts['TIDAK DAPAT IZIN'] || 0, color: '#ea580c' },
      { name: 'Kendala Material', value: counts['KENDALA MATERIAL'], color: '#ef4444' }
    ].filter(item => item.value > 0);

    return { chartData, counts, total: dashboardData.length };
  }, [dashboardData]);

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

  const rekapJenisData = useMemo(() => {
    const counts: Record<string, { keterangan: string, total: number, belum: number, sudah: number, padam: number, tidakIzin: number, kendala: number }> = {};
    data.forEach(item => {
      const dDate = parseRobustDate(item.tanggal);
      const matchMonth = dDate.getMonth() + 1 === rekapJenisMonth;
      const matchYear = dDate.getFullYear() === rekapJenisYear;
      const matchPekerjaan = !rekapJenisPekerjaan || item.pekerjaan === rekapJenisPekerjaan;
      const matchUlp = !rekapJenisUlp || item.ulp === rekapJenisUlp;
      const matchFeeder = !rekapJenisFeeder || item.feeder === rekapJenisFeeder;

      if (matchMonth && matchYear && matchPekerjaan && matchUlp && matchFeeder) {
        const key = item.keterangan || 'Tanpa Keterangan';
        if (!counts[key]) {
          counts[key] = { keterangan: key, total: 0, belum: 0, sudah: 0, padam: 0, tidakIzin: 0, kendala: 0 };
        }
        counts[key].total++;
        if (item.status === 'BELUM EKSEKUSI') counts[key].belum++;
        else if (item.status === 'SUDAH EKSEKUSI') counts[key].sudah++;
        else if (item.status === 'BUTUH PADAM') counts[key].padam++;
        else if (item.status === 'TIDAK DAPAT IZIN') counts[key].tidakIzin++;
        else if (item.status === 'KENDALA MATERIAL') counts[key].kendala++;
      }
    });
    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [data, rekapJenisMonth, rekapJenisYear, rekapJenisPekerjaan, rekapJenisUlp, rekapJenisFeeder]);

  const feedersWithDataForRekapJenis = useMemo(() => {
    const unique = new Set<string>();
    data.forEach(item => {
      const dDate = parseRobustDate(item.tanggal);
      const matchMonth = dDate.getMonth() + 1 === rekapJenisMonth;
      const matchYear = dDate.getFullYear() === rekapJenisYear;
      const matchPekerjaan = !rekapJenisPekerjaan || item.pekerjaan === rekapJenisPekerjaan;
      const matchUlp = !rekapJenisUlp || item.ulp === rekapJenisUlp;
      if (matchMonth && matchYear && matchPekerjaan && matchUlp && item.feeder) unique.add(item.feeder);
    });
    return Array.from(unique).sort();
  }, [data, rekapJenisMonth, rekapJenisYear, rekapJenisPekerjaan, rekapJenisUlp]);

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
    return Object.values(counts).sort((a, b) => {
      const pctA = a.total > 0 ? a.done / a.total : 0;
      const pctB = b.total > 0 ? b.done / b.total : 0;
      if (pctB !== pctA) return pctB - pctA;
      return b.total - a.total;
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
        const start = new Date(filterStartDate); start.setHours(0,0,0,0);
        if (itemDate < start) matchDate = false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate); end.setHours(23,59,59,999);
        if (itemDate > end) matchDate = false;
      }
      return matchUlp && matchFeeder && matchPekerjaan && matchDate;
    });
    return filtered.sort((a, b) => parseRobustDate(b.tanggal).getTime() - parseRobustDate(a.tanggal).getTime());
  }, [data, filterUlp, filterFeeder, filterPekerjaan, filterStartDate, filterEndDate]);

  const handleDownloadExcel = async () => {
    if (filteredAndSortedData.length === 0) { alert("Tidak ada data untuk diunduh."); return; }
    setIsExporting(true);
    try {
      const sortedForExport = [...filteredAndSortedData].sort((a, b) => parseRobustDate(a.tanggal).getTime() - parseRobustDate(b.tanggal).getTime());
      const firstDataDate = parseRobustDate(sortedForExport[0]?.tanggal);
      const displayMonth = `${MONTHS.find(m => m.val === (firstDataDate.getMonth() + 1))?.label || 'Bulan'} ${firstDataDate.getFullYear()}`;
      await ReportService.downloadExcel(sortedForExport, { 
        ulp: filterUlp || 'SEMUA UNIT', 
        feeder: filterFeeder || 'SEMUA FEEDER', 
        pekerjaan: filterPekerjaan || 'SEMUA PEKERJAAN', 
        bulan: displayMonth, 
        inspektor1: sortedForExport[0]?.inspektor1 || '-', 
        inspektor2: sortedForExport[0]?.inspektor2 || '-' 
      });
    } catch (error) { alert("Gagal mengunduh Excel."); } 
    finally { setIsExporting(false); }
  };

  const handleSaveMaster = async () => {
    if (!formData.name.trim()) return alert('Nama wajib diisi!');
    if (subTab === 'FEEDER' && !formData.ulpId) return alert('Pilih ULP!');
    setIsSaving(true);
    try {
      let updatedList: any[] = [];
      let sheetName: 'Inspectors' | 'ULP' | 'Feeders';
      if (subTab === 'INSPEKTOR') {
        sheetName = 'Inspectors';
        updatedList = modalMode === 'ADD' ? [...inspectors, { id: `INS-${Date.now()}`, name: formData.name }] : inspectors.map(i => i.id === editingItem.id ? { ...i, name: formData.name } : i);
      } else if (subTab === 'ULP') {
        sheetName = 'ULP';
        updatedList = modalMode === 'ADD' ? [...ulpList, { id: `ULP-${Date.now()}`, name: formData.name }] : ulpList.map(u => u.id === editingItem.id ? { ...u, name: formData.name } : u);
      } else {
        sheetName = 'Feeders';
        updatedList = modalMode === 'ADD' ? [...feeders, { id: `F-${Date.now()}`, name: formData.name, ulpId: formData.ulpId }] : feeders.map(f => f.id === editingItem.id ? { ...f, name: formData.name, ulpId: formData.ulpId } : f);
      }
      const res = await SpreadsheetService.updateMasterData(sheetName, updatedList);
      if (res.success) {
        if (subTab === 'INSPEKTOR') onUpdateInspectors(updatedList);
        else if (subTab === 'ULP') onUpdateUlp(updatedList);
        else onUpdateFeeders(updatedList);
        setIsModalOpen(false);
      }
    } catch (e) { alert('Gagal simpan.'); } 
    finally { setIsSaving(false); }
  };

  const handleDeleteMaster = async (item: any) => {
    if (!window.confirm(`Hapus "${item.name}"?`)) return;
    setIsSaving(true);
    try {
      let updatedList: any[] = [];
      let sheetName: 'Inspectors' | 'ULP' | 'Feeders';
      if (subTab === 'INSPEKTOR') { sheetName = 'Inspectors'; updatedList = inspectors.filter(i => i.id !== item.id); }
      else if (subTab === 'ULP') { sheetName = 'ULP'; updatedList = ulpList.filter(u => u.id !== item.id); }
      else { sheetName = 'Feeders'; updatedList = feeders.filter(f => f.id !== item.id); }
      await SpreadsheetService.updateMasterData(sheetName, updatedList);
      if (subTab === 'INSPEKTOR') onUpdateInspectors(updatedList);
      else if (subTab === 'ULP') onUpdateUlp(updatedList);
      else onUpdateFeeders(updatedList);
    } catch (e) { alert('Gagal hapus.'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all group w-full sm:w-auto">
          <span className="text-sm font-black text-slate-900 group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Logout</span>
        </button>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Panel Administrasi</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Analitik Data & Pengelolaan Master</p>
        </div>
      </div>

      <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl mb-8 shadow-sm overflow-x-auto gap-1 scrollbar-hide no-scrollbar">
        {[
          { id: 'DASHBOARD', label: 'DASHBOARD' },
          { id: 'REKAP', label: 'REKAP INSPEKTOR' },
          { id: 'REKAP_JENIS', label: 'REKAP JENIS' },
          { id: 'DATA', label: 'LIHAT DATA' },
          { id: 'KELOLA', label: 'MASTER DATA' }
        ].map(t => (
          <button 
            key={t.id} onClick={() => setTab(t.id as any)} 
            className={`flex-1 py-3 px-4 text-[9px] font-black rounded-xl transition-all tracking-widest uppercase whitespace-nowrap ${tab === t.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'DASHBOARD' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Penyaringan Dashboard</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterMonth} onChange={(e) => setDashFilterMonth(Number(e.target.value))}>
                {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterYear} onChange={(e) => setDashFilterYear(Number(e.target.value))}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterUlp} onChange={(e) => setDashFilterUlp(e.target.value)}>
                <option value="">Semua Unit (ULP)</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={dashFilterPekerjaan} onChange={(e) => setDashFilterPekerjaan(e.target.value)}>
                <option value="">Semua Pekerjaan</option>
                {pekerjaanList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 sm:p-6 mt-6">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="text-base">✨</span> Gemini AI Dashboard Insights
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">{aiInsight}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {tierStats.map(s => (
              <div key={s.label} className={`${s.bgColor} border-2 ${s.borderColor} p-6 rounded-[2.5rem] shadow-xl transition-all hover:scale-[1.03] group`}>
                 <div className="flex justify-between items-start mb-4">
                    <div className="text-left">
                       <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${s.labelColor}`}>Total</p>
                       <p className={`text-3xl font-black leading-none ${s.textColor}`}>{s.total}</p>
                    </div>
                    <div className="text-right">
                       <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${s.labelColor}`}>Done</p>
                       <p className={`text-3xl font-black leading-none ${s.textColor}`}>{s.done}</p>
                    </div>
                 </div>
                 <div className="w-full bg-black/10 h-2.5 rounded-full overflow-hidden mb-4 border border-white/5">
                    <div className={`${s.barColor} h-full transition-all duration-1000 group-hover:opacity-90`} style={{ width: `${s.pct}%` }}></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <p className={`text-[10px] font-black uppercase tracking-tight ${s.textColor}`}>{s.label}</p>
                    <p className={`text-[10px] font-black opacity-70 ${s.textColor}`}>{s.pct}% Selesai</p>
                 </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] border border-slate-200 shadow-xl overflow-hidden">
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
              Statistik Status Temuan ({dashboardData.length} Total)
            </h3>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="w-full lg:w-1/2 h-64 sm:h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusSummary.chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                      {statusSummary.chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      <Label value={statusSummary.total} position="center" fill="#0f172a" style={{ fontSize: '32px', fontWeight: '900' }} />
                      <Label value="TEMUAN" position="center" dy={25} fill="#64748b" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                {statusSummary.chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{item.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">{Math.round((item.value / statusSummary.total) * 100)}% dari total</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'DATA' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Ekspor & Filter Laporan</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={filterUlp} onChange={(e) => setFilterUlp(e.target.value)}>
                <option value="">Semua ULP</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={filterFeeder} onChange={(e) => setFilterFeeder(e.target.value)}>
                <option value="">Semua Feeder</option>
                {Array.from(new Set(data.map(d => d.feeder).filter(Boolean))).sort().map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={handleDownloadExcel} disabled={isExporting} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                {isExporting ? '⏳ MENYIAPKAN...' : '📗 DOWNLOAD EXCEL'}
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
               <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-900 text-white font-black uppercase">
                     <tr>
                        <th className="p-4">Tgl</th>
                        <th className="p-4">Tiang</th>
                        <th className="p-4">Feeder</th>
                        <th className="p-4">Kelainan</th>
                        <th className="p-4">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredAndSortedData.slice(0, 100).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-4 whitespace-nowrap font-medium text-slate-400">{parseRobustDate(item.tanggal).toLocaleDateString('id-ID')}</td>
                           <td className="p-4 font-black text-slate-900">{item.noTiang}</td>
                           <td className="p-4 font-bold text-indigo-600">{item.feeder}</td>
                           <td className="p-4 text-red-600 font-bold uppercase">{item.keterangan}</td>
                           <td className="p-4 font-black">{item.status}</td>
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
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 max-w-xl mx-auto">
             {(['INSPEKTOR', 'ULP', 'FEEDER'] as const).map(s => (
               <button key={s} onClick={() => setSubTab(s)} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${subTab === s ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
             ))}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center px-2 gap-4">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Daftar {subTab}</h3>
            <button onClick={() => { setModalMode('ADD'); setFormData({name: '', ulpId: ulpList[0]?.id || ''}); setIsModalOpen(true); }} className="bg-slate-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all w-full sm:w-auto">
              + Tambah {subTab}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {subTab === 'INSPEKTOR' && inspectors.map(i => (
               <div key={i.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                 <div><p className="text-[12px] font-black text-slate-900 uppercase">{i.name}</p><p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">ID: {i.id}</p></div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItem(i); setModalMode('EDIT'); setFormData({name: i.name}); setIsModalOpen(true); }} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">✏️</button>
                    <button onClick={() => handleDeleteMaster(i)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                 </div>
               </div>
             ))}
             {subTab === 'ULP' && ulpList.map(u => (
               <div key={u.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                 <div><p className="text-[12px] font-black text-slate-900 uppercase">{u.name}</p><p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">UNIT PELAKSANA</p></div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItem(u); setModalMode('EDIT'); setFormData({name: u.name}); setIsModalOpen(true); }} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">✏️</button>
                    <button onClick={() => handleDeleteMaster(u)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                 </div>
               </div>
             ))}
             {subTab === 'FEEDER' && feeders.map(f => (
               <div key={f.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all">
                 <div><p className="text-[12px] font-black text-slate-900 uppercase">{f.name}</p><p className="text-[9px] text-indigo-600 font-bold mt-1 uppercase tracking-widest">{ulpList.find(u => u.id === f.ulpId)?.name || 'Unknown Unit'}</p></div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItem(f); setModalMode('EDIT'); setFormData({name: f.name, ulpId: f.ulpId}); setIsModalOpen(true); }} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">✏️</button>
                    <button onClick={() => handleDeleteMaster(f)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
              <div className="p-8 sm:p-12">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{modalMode === 'ADD' ? 'Tambah' : 'Edit'} {subTab}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl p-2">✕</button>
                 </div>
                 <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Nama {subTab} *</label>
                       <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all uppercase" placeholder={`Ketik nama ${subTab.toLowerCase()}`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    {subTab === 'FEEDER' && (
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Unit Terkait *</label>
                          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" value={formData.ulpId} onChange={(e) => setFormData({ ...formData, ulpId: e.target.value })}>
                             {ulpList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                       </div>
                    )}
                 </div>
                 <div className="mt-10 flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Batal</button>
                    <button onClick={handleSaveMaster} disabled={isSaving} className="flex-2 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 px-10">
                       {isSaving ? '⏳ SINKRON...' : 'SIMPAN DATA'}
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
