
import React, { useState, useMemo } from 'react';
import { TemuanData } from '../types';

interface DataViewPageProps {
  ulp: string;
  data: TemuanData[];
  onBack: () => void;
  onAddTemuan?: () => void;
  onAddEksekusi?: () => void;
}

const MONTHS = [
  { val: 1, label: 'Januari' }, { val: 2, label: 'Februari' }, { val: 3, label: 'Maret' },
  { val: 4, label: 'April' }, { val: 5, label: 'Mei' }, { val: 6, label: 'Juni' },
  { val: 7, label: 'Juli' }, { val: 8, label: 'Agustus' }, { val: 9, label: 'September' },
  { val: 10, label: 'Oktober' }, { val: 11, label: 'November' }, { val: 12, label: 'Desember' }
];

const DataViewPage: React.FC<DataViewPageProps> = ({ ulp, data, onBack, onAddTemuan, onAddEksekusi }) => {
  const [filter, setFilter] = useState<'ALL' | 'BELUM EKSEKUSI' | 'SUDAH EKSEKUSI' | 'BUTUH PADAM'>('ALL');
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  
  const formatDriveUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
  };

  const parseIndoDate = (dateStr: string) => {
    try {
      if (!dateStr) return new Date(0);
      const datePart = dateStr.split(',')[0].trim();
      const [day, month, year] = datePart.split('/').map(Number);
      return new Date(year, month - 1, day);
    } catch (e) {
      return new Date(0);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const dDate = parseIndoDate(item.tanggal);
      const matchMonth = dDate.getMonth() + 1 === filterMonth;
      const matchYear = dDate.getFullYear() === filterYear;
      const matchStatus = filter === 'ALL' ? true : item.status === filter;
      return matchMonth && matchYear && matchStatus;
    });
  }, [data, filter, filterMonth, filterYear]);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Monitoring Data</h2>
          <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">{ulp}</p>
        </div>
      </div>
{/* Akses Cepat Petugas Section */}
      {(onAddTemuan || onAddEksekusi) && (
        <div className="mb-8 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Akses Cepat Petugas</p>
          
          {onAddTemuan && (
            <button 
              onClick={onAddTemuan}
              className="w-full flex items-center p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all group"
            >
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl mr-4 group-hover:scale-110 transition-transform">📝</div>
              <div className="text-left flex-1">
                <p className="text-xs font-black uppercase tracking-widest">Tambahkan Temuan Baru</p>
                <p className="text-[9px] font-medium opacity-80 mt-0.5">Kembali ke Formulir Temuan Baru</p>
              </div>
              <span className="text-xl font-light opacity-50">→</span>
            </button>
          )}

          {onAddEksekusi && (
            <button 
              onClick={onAddEksekusi}
              className="w-full flex items-center p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all group"
            >
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl mr-4 group-hover:scale-110 transition-transform">🛠️</div>
              <div className="text-left flex-1">
                <p className="text-xs font-black uppercase tracking-widest">Tambahkan Eksekusi Baru</p>
                <p className="text-[9px] font-medium opacity-80 mt-0.5">Kembali ke Daftar Antrean Eksekusi</p>
              </div>
              <span className="text-xl font-light opacity-50">→</span>
            </button>
          )}
        </div>
      )}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 mb-6 shadow-sm">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3">Filter Periode Temuan</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <select 
            className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none text-slate-700"
            value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}
          >
            {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <select 
            className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none text-slate-700"
            value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['ALL', 'BELUM EKSEKUSI', 'SUDAH EKSEKUSI', 'BUTUH PADAM'].map((f) => (
            <button
              key={f} onClick={() => setFilter(f as any)}
              className={`whitespace-nowrap px-4 py-2 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wide ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
            >
              {f === 'ALL' ? 'SEMUA' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Data Tidak Ditemukan</p>
            <p className="text-[9px] text-slate-300 font-medium italic">Coba ubah filter bulan atau tahun</p>
          </div>
        ) : (
          filteredData.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:border-indigo-200 transition-all">
              <div className="flex p-4 gap-4">
                <div 
                  className="relative flex-shrink-0 cursor-zoom-in group"
                  onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoTemuan), title: `Foto Temuan: ${item.noTiang}` })}
                >
                   <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-100 shadow-inner">
                     <img src={formatDriveUrl(item.fotoTemuan)} alt="Temuan" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">#{item.id.slice(-5)}</p>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${item.status === 'SUDAH EKSEKUSI' ? 'text-emerald-700 bg-emerald-50' : 'text-indigo-700 bg-indigo-50'}`}>
                      {item.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{item.noTiang} / {item.feeder}</h3>
                  <p className="text-[9px] text-slate-400 font-medium truncate mb-1">{item.lokasi || "Alamat tidak tersedia"}</p>
                  <p className="text-xs font-bold text-red-600 line-clamp-1">{item.keterangan}</p>
                  <p className="text-[8px] text-slate-400 mt-1 font-bold">{item.tanggal.split(',')[0]}</p>
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
