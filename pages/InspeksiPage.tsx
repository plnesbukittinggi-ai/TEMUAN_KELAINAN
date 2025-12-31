
import React, { useState, useEffect } from 'react';
import { LoginSession, TemuanData, Feeder, Keterangan } from '../types';

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
  const [formData, setFormData] = useState<Partial<TemuanData>>({
    id: `ID-${Date.now().toString().slice(-8)}`,
    tanggal: new Date().toLocaleString('id-ID'),
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
        alert("Gagal mengambil lokasi otomatis. Silakan ketik koordinat secara manual.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { fetchLocation(); }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(p => ({ ...p, fotoTemuan: reader.result as string }));
      reader.readAsDataURL(file);
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
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Formulir Temuan Baru</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">No. Tiang / Gardu *</label>
              <input 
                type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 transition-all uppercase"
                placeholder="Ex: T.44A" value={formData.noTiang} onChange={e => setFormData({ ...formData, noTiang: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">No. WO</label>
              <input 
                type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 transition-all"
                placeholder="2024xx" value={formData.noWO} onChange={e => setFormData({ ...formData, noWO: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Penyulang (Feeder) *</label>
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500" value={formData.feeder} onChange={e => setFormData({ ...formData, feeder: e.target.value })}>
              <option value="">-- Pilih Feeder --</option>
              {feeders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">Lokasi Detail *</label>
            <textarea rows={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 resize-none" placeholder="Patokan lokasi lapangan..." value={formData.lokasi} onChange={e => setFormData({ ...formData, lokasi: e.target.value })} />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Koordinat Geotagging</label>
              <button type="button" onClick={fetchLocation} disabled={isLocating} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">
                {isLocating ? 'Mencari...' : '🔄 Dapatkan GPS'}
              </button>
            </div>
            <input 
              type="text" 
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-700 outline-none focus:border-indigo-500 shadow-inner" 
              placeholder="Ketik Koordinat Manual jika GPS Gagal"
              value={formData.geotag || ''} 
              onChange={e => setFormData({ ...formData, geotag: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-2 min-h-[200px] flex items-center justify-center relative shadow-sm">
          {formData.fotoTemuan ? (
            <div className="w-full h-full relative p-1">
              <img src={formData.fotoTemuan} className="w-full h-64 object-cover rounded-xl" alt="Preview" />
              <button type="button" onClick={() => setFormData({ ...formData, fotoTemuan: '' })} className="absolute top-4 right-4 bg-slate-900/80 text-white w-8 h-8 rounded-lg flex items-center justify-center">✕</button>
            </div>
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer py-10">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-3 border border-indigo-100">📷</div>
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Lampirkan Foto Temuan</p>
              <p className="text-[9px] text-slate-400 mt-1">Gunakan kamera depan atau upload galeri</p>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">Kategori Kelainan *</label>
          <select className="w-full p-3.5 bg-white border border-red-200 rounded-xl text-sm font-bold text-red-700 outline-none focus:ring-2 focus:ring-red-100" value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })}>
            <option value="">-- Pilih Kategori --</option>
            {keteranganList.map(k => <option key={k.id} value={k.text}>{k.text}</option>)}
          </select>
        </div>

        <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-xl shadow-lg font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${isSubmitting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'}`}>
          {isSubmitting ? 'Mengirim Data...' : 'Simpan Laporan'}
        </button>
      </form>
    </div>
  );
};

export default InspeksiPage;
