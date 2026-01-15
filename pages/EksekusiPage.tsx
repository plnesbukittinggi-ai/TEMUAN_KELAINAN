
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LoginSession, TemuanData } from '../types';
import { compressImage } from '../utils/imageUtils';

interface EksekusiPageProps {
  session: LoginSession;
  data: TemuanData[];
  onBack: () => void;
  onSave: (data: TemuanData) => void;
  initialData?: TemuanData; // Support for Edit mode
}

const EksekusiPage: React.FC<EksekusiPageProps> = ({ session, data, onBack, onSave, initialData }) => {
  const [selectedTemuan, setSelectedTemuan] = useState<TemuanData | null>(initialData || null);
  const [executionPhoto, setExecutionPhoto] = useState<string>(initialData?.fotoEksekusi || '');
  const [executionDate, setExecutionDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set initial execution date for editing if available
  useEffect(() => {
    if (initialData?.tanggalEksekusi) {
        // Parse date from id-ID string back to YYYY-MM-DD for input date
        try {
            const dateStr = initialData.tanggalEksekusi.split(',')[0].trim();
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const formatted = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                setExecutionDate(formatted);
            }
        } catch (e) {}
    }
  }, [initialData]);

  const formatDriveUrl = (url?: string) => {
    if (!url) return '';
    if (url.indexOf('data:image') === 0) return url;
    if (url.includes('drive.google.com/file/d/')) {
      const id = url.split('/d/')[1]?.split('/')[0];
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    }
    return url;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const compressed = await compressImage(base64);
          setExecutionPhoto(compressed);
        } catch (err) {
          alert('Gagal memproses gambar perbaikan.');
        } finally {
          setIsCompressing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openPicker = (mode: 'camera' | 'gallery') => {
    if (fileInputRef.current) {
      if (mode === 'camera') fileInputRef.current.setAttribute('capture', 'environment');
      else fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleAction = async (newStatus: 'SUDAH EKSEKUSI' | 'BUTUH PADAM') => {
    if (!selectedTemuan || !executionPhoto) {
      alert('⚠️ Foto bukti perbaikan wajib dilampirkan!');
      return;
    }
    
    setIsSaving(true);
    
    const finalDate = executionDate 
      ? new Date(executionDate).toLocaleDateString('id-ID')
      : new Date().toLocaleString('id-ID');

    const updated: TemuanData = {
      ...selectedTemuan,
      status: newStatus, 
      tanggalEksekusi: finalDate,
      fotoEksekusi: executionPhoto,
      timEksekusi: initialData?.timEksekusi || session.team || 'Team Lapangan'
    };
    
    try {
      await onSave(updated);
      if (!initialData) {
        setSelectedTemuan(null);
        setExecutionPhoto('');
        setExecutionDate('');
      }
    } catch (err) {
      alert("❌ Gagal menyimpan data eksekusi.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredQueue = useMemo(() => {
    return data.filter(item => {
      if (!startDate && !endDate) return true;
      try {
        const datePart = item.tanggal.split(',')[0].trim();
        const [day, month, year] = datePart.split('/').map(Number);
        const itemDate = new Date(year, month - 1, day);
        itemDate.setHours(0,0,0,0);

        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0,0,0,0);
          if (itemDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(0,0,0,0);
          if (itemDate > e) return false;
        }
        return true;
      } catch (e) { return true; }
    });
  }, [data, startDate, endDate]);

  return (
    <div className="pb-10">
      <div className="flex items-center mb-8 gap-4">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{initialData ? 'Edit Eksekusi' : 'Antrean Eksekusi'}</h2>
          <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">{initialData ? 'MODE EDIT' : `${session.team || 'TIM'} • ${session.ulp}`}</p>
        </div>
      </div>

      {!initialData && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 mb-6 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Saring Tanggal Temuan</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
      )}

      {filteredQueue.length === 0 && !initialData ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Tidak ada antrean</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(initialData ? [initialData] : filteredQueue).map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group">
              <div className="flex p-4 gap-4">
                <div 
                  className="relative flex-shrink-0 cursor-zoom-in"
                  onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoTemuan), title: `Foto Temuan: ${item.noTiang}` })}
                >
                  <img src={formatDriveUrl(item.fotoTemuan)} alt="Temuan" className="w-24 h-24 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/5 rounded-xl group-hover:bg-black/0 transition-all"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[9px] font-bold text-slate-400">#{item.id.slice(-5)}</p>
                    <div className="flex items-center gap-1.5">
                      {item.geotag && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${item.geotag}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider hover:bg-blue-100 transition-colors"
                        >
                          📍 Peta
                        </a>
                      )}
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${item.status === 'BUTUH PADAM' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{item.noTiang} / {item.feeder}</h3>
                  <p className="text-xs font-bold text-red-600 line-clamp-1">{item.keterangan}</p>
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-0.5 italic">{item.alamat || item.lokasi || 'Alamat tidak tersedia'}</p>
                  <p className="text-[8px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">{item.tanggal.split(',')[0]}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTemuan(item)}
                className="w-full bg-slate-900 text-white font-bold py-4 text-xs uppercase tracking-[0.2em] active:bg-slate-800 transition-colors"
              >
                {initialData ? 'EDIT DETAIL EKSEKUSI' : 'PROSES EKSEKUSI'}
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedTemuan && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Form Laporan Eksekusi</h3>
              {!isSaving && !initialData && <button onClick={() => setSelectedTemuan(null)} className="text-slate-400 p-2">✕</button>}
              {initialData && <button onClick={onBack} className="text-slate-400 p-2">✕</button>}
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Aset Target</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{selectedTemuan.noTiang} • {selectedTemuan.feeder}</p>
                <p className="text-[10px] text-slate-600 mt-1 italic">{selectedTemuan.alamat || selectedTemuan.lokasi}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">Tanggal Eksekusi Manual (Opsional)</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-indigo-700 outline-none"
                  value={executionDate}
                  onChange={(e) => setExecutionDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">Bukti Foto Perbaikan *</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 min-h-[220px]">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  
                  {isCompressing ? (
                    <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                  ) : executionPhoto ? (
                    <div className="relative w-full">
                      <img src={executionPhoto.includes('http') ? executionPhoto : executionPhoto} alt="Preview" className="w-full h-56 object-cover rounded-xl" />
                      {!isSaving && (
                        <button 
                          onClick={() => setExecutionPhoto('')}
                          className="absolute top-2 right-2 bg-slate-900/80 text-white w-8 h-8 rounded-lg flex items-center justify-center"
                        >✕</button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button type="button" onClick={() => openPicker('camera')} className="flex flex-col items-center p-5 bg-white border border-slate-200 rounded-2xl">
                        <span className="text-xl mb-2">📷</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Kamera</span>
                      </button>
                      <button type="button" onClick={() => openPicker('gallery')} className="flex flex-col items-center p-5 bg-white border border-slate-200 rounded-2xl">
                        <span className="text-xl mb-2">🖼️</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Galeri</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleAction('SUDAH EKSEKUSI')}
                    disabled={isSaving || isCompressing}
                    className={`py-4 rounded-xl shadow-lg uppercase text-[10px] font-bold ${isSaving || isCompressing ? 'bg-slate-300' : 'bg-emerald-600 text-white'}`}
                  >
                    {isSaving ? '⏳' : initialData ? 'Update Selesai' : '✅ SELESAI'}
                  </button>
                  <button 
                    onClick={() => handleAction('BUTUH PADAM')}
                    disabled={isSaving || isCompressing}
                    className={`py-4 rounded-xl shadow-lg uppercase text-[10px] font-bold ${isSaving || isCompressing ? 'bg-slate-300' : 'bg-amber-500 text-white'}`}
                  >
                    ⚡ PADAM
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="w-full max-w-md relative">
            <img src={previewImage.url} alt="Preview" className="w-full aspect-square object-contain bg-slate-100 rounded-3xl" referrerPolicy="no-referrer" />
            <div className="absolute bottom-4 left-0 right-0 text-center">
               <p className="text-white text-[11px] font-black uppercase tracking-widest bg-black/40 inline-block px-4 py-2 rounded-full backdrop-blur-md">
                 {previewImage.title}
               </p>
            </div>
          </div>
          <p className="text-white/50 text-[10px] mt-6 font-bold uppercase tracking-[0.2em]">Sentuh di mana saja untuk menutup</p>
        </div>
      )}
    </div>
  );
};

export default EksekusiPage;
