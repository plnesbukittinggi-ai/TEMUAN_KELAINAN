
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LoginSession, TemuanData, Feeder, Keterangan } from '../types';
import { compressImage } from '../utils/imageUtils';

interface InspeksiPageProps {
  session: LoginSession;
  feeders: Feeder[];
  keteranganList: Keterangan[];
  onBack: () => void;
  onSave: (data: TemuanData) => void;
  historyData?: TemuanData[];
  initialData?: TemuanData; // Support for Edit mode
}

const InspeksiPage: React.FC<InspeksiPageProps> = ({ session, feeders, keteranganList, onBack, onSave, historyData = [], initialData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isManualGeotag, setIsManualGeotag] = useState(false); // State baru untuk input manual
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const normalize = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const filteredKeteranganList = useMemo(() => {
    const list = keteranganList || [];
    const targetIdNorm = normalize(session.idPekerjaan);
    const targetNameNorm = normalize(session.pekerjaan);

    return list.filter(k => {
      const currentKIdNorm = normalize(k.idPekerjaan);
      const matchById = (targetIdNorm !== "" && currentKIdNorm === targetIdNorm);
      const matchByName = (targetNameNorm !== "" && currentKIdNorm === targetNameNorm);
      return matchById || matchByName;
    });
  }, [keteranganList, session]);

  const [formData, setFormData] = useState<Partial<TemuanData>>({
    id: initialData?.id || `ID-${Date.now().toString().slice(-8)}`,
    tanggal: initialData?.tanggal || new Date().toLocaleString('id-ID'),
    pekerjaan: initialData?.pekerjaan || session.pekerjaan || 'UMUM',
    inspektor1: initialData?.inspektor1 || session.inspektor1 || '-',
    inspektor2: initialData?.inspektor2 || session.inspektor2 || '-',
    ulp: initialData?.ulp || session.ulp || '-',
    noTiang: initialData?.noTiang || '',
    noWO: initialData?.noWO || '',
    feeder: initialData?.feeder || '',
    alamat: initialData?.alamat || initialData?.lokasi || '',
    lokasi: initialData?.lokasi || '',
    geotag: initialData?.geotag || '',
    fotoTemuan: initialData?.fotoTemuan || '',
    keterangan: initialData?.keterangan || '',
    status: initialData?.status || 'BELUM EKSEKUSI'
  });

  const fetchLocation = () => {
    if (!("geolocation" in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(7)}, ${pos.coords.longitude.toFixed(7)}`;
        setFormData(p => ({ ...p, geotag: coords }));
        setIsLocating(false);
      },
      () => { 
        setIsLocating(false); 
        alert("Gagal mengambil lokasi secara otomatis. Gunakan input manual.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => { 
    if (!initialData) fetchLocation(); 
  }, [initialData]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const compressed = await compressImage(base64);
          setFormData(p => ({ ...p, fotoTemuan: compressed }));
        } catch (err) {
          alert('Gagal memproses gambar.');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.noTiang || !formData.feeder || !formData.fotoTemuan || !formData.keterangan || !formData.alamat) {
      alert('Mohon lengkapi seluruh field wajib (*)');
      return;
    }
    setIsSubmitting(true);
    onSave({ ...formData, lokasi: formData.alamat } as TemuanData);
  };

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{initialData ? 'Edit Data Temuan' : 'Formulir Temuan Baru'}</h2>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">
            {initialData ? 'MODE EDIT DATA' : formData.pekerjaan}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {initialData && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4">
             <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">⚠️ Perhatian: Anda sedang mengubah data ID #{initialData.id.slice(-5)}</p>
          </div>
        )}

        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg grid grid-cols-2 gap-y-4">
          <div className="col-span-2 flex justify-between border-b border-slate-800 pb-3 mb-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {formData.id}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formData.tanggal}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Unit Pelaksana</p>
            <p className="text-xs font-bold">{formData.ulp}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Inspektorat</p>
            <p className="text-xs font-bold truncate">{formData.inspektor1} & {formData.inspektor2}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">No. Tiang / Gardu *</label>
              <input 
                type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all uppercase"
                placeholder="Ex: T.44A" value={formData.noTiang} onChange={e => setFormData({ ...formData, noTiang: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">No. WO</label>
              <input 
                type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                placeholder="2024xx" value={formData.noWO} onChange={e => setFormData({ ...formData, noWO: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Penyulang (Feeder) *</label>
            <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={formData.feeder} onChange={e => setFormData({ ...formData, feeder: e.target.value })}>
              <option value="">-- Pilih Feeder --</option>
              {feeders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Alamat Detail *</label>
            <textarea rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 resize-none" placeholder="Masukkan alamat atau patokan lokasi..." value={formData.alamat} onChange={e => setFormData({ ...formData, alamat: e.target.value })} />
          </div>
          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Koordinat Geotag</label>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsManualGeotag(!isManualGeotag)} 
                  className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isManualGeotag ? 'text-indigo-600' : 'text-slate-400'}`}
                >
                  {isManualGeotag ? '⌨️ Mode Manual' : '⌨️ Input Manual'}
                </button>
                {!isManualGeotag && (
                  <button type="button" onClick={fetchLocation} disabled={isLocating} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 disabled:opacity-50">
                    {isLocating ? 'Mencari...' : '🔄 Refresh GPS'}
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <input 
                type="text" 
                className={`w-full p-3 rounded-xl text-xs font-mono transition-all border outline-none ${isManualGeotag ? 'bg-white border-indigo-400 focus:ring-2 focus:ring-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                value={isLocating ? "📍 Sedang mengambil lokasi..." : (formData.geotag || '')} 
                readOnly={!isManualGeotag}
                placeholder={isManualGeotag ? "Ketik Lat, Long (Contoh: -0.123, 100.456)" : "Klik Refresh GPS untuk koordinat"}
                onChange={e => isManualGeotag && setFormData({ ...formData, geotag: e.target.value })}
              />
              {isLocating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <div className="animate-spin h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            {isManualGeotag && (
              <p className="text-[9px] text-indigo-500 font-bold mt-1 ml-1 uppercase tracking-tight italic">* Masukkan koordinat manual jika GPS otomatis tidak akurat</p>
            )}
          </div>
        </div>
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-4 min-h-[200px] flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFile} />
          {isCompressing ? (
             <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          ) : formData.fotoTemuan ? (
            <div className="w-full h-full relative">
              <img src={formData.fotoTemuan.includes('http') ? formData.fotoTemuan : formData.fotoTemuan} className="w-full h-64 object-cover rounded-2xl" alt="Preview" />
              <button type="button" onClick={() => setFormData({ ...formData, fotoTemuan: '' })} className="absolute top-2 right-2 bg-slate-900/80 text-white w-8 h-8 rounded-lg flex items-center justify-center">✕</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full">
              <button type="button" onClick={() => openPicker('camera')} className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-2xl mb-2">📷</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Kamera</span>
              </button>
              <button type="button" onClick={() => openPicker('gallery')} className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-2xl mb-2">🖼️</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Galeri</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Kategori Kelainan *</label>
          <select 
            className="w-full p-4 bg-white border-2 border-indigo-100 rounded-xl text-sm font-bold shadow-sm outline-none" 
            value={formData.keterangan} 
            onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
          >
            <option value="">-- Pilih Kelainan --</option>
            {filteredKeteranganList.map(k => <option key={k.id} value={k.text}>{k.text}</option>)}
          </select>
        </div>

        <button type="submit" disabled={isSubmitting || isCompressing} className={`w-full py-5 rounded-2xl shadow-xl font-bold uppercase tracking-[0.2em] text-xs transition-all ${isSubmitting || isCompressing ? 'bg-slate-300' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
          {isSubmitting ? '⏳ Menyimpan...' : initialData ? 'Update Laporan Temuan' : 'Simpan Laporan Temuan'}
        </button>
      </form>
    </div>
  );
};

export default InspeksiPage;
