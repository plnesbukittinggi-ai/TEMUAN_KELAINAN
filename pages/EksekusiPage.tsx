
import React, { useState, useRef, useMemo } from 'react';
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
  const [executionDate, setExecutionDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
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
      dDate.setHours(0, 0, 0, 0);

      let matchDate = true;
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        if (dDate < s) matchDate = false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(0, 0, 0, 0);
        if (dDate > e) matchDate = false;
      }
      return matchDate;
    });
  }, [data, startDate, endDate]);

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
    
    // Jika tanggal manual diisi, gunakan locale date string (tanpa jam)
    // Jika kosong, gunakan waktu saat ini (dengan jam untuk akurasi otomatis)
    const finalDate = executionDate 
      ? new Date(executionDate).toLocaleDateString('id-ID')
      : new Date().toLocaleString('id-ID');

    const updated: TemuanData = {
      ...selectedTemuan,
      status: newStatus, 
      tanggalEksekusi: finalDate,
      fotoEksekusi: executionPhoto,
      timEksekusi: session.team || 'Team Lapangan'
    };
    
    try {
      await onSave(updated);
      setSelectedTemuan(null);
      setExecutionPhoto('');
      setExecutionDate('');
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
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Antrean Eksekusi</h2>
          <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">{session.team || 'TIM'} • {session.ulp}</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-3 ml-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saring Tanggal Temuan</p>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-[8px] font-black text-red-500 uppercase tracking-widest">Reset</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Dari</label>
            <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none text-slate-700" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Sampai</label>
            <input type="date" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none text-slate-700" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Tidak ada antrean</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredData.map((item) => (
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
                      <p className="text-[9px] font-bold text-slate-400">#{item.id.slice(-5)}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'BUTUH PADAM' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {item.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{item.noTiang} / {item.feeder}</h3>
                    <p className="text-xs font-bold text-red-600 line-clamp-1">{item.keterangan}</p>
                    <p className="text-[8px] text-slate-400 mt-1 font-bold">{item.tanggal.split(',')[0]}</p>
                  </div>
                  
                  {item.geotag && (
                    <button 
                      onClick={() => openInMaps(item.geotag)}
                      className="mt-2 text-[9px] font-bold text-indigo-600 bg-indigo-50/50 py-2 rounded-lg border border-indigo-100"
                    >
                      Buka Maps
                    </button>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setSelectedTemuan(item)}
                className="w-full bg-slate-900 text-white font-bold py-4 text-xs uppercase tracking-[0.2em] border-t border-white/10"
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
              {!isSaving && <button onClick={() => setSelectedTemuan(null)} className="text-slate-400 p-2">✕</button>}
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aset Target</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{selectedTemuan.noTiang} • {selectedTemuan.feeder}</p>
                <p className="text-[10px] text-red-600 font-bold mt-1">Kelainan: {selectedTemuan.keterangan}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">Tanggal Eksekusi Manual (Opsional)</label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-100"
                  value={executionDate}
                  onChange={(e) => setExecutionDate(e.target.value)}
                />
                <p className="text-[8px] text-slate-400 mt-1.5 ml-1 italic">* Jika kosong, otomatis menggunakan tanggal & waktu hari ini.</p>
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
                    <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full mb-3"></div>
                  ) : executionPhoto ? (
                    <div className="relative w-full">
                      <img src={executionPhoto} alt="Preview" className="w-full h-56 object-cover rounded-xl" />
                      {!isSaving && (
                        <button 
                          onClick={() => setExecutionPhoto('')}
                          className="absolute top-2 right-2 bg-slate-900/80 text-white w-8 h-8 rounded-lg flex items-center justify-center"
                        >✕</button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button 
                        type="button" 
                        onClick={() => openPicker('camera')}
                        className="flex flex-col items-center p-5 bg-white border border-slate-200 rounded-2xl transition-all"
                      >
                        <span className="text-xl mb-2">📷</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Kamera</span>
                      </button>
                      
                      <button 
                        type="button" 
                        onClick={() => openPicker('gallery')}
                        className="flex flex-col items-center p-5 bg-white border border-slate-200 rounded-2xl transition-all"
                      >
                        <span className="text-xl mb-2">🖼️</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Galeri</span>
                      </button>
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
                    className={`py-4 rounded-xl shadow-lg uppercase text-[10px] font-bold ${isSaving || isCompressing ? 'bg-slate-300' : 'bg-emerald-600 text-white'}`}
                  >
                    {isSaving ? '⏳' : '✅ SELESAI'}
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
    </div>
  );
};

export default EksekusiPage;
