import React, { useState, useRef, useMemo, useEffect } from 'react';
import { LoginSession, TemuanData } from '../types';
import { compressImage } from '../utils/imageUtils';

interface EksekusiPageProps {
  session: LoginSession;
  data: TemuanData[];
  onBack: () => void;
  onSave: (data: TemuanData) => Promise<void> | void;
  initialData?: TemuanData;
}

type EksekusiSubFilter = 'BELUM EKSEKUSI' | 'BUTUH PADAM' | 'TIDAK DAPAT IZIN' | 'KENDALA MATERIAL';

const EksekusiPage: React.FC<EksekusiPageProps> = ({ session, data, onBack, onSave, initialData }) => {
  const [selectedTemuan, setSelectedTemuan] = useState<TemuanData | null>(initialData || null);
  const [executionPhoto, setExecutionPhoto] = useState<string>(initialData?.fotoEksekusi || '');
  const [executionDate, setExecutionDate] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>(initialData?.timEksekusi || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  const [subFilter, setSubFilter] = useState<EksekusiSubFilter>('BELUM EKSEKUSI');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (e) { return new Date(0); }
    return new Date(0);
  };

  useEffect(() => {
    if (initialData?.tanggalEksekusi) {
      try {
        const d = parseRobustDate(initialData.tanggalEksekusi);
        if (d.getTime() > 0) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setExecutionDate(`${year}-${month}-${day}`);
        }
      } catch (e) { console.error("Date parse error", e); }
    }
    if (initialData?.fotoEksekusi) setExecutionPhoto(initialData.fotoEksekusi);
    if (initialData?.timEksekusi) setSelectedTeam(initialData.timEksekusi);
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
        } catch (err) { alert('Gagal memproses gambar perbaikan.'); }
        finally { setIsCompressing(false); }
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

  const handleAction = async (newStatus: 'SUDAH EKSEKUSI' | 'BUTUH PADAM' | 'TIDAK DAPAT IZIN' | 'KENDALA MATERIAL') => {
    if (!selectedTemuan) return;
    if (!selectedTeam) { alert('⚠️ Tim Kerja wajib dipilih!'); return; }
    if (!executionPhoto) { alert('⚠️ Foto bukti perbaikan wajib dilampirkan!'); return; }
    
    setIsSaving(true);
    let finalDateString = new Date().toLocaleDateString('id-ID');
    if (executionDate) {
      const [year, month, day] = executionDate.split('-').map(Number);
      finalDateString = new Date(year, month - 1, day).toLocaleDateString('id-ID');
    }

    const updated: TemuanData = {
      ...selectedTemuan,
      status: newStatus, 
      tanggalEksekusi: finalDateString,
      fotoEksekusi: executionPhoto,
      timEksekusi: selectedTeam
    };
    
    try {
      await onSave(updated);
      if (!initialData) {
        setSelectedTemuan(null);
        setExecutionPhoto('');
        setExecutionDate('');
        setSelectedTeam('');
      }
    } catch (err) { alert("❌ Gagal menyimpan data eksekusi."); }
    finally { setIsSaving(false); }
  };

  const filteredQueue = useMemo(() => {
    const filtered = data.filter(item => {
      // Apply subFilter first
      if (item.status !== subFilter) return false;

      const noTiangStr = String(item.noTiang || '');
      const matchesSearch = !searchQuery || noTiangStr.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      const itemDate = parseRobustDate(item.tanggal);
      const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      if (startDate) {
        const s = new Date(startDate); s.setHours(0,0,0,0);
        if (itemDateOnly < s) return false;
      }
      if (endDate) {
        const e = new Date(endDate); e.setHours(0,0,0,0);
        if (itemDateOnly > e) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => parseRobustDate(b.tanggal).getTime() - parseRobustDate(a.tanggal).getTime());
  }, [data, startDate, endDate, searchQuery, subFilter]);

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

  return (
    <div className="pb-10">
      <div className="flex items-center mb-8 gap-4">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all group">
          <span className="text-sm font-black text-slate-900 group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Kembali</span>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{initialData ? 'Edit Eksekusi' : 'Antrean Eksekusi'}</h2>
          <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">{session.ulp}</p>
        </div>
      </div>

      {!initialData && (
        <div className="space-y-4">
          {/* Tampilan Total Data Atrean */}
          <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl border border-indigo-500 flex items-center justify-between animate-slide-up">
            <div>
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Status Atrean: {subFilter}</p>
              <h3 className="text-white text-2xl font-black leading-none">Total {filteredQueue.length} Data</h3>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
              📊
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 mb-2 shadow-sm space-y-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Cari No. Tiang</p>
              <div className="relative">
                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all uppercase" placeholder="Ketik No. Tiang..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">🔍</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Saring Tanggal Temuan</p>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto gap-1 scrollbar-hide no-scrollbar">
            {(['BELUM EKSEKUSI', 'BUTUH PADAM', 'TIDAK DAPAT IZIN', 'KENDALA MATERIAL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSubFilter(f)}
                className={`whitespace-nowrap px-4 py-2.5 text-[8px] font-black rounded-xl transition-all uppercase tracking-widest flex-1 min-w-max ${subFilter === f ? 'bg-slate-900 text-white shadow-md scale-100' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {f === 'TIDAK DAPAT IZIN' ? 'TIDAK IZIN' : f}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredQueue.length === 0 && !initialData ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 mt-6">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Tidak ada data {subFilter.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {(initialData ? [initialData] : filteredQueue).map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group animate-fade-in">
              <div className="px-4 pt-3 pb-1 border-b border-slate-50 flex justify-between items-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  🗓️ {parseRobustDate(item.tanggal).toLocaleDateString('id-ID')}
                </p>
                <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase ${item.status === 'BUTUH PADAM' ? 'bg-amber-50 text-amber-700' : item.status === 'BELUM EKSEKUSI' ? 'bg-indigo-50 text-indigo-700' : item.status === 'TIDAK DAPAT IZIN' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                  {item.status === 'TIDAK DAPAT IZIN' ? 'TIDAK IZIN' : item.status}
                </span>
              </div>

              <div className="flex p-4 gap-4 pb-0">
                <div className="relative flex-shrink-0 cursor-zoom-in" onClick={() => setPreviewImage({ url: formatDriveUrl(item.fotoTemuan), title: `Foto Temuan: ${item.noTiang}` })}>
                  <img src={formatDriveUrl(item.fotoTemuan)} alt="Temuan" className="w-24 h-24 object-cover rounded-xl border border-slate-100" referrerPolicy="no-referrer" />
                </div>
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
              
              <div className="px-4 pb-4 mt-2">
                <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-600 font-bold italic flex-1 leading-tight">
                    📍 {item.alamat || item.lokasi || 'Alamat tidak tersedia'}
                  </p>
                  {item.geotag && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); openInMaps(item.geotag); }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg active:scale-90 transition-all hover:bg-white shadow-sm"
                    >
                      <span className="text-[11px]">🗺️</span>
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Navigasi</span>
                    </button>
                  )}
                </div>
              </div>

              <button onClick={() => setSelectedTemuan(item)} className="w-full bg-slate-900 text-white font-bold py-4 text-xs uppercase tracking-[0.2em] active:bg-slate-800 transition-colors">{initialData ? 'EDIT DETAIL EKSEKUSI' : 'PROSES EKSEKUSI'}</button>
            </div>
          ))}
        </div>
      )}

      {selectedTemuan && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-sm rounded-3xl shadow-2xl flex flex-col my-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Form Laporan Eksekusi</h3>
              <button onClick={() => initialData ? onBack() : setSelectedTemuan(null)} className="text-slate-400 p-2">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Aset Target</p>
                <p className="font-bold text-slate-900 text-sm uppercase">{selectedTemuan.noTiang} • {selectedTemuan.feeder}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">Pilih Tim Kerja *</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
                  <option value="">-- Pilih Tim Kerja --</option>
                  <option value="Team ROW">Team ROW</option>
                  <option value="Team Yandal">Team Yandal</option>
                  <option value="Team Pemeliharaan">Team PLN</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">Tanggal Eksekusi</label>
                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-indigo-700 outline-none" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest ml-1">Bukti Foto Perbaikan *</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 min-h-[220px]">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  {isCompressing ? (
                    <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                  ) : executionPhoto ? (
                    <div className="relative w-full">
                      <img src={executionPhoto} alt="Preview" className="w-full h-56 object-cover rounded-xl" />
                      <button onClick={() => setExecutionPhoto('')} className="absolute top-2 right-2 bg-slate-900/80 text-white w-8 h-8 rounded-lg flex items-center justify-center">✕</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button type="button" onClick={() => openPicker('camera')} className="flex flex-col items-center p-5 bg-white border border-slate-200 rounded-2xl">
                        <span className="text-xl mb-2">📷</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Kamera</span>
                      </button>
                      <button type="button" onClick={() => openPicker('gallery')} className="flex flex-col items-center p-5 bg-white border border-slate-200 rounded-2xl">
                        <span className="text-xl mb-2">🖼️</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase">Galeri</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
              <button onClick={() => handleAction('SUDAH EKSEKUSI')} disabled={isSaving || isCompressing} className={`w-full py-4 rounded-xl shadow-lg uppercase text-[10px] font-black tracking-[0.2em] ${isSaving || isCompressing ? 'bg-slate-300' : 'bg-emerald-600 text-white'}`}>{isSaving ? '⏳ Menyimpan...' : '✅ Simpan Laporan Selesai'}</button>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button onClick={() => handleAction('BUTUH PADAM')} className="py-3 rounded-xl bg-amber-500 text-white text-[8px] font-bold uppercase">⚡ Butuh Padam</button>
                <button onClick={() => handleAction('TIDAK DAPAT IZIN')} className="py-3 rounded-xl bg-orange-600 text-white text-[8px] font-bold uppercase">🚫 Tidak Izin</button>
                <button onClick={() => handleAction('KENDALA MATERIAL')} className="py-3 rounded-xl bg-red-600 text-white text-[8px] font-bold uppercase">📦 Kendala</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage.url} alt="Preview" className="w-full max-w-md aspect-square object-contain bg-slate-100 rounded-3xl" referrerPolicy="no-referrer" />
          <p className="text-white/50 text-[10px] mt-6 font-bold uppercase tracking-[0.2em]">Sentuh di mana saja untuk menutup</p>
        </div>
      )}
    </div>
  );
};

export default EksekusiPage;
