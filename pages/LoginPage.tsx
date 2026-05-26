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
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full select-none pointer-events-none group-hover:scale-110 transition-transform duration-300" strokeLinecap="round" strokeLinejoin="round">
          {/* Circular backdrop gradient */}
          <defs>
            <linearGradient id="bgGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="clipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="towerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Backdrop circle */}
          <circle cx="50" cy="65" r="32" fill="url(#bgGrad1)" opacity="0.85" />

          {/* Transformer on Left */}
          <g transform="translate(18, 52) scale(0.65)" stroke="#334155" strokeWidth="1.2">
            {/* Transformer body */}
            <rect x="5" y="20" width="16" height="22" rx="2" fill="#64748b" />
            {/* Cooling fins */}
            <line x1="2" y1="23" x2="5" y2="23" />
            <line x1="2" y1="27" x2="5" y2="27" />
            <line x1="2" y1="31" x2="5" y2="31" />
            <line x1="2" y1="35" x2="5" y2="35" />
            <line x1="21" y1="23" x2="24" y2="23" />
            <line x1="21" y1="27" x2="24" y2="27" />
            <line x1="21" y1="31" x2="24" y2="31" />
            <line x1="21" y1="35" x2="24" y2="35" />
            {/* Bushings/insulators on top */}
            <path d="M 8,12 L 8,20 M 13,12 L 13,20 M 18,12 L 18,20" stroke="#475569" strokeWidth="2" />
            <circle cx="8" cy="11" r="1.5" fill="#f59e0b" stroke="none" />
            <circle cx="13" cy="11" r="1.5" fill="#f59e0b" stroke="none" />
            <circle cx="18" cy="11" r="1.5" fill="#f59e0b" stroke="none" />
            {/* Lightning Bolt Danger Symbol */}
            <path d="M 14,25 L 10,32 H 14 L 12,38" fill="#f59e0b" stroke="none" />
          </g>

          {/* Electrical Tower on Right */}
          <g transform="translate(62, 28) scale(0.7)" stroke="url(#towerGrad)" strokeWidth="1.5">
            {/* Tower body outer truss */}
            <path d="M 20,95 L 35,20 L 41,20 L 56,95" />
            {/* Cross bracing horizontal segments */}
            <path d="M 22,80 L 54,80" />
            <path d="M 26,60 L 50,60" />
            <path d="M 29,43 L 47,43" />
            <path d="M 33,28 L 43,28" />
            {/* Diagonals */}
            <path d="M 20,95 L 50,60 L 20,80 L 54,80" />
            <path d="M 26,60 L 43,28 L 29,43 L 47,43" />
            <path d="M 35,20 L 41,20" />
            {/* Cross arms for wires */}
            <path d="M 12,35 L 64,35" strokeWidth="2.2" />
            <path d="M 8,50 L 68,50" strokeWidth="2.2" stroke="#334155" />
            {/* Insulators hanging down */}
            <line x1="12" y1="35" x2="12" y2="42" stroke="#475569" strokeWidth="2.5" />
            <line x1="64" y1="35" x2="64" y2="42" stroke="#475569" strokeWidth="2.5" />
            <line x1="8" y1="50" x2="8" y2="58" stroke="#475569" strokeWidth="2.5" />
            <line x1="68" y1="50" x2="68" y2="58" stroke="#475569" strokeWidth="2.5" />
          </g>

          {/* Clipboard Panel Main */}
          <g transform="translate(24, 30)">
            {/* Shadow / Base Board */}
            <rect x="5" y="10" width="46" height="60" rx="6" fill="url(#clipGrad)" stroke="#1e3a8a" strokeWidth="1.5" />
            
            {/* Metal Clip at TOP */}
            <path d="M 18,10 Q 18,3 28,3 Q 38,3 38,10 Z" fill="#94a3b8" stroke="#475569" strokeWidth="1.2" />
            <rect x="16" y="7" width="24" height="6" rx="2.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" />
            <circle cx="28" cy="10" r="1.5" fill="#475569" />

            {/* Paper Sheet */}
            <rect x="9" y="18" width="38" height="48" rx="2" fill="#ffffff" />

            {/* Checkbox Rows */}
            {/* Row 1 */}
            <rect x="13" y="24" width="8" height="8" rx="1.5" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
            <path d="M 15,28 L 17,30 L 20,25" stroke="#2563eb" strokeWidth="1.5" fill="none" />
            <line x1="25" y1="26" x2="43" y2="26" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="25" y1="30" x2="38" y2="30" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Row 2 */}
            <rect x="13" y="36" width="8" height="8" rx="1.5" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
            <path d="M 15,40 L 17,42 L 20,37" stroke="#2563eb" strokeWidth="1.5" fill="none" />
            <line x1="25" y1="38" x2="43" y2="38" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="25" y1="42" x2="35" y2="42" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Row 3 */}
            <rect x="13" y="48" width="8" height="8" rx="1.5" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.2" />
            <path d="M 15,52 L 17,54 L 20,49" stroke="#2563eb" strokeWidth="1.5" fill="none" />
            <line x1="25" y1="50" x2="43" y2="50" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="25" y1="54" x2="39" y2="54" stroke="#e2e8f0" strokeWidth="1.5" />
          </g>

          {/* Magnifying Glass Over the Clipboard */}
          <g transform="translate(56, 68) rotate(-15)">
            {/* Handle shadow/base */}
            <rect x="3" y="22" width="6" height="24" rx="3" fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
            {/* Metal Ring connection */}
            <rect x="2" y="16" width="8" height="6" rx="1" fill="#cbd5e1" stroke="#64748b" strokeWidth={1} />
            {/* Circular Frame */}
            <circle cx="6" cy="6" r="14" fill="#ffffff" stroke="#475569" strokeWidth={3} />
            {/* Glass lens with reflection */}
            <circle cx="6" cy="6" r="11.5" fill="url(#lensGrad)" />
            {/* Handle grip detail */}
            <line x1="6" y1="26" x2="6" y2="40" stroke="#475569" strokeWidth="1.2" />
          </g>
        </svg>
      ),
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
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full select-none pointer-events-none group-hover:scale-110 transition-transform duration-300" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
            <linearGradient id="pencilYellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="woodTip" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
            <linearGradient id="eraserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Backdrop circle */}
          <circle cx="70" cy="55" r="32" fill="url(#bgGrad2)" opacity="0.85" />

          {/* Document Base */}
          <g transform="translate(25, 22)">
            <rect x="0" y="5" width="46" height="58" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
            <rect x="2" y="7" width="42" height="54" rx="4" fill="#ffffff" />
            
            {/* Document Checklines */}
            <rect x="8" y="16" width="7" height="7" rx="1.5" stroke="#0ea5e9" strokeWidth="1.5" fill="none" />
            <path d="M 10,19.5 L 11.5,21 L 14,17.5" stroke="#0ea5e9" strokeWidth="1.5" fill="none" />
            <line x1="19" y1="18.5" x2="36" y2="18.5" stroke="#94a3b8" strokeWidth="2.2" />
            <line x1="19" y1="22.5" x2="28" y2="22.5" stroke="#cbd5e1" strokeWidth="1.5" />

            <rect x="8" y="28" width="7" height="7" rx="1.5" stroke="#0ea5e9" strokeWidth="1.5" fill="none" />
            <path d="M 10,31.5 L 11.5,33 L 14,29.5" stroke="#0ea5e9" strokeWidth="1.5" fill="none" />
            <line x1="19" y1="30.5" x2="36" y2="30.5" stroke="#94a3b8" strokeWidth="2.2" />
            <line x1="19" y1="34.5" x2="30" y2="34.5" stroke="#cbd5e1" strokeWidth="1.5" />

            <rect x="8" y="40" width="7" height="7" rx="1.5" stroke="#0ea5e9" strokeWidth="1.5" fill="none" />
            <line x1="19" y1="42.5" x2="36" y2="42.5" stroke="#cbd5e1" strokeWidth="2.2" />
            <line x1="19" y1="46.5" x2="26" y2="46.5" stroke="#e2e8f0" strokeWidth="1.5" />
          </g>

          {/* Gear on Right */}
          <g transform="translate(76, 68)" fill="url(#gearGrad)" stroke="#1e40af" strokeWidth="1.2">
            <circle cx="16" cy="16" r="11" />
            {Array.from({ length: 8 }).map((_, i) => {
              const rotation = (i * 360) / 8;
              return (
                <path
                  key={i}
                  d="M 12.5,-3 L 19.5,-3 L 18.5,4 L 13.5,4 Z"
                  transform={`translate(16, 16) rotate(${rotation}) translate(-16, -16) translate(0, -11)`}
                />
              );
            })}
            <circle cx="16" cy="16" r="5" fill="#ffffff" stroke="#1e40af" strokeWidth="1.2" />
          </g>

          {/* Classic Pencil leaning in */}
          <g transform="translate(68, 62) rotate(-35) scale(0.95)">
            <rect x="-4" y="-36" width="8" height="7" rx="1.5" fill="url(#eraserGrad)" />
            <rect x="-4" y="-29" width="8" height="4" fill="#94a3b8" />
            <line x1="-4" y1="-27" x2="4" y2="-27" stroke="#334155" strokeWidth="0.8" />
            <rect x="-4" y="-25" width="8" height="34" fill="url(#pencilYellow)" />
            <line x1="-1.5" y1="-25" x2="-1.5" y2="9" stroke="#fbbf24" strokeWidth="0.8" opacity="0.4" />
            <line x1="1.5" y1="-25" x2="1.5" y2="9" stroke="#b45309" strokeWidth="0.8" opacity="0.4" />
            <path d="M -4,9 L 0,18 L 4,9" fill="url(#woodTip)" />
            <path d="M -1.8,14 L 0,18 L 1.8,14" fill="#1e293b" />
          </g>
        </svg>
      ),
      themeColor: 'emerald',
      bgColor: 'from-emerald-50 to-emerald-100/90 border border-emerald-200/55',
      btnColor: 'bg-gradient-to-r from-emerald-500 to-[#10b981] shadow-lg shadow-emerald-500/25 hover:from-[#059669] hover:to-[#047857]',
      hoverBorder: 'hover:border-emerald-400',
      hoverShadow: 'hover:shadow-[0_15px_30px_rgba(16,185,129,0.12)]'
    },
    { 
      role: AppRole.VIEWER, 
      title: 'Monitoring Temuan', 
      desc: 'Rekapitulasi status real-time', 
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full select-none pointer-events-none group-hover:scale-110 transition-transform duration-300" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="bgGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="pieBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="pieYellow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="barTeal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>

          {/* Backdrop circle */}
          <circle cx="50" cy="62" r="32" fill="url(#bgGrad3)" opacity="0.85" />

          {/* Transformer on Left */}
          <g transform="translate(14, 58) scale(0.65)" stroke="#334155" strokeWidth="1.2">
            <rect x="5" y="20" width="16" height="22" rx="2" fill="#475569" />
            <line x1="2" y1="23" x2="5" y2="23" />
            <line x1="2" y1="29" x2="5" y2="29" />
            <line x1="2" y1="35" x2="5" y2="35" />
            <line x1="21" y1="23" x2="24" y2="23" />
            <line x1="21" y1="29" x2="24" y2="29" />
            <line x1="21" y1="35" x2="24" y2="35" />
            <path d="M 8,12 L 8,20 M 13,12 L 13,20 M 18,12 L 18,20" stroke="#334155" strokeWidth="1.8" />
            <path d="M 14,25 L 10,32 H 14 L 12,38" fill="#f59e0b" stroke="none" />
          </g>

          {/* Utility/Concrete Pole on Right */}
          <g transform="translate(85, 30) scale(0.72)" stroke="#475569" strokeWidth="1.8">
            {/* Main vertical cement pole */}
            <path d="M 20,95 L 20,15" strokeWidth="3" />
            {/* Cross-arms / Crossbars */}
            <path d="M 5,22 L 35,22" strokeWidth="2.5" />
            <path d="M 8,36 L 32,36" strokeWidth="2.2" />
            {/* Side bracket support struts */}
            <line x1="14" y1="30" x2="20" y2="22" />
            <line x1="26" y1="30" x2="20" y2="22" />
            {/* Insulator caps cylindrical details */}
            <rect x="4" y="16" width="3" height="6" rx="0.5" fill="#f59e0b" stroke="none" />
            <rect x="18" y="16" width="4" height="6" rx="0.5" fill="#f59e0b" stroke="none" />
            <rect x="33" y="16" width="3" height="6" rx="0.5" fill="#f59e0b" stroke="none" />
            
            <rect x="7" y="31" width="3" height="5" rx="0.5" fill="#64748b" stroke="none" />
            <rect x="30" y="31" width="3" height="5" rx="0.5" fill="#64748b" stroke="none" />
            {/* Overhead Line-hanging cylinder element */}
            <rect x="25" y="44" width="7" height="15" rx="1" fill="#475569" stroke="none" />
            <line x1="28.5" y1="36" x2="28.5" y2="44" strokeWidth="1.2" />
          </g>

          {/* LCD Computer Monitor showing charts */}
          <g transform="translate(26, 32)">
            {/* Stand base & neck */}
            <path d="M 18,46 L 24,46 L 27,53 L 15,53 Z" fill="#334155" stroke="#1e293b" strokeWidth="1.2" />
            {/* Main screen bevel border */}
            <rect x="1" y="2" width="48" height="37" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1.8" />
            {/* Web Canvas background */}
            <rect x="3" y="4" width="44" height="33" rx="2" fill="#ffffff" />

            {/* Pie Chart Donut slice illustration */}
            <g transform="translate(13, 14)">
              <circle cx="0" cy="0" r="7.5" fill="none" stroke="url(#pieBlue)" strokeWidth="4.5" />
              <path d="M 0,0 M -7.5,0 A 7.5,7.5 0 0,1 5,-5" fill="none" stroke="url(#pieYellow)" strokeWidth="4.5" />
              <circle cx="0" cy="0" r="3.2" fill="#ffffff" />
            </g>

            {/* lines beside pie */}
            <line x1="23" y1="10" x2="33" y2="10" stroke="#cbd5e1" strokeWidth="2.2" />
            <line x1="23" y1="14" x2="29" y2="14" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Bar graphics on Right of screen */}
            <rect x="35" y="16" width="3" height="10" rx="0.8" fill="url(#barTeal)" />
            <rect x="39" y="12" width="3" height="14" rx="0.8" fill="url(#barTeal)" />
            <rect x="43" y="19" width="3" height="7" rx="0.8" fill="url(#pieYellow)" />

            {/* Line Chart */}
            <path d="M 6,32 L 12,28 L 20,31 L 28,26 L 35,29 L 42,24" fill="none" stroke="#2563eb" strokeWidth="2" />
            <circle cx="6" cy="32" r="1.5" fill="#1d4ed8" />
            <circle cx="12" cy="28" r="1.5" fill="#1d4ed8" />
            <circle cx="20" cy="31" r="1.5" fill="#1d4ed8" />
            <circle cx="28" cy="26" r="1.5" fill="#1d4ed8" />
            <circle cx="35" cy="29" r="1.5" fill="#1d4ed8" />
            <circle cx="42" cy="24" r="1.5" fill="#1d4ed8" />
          </g>
        </svg>
      ),
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
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full select-none pointer-events-none group-hover:scale-110 transition-transform duration-300" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="bgGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="lockSilver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="gearAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
          </defs>

          {/* Backdrop circle */}
          <circle cx="68" cy="62" r="32" fill="url(#bgGrad4)" opacity="0.85" />

          {/* Web Browser Panel Window */}
          <g transform="translate(16, 26)">
            <rect x="0" y="0" width="46" height="42" rx="4.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
            <path d="M 0,4.5 A 4.5,4.5 0 0,1 4.5,0 L 41.5,0 A 4.5,4.5 0 0,1 46,4.5 L 46,10 L 0,10 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0" />
            
            <circle cx="4.5" cy="5" r="1.2" fill="#ef4444" />
            <circle cx="9.5" cy="5" r="1.2" fill="#eab308" />
            <circle cx="14.5" cy="5" r="1.2" fill="#22c55e" />

            <rect x="5" y="15" width="13" height="13" rx="2.5" fill="#dbeafe" />
            <circle cx="11.5" cy="19.5" r="2.8" fill="#3b82f6" />
            <path d="M 7,27 Q 7,23.5 11.5,23.5 Q 16,23.5 16,27 Z" fill="#3b82f6" />

            <line x1="22" y1="18" x2="38" y2="18" stroke="#cbd5e1" strokeWidth="2.5" />
            <line x1="22" y1="23" x2="32" y2="23" stroke="#cbd5e1" strokeWidth="1.8" />
            <line x1="5" y1="33" x2="25" y2="33" stroke="#fbbf24" strokeWidth="2.5" />
          </g>

          {/* Shield overlay */}
          <g transform="translate(56, 25)">
            <path d="M 2,4 L 19,4 Q 30,4 34,10 Q 36,18 34,32 Q 32,45 19,53 Q 6,45 4,32 Q 2,18 2,4 Z" fill="url(#shieldGrad)" stroke="#1d4ed8" strokeWidth="1.8" />
            <path d="M 19,4 L 19,51.8 Q 11.5,46 6.5,33.5 Q 4,20.5 4.5,6.5 L 19,6.5 Z" fill="#3b82f6" opacity="0.18" />
          </g>

          {/* Security System Gear */}
          <g transform="translate(84, 68)" fill="url(#gearAdmin)" stroke="#1e293b" strokeWidth="1">
            <circle cx="13" cy="13" r="9" />
            {Array.from({ length: 8 }).map((_, i) => {
              const rotation = (i * 360) / 8;
              return (
                <path
                  key={i}
                  d="M 10.5,-2.5 L 15.5,-2.5 L 14.5,3 L 11.5,3 Z"
                  transform={`translate(13, 13) rotate(${rotation}) translate(-13, -13) translate(0, -9)`}
                />
              );
            })}
            <circle cx="13" cy="13" r="4.2" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
          </g>

          {/* Padlock */}
          <g transform="translate(48, 62)">
            <path d="M 10,12 L 10,7 A 7,7 0 0,1 24,7 L 24,12" stroke="#475569" strokeWidth="3" fill="none" />
            <rect x="5" y="11" width="24" height="20" rx="4.5" fill="url(#lockSilver)" stroke="#475569" strokeWidth="1.5" />
            <circle cx="17" cy="18.5" r="2.8" fill="#1e293b" stroke="none" />
            <path d="M 15.5,19 Q 15.5,18.5 17,18.5 Q 18.5,18.5 18.5,19 L 20,26.5 L 14,26.5 Z" fill="#1e293b" stroke="none" />
          </g>
        </svg>
      ),
      themeColor: 'amber',
      bgColor: 'from-amber-50 to-amber-100/90 border border-amber-200/55',
      btnColor: 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700',
      hoverBorder: 'hover:border-amber-400',
      hoverShadow: 'hover:shadow-[0_15px_30px_rgba(245,158,11,0.12)]'
    }
  ];

  return (
    <div className="w-full min-h-screen flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-y-auto overflow-x-hidden font-sans bg-[#edf6fc] pb-20">
      
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
          <div className="grid grid-cols-2 gap-3.5 sm:gap-8 w-full max-w-4xl px-2.2 sm:px-6 mb-3 sm:mb-10">
            {menuItems.map((item) => (
              <button 
                key={item.role}
                onClick={() => handleSelectRole(item.role)}
                className={`group flex items-center p-3.5 xs:p-4.5 sm:p-7 rounded-[1.75rem] sm:rounded-[2.5rem] bg-white border border-slate-200/85 ${item.hoverBorder} ${item.hoverShadow} hover:-translate-y-1 transition-all duration-300 active:scale-95 w-full relative text-left shadow-lg shadow-blue-900/5`}
              >
                <div className={`w-11 h-11 xs:w-13 xs:h-13 sm:w-20 sm:h-20 bg-gradient-to-br ${item.bgColor} rounded-2xl sm:rounded-3xl flex items-center justify-center mr-3 sm:mr-6 shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="font-extrabold text-[#0f2d59] text-[12px] xs:text-[15.5px] sm:text-2xl tracking-tight leading-tight uppercase">{item.title}</p>
                  <p className="text-[9.5px] xs:text-[11.5px] sm:text-[14px] text-slate-500 font-bold mt-1 sm:mt-1.5 leading-normal truncate">{item.desc}</p>
                </div>
                <div className={`w-6 h-6 xs:w-8 xs:h-8 sm:w-11 sm:h-11 ${item.btnColor} rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0 group-hover:translate-x-1.5 transition-all duration-300 ml-1.5`}>
                  <ChevronRight className="w-3.5 xs:w-4.5 sm:w-6 sm:h-6 stroke-[3] sm:stroke-[4]" />
                </div>
              </button>
            ))}
          </div>

          {/* HIGH POLISH GRAPHICS FOOTER COMPONENT - Cozy Card styled exactly like the provided reference image */}
          <div className="w-full max-w-4xl bg-white/70 backdrop-blur-md border border-blue-100/80 rounded-[2rem] p-3.5 sm:p-6 shadow-xl relative overflow-hidden flex flex-row items-center gap-2.5 sm:gap-6 mt-4 z-20 animate-fade-in mb-8">
            
            {/* Integrated Vector Transmission Tower Silhouette (Left side of card - now inline on mobile too!) */}
            <div className="w-12 h-9 xs:w-16 xs:h-11 sm:w-28 sm:h-14 md:w-32 md:h-20 flex-shrink-0 relative opacity-40 text-blue-600">
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

            {/* Vertical divider visible on all viewports to anchor the column */}
            <div className="w-px h-8 sm:h-12 bg-blue-100 flex-shrink-0" />

            {/* Feature lists deck container */}
            <div className="flex-1 grid grid-cols-3 gap-1 xs:gap-1.5 sm:gap-4 w-full">
              {/* Feature 1 */}
              <div className="flex flex-row items-center gap-1.5 xs:gap-2.5 sm:gap-2.5 justify-center text-left">
                <div className="w-7 h-7 xs:w-8.5 xs:h-8.5 sm:w-10 sm:h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] xs:text-[10px] sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide leading-none">Real-time</p>
                  <p className="text-[7.5px] xs:text-[8px] sm:text-xs text-slate-500 font-bold mt-0.5 sm:mt-1.5 truncate">Data terupdate</p>
                </div>
              </div>
              {/* Feature 2 */}
              <div className="flex flex-row items-center gap-1.5 xs:gap-2.5 sm:gap-2.5 justify-center text-left">
                <div className="w-7 h-7 xs:w-8.5 xs:h-8.5 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] xs:text-[10px] sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide leading-none">Aman</p>
                  <p className="text-[7.5px] xs:text-[8px] sm:text-xs text-slate-500 font-bold mt-0.5 sm:mt-1.5 truncate">Terlindungi</p>
                </div>
              </div>
              {/* Feature 3 */}
              <div className="flex flex-row items-center gap-1.5 xs:gap-2.5 sm:gap-2.5 justify-center text-left">
                <div className="w-7 h-7 xs:w-8.5 xs:h-8.5 sm:w-10 sm:h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner flex-shrink-0">
                  <Users className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8.5px] xs:text-[10px] sm:text-sm font-extrabold text-[#0f2d59] uppercase tracking-wide leading-none">Kolaboratif</p>
                  <p className="text-[7.5px] xs:text-[8px] sm:text-xs text-slate-500 font-bold mt-0.5 sm:mt-1.5 truncate">Lebih efektif</p>
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
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a3a60] text-blue-100 py-3.5 px-3 sm:px-6 shadow-2xl border-t border-blue-900/30">
        <div className="max-w-6xl mx-auto flex flex-row items-center justify-between gap-1 text-[7px] xs:text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider">
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 sm:w-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span className="text-emerald-400 font-extrabold tracking-widest text-[7.5px] sm:text-[10px]">ONLINE</span>
          </div>

          <div className="text-slate-200/90 font-black truncate px-1 flex-1 text-center text-[7px] xs:text-[8.5px] sm:text-[10px]">
            SISTEM INFORMASI TEMUAN KELAINAN V{APP_VERSION}
          </div>

          <div className="text-blue-200/80 flex-shrink-0 text-right text-[7px] xs:text-[8px] sm:text-[10px]">
            <span className="hidden sm:inline">© DO : 2026 - IT PLN ES BKT</span>
            <span className="sm:hidden">IT PLN BKT</span>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LoginPage;
