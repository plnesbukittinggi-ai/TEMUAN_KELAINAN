
import React, { useState, useRef } from 'react';
import { LoginSession, TemuanData } from '../types';
import { compressImage } from '../utils/imageUtils';

interface EksekusiPageProps {
  session: LoginSession;
  data: TemuanData[];
  onBack: () => void;
  onSave: (data: TemuanData) => void;
}

const EksekusiPage: React.FC<EksekusiPageProps> = ({ session, data, onBack, onSave }) => {
  const [selectedTemuan, setSelectedTemuan] = useState<TemuanData | null>(null);
  const [executionPhoto, setExecutionPhoto] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (mode === 'camera') {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const openInMaps = (geotag?: string) => {
    if (!geotag) {
      alert("Koordinat tidak tersedia untuk temuan ini.");
      return;
    }
    const cleanCoords = geotag.replace(/\s/g, '');
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanCoords)}`;
    window.open(url, '_blank');
  };

  const handleAction = async (newStatus: 'SUDAH EKSEKUSI' | 'BUTUH PADAM') => {
    if (!selectedTemuan || !executionPhoto) {
      alert('⚠️ Foto bukti perbaikan wajib dilampirkan!');
      return;
    }
    
    setIsSaving(true);
    const updated: TemuanData = {
      ...selectedTemuan,
      status: newStatus, 
      tanggalEksekusi: new Date().toLocaleString('id-ID'),
      fotoEksekusi: executionPhoto,
      timEksekusi: session.team || 'Team Lapangan'
    };
    
    try {
      await onSave(updated);
      setSelectedTemuan(null);
      setExecutionPhoto('');
    } catch (err) {
      alert("❌ Gagal menyimpan data eksekusi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <div className="flex items-center mb-8 gap-4">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Daftar Antrean Eksekusi</h2>
          <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">{session.team || 'TIM'} • {session.ulp}</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Semua Temuan Teratasi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all hover:border-emerald-200">
              <div className="flex p-4 gap-4">
                <div className="relative flex-shrink-0">
                  <img 
                    src={formatDriveUrl(item.fotoTemuan)} 
                    alt="Temuan" 
                    className="w-24 h-24 object-cover rounded-xl border border-slate-100 bg-slate-50"
                    referrerPolicy="no-referrer"
                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image')}
                  />
                  {item.status === 'BUTUH PADAM' && (
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white w-7 h-7 rounded-lg flex items-center justify-center text-[10px] shadow-md border-2 border-white animate-pulse">⚡</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[9px] font-bold text-slate-400">ID: {item.id.slice(-6).toUpperCase()}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'BUTUH PADAM' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {item.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{item.noTiang} / {item.feeder}</h3>
                    <p className="text-[8px] font-bold text-slate-400 truncate uppercase tracking-tight">{item.lokasi}</p>
                    <p className="text-xs font-bold text-red-600 line-clamp-1">{item.keterangan}</p>
                  </div>
                  
                  {item.geotag && (
                    <button 
                      onClick={() => openInMaps(item.geotag)}
                      className="mt-2 flex items-center justify-center gap-1.5 text-[9px] font-bold text-indigo-600 bg-indigo-50/50 py-2 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                    >
                      Buka di Google Maps
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setSelectedTemuan(item)}
                className={`w-full ${item.status === 'BUTUH PADAM' ? 'bg-amber-600' : 'bg-slate-900'} text-white font-bold py-4 text-xs hover:opacity-90 transition-all uppercase tracking-[0.2em] border-t border-white/10`}
              >
                PROSES EKSEKUSI
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedTemuan && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto" onClick={() => !isSaving && setSelectedTemuan(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-slide-up flex flex-col my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Form Laporan Eksekusi</h3>
              {!isSaving && <button onClick={() => setSelectedTemuan(null)} className="text-slate-400 hover:text-red-500 text-xl p-2">✕</button>}
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aset Target</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{selectedTemuan.noTiang} • {selectedTemuan.feeder}</p>
                <p className="text-[10px] text-red-600 font-bold mt-1">Kelainan: {selectedTemuan.keterangan}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">Bukti Foto Perbaikan *</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 min-h-[220px]">
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  
                  {isCompressing ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Memproses Foto...</p>
                    </div>
                  ) : executionPhoto ? (
                    <div className="relative w-full">
                      <img src={executionPhoto} alt="Preview" className="w-full h-56 object-cover rounded-xl shadow-inner" />
                      {!isSaving && (
                        <button 
                          onClick={() => setExecutionPhoto('')}
                          className="absolute top-2 right-2 bg-slate-900/80 text-white w-8 h-8 rounded-lg shadow-lg flex items-center justify-center"
                        >✕</button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center">
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button 
                          type="button" 
                          onClick={() => openPicker('camera')}
                          className="flex flex-col items-center justify-center p-5 bg-white border border-slate-200 rounded-2xl transition-all hover:bg-indigo-50 hover:border-indigo-200 active:scale-95 group"
                        >
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl mb-2 shadow-sm group-hover:scale-110 transition-transform">📷</div>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Kamera</span>
                        </button>
                        
                        <button 
                          type="button" 
                          onClick={() => openPicker('gallery')}
                          className="flex flex-col items-center justify-center p-5 bg-white border border-slate-200 rounded-2xl transition-all hover:bg-emerald-50 hover:border-emerald-200 active:scale-95 group"
                        >
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl mb-2 shadow-sm group-hover:scale-110 transition-transform">🖼️</div>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Galeri</span>
                        </button>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-tighter text-center">Ukuran akan otomatis dikompresi</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
               <div className="grid grid-cols-2 gap-3 mb-2">
                  <button 
                    onClick={() => handleAction('SUDAH EKSEKUSI')}
                    disabled={isSaving || isCompressing}
                    className={`py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-[10px] font-bold flex items-center justify-center gap-2 ${isSaving || isCompressing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
                  >
                    {isSaving ? '⏳ Menyimpan...' : '✅ SELESAI'}
                  </button>
                  <button 
                    onClick={() => handleAction('BUTUH PADAM')}
                    disabled={isSaving || isCompressing}
                    className={`py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-[10px] font-bold flex items-center justify-center gap-2 ${isSaving || isCompressing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'}`}
                  >
                    {isSaving ? '...' : '⚡ BUTUH PADAM'}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 text-center font-medium italic">Pastikan data sudah benar sebelum menyimpan.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EksekusiPage;
