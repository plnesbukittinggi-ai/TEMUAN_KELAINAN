
import React, { useState } from 'react';
import { AppRole, LoginSession, Inspector, ULP } from '../types';
import { ADMIN_PASSWORD } from '../constants';

interface LoginPageProps {
  onLogin: (session: LoginSession) => void;
  inspectors: Inspector[];
  ulpList: ULP[];
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, inspectors, ulpList }) => {
  const [view, setView] = useState<'MENU' | 'CONFIG'>('MENU');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [formData, setFormData] = useState<Partial<LoginSession>>({});
  const [password, setPassword] = useState('');

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

  const handleFinalLogin = () => {
    if (selectedRole === AppRole.ADMIN) {
      if (password === ADMIN_PASSWORD) {
        onLogin({ role: AppRole.ADMIN });
      } else {
        alert('Password Admin Salah!');
      }
      return;
    }

    if (selectedRole === AppRole.INSPEKSI && (!formData.inspektor1 || !formData.inspektor2 || !formData.ulp || !formData.pekerjaan)) {
      alert('⚠️ Mohon lengkapi seluruh detail inspeksi dan Jenis Pekerjaan!');
      return;
    }

    if (selectedRole === AppRole.EKSEKUSI && (!formData.ulp || !formData.team)) {
      alert('⚠️ Mohon lengkapi detail unit dan tim eksekusi!');
      return;
    }

    if (selectedRole === AppRole.VIEWER && !formData.ulp) {
      alert('⚠️ Pilih Unit (ULP) terlebih dahulu!');
      return;
    }

    onLogin({ role: selectedRole!, ...formData });
  };

  const menuItems = [
    { role: AppRole.INSPEKSI, title: 'Input Inspeksi', desc: 'Lapor temuan kelainan jaringan', icon: '📝' },
    { role: AppRole.EKSEKUSI, title: 'Update Eksekusi', desc: 'Update hasil perbaikan lapangan', icon: '🛠️' },
    { role: AppRole.VIEWER, title: 'Monitoring Data', desc: 'Rekapitulasi status real-time', icon: '🖥️' },
    { role: AppRole.ADMIN, title: 'Panel Admin', desc: 'Kelola master & Analitik', icon: '📊' }
  ];

  if (view === 'MENU') {
    return (
      <div className="py-6 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-block mb-6 p-3 bg-white rounded-[2rem] shadow-xl border border-slate-100">
            <img src={LOGO_URL} alt="Logo" className="w-20 h-20 object-contain" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Aplikasi Temuan</h2>
          <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-[0.2em] opacity-70">PLN ES BUKITTINGGI</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {menuItems.map((item) => (
            <button 
              key={item.role}
              onClick={() => handleSelectRole(item.role)}
              className="group flex items-center p-5 rounded-[2rem] bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-2xl transition-all duration-300 active:scale-95"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl mr-4 shadow-inner group-hover:bg-indigo-50 transition-colors">
                {item.icon}
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-slate-900 text-sm tracking-tight">{item.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{item.desc}</p>
              </div>
              <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">→</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 animate-slide-up">
      <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8 hover:text-indigo-600 transition-colors">
        <span className="text-lg">←</span> Kembali
      </button>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-2xl space-y-6">
        <div className="text-center mb-4">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">Konfigurasi Akses</p>
          <h3 className="text-xl font-black text-slate-900 uppercase">{selectedRole?.replace('_', ' ')}</h3>
        </div>

        {selectedRole === AppRole.INSPEKSI && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Jenis Pekerjaan *</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-100"
                value={formData.pekerjaan || ''}
                onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
              >
                <option value="">-- Pilih Pekerjaan --</option>
                <option value="JTR T1">JTR T1</option>
                <option value="JTR T2">JTR T2</option>
                <option value="GARDU T1">GARDU T1</option>
                <option value="GARDU T2">GARDU T2</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Unit Pelaksana (ULP) *</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}>
                <option value="">Pilih Unit</option>
                {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Inspektur 1</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold outline-none" onChange={(e) => setFormData({ ...formData, inspektor1: e.target.value })}>
                  <option value="">Nama</option>
                  {inspectors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Inspektur 2</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold outline-none" onChange={(e) => setFormData({ ...formData, inspektor2: e.target.value })}>
                  <option value="">Nama</option>
                  {inspectors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {selectedRole === AppRole.EKSEKUSI && (
          <div className="space-y-4">
            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}>
              <option value="">Pilih Unit (ULP)</option>
              {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" onChange={(e) => setFormData({ ...formData, team: e.target.value })}>
              <option value="">Pilih Tim Kerja</option>
              <option value="Team ROW">Team ROW</option>
              <option value="Team Yandal">Team Yandal</option>
              <option value="Team Pemeliharaan">Team PLN</option>
            </select>
          </div>
        )}

        {selectedRole === AppRole.ADMIN && (
          <input 
            type="password" 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500"
            placeholder="Masukkan Kode Admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {selectedRole === AppRole.VIEWER && (
          <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" onChange={(e) => setFormData({ ...formData, ulp: e.target.value })}>
            <option value="">Pilih Unit (ULP)</option>
            {ulpList.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        )}

        <button 
          onClick={handleFinalLogin}
          className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-[0.3em] mt-4"
        >
          Masuk Sistem →
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
