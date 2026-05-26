import React, { useState } from 'react';
import { AppRole, LoginSession, Inspector, ULP, Pekerjaan, MarqueeMessage } from '../types';
import { ADMIN_PASSWORD, APP_VERSION } from '../constants';
import { 
  ClipboardList, 
  Wrench, 
  Monitor, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Users, 
  Settings, 
  Bell, 
  ChevronRight, 
  ArrowLeft, 
  Building, 
  Sparkles,
  Shield
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (session: LoginSession) => void;
  inspectors: Inspector[];
  ulpList: ULP[];
  pekerjaanList: Pekerjaan[];
  isLoading?: boolean;
  marqueeMessages?: MarqueeMessage[];
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, inspectors, ulpList, pekerjaanList, isLoading, marqueeMessages }) => {
  const [view, setView] = useState<'MENU' | 'CONFIG'>('MENU');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [formData, setFormData] = useState<Partial<LoginSession>>({});
  const [password, setPassword] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [headerLogoError, setHeaderLogoError] = useState(false);

  const LOGO_URL = "https://lh3.googleusercontent.com/d/1kpaHfckdo0GhhCXtANR_Q38KWuBc0T9u";

  const handleSelectRole = (role: AppRole) => {
    setSelectedRole(role);
    setView('CONFIG');
  };

  const handleBack = () => {
    setView('MENU');
    setSelectedRole(null);
    setFormData({});
    setPassword('');
  };

  const handlePekerjaanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedPek = pekerjaanList.find(p => p.id === selectedId);
    setFormData({
      ...formData,
      idPekerjaan: selectedId,
      pekerjaan: selectedPek ? selectedPek.name : ''
    });
  };

  const handleFinalLogin = () => {
    if (selectedRole === AppRole.ADMIN) {
      if (password === ADMIN_PASSWORD) {
        onLogin({ role: AppRole.ADMIN });
      } else if (password === 'SuperAdmin') {
        onLogin({ role: AppRole.SUPER_ADMIN });
      } else {
        alert('Password Admin Salah!');
      }
      return;
    }

    if (selectedRole === AppRole.INSPEKSI) {
      const isPLN = formData.inspektor1 === 'PLN';
      if (isPLN) {
        if (!formData.inspektor1 || !formData.ulp) {
          alert('⚠️ Mohon lengkapi Unit Pelaksana!');
          return;
        }
        const sessionData = {
          ...formData,
          inspektor2: '-',
          idPekerjaan: 'PLN',
          pekerjaan: 'PLN'
        };
        onLogin({ role: selectedRole!, ...sessionData } as LoginSession);
        return;
      }

      if (!formData.inspektor1 || !formData.ulp || !formData.idPekerjaan) {
        alert('⚠️ Mohon lengkapi Unit Pelaksana, Inspektur 1, dan Jenis Pekerjaan!');
        return;
      }
      if (formData.inspektor2 && formData.inspektor1 === formData.inspektor2) {
        alert('⚠️ Nama Inspektur 1 dan Inspektur 2 tidak boleh sama!');
        return;
      }
      
      if (!formData.inspektor2) {
        formData.inspektor2 = '-';
      }
    }

    if (selectedRole === AppRole.EKSEKUSI) {
      if (!formData.ulp) {
        alert('⚠️ Mohon lengkapi detail unit!');
        return;
      }
      formData.team = 'EKSEKUTOR';
    }

    if (selectedRole === AppRole.VIEWER && !formData.ulp) {
      alert('⚠️ Pilih Unit (ULP) terlebih dahulu!');
      return;
    }

    onLogin({ role: selectedRole!, ...formData });
  };

  const menuItems = [
    { 
      role: AppRole.INSPEKSI, 
      title: 'Input Inspeksi', 
      desc: 'Lapor temuan kelainan jaringan', 
      icon: <ClipboardList className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600 fill-blue-500/15 stroke-[2.2] filter drop-shadow-[0_2px_5px_rgba(37,99,235,0.25)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />, 
      themeColor: 'blue',
      bgColor: 'from-blue-50 to-blue-100/90 border border-blue-200/55',
      btnColor: 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-blue-700',
      hoverBorder: 'hover:border-blue-400',
      hoverShadow: 'hover:shadow-[0_15px_30px_rgba(59,130,246,0.12)]'
    },
    { 
      role: AppRole.EKSEKUSI, 
      title: 'Update Eksekusi', 
      desc: 'Update hasil perbaikan lapangan', 
      icon: <Wrench className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600 fill-emerald-500/15 stroke-[2.2] filter drop-shadow-[0_2px_5px_rgba(16,185,129,0.25)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />, 
      themeColor: 'emerald',
      bgColor: 'from-emerald-50 to-emerald-100/90 border border-emerald-200/55',
      btnColor: 'bg-gradient-to-r from-emerald-500 to-[#10b981] shadow-lg shadow-emerald-500/25 hover:from-[#059669] hover:to-[#047857]',
      hoverBorder: 'hover:border-emerald-400',
      hoverShadow: 'hover:shadow-[0_15px_30px_rgba(16,185,129,0.12)]'
    },
    { 
      role: AppRole.VIEWER, 
      title: 'Monitoring Data', 
      desc: 'Rekapitulasi status real-time', 
      icon: <Monitor className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-600 fill-indigo-500/15 stroke-[2.2] filter drop-shadow-[0_2px_5px_rgba(99,102,241,0.25)] group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300" />, 
      themeColor: 'violet',
      bgColor: 'from-indigo-50 to-indigo-100/90 border border-indigo-200/55',
      btnColor: 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-700',
      hoverBorder: 'hover:border-indigo-400',
      hoverShadow: 'hover:shadow-[0_15px_30px_rgba(99,102,241,0.12)]'
    },
    { 
      role: AppRole.ADMIN, 
      title: 'Panel Admin', 
      desc: 'Kelola pengguna dlm sistem', 
      icon: <UserCheck className="w-5 h-5 sm:w-7 sm:h-7 text-amber-600 fill-amber-500/15 stroke-[2.2] filter drop-shadow-[0_2px_5px_rgba(245,158,11,0.25)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" />, 
      themeColor: 'amber',
      bgColor: 'from-amber-50 to-amber-100/90 border border-amber-200/55',
      btnColor: 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700',
      hoverBorder: 'hover:border-amber-400',
      hoverShadow: 'hover:shadow-[0_15px_30px_rgba(245,158,11,0.12)]'
    }
  ];

  return (
    <div className="w-full h-screen sm:h-auto sm:min-h-screen flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-hidden font-sans bg-[#edf6fc]">
      
      {/* Background Gradients - perfectly matches the light sky/blue tint in reference images */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#edf5fc] via-[#f3f8fc] to-[#e6eff6] pointer-events-none z-0" />
      
      {/* Dynamic Wave Vector Lines in Ambient Background (mimics the reference images curve bands) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.22]">
        <svg className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] text-blue-300/40" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M-50,50 Q25,-20 100,50 T250,50" />
          <path d="M-50,60 Q25,-10 100,60 T250,60" />
          <path d="M-50,70 Q25,0 100,70 T250,70" />
        </svg>
        <svg className="absolute bottom-[-10%] left-[-10%] w-[90%] h-[70%] text-blue-400/30" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M-10,80 Q50,40 110,80" />
          <path d="M-10,90 Q50,50 110,90" />
          <path d="M-10,100 Q50,60 110,100" />
        </svg>
      </div>

      {/* Left side watermark (Wavy lines crossed by red lightning) - perfectly matches the reference image */}
      <div className="absolute top-[28%] left-[4%] opacity-20 pointer-events-none select-none z-0 hidden lg:block">
        <svg width="240" height="240" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Wave transmission lines */}
          <path d="M10 60 C 50 80, 80 40, 120 60 C 160 80, 180 50, 190 60" stroke="#0064b0" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M10 90 C 50 110, 80 70, 120 90 C 160 110, 180 80, 190 90" stroke="#0064b0" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M10 120 C 50 140, 80 100, 120 120 C 160 140, 180 110, 190 120" stroke="#0064b0" strokeWidth="4.5" strokeLinecap="round" />
          {/* Red lightning bolt */}
          <path d="M125 20 L65 110 L105 110 L85 180 L145 90 L105 90 Z" fill="#ef4444" opacity="0.65" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Right side watermark: PLN Electricity Service - perfectly matches the reference image */}
      <div className="absolute top-[22%] right-[5%] flex flex-col items-end pointer-events-none select-none z-0 opacity-[0.08]">
        <div className="text-[12vw] md:text-[8vw] font-black text-[#0064b0] tracking-widest leading-none select-none">
          PLN
        </div>
        <div className="text-[3vw] md:text-[2vw] font-extrabold text-[#0064b0] tracking-wider -mt-2">
          Electricity Service
        </div>
      </div>

      {/* TOP HEADER */}
      <header className="bg-gradient-to-r from-[#003b71] to-[#005ba3] text-white py-3 px-4 sm:px-6 shadow-xl rounded-b-[2rem] border-b border-[#002b54]/50 relative z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
          
          {/* Logo & title stack */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-lg border border-white/20 overflow-hidden">
              {!headerLogoError ? (
                <img 
                  src={LOGO_URL} 
                  alt="Logo PLN" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer" 
                  onError={() => setHeaderLogoError(true)}
                />
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 25 C12 25, 50 15, 50 15 C50 15, 88 25, 88 25 C88 25, 85 75, 50 90 C15 75, 12 25, 12 25 Z" fill="#0064b0" stroke="#003b71" strokeWidth="3" />
                  <path d="M18 29 C18 29, 50 20, 50 20 C50 20, 82 29, 82 29 C82 29, 79 70, 50 84 C21 70, 18 29, 18 29 Z" fill="#005ba3" stroke="#fbbf24" strokeWidth="2" />
                  <path d="M58 28 L38 52 H48 L42 72 L62 48 H52 Z" fill="#fbbf24" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-200">SISTEM INFORMASI</p>
              <h1 className="text-sm sm:text-lg font-black uppercase tracking-tight text-white leading-none -mt-0.5">TEMUAN KELAINAN</h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-blue-200/90 leading-none mt-0.5">PLN ES Bukittinggi</p>
            </div>
          </div>

          {/* Action buttons replaced with Logo K2K3 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-lg border border-white/20">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_20s_linear_infinite]" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(50, 50)">
                  {/* 11 gear teeth */}
                  {Array.from({ length: 11 }).map((_, i) => {
                    const rotation = (i * 360) / 11;
                    return (
                      <path
                        key={i}
                        d="M -9.5,-46 L 9.5,-46 L 7.5,-30 L -7.5,-30 Z"
                        fill="#10b981"
                        transform={`rotate(${rotation})`}
                      />
                    );
                  })}
                  {/* Outer body of the gear */}
                  <circle cx="0" cy="0" r="32" fill="#10b981" />
                  {/* White circle inside the gear */}
                  <circle cx="0" cy="0" r="20" fill="#ffffff" />
                  {/* Green cross inside the white circle */}
                  <path
                    d="M -4.7,-13.5 L 4.7,-13.5 L 4.7,-4.7 L 13.5,-4.7 L 13.5,4.7 L 4.7,4.7 L 4.7,13.5 L -4.7,13.5 L -4.7,4.7 L -13.5,4.7 L -13.5,-4.7 L -4.7,-4.7 Z"
                    fill="#10b981"
                  />
                </g>
              </svg>
            </div>
          </div>

        </div>
      </header>

      {/* GLOBAL SLOGAN BANNER (FULL WIDTH WITH EDGE FADE AND GLOWING BADGE) */}
      <div className="w-full bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 backdrop-blur-sm border-y border-amber-500/20 py-2 sm:py-2.5 shadow-sm relative z-30 animate-fade-in flex items-center overflow-hidden">
        <div className="w-full max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-6 relative">
          
          {/* Integrity Pill Label */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-md shadow-amber-500/20 z-40 flex-shrink-0 animate-pulse uppercase tracking-wider">
            <Shield className="w-3 h-3 text-white fill-white/20" />
            <span>INTEGRITAS</span>
          </div>

          <div className="flex-1 overflow-hidden relative h-5 flex items-center select-none ml-1 sm:ml-2">
            {/* Edge Fades for professional, modern fade visual signature */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#edf6fc] to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#edf6fc] to-transparent z-20 pointer-events-none" />
            
            <div className="animate-marquee whitespace-nowrap text-amber-950 text-[10px] sm:text-xs font-black tracking-widest uppercase flex items-center" style={{ animationDuration: '45s' }}>
              <span className="inline-flex items-center gap-8 px-4 font-black">
                {marqueeMessages && marqueeMessages.filter(m => m.isActive).length > 0 ? (
                  marqueeMessages.filter(m => m.isActive).map((m, idx) => (
                    <span key={m.id} className="inline-flex items-center gap-2">
                      <span className="text-amber-500">✨</span>
                      {m.text}
                      {idx < marqueeMessages.filter(m => m.isActive).length - 1 && (
                        <span className="mx-8 text-amber-500/50">✦</span>
                      )}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="text-amber-500">✨</span>
                    <span>SAYA KERJA CARI REZEKI, BUKAN CARI SENSASI</span>
                    <span className="text-amber-500">✦</span>
                    <span className="text-[#005ba3]">⚡</span>
                    <span>BEKERJA DENGAN JUJUR, DISIPLIN, DAN BERTANGGUNG JAWAB</span>
                    <span className="text-amber-500">✦</span>
                    <span className="text-emerald-500">🍃</span>
                    <span>PELAYANAN TERBAIK ADALAH PRIORITAS UTAMA MASING-MASING KITA</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW PANEL ROUTER */}
      {view === 'MENU' ? (
        <div className="flex-1 flex flex-col justify-around items-center w-full max-w-6xl mx-auto py-2.5 sm:py-6 px-3 sm:px-4 relative z-20">
          
          {/* CENTRAL EMBLEM BAR */}
          <div className="text-center mb-1.5 sm:mb-6 animate-fade-in flex flex-col items-center">
            <div className="inline-flex items-center justify-center bg-white w-28 h-28 xs:w-32 xs:h-32 sm:w-48 sm:h-48 rounded-2xl xs:rounded-[1.75rem] sm:rounded-[2.2rem] shadow-xl border border-blue-100/70 p-3 xs:p-4 sm:p-5 mb-2 sm:mb-3.5 transform hover:scale-[1.03] hover:rotate-1 transition-all duration-300 overflow-hidden">
              {!logoError ? (
                <img 
                  src={LOGO_URL} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 25 C12 25, 50 15, 50 15 C50 15, 88 25, 88 25 C88 25, 85 75, 50 90 C15 75, 12 25, 12 25 Z" fill="#0064b0" stroke="#003b71" strokeWidth="3" />
                  <path d="M18 29 C18 29, 50 20, 50 20 C50 20, 82 29, 82 29 C82 29, 79 70, 50 84 C21 70, 18 29, 18 29 Z" fill="#005ba3" stroke="#fbbf24" strokeWidth="2" />
                  <path d="M58 28 L38 52 H48 L42 72 L62 48 H52 Z" fill="#fbbf24" />
                </svg>
              )}
            </div>

            {/* PLN Unit Badge */}
            <div className="bg-[#e3f2fd] border border-blue-200/80 px-2.5 xs:px-3.5 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 max-w-fit mx-auto mt-1.5 sm:mt-3 shadow-sm hover:bg-blue-100 transition-colors">
              <Building className="text-blue-600 w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-blue-900 text-[8px] xs:text-[9px] sm:text-xs font-black tracking-wider uppercase">
                PLN ES BUKITTINGGI
              </span>
            </div>
          </div>

          {/* CHOOSE MENU GRID (2x2 ON MOBILE & DESKTOP) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-6 w-full max-w-4xl px-1.5 sm:px-4 mb-2.5 sm:mb-8">
            {menuItems.map((item) => (
              <button 
                key={item.role}
                onClick={() => handleSelectRole(item.role)}
                className={`group flex items-center p-2.5 xs:p-3 sm:p-5 rounded-2xl sm:rounded-[2.2rem] bg-white border border-slate-200/85 ${item.hoverBorder} ${item.hoverShadow} hover:-translate-y-0.5 transition-all duration-300 active:scale-98 w-full relative text-left`}
              >
                <div className={`w-9 h-9 xs:w-11 xs:h-11 sm:w-14 sm:h-14 bg-gradient-to-br ${item.bgColor} rounded-xl sm:rounded-2xl flex items-center justify-center mr-2 sm:mr-4 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[#0f2d59] text-[10px] xs:text-xs sm:text-base tracking-tight leading-tight truncate">{item.title}</p>
                  <p className="text-[8px] xs:text-[9.5px] sm:text-[11px] text-slate-400 font-semibold mt-0.5 sm:mt-1 leading-normal truncate">{item.desc}</p>
                </div>
                <div className={`w-5 h-5 xs:w-7 xs:h-7 sm:w-9 sm:h-9 ${item.btnColor} rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:translate-x-1 transition-all duration-300 ml-1.5`}>
                  <ChevronRight className="w-3 xs:w-4 sm:w-5 sm:h-5 stroke-[2.5] sm:stroke-[3.5]" />
                </div>
              </button>
            ))}
          </div>

          {/* HIGH POLISH GRAPHICS FOOTER COMPONENT - Cozy Card styled exactly like the provided reference image */}
          <div className="w-full max-w-4xl bg-white/70 backdrop-blur-md border border-blue-100/80 rounded-[2rem] p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 mt-4 z-20 animate-fade-in mb-8">
            
            {/* Integrated Vector Transmission Tower Silhouette (Left side of card - matching reference image) */}
            <div className="w-32 h-16 md:h-20 flex-shrink-0 relative opacity-40 text-blue-600">
              <svg viewBox="0 0 160 120" className="w-full h-full pointer-events-none select-none" fill="none" stroke="currentColor" strokeWidth="1.5">
                {/* Ground Line */}
                <path d="M 10,110 L 150,110" strokeWidth="2" />
                {/* 1st Left Transmission Tower */}
                <path d="M 35,110 L 55,15 L 75,110" />
                <path d="M 25,110 L 85,110" />
                <path d="M 47,50 L 63,50" />
                <path d="M 43,80 L 67,80" />
                <path d="M 47,50 L 63,80" />
                <path d="M 63,50 L 43,80" />
                {/* Arms of 1st Tower */}
                <path d="M 25,50 L 85,50" />
                <path d="M 20,80 L 90,80" />
                {/* 2nd Back Transmission Tower (smaller for depth) */}
                <path d="M 95,110 L 110,35 L 125,110" opacity="0.6" strokeWidth="1" />
                <path d="M 85,55 L 135,55" opacity="0.6" strokeWidth="1" />
                <path d="M 80,80 L 140,80" opacity="0.6" strokeWidth="1" />
                {/* Power Lines connecting them */}
                <path d="M -10,45 Q 25,60 55,50 T 110,55 T 170,45" strokeWidth="0.75" strokeDasharray="3 3" />
                <path d="M -10,75 Q 20,90 50,80 T 110,80 T 170,75" strokeWidth="0.75" strokeDasharray="3 3" />
              </svg>
            </div>

            {/* Vertical divider on desktop */}
            <div className="hidden md:block w-px h-12 bg-blue-100 flex-shrink-0" />

            {/* Feature lists deck container */}
            <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-4 text-center w-full">
              {/* Feature 1 */}
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide leading-none">Real-time</p>
                  <p className="text-[8px] sm:text-xs text-slate-500 font-bold mt-1 sm:mt-1.5 truncate">Data terupdate</p>
                </div>
              </div>
              {/* Feature 2 */}
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide leading-none">Aman</p>
                  <p className="text-[8px] sm:text-xs text-slate-500 font-bold mt-1 sm:mt-1.5 truncate">Terlindungi</p>
                </div>
              </div>
              {/* Feature 3 */}
              <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2.5 justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm font-extrabold text-[#0f2d59] uppercase tracking-wide leading-none">Kolaboratif</p>
                  <p className="text-[8px] sm:text-xs text-slate-500 font-bold mt-1 sm:mt-1.5 truncate">Lebih efektif</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ACCESS PANEL CONFIGURATION STAGE */
        <div className="flex-1 flex items-center justify-center w-full max-w-lg mx-auto py-10 px-4 relative z-20 animate-slide-up">
          <div className="bg-white p-8 sm:p-10 rounded-[2.8rem] border border-slate-200/90 shadow-2xl space-y-6 w-full">
            
            {/* Back indicator trigger */}
            <button 
              onClick={handleBack} 
              className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl shadow-sm hover:shadow active:scale-95 transition-all text-xs font-black uppercase tracking-[0.1em] text-slate-800 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform stroke-[2.5]" />
              Kembali
            </button>

            {/* Description headers */}
            <div className="text-center pt-2">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.34em] mb-1.5">
                Konfigurasi Akses {isLoading && '(Sinkronisasi...)'}
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-[#0f2d59] uppercase tracking-wide leading-none">
                {selectedRole?.replace('_', ' ')}
              </h3>
            </div>

            {/* INSPECTION VIEW */}
            {selectedRole === AppRole.INSPEKSI && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                    Unit Pelaksana (ULP) *
                  </label>
                  <select 
                    className="w-full p-4 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-colors" 
                    value={formData.ulp || ''}
                    onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}
                  >
                    <option value="">Pilih Unit</option>
                    {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                      Inspektur 1
                    </label>
                    <select 
                      className="w-full p-4 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-bold outline-none transition-colors" 
                      value={formData.inspektor1 || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'PLN') {
                          setFormData({ ...formData, inspektor1: val, inspektor2: '', idPekerjaan: '', pekerjaan: '' });
                        } else {
                          setFormData({ ...formData, inspektor1: val });
                        }
                      }}
                    >
                      <option value="">Nama</option>
                      <option value="PLN">PLN</option>
                      {inspectors
                        .filter(i => i.name !== formData.inspektor2)
                        .map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                      Inspektur 2
                    </label>
                    <select 
                      className="w-full p-4 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs font-bold outline-none disabled:opacity-50 disabled:bg-slate-200 transition-colors" 
                      value={formData.inspektor2 || ''}
                      disabled={formData.inspektor1 === 'PLN'}
                      onChange={(e) => setFormData({ ...formData, inspektor2: e.target.value })}
                    >
                      <option value="">Nama</option>
                      {inspectors
                        .filter(i => i.name !== formData.inspektor1)
                        .map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                    Jenis Pekerjaan * {pekerjaanList.length === 0 && <span className="text-red-500 italic">(Memuat...)</span>}
                  </label>
                  <select 
                    className="w-full p-4 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-2xl text-xs sm:text-sm font-bold text-blue-800 outline-none disabled:opacity-50 disabled:bg-slate-200 transition-colors"
                    value={formData.idPekerjaan || ''}
                    disabled={formData.inspektor1 === 'PLN'}
                    onChange={handlePekerjaanChange}
                  >
                    <option value="">-- Pilih Pekerjaan --</option>
                    {pekerjaanList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* EKSEKUSI VIEW */}
            {selectedRole === AppRole.EKSEKUSI && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                    Unit Pelaksana (ULP) *
                  </label>
                  <select 
                    className="w-full p-4 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-colors" 
                    value={formData.ulp || ''}
                    onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}
                  >
                    <option value="">Pilih Unit (ULP)</option>
                    {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ADMIN ACCESS POINT */}
            {selectedRole === AppRole.ADMIN && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                    Kode Akses Admin *
                  </label>
                  <input 
                    type="password" 
                    className="w-full p-4 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                    placeholder="Masukkan Kode Admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* VIEWER PORTAL */}
            {selectedRole === AppRole.VIEWER && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                    Unit Pelaksana (ULP) *
                  </label>
                  <select 
                    className="w-full p-4 bg-slate-50 hover:bg-slate-50/50 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-colors" 
                    value={formData.ulp || ''}
                    onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}
                  >
                    <option value="">Pilih Unit (ULP)</option>
                    {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* FINAL ENTER BUTTON */}
            <button 
              onClick={handleFinalLogin}
              disabled={isLoading && pekerjaanList.length === 0}
              className={`w-full ${isLoading && pekerjaanList.length === 0 ? 'bg-slate-400' : 'bg-gradient-to-r from-[#003b71] to-[#005ba3] hover:from-[#002e5c] hover:to-[#004b87] shadow-xl'} text-white font-black py-4.5 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-[0.25em] mt-4`}
            >
              {isLoading && pekerjaanList.length === 0 ? 'Mohon Tunggu...' : 'Masuk Sistem →'}
            </button>

          </div>
        </div>
      )}

      {/* FULL WIDTH ONLINE STATUS BOTTOM FOOTER (MATCHING PICTURE) */}
      <footer className="w-full bg-[#0a3a60] text-blue-100 py-3 px-4 sm:px-6 relative z-30 shadow-2xl border-t border-blue-900/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center sm:text-left">
          
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span className="text-emerald-400 font-extrabold tracking-widest">ONLINE</span>
          </div>

          <div className="text-slate-200/90 font-black">
            SISTEM INFORMASI TEMUAN KELAINAN V{APP_VERSION}
          </div>

          <div className="text-blue-200/80">
            © 2026 - IT PLN ES BKT
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LoginPage;
