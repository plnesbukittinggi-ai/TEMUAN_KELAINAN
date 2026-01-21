
import React, { useState, useMemo } from 'react';
import { TemuanData } from '../types';

interface DataViewPageProps {
  ulp: string;
  data: TemuanData[];
  onBack: () => void;
  onAddTemuan?: () => void;
  onAddEksekusi?: () => void;
  onEdit?: (data: TemuanData) => void;
}

const DataViewPage: React.FC<DataViewPageProps> = ({ ulp, data, onBack, onAddTemuan, onAddEksekusi, onEdit }) => {
  const [filter, setFilter] = useState<'ALL' | 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM' | 'TIDAK DAPAT IZIN'>('ALL');
  const [selectedFeeder, setSelectedFeeder] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  
  const formatDriveUrl = (url?: string) => {
    if (!url) return '';
    if (url.indexOf('data:image') === 0) return url;
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
  };

  const parseIndoDate = (dateStr: string) => {
    try {
      if (!dateStr) return new Date(0);
      // Support formats: "DD/MM/YYYY" or "DD/MM/YYYY, HH:mm:ss"
      const cleanStr = dateStr.replace('pukul ', '').replace('.', ':');
      const parts = cleanStr.split(',');
      const dPart = parts[0].trim();
      const tPart = parts[1] ? parts[1].trim() : null;
      
      const [day, month, year] = dPart.split('/').map(Number);
      
      if (tPart) {
        const [h, m, s] = tPart.split(':').map(val => Number(val.trim()));
        return new Date(year, month - 1, day, h || 0, m || 0, s || 0);
      }
      return new Date(year, month - 1, day);
    } catch (e) {
      return new Date(0);
    }
  };

  const uniqueFeeders = useMemo(() => {
    const feeders = data.map(item => item.feeder).filter(Boolean);
    return Array.from(new Set(feeders)).sort();
  }, [data]);

  const sortedAndFilteredData = useMemo(() => {
    // First, filter the data
    const filtered = data.filter(item => {
      const dDate = parseIndoDate(item.tanggal);
      const dDateNoTime = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());

      let matchDate = true;
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (dDateNoTime < s) matchDate = false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(0, 0, 0, 0);
        if (dDateNoTime > e) matchDate = false;
      }

      const matchStatus = filter === 'ALL' ? true : item.status === filter;
      const matchFeeder = !selectedFeeder || item.feeder === selectedFeeder;
      
      return matchDate && matchStatus && matchFeeder;
    });

    // Then, sort by newest date (descending)
    return filtered.sort((a, b) => {
      const timeA = parseIndoDate(a.tanggal).getTime();
      const timeB = parseIndoDate(b.tanggal).getTime();
      return timeB - timeA;
    });
  }, [data, filter, selectedFeeder, startDate, endDate]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedFeeder('');
    setFilter('ALL');
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'SUDAH EKSEKUSI': return 'text-emerald-700 bg-emerald-50';
      case 'BUTUH PADAM': return 'text-amber-700 bg-amber-50';
      case 'BUTUH IZIN TEBANG': return 'text-orange-700 bg-orange-50';
      default: return 'text-indigo-700 bg-indigo-50';
    }
  };

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Monitoring Data</h2>
          <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">{ulp}</p>
        </div>
      </div>

      {(onAddTemuan || onAddEksekusi) && (
        <div className="mb-8 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Pintasan Petugas</p>
          <div className="grid grid-cols-2 gap-3">
             {onAddTemuan && (
                <button 
                  onClick={onAddTemuan}
                  className="flex flex-col items-center p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                  <span className="text-xl mb-1">📝</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Temuan Baru</p>
                </button>
             )}
             {onAddEksekusi && (
                <button 
                  onClick={onAddEksekusi}
                  className="flex flex-col items-center p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all"
                >
                  <span className="text-xl mb-1">🛠️</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Eksekusi Baru</p>
                </button>
             )}
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-3xl border border-slate-200 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-3 ml-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penyaringan Data</p>
          {(startDate || endDate || selectedFeeder || filter !== 'ALL') && (
            <button onClick={resetFilters} className="text-[8px] font-black text-red-500 uppercase tracking-widest">Reset</button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="mb-4">
          <select 
            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500"
            value={selectedFeeder}
            onChange={(e) => setSelectedFeeder(e.target.value)}
          >
            <option value="">-- Semua Feeder --</option>
            {uniqueFeeders.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['ALL', 'BELUM EKSEKUSI', 'SUDAH EKSEKUSI', 'BUTUH PADAM', 'BUTUH IZIN TEBANG'].map((f) => (
            <button
              key={f} onClick={() => setFilter(f as any)}
              className={`whitespace-nowrap px-4 py-2 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wide ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
            >
              {f === 'ALL' ? 'SEMUA' : f === 'TIDAK DAPAT IZIN' ? 'TIDAK DAPAT IZIN' : f}
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
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-indigo-200 transition-all group">
              <div className="flex p-4 gap-4">
                <div 
                  className="relative flex-shrink-0 cursor-zoom-in"
                  onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoTemuan), title: `Foto Temuan: ${item.noTiang}` })}
                >
                   <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
                     <img src={formatDriveUrl(item.fotoTemuan)} alt="Temuan" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   </div>
                </div>
                <div className="flex-1 min-w-0 relative">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">#{item.id.slice(-5)}</p>
                    <div className="flex items-center gap-2">
                       {onEdit && (
                         <button 
                           onClick={() => onEdit(item)}
                           className="text-[10px] text-slate-400 hover:text-indigo-600 p-1"
                           title="Edit Data"
                         >
                           ✏️
                         </button>
                       )}
                       <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${getStatusBadgeClass(item.status)}`}>
                        {item.status.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{item.noTiang} / {item.feeder}</h3>
                  <p className="text-xs font-bold text-red-600 line-clamp-1">{item.keterangan}</p>
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-0.5 italic">{item.alamat || item.lokasi || 'Alamat tidak tersedia'}</p>
                  <p className="text-[8px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">{item.tanggal.split(',')[0]}</p>
                  
                  {item.status === 'SUDAH EKSEKUSI' && (
                    <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2">
                       <div 
                         className="w-6 h-6 rounded bg-slate-100 cursor-zoom-in overflow-hidden"
                         onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoEksekusi), title: `Bukti Eksekusi: ${item.noTiang}` })}
                       >
                         <img src={formatDriveUrl(item.fotoEksekusi)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       </div>
                       <p className="text-[8px] font-bold text-emerald-600 uppercase">Selesai: {item.tanggalEksekusi?.split(',')[0]}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <img src={previewImage.url} alt="Preview" className="w-full max-w-md aspect-square object-contain bg-slate-100 rounded-3xl" referrerPolicy="no-referrer" />
          <p className="text-white text-[10px] mt-4 font-bold uppercase tracking-widest">Sentuh untuk menutup</p>
        </div>
      )}
    </div>
  );
};

export default DataViewPage;
