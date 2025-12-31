
import React, { useState } from 'react';
import { AppRole, LoginSession, Inspector, ULP } from '../types';
import { ADMIN_PASSWORD } from '../constants';

interface LoginPageProps {
  onLogin: (session: LoginSession) => void;
  inspectors: Inspector[];
  ulpList: ULP[];
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, inspectors, ulpList }) => {
  const [activeMenu, setActiveMenu] = useState<AppRole | null>(null);
  const [formData, setFormData] = useState<Partial<LoginSession>>({});
  const [password, setPassword] = useState('');

  const LOGO_URL = "https://lh3.googleusercontent.com/d/1kpaHfckdo0GhhCXtANR_Q38KWuBc0T9u";

  const handleStart = () => {
    if (activeMenu === AppRole.ADMIN) {
      if (password === ADMIN_PASSWORD) {
        onLogin({ role: AppRole.ADMIN });
      } else {
        alert('Password Admin Salah!');
      }
      return;
    }

    if (activeMenu === AppRole.INSPEKSI && (!formData.inspektor1 || !formData.inspektor2 || !formData.ulp)) {
      alert('⚠️ Mohon lengkapi detail inspeksi!');
      return;
    }

    if (activeMenu === AppRole.EKSEKUSI && (!formData.ulp || !formData.team)) {
      alert('⚠️ Mohon lengkapi detail eksekusi!');
      return;
    }

    if (activeMenu === AppRole.VIEWER && !formData.ulp) {
      alert('⚠️ Pilih ULP terlebih dahulu!');
      return;
    }

    onLogin({ role: activeMenu!, ...formData });
  };

  const menuItems = [
    { role: AppRole.INSPEKSI, title: 'Input Inspeksi', desc: 'Laporkan temuan kelainan jaringan', icon: '📝', color: 'indigo' },
    { role: AppRole.EKSEKUSI, title: 'Update Eksekusi', desc: 'Laporan perbaikan lapangan', icon: '🛠️', color: 'emerald' },
    { role: AppRole.ADMIN, title: 'Panel Admin', desc: 'Kelola data & Analitik AI', icon: '📊', color: 'slate' },
    { role: AppRole.VIEWER, title: 'Monitoring Data', desc: 'Rekapitulasi status real-time', icon: '🖥️', color: 'slate' }
  ];

  return (
    <div className="py-4">
      <div className="text-center mb-10">
        <div className="inline-block mb-6">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-100 overflow-hidden">
             <img 
               src={LOGO_URL} 
               alt="Logo" 
               className="w-4/5 h-4/5 object-contain" 
               referrerPolicy="no-referrer"
             />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Portal Manajemen Temuan Kelainan</h2>
        <p className="text-slate-500 text-xs mt-1.5 font-medium uppercase tracking-wide">Pilih Departemen Akses</p>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-8">
        {menuItems.map((item) => (
          <button 
            key={item.role}
            onClick={() => setActiveMenu(item.role)}
            className={`flex items-center p-4 rounded-xl border transition-all duration-200 ${
              activeMenu === item.role 
                ? 'border-indigo-600 bg-white shadow-md ring-1 ring-indigo-600' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className={`w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-xl mr-4`}>
              {item.icon}
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-slate-900 text-sm leading-tight">{item.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
            </div>
            {activeMenu === item.role && <div className="text-indigo-600">●</div>}
          </button>
        ))}
      </div>

      {activeMenu && (
        <div className="animate-slide-up space-y-4 bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg mb-8">
          <p className="font-bold text-[11px] text-indigo-600 uppercase tracking-widest mb-4">Detail Konfigurasi</p>
          
          {activeMenu === AppRole.INSPEKSI && (
            <div className="space-y-3">
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500" onChange={(e) => setFormData({ ...formData, inspektor1: e.target.value })}>
                <option value="">Inspektor 1</option>
                {inspectors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500" onChange={(e) => setFormData({ ...formData, inspektor2: e.target.value })}>
                <option value="">Inspektor 2</option>
                {inspectors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500" onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}>
                <option value="">Pilih Unit (ULP)</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          )}

          {activeMenu === AppRole.EKSEKUSI && (
            <div className="space-y-3">
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500" onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}>
                <option value="">Pilih Unit (ULP)</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500" onChange={(e) => setFormData({ ...formData, team: e.target.value })}>
                <option value="">Pilih Tim Kerja</option>
                <option value="Team ROW">Team ROW</option>
                <option value="Team Yandal">Team Yandal</option>
                <option value="Team Pemeliharaan">Team PLN</option>
              </select>
            </div>
          )}

          {activeMenu === AppRole.ADMIN && (
            <input 
              type="password" 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500"
              placeholder="Kode Akses Administrator"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {activeMenu === AppRole.VIEWER && (
            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-slate-500" onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}>
              <option value="">Pilih Unit (ULP)</option>
              {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          )}

          <button 
            onClick={handleStart}
            className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-md active:scale-95 transition-all text-sm uppercase tracking-wider mt-4"
          >
            Masuk Sekarang
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
