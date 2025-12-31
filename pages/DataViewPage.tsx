
import React, { useState } from 'react';
import { TemuanData } from '../types';

interface DataViewPageProps {
  ulp: string;
  data: TemuanData[];
  onBack: () => void;
  onAddTemuan?: () => void;
  onAddEksekusi?: () => void;
}

const DataViewPage: React.FC<DataViewPageProps> = ({ ulp, data, onBack, onAddTemuan, onAddEksekusi }) => {
  const [filter, setFilter] = useState<'ALL' | 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM'>('ALL');
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  
  const formatDriveUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    if (url.includes('id=')) {
      const idMatch = url.match(/id=([^&]+)/);
      if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
    return url;
  };

  const filteredData = data.filter(item => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Rekapitulasi Data</h2>
          <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">{ulp}</p>
        </div>
      </div>

      {(onAddTemuan || onAddEksekusi) && (
        <div className={`grid ${onAddTemuan && onAddEksekusi ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-8`}>
          {onAddTemuan && (
            <button onClick={onAddTemuan} className="flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wide shadow-md active:scale-95 transition-all">
              <span>➕</span> Tambah Temuan
            </button>
          )}
          {onAddEksekusi && (
            <button onClick={onAddEksekusi} className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wide shadow-md active:scale-95 transition-all">
              <span>🛠️</span> Update Eksekusi
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', 'BELUM EKSEKUSI', 'SUDAH EKSEKUSI', 'BUTUH PADAM'].map((f) => (
          <button
            key={f} onClick={() => setFilter(f as any)}
            className={`whitespace-nowrap px-4 py-2 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wide ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
          >
            {f === 'ALL' ? 'SEMUA' : f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Data Tidak Ditemukan</p>
          </div>
        ) : (
          filteredData.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-indigo-200 transition-all">
              <div className="flex p-4 gap-4">
                <div 
                  className="relative flex-shrink-0 cursor-zoom-in group"
                  onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoTemuan), title: `Foto Temuan: ${item.noTiang}` })}
                >
                   <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-100 relative">
                     <img 
                       src={formatDriveUrl(item.fotoTemuan)} 
                       alt="Temuan" 
                       className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                       referrerPolicy="no-referrer"
                       loading="lazy"
                       onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image')}
                     />
                   </div>
                   <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center text-[10px] shadow-md ${item.status === 'SUDAH EKSEKUSI' ? 'bg-emerald-500 text-white' : item.status === 'BUTUH PADAM' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'}`}>
                      {item.status === 'SUDAH EKSEKUSI' ? '✓' : item.status === 'BUTUH PADAM' ? '⚡' : '●'}
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-[9px] font-bold text-slate-400">ID: {item.id.slice(-6).toUpperCase()}</p>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'SUDAH EKSEKUSI' ? 'text-emerald-700 bg-emerald-50' : item.status === 'BUTUH PADAM' ? 'text-amber-700 bg-amber-50' : 'text-indigo-700 bg-indigo-50'}`}>
                      {item.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{item.noTiang}</h3>
                  <p className="text-[10px] text-slate-500 font-medium truncate mb-1">{item.feeder}</p>
                  <p className="text-xs font-bold text-red-600 line-clamp-1">{item.keterangan}</p>
                </div>
              </div>
              
              {item.status !== 'BELUM EKSEKUSI' && (
                <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-t border-slate-100">
                  <div className="text-[10px] font-bold flex-1">
                    <p className="text-slate-400 uppercase text-[8px] tracking-widest mb-0.5">Update Eksekusi</p>
                    <p className="text-slate-700 uppercase truncate">{item.timEksekusi}</p>
                    <p className="text-slate-400 text-[8px] font-medium">{item.tanggalEksekusi}</p>
                  </div>
                  <div 
                    className="w-10 h-10 rounded-lg overflow-hidden border border-white shadow-sm flex-shrink-0 cursor-zoom-in"
                    onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoEksekusi), title: `Bukti Perbaikan: ${item.noTiang}` })}
                  >
                    <img 
                      src={formatDriveUrl(item.fotoEksekusi)} 
                      className="w-full h-full object-cover" 
                      alt="Execution" 
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100?text=Error')}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
            <p className="text-white text-xs font-bold uppercase tracking-widest">{previewImage.title}</p>
            <button className="text-white bg-white/10 w-10 h-10 rounded-full flex items-center justify-center text-xl">✕</button>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md aspect-square relative" onClick={e => e.stopPropagation()}>
            <img 
              src={previewImage.url} 
              alt="Preview" 
              className="w-full h-full object-contain bg-slate-100" 
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-white/50 text-[10px] mt-6 font-medium uppercase tracking-widest">Sentuh di luar gambar untuk menutup</p>
        </div>
      )}
    </div>
  );
};

export default DataViewPage;
