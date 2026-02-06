DataView:


import React, { useState, useMemo } from 'react';
import { TemuanData, LoginSession } from '../types';

interface DataViewPageProps {
  ulp: string;
  data: TemuanData[];
  onBack: () => void;
  onAddTemuan?: () => void;
  onAddEksekusi?: () => void;
  onEdit?: (data: TemuanData) => void;
  currentSession?: LoginSession;
}

const getDefaultMonthDates = () => {
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

  return { start: formatDate(firstDay), end: formatDate(lastDay) };
};

const DataViewPage: React.FC<DataViewPageProps> = ({ ulp, data, onBack, onAddTemuan, onAddEksekusi, onEdit, currentSession }) => {
  const initialDates = getDefaultMonthDates();
  const [filter, setFilter] = useState<'ALL' | 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM' | 'TIDAK DAPAT IZIN' | 'KENDALA MATERIAL'>('ALL');
  const [selectedFeeder, setSelectedFeeder] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(initialDates.start);
  const [endDate, setEndDate] = useState<string>(initialDates.end);
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  const [showOnlyMyData, setShowOnlyMyData] = useState<boolean>(!!(currentSession?.inspektor1 || currentSession?.inspektor2));

  const formatDriveUrl = (url?: string) => {
    if (!url) return '';
    if (url.indexOf('data:image') === 0) return url;
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
  };

  const openInMaps = (geotag?: string) => {
    if (!geotag) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(geotag)}`;
    window.open(url, '_blank');
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
        return new Date(year, month, day);
      }
    } catch (e) { return new Date(0); }
    return new Date(0);
  };

  const uniqueFeeders = useMemo(() => {
    return Array.from(new Set(data.map(item => item.feeder).filter(Boolean))).sort();
  }, [data]);

  const sortedAndFilteredData = useMemo(() => {
    const filtered = data.filter(item => {
      const dDate = parseRobustDate(item.tanggal);
      const dDateNoTime = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
      let matchDate = true;
      if (startDate) {
        const s = new Date(startDate); s.setHours(0,0,0,0);
        if (dDateNoTime < s) matchDate = false;
      }
      if (endDate) {
        const e = new Date(endDate); e.setHours(23,59,59,999);
        if (dDateNoTime > e) matchDate = false;
      }
      const matchStatus = filter === 'ALL' ? true : item.status === filter;
      const matchFeeder = !selectedFeeder || item.feeder === selectedFeeder;
      let matchInspector = true;
      if (showOnlyMyData && (currentSession?.inspektor1 || currentSession?.inspektor2)) {
        const myNames = [currentSession.inspektor1, currentSession.inspektor2].filter(Boolean);
        matchInspector = myNames.includes(item.inspektor1) || myNames.includes(item.inspektor2);
      }
      return matchDate && matchStatus && matchFeeder && matchInspector;
    });
    return filtered.sort((a, b) => parseRobustDate(b.tanggal).getTime() - parseRobustDate(a.tanggal).getTime());
  }, [data, filter, selectedFeeder, startDate, endDate, showOnlyMyData, currentSession]);

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'SUDAH EKSEKUSI': return 'text-emerald-700 bg-emerald-100';
      case 'BUTUH PADAM': return 'text-amber-700 bg-amber-100';
      case 'TIDAK DAPAT IZIN': return 'text-orange-700 bg-orange-100';
      case 'KENDALA MATERIAL': return 'text-red-700 bg-red-100';
      default: return 'text-indigo-700 bg-indigo-100';
    }
  };

  const isInspector = !!(currentSession?.inspektor1 || currentSession?.inspektor2);

  return (
    <div className="pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all group w-full sm:w-auto">
          <span className="text-sm font-black text-slate-900 group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Logout</span>
        </button>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Monitoring Temuan Real-time</h2>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{ulp}</p>
        </div>
      </div>

      {(onAddTemuan || onAddEksekusi) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {onAddTemuan && (
            <button onClick={onAddTemuan} className="flex items-center gap-5 p-6 bg-slate-900 text-white rounded-[2.5rem] shadow-xl hover:bg-slate-800 transition-all group text-left">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📝</div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest">Lapor Temuan</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Input Kelainan Baru</p>
              </div>
            </button>
          )}
          {onAddEksekusi && (
            <button onClick={onAddEksekusi} className="flex items-center gap-5 p-6 bg-emerald-600 text-white rounded-[2.5rem] shadow-xl hover:bg-emerald-700 transition-all group text-left">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🛠️</div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest">Input Perbaikan</p>
                <p className="text-[10px] text-emerald-100 font-bold uppercase mt-1">Update Status Eksekusi</p>
              </div>
            </button>
          )}
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-6">
           <div className="flex items-center gap-3">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Penyaringan</p>
              <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black">{sortedAndFilteredData.length} TOTAL</span>
           </div>
           <div className="flex flex-wrap gap-4">
              {isInspector && (
                <button onClick={() => setShowOnlyMyData(!showOnlyMyData)} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${showOnlyMyData ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {showOnlyMyData ? '🎯 Data Saya' : '🌍 Semua Data'}
                </button>
              )}
              <button onClick={() => { setStartDate(initialDates.start); setEndDate(initialDates.end); setSelectedFeeder(''); setFilter('ALL'); }} className="text-[10px] font-black text-red-500 uppercase px-4 py-2 border border-red-100 rounded-xl hover:bg-red-50">Reset Filter</button>
           </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-300 uppercase ml-1">Mulai</label>
             <input type="date" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-300 uppercase ml-1">Sampai</label>
             <input type="date" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
             <label className="text-[10px] font-black text-slate-300 uppercase ml-1">Pilih Feeder</label>
             <select className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={selectedFeeder} onChange={(e) => setSelectedFeeder(e.target.value)}>
               <option value="">-- Semua Feeder --</option>
               {uniqueFeeders.map(f => <option key={f} value={f}>{f}</option>)}
             </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          {['ALL', 'BELUM EKSEKUSI', 'SUDAH EKSEKUSI', 'BUTUH PADAM', 'TIDAK DAPAT IZIN', 'KENDALA MATERIAL'].map((f) => (
            <button key={f} onClick={() => setFilter(f as any)} className={`whitespace-nowrap px-5 py-3 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest ${filter === f ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
              {f === 'ALL' ? 'SEMUA' : f.replace(' EKSEKUSI', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedAndFilteredData.map((item) => (
          <div key={item.id} className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">🗓️ {parseRobustDate(item.tanggal).toLocaleDateString('id-ID')}</p>
               <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${getStatusBadgeClass(item.status)}`}>{item.status}</span>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 cursor-zoom-in group/img relative" onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoTemuan), title: item.noTiang })}>
                   <img src={formatDriveUrl(item.fotoTemuan)} alt="Temuan" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" referrerPolicy="no-referrer" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase">Lihat</div>
                </div>
                {item.fotoEksekusi && (
                  <div className="w-24 h-24 bg-emerald-50 rounded-2xl overflow-hidden border border-emerald-100 cursor-zoom-in group/img relative" onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoEksekusi), title: item.noTiang })}>
                    <img src={formatDriveUrl(item.fotoEksekusi)} alt="Eksekusi" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-black uppercase">Hasil</div>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex gap-0.5 mb-2">
                   {Array.from({ length: item.prioritas || 1 }).map((_, i) => <span key={i} className="text-[12px] drop-shadow-sm">⭐</span>)}
                </div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{item.feeder}</p>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{item.noTiang}</h3>
                <p className="text-xs font-bold text-red-600 uppercase mb-4 leading-relaxed">{item.keterangan}</p>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                   <p className="text-[10px] text-slate-600 font-bold italic leading-snug line-clamp-2">📍 {item.alamat || 'Alamat tidak diisi'}</p>
                   {item.geotag && (
                     <button onClick={() => openInMaps(item.geotag)} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-900 hover:text-white transition-all">🗺️</button>
                   )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 mt-auto">
              <div className="flex justify-between items-center mb-4">
                 <p className="text-[8px] font-bold text-slate-400 uppercase">👤 {item.inspektor1}</p>
                 {item.timEksekusi && <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">👷 {item.timEksekusi}</p>}
              </div>
              {onEdit && (
                <button onClick={() => onEdit(item)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Kelola / Edit Data</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[1000] flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <img src={previewImage.url} alt="Full Preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" referrerPolicy="no-referrer" />
          <p className="text-white text-[10px] mt-8 font-black uppercase tracking-[0.3em] opacity-60">Ketuk di mana saja untuk kembali</p>
        </div>
      )}
    </div>
  );
};

export default DataViewPage;
