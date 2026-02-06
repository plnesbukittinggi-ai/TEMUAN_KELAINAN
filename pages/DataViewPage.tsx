
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

// Helper to get default month dates
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

  return {
    start: formatDate(firstDay),
    end: formatDate(lastDay)
  };
};

const DataViewPage: React.FC<DataViewPageProps> = ({ ulp, data, onBack, onAddTemuan, onAddEksekusi, onEdit, currentSession }) => {
  const initialDates = getDefaultMonthDates();
  const [filter, setFilter] = useState<'ALL' | 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM' | 'TIDAK DAPAT IZIN' | 'KENDALA MATERIAL'>('ALL');
  const [selectedFeeder, setSelectedFeeder] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(initialDates.start);
  const [endDate, setEndDate] = useState<string>(initialDates.end);
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  
  // State for toggling "Only My Data" filter
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
        
        const tPart = parts[1] ? parts[1].trim() : null;
        if (tPart) {
          const tParts = tPart.split(':');
          return new Date(year, month, day, parseInt(tParts[0] || '0'), parseInt(tParts[1] || '0'), parseInt(tParts[2] || '0'));
        }
        return new Date(year, month, day);
      }
    } catch (e) {
      return new Date(0);
    }
    return new Date(0);
  };

  const uniqueFeeders = useMemo(() => {
    const feeders = data.map(item => item.feeder).filter(Boolean);
    return Array.from(new Set(feeders)).sort();
  }, [data]);

  const sortedAndFilteredData = useMemo(() => {
    const filtered = data.filter(item => {
      const dDate = parseRobustDate(item.tanggal);
      const dDateNoTime = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());

      let matchDate = true;
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (dDateNoTime < s) matchDate = false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        if (dDateNoTime > e) matchDate = false;
      }

      const matchStatus = filter === 'ALL' ? true : item.status === filter;
      const matchFeeder = !selectedFeeder || item.feeder === selectedFeeder;
      
      // Inspector Filter Logic
      let matchInspector = true;
      if (showOnlyMyData && (currentSession?.inspektor1 || currentSession?.inspektor2)) {
        const myNames = [currentSession.inspektor1, currentSession.inspektor2].filter(Boolean);
        matchInspector = myNames.includes(item.inspektor1) || myNames.includes(item.inspektor2);
      }
      
      return matchDate && matchStatus && matchFeeder && matchInspector;
    });

    return filtered.sort((a, b) => {
      const timeA = parseRobustDate(a.tanggal).getTime();
      const timeB = parseRobustDate(b.tanggal).getTime();
      if (timeB !== timeA) return timeB - timeA;
      const pA = Number(a.prioritas || 3);
      const pB = Number(b.prioritas || 3);
      return pA - pB;
    });
  }, [data, filter, selectedFeeder, startDate, endDate, showOnlyMyData, currentSession]);

  const resetFilters = () => {
    const dates = getDefaultMonthDates();
    setStartDate(dates.start);
    setEndDate(dates.end);
    setSelectedFeeder('');
    setFilter('ALL');
    setShowOnlyMyData(!!(currentSession?.inspektor1 || currentSession?.inspektor2));
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'SUDAH EKSEKUSI': return 'text-emerald-700 bg-emerald-50';
      case 'BUTUH PADAM': return 'text-amber-700 bg-amber-50';
      case 'TIDAK DAPAT IZIN': return 'text-orange-700 bg-orange-50';
      case 'KENDALA MATERIAL': return 'text-red-700 bg-red-50';
      default: return 'text-indigo-700 bg-indigo-50';
    }
  };

  const renderStars = (count: number) => {
    const priority = Number(count || 1);
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: priority }).map((_, i) => (
          <span key={i} className="text-[10px] drop-shadow-sm">⭐</span>
        ))}
      </div>
    );
  };

  const isInspector = !!(currentSession?.inspektor1 || currentSession?.inspektor2);

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all group">
          <span className="text-sm font-black text-slate-900 group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Logout</span>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Monitoring Data</h2>
          <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">{ulp}</p>
        </div>
      </div>

      {(onAddTemuan || onAddEksekusi) && (
        <div className="grid grid-cols-1 gap-3 mb-6 animate-slide-up">
          {onAddTemuan && (
            <button 
              onClick={onAddTemuan}
              className="flex items-center justify-center gap-4 p-5 bg-slate-900 text-white rounded-[2rem] shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all border border-slate-800 group"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📝
              </div>
              <div className="text-left flex-1">
                <p className="text-xs font-black uppercase tracking-widest">Tambahkan Temuan Baru</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">Lapor Kelainan Jaringan</p>
              </div>
              <span className="text-slate-500 text-lg">→</span>
            </button>
          )}
          {onAddEksekusi && (
            <button 
              onClick={onAddEksekusi}
              className="flex items-center justify-center gap-4 p-5 bg-emerald-600 text-white rounded-[2rem] shadow-xl hover:bg-emerald-700 active:scale-[0.98] transition-all border border-emerald-500 group"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🛠️
              </div>
              <div className="text-left flex-1">
                <p className="text-xs font-black uppercase tracking-widest">Tambahkan Eksekusi Baru</p>
                <p className="text-[9px] text-emerald-100 font-bold uppercase tracking-tighter mt-0.5">Input Hasil Perbaikan</p>
              </div>
              <span className="text-emerald-300 text-lg">→</span>
            </button>
          )}
        </div>
      )}

      <div className="bg-white p-5 rounded-3xl border border-slate-200 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-3 ml-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penyaringan Data</p>
          <div className="flex gap-4 items-center">
            {isInspector && (
              <button 
                onClick={() => setShowOnlyMyData(!showOnlyMyData)} 
                className={`text-[8px] font-black uppercase tracking-widest transition-all px-2 py-1 rounded-md ${showOnlyMyData ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                {showOnlyMyData ? 'Data Saya' : 'Semua Inspektor'}
              </button>
            )}
            <button onClick={resetFilters} className="text-[8px] font-black text-red-500 uppercase tracking-widest">Reset</button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
             <label className="text-[7px] font-black text-slate-300 uppercase ml-1">Tgl Mulai</label>
             <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
             <label className="text-[7px] font-black text-slate-300 uppercase ml-1">Tgl Akhir</label>
             <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <select 
            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none"
            value={selectedFeeder}
            onChange={(e) => setSelectedFeeder(e.target.value)}
          >
            <option value="">-- Semua Feeder --</option>
            {uniqueFeeders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['ALL', 'BELUM EKSEKUSI', 'SUDAH EKSEKUSI', 'BUTUH PADAM', 'TIDAK DAPAT IZIN', 'KENDALA MATERIAL'].map((f) => (
            <button
              key={f} onClick={() => setFilter(f as any)}
              className={`whitespace-nowrap px-4 py-2 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wide ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
            >
              {f === 'ALL' ? 'SEMUA' : f === 'TIDAK DAPAT IZIN' ? 'TDK IZIN' : f === 'KENDALA MATERIAL' ? 'KENDALA' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {sortedAndFilteredData.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Data Tidak Ditemukan</p>
          </div>
        ) : (
          sortedAndFilteredData.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-indigo-200 transition-all flex flex-col">
              <div className="px-4 pt-3 pb-1 border-b border-slate-50 flex justify-between items-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  🗓️ {parseRobustDate(item.tanggal).toLocaleDateString('id-ID')}
                </p>
                <div className="flex flex-col items-end">
                  <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                  {item.status === 'SUDAH EKSEKUSI' && (
                    <p className="text-[7px] font-bold text-emerald-600 mt-1 uppercase tracking-tighter">
                      {item.timEksekusi} - {item.tanggalEksekusi ? parseRobustDate(item.tanggalEksekusi).toLocaleDateString('id-ID') : '-'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex p-4 gap-4 pb-2">
                <div 
                  className="relative flex-shrink-0 cursor-zoom-in"
                  onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoTemuan), title: `Foto Temuan: ${item.noTiang}` })}
                >
                   <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
                     <img src={formatDriveUrl(item.fotoTemuan)} alt="Temuan" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   </div>
                   <p className="text-[7px] font-black text-center mt-1 uppercase text-slate-400">Temuan</p>
                </div>

                {item.status === 'SUDAH EKSEKUSI' && item.fotoEksekusi && (
                  <div 
                    className="relative flex-shrink-0 cursor-zoom-in"
                    onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoEksekusi), title: `Foto Eksekusi: ${item.noTiang}` })}
                  >
                    <div className="w-20 h-20 bg-emerald-50 rounded-xl overflow-hidden border border-emerald-100">
                      <img src={formatDriveUrl(item.fotoEksekusi)} alt="Eksekusi" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <p className="text-[7px] font-black text-center mt-1 uppercase text-emerald-500">Eksekusi</p>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    {renderStars(item.prioritas)}
                  </div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tight mb-0.5">
                    {item.feeder}
                  </p>
                  <h3 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight mb-0.5">
                    {item.noTiang}
                  </h3>
                  <p className="text-xs font-bold text-red-600 line-clamp-1">{item.keterangan}</p>
                </div>
              </div>

              <div className="px-4 pb-3">
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-600 font-bold italic flex-1 leading-tight">
                    📍 {item.alamat || item.lokasi || 'Alamat tidak tersedia'}
                  </p>
                  {item.geotag && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); openInMaps(item.geotag); }}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg active:scale-90 transition-all hover:bg-white shadow-sm"
                    >
                      <span className="text-[10px]">🗺️</span>
                      <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Map</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="px-4 pb-3 flex gap-2">
                 <p className="text-[8px] font-bold text-slate-400 uppercase italic">
                   Input oleh: {item.inspektor1}{item.inspektor2 ? ` & ${item.inspektor2}` : ''}
                 </p>
              </div>

              {onEdit && (
                <button 
                  onClick={() => onEdit(item)}
                  className="bg-slate-50 border-t border-slate-100 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  {['SUDAH EKSEKUSI', 'BUTUH PADAM', 'TIDAK DAPAT IZIN', 'KENDALA MATERIAL'].includes(item.status) 
                    ? 'PROSES EKSEKUSI' 
                    : 'Ubah Data / Edit'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="w-full max-w-md relative">
            <img src={previewImage.url} alt="Preview" className="w-full aspect-square object-contain bg-slate-100 rounded-3xl" referrerPolicy="no-referrer" />
          </div>
          <p className="text-white text-[10px] mt-6 font-bold uppercase tracking-[0.2em]">Sentuh di mana saja untuk menutup</p>
        </div>
      )}
    </div>
  );
};

export default DataViewPage;
