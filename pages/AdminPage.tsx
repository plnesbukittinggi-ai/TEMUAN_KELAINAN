import React, { useState, useEffect } from 'react';
import { InisiasiUnit } from '../types';
import { fetchInisiasiUnits, saveInisiasiUnit, getInisiasiUnit } from '../services/spreadsheetService';
import { Database, Building2, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

interface InisiasiPageProps {
  onComplete: (unit: InisiasiUnit) => void;
  onBack?: () => void;
}

const RAW_LOGO_URL = "https://drive.google.com/file/d/1W_q1EgEvSsFH0d1bc7QtzbeOozfW9DtR/view?usp=sharing";

const getDirectImageUrl = (url: string) => {
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return url;
};

const LOGO_URL = getDirectImageUrl(RAW_LOGO_URL);

const InisiasiPage: React.FC<InisiasiPageProps> = ({ onComplete, onBack }) => {
  const [units, setUnits] = useState<InisiasiUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [logoError, setLogoError] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchInisiasiUnits();
      setUnits(data);
      
      const existing = getInisiasiUnit();
      if (existing && data.some(u => u.namaUL === existing.namaUL || u.id === existing.id)) {
        const found = data.find(u => u.namaUL === existing.namaUL || u.id === existing.id);
        if (found) {
          setSelectedUnitId(found.id);
        }
      } else if (data.length > 0) {
        // Default select first available with GAS
        const withGas = data.find(u => u.urlGAS && u.urlGAS.trim()) || data[0];
        setSelectedUnitId(withGas.id);
      }
    } catch (err: any) {
      console.error("Error loading inisiasi units:", err);
      setErrorMsg('Gagal membaca data inisiasi dari Spreadsheet. Menggunakan daftar cadangan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
  };

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) {
      alert('Silakan pilih Unit Layanan terlebih dahulu.');
      return;
    }

    if (!selectedUnit.urlGAS || !selectedUnit.urlGAS.trim()) {
      alert(`Peringatan: URL Google Apps Script (GAS) untuk ${selectedUnit.namaUL} belum terisi di sheet inisiasi. Silakan hubungi Administrator.`);
      return;
    }

    setIsSubmitting(true);

    // Simpan ke storage dan selesaikan inisiasi
    saveInisiasiUnit(selectedUnit);

    setTimeout(() => {
      setIsSubmitting(false);
      onComplete(selectedUnit);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#eaf4fa] flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center animate-fade-in my-auto">
        
        {/* HEADER BRANDING */}
        <div className="text-center mb-5">
          {/* Logo Banner */}
          <div className="w-full max-w-[340px] sm:max-w-[400px] h-20 sm:h-24 mx-auto mb-3 flex items-center justify-center">
            {!logoError ? (
              <img 
                src={LOGO_URL} 
                alt="Logo I-Monex" 
                className="w-full h-full object-contain filter drop-shadow-sm"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#003b71] tracking-wider">i-MONEX</span>
              </div>
            )}
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#fef3c7] text-[#92400e] border border-[#fde68a] rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>SETUP INISIASI SISTEM</span>
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
            INISIASI DATABASE UNIT LAYANAN
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-600 font-medium mt-1 max-w-md mx-auto leading-relaxed">
            Pilih Unit Layanan (UL) untuk menghubungkan koneksi database<br className="hidden sm:inline" /> Google Spreadsheet &amp; Google Apps Script
          </p>
        </div>

        {/* MAIN CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Card Header (Deep Blue) */}
          <div className="bg-[#003865] px-5 py-3.5 sm:py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Database className="w-4.5 h-4.5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                  PILIH UNIT LAYANAN (UL)
                </h2>
                <p className="text-[10px] sm:text-[11px] text-cyan-100/90 font-medium">
                  Sheet Sumber: <span className="underline decoration-cyan-300 underline-offset-2 font-semibold">inisiasi</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  title="Kembali ke Aplikasi"
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white text-[11px] font-bold active:scale-95 flex items-center gap-1 border border-white/20 cursor-pointer"
                >
                  <span>← Kembali</span>
                </button>
              )}
              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                title="Muat Ulang Data Inisiasi"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white flex items-center justify-center active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Card Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* UL LIST SECTION */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-2.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>NAMA UNIT LAYANAN (KOLOM: NAMA_UL):</span>
              </label>
              
              {isLoading ? (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#003865]" />
                  <span className="text-xs font-semibold">Membaca daftar Unit dari Spreadsheet...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {units.map((unit) => {
                    const isSelected = unit.id === selectedUnitId;
                    const hasGas = !!(unit.urlGAS && unit.urlGAS.trim());

                    return (
                      <button
                        type="button"
                        key={unit.id}
                        onClick={() => handleSelectUnit(unit.id)}
                        className={`p-3.5 rounded-xl text-left transition-all relative flex flex-col justify-between cursor-pointer border ${
                          isSelected
                            ? 'bg-[#003865] text-white border-[#003865] shadow-md'
                            : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/15">
                          <span className="font-bold text-xs sm:text-[13px] tracking-tight uppercase">
                            {unit.namaUL}
                          </span>
                          <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {unit.kodeUL || unit.id}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-2">
                          <span className={`font-medium ${isSelected ? 'text-white/90' : (hasGas ? 'text-slate-500' : 'text-amber-600')}`}>
                            {hasGas ? '✓ Database Terhubung' : '⚠️ GAS Belum Diatur'}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTION SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isLoading || !selectedUnit}
                className="w-full py-3.5 bg-[#002d59] hover:bg-[#002244] text-white font-bold rounded-xl shadow-md active:scale-[0.99] transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>MENGHUBUNGKAN DATABASE...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                    <span>INISIASI &amp; LANJUT KE LOGIN</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <footer className="text-center text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-5">
          © DO : 2026 - IT PLN ES BKT
        </footer>
      </div>
    </div>
  );
};

export default InisiasiPage;
