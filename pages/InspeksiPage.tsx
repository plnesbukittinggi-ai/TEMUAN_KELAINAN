
import React, { useState, useEffect, useRef } from 'react';
import { LoginSession, TemuanData, Feeder, Keterangan } from '../types';
import { compressImage } from '../utils/imageUtils';

interface InspeksiPageProps {
  session: LoginSession;
  feeders: Feeder[];
  keteranganList: Keterangan[];
  onBack: () => void;
  onSave: (data: TemuanData) => void;
}

const InspeksiPage: React.FC<InspeksiPageProps> = ({ session, feeders, keteranganList, onBack, onSave }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // LOGIKA FILTER: Filter Keterangan berdasarkan Pekerjaan yang dipilih saat login
  const filteredKeteranganList = keteranganList.filter(k => 
    k.category?.toString().trim().toLowerCase() === session.pekerjaan?.toString().trim().toLowerCase()
  );

  // Jika hasil filter kosong (mungkin karena nama kategori di spreadsheet tidak sama persis), 
  // maka tampilkan semua data sebagai cadangan agar dropdown tidak kosong.
  const displayKeterangan = filteredKeteranganList.length > 0 ? filteredKeteranganList : keteranganList;

  const [formData, setFormData] = useState<Partial<TemuanData>>({
    id: `ID-${Date.now().toString().slice(-8)}`,
    tanggal: new Date().toLocaleString('id-ID'),
    pekerjaan: session.pekerjaan || 'UMUM',
    inspektor1: session.inspektor1 || '-',
    inspektor2: session.inspektor2 || '-',
    ulp: session.ulp || '-',
    noTiang: '',
    noWO: '',
    feeder: '',
    lokasi: '',
    geotag: '',
    fotoTemuan: '',
    keterangan: '',
    status: 'BELUM EKSEKUSI'
  });

  const fetchLocation = () => {
    if (!("geolocation" in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(p => ({ ...p, geotag: `${pos.coords.latitude.toFixed(7)}, ${pos.coords.longitude.toFixed(7)}` }));
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        console.warn("Gagal mengambil lokasi otomatis.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { fetchLocation(); }, []);

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
      if (mode === 'camera') {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.noTiang || !formData.feeder || !formData.fotoTemuan || !formData.keterangan || !formData.lokasi) {
      alert('Mohon lengkapi seluruh field wajib (*)');
      return;
    }
    setIsSubmitting(true);
    onSave(formData as TemuanData);
  };

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">←</button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Formulir Temuan Baru</h2>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{formData.pekerjaan}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Box */}
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

        {/* Input Aset */}
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
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Lokasi Detail *</label>
            <textarea rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 resize-none" placeholder="Patokan lokasi lapangan..." value={formData.lokasi} onChange={e => setFormData({ ...formData, lokasi: e.target.value })} />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Geotagging</label>
              <button type="button" onClick={fetchLocation} disabled={isLocating} className="text-[10px] font-bold text-indigo-600">
                {isLocating ? 'Mencari...' : '🔄 Update GPS'}
              </button>
            </div>
            <input type="text" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono" value={formData.geotag || ''} readOnly />
          </div>
        </div>

        {/* Foto Box */}
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-4 min-h-[200px] flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFile} />
          {isCompressing ? (
             <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          ) : formData.fotoTemuan ? (
            <div className="w-full h-full relative">
              <img src={formData.fotoTemuan} className="w-full h-64 object-cover rounded-2xl" alt="Preview" />
              <button type="button" onClick={() => setFormData({ ...formData, fotoTemuan: '' })} className="absolute top-2 right-2 bg-slate-900/80 text-white w-8 h-8 rounded-lg flex items-center justify-center">✕</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full">
              <button type="button" onClick={() => openPicker('camera')} className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-indigo-50">
                <span className="text-2xl mb-2">📷</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Kamera</span>
              </button>
              <button type="button" onClick={() => openPicker('gallery')} className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-emerald-50">
                <span className="text-2xl mb-2">🖼️</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Galeri</span>
              </button>
            </div>
          )}
        </div>

        {/* DROPDOWN KATEGORI KELAINAN */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-1">Kategori Kelainan *</label>
          <select 
            className={`w-full p-4 bg-white border-2 rounded-xl text-sm font-bold shadow-sm outline-none transition-all ${displayKeterangan.length === 0 ? 'border-red-200 text-red-400' : 'border-indigo-100 focus:border-indigo-500'}`}
            value={formData.keterangan} 
            onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
          >
            {displayKeterangan.length > 0 ? (
              <>
                <option value="">-- Pilih Kelainan --</option>
                {displayKeterangan.map(k => (
                  <option key={k.id} value={k.text}>{k.text}</option>
                ))}
              </>
            ) : (
              <option value="">(Data Keterangan Kosong di Server)</option>
            )}
          </select>
          
          {/* Debugging / Helper Message */}
          {displayKeterangan.length > 0 && filteredKeteranganList.length === 0 && (
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
              <p className="text-[10px] text-amber-700 font-bold leading-tight">
                ⚠️ Menampilkan seluruh kategori. <br/>
                <span className="font-normal">Kategori spesifik untuk "{session.pekerjaan}" tidak ditemukan di Spreadsheet.</span>
              </p>
            </div>
          )}
          
          {displayKeterangan.length === 0 && (
            <p className="text-[10px] text-red-500 font-bold italic ml-1 animate-pulse">
              Data sheet "Keterangan" tidak terbaca. Pastikan sheet tersedia di Spreadsheet.
            </p>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || isCompressing} 
          className={`w-full py-5 rounded-2xl shadow-xl font-bold uppercase tracking-[0.2em] text-xs transition-all ${isSubmitting || isCompressing ? 'bg-slate-300 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'}`}
        >
          {isSubmitting ? '⏳ Menyimpan...' : 'Simpan Laporan Temuan'}
        </button>
      </form>
    </div>
  );
};

export default InspeksiPage;
