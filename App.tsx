
import React, { useState, useEffect } from 'react';
import { AppRole, TemuanData, LoginSession, Inspector, ULP, Feeder, Keterangan } from './types';
import { INITIAL_INSPECTORS, INITIAL_ULP, INITIAL_FEEDERS, INITIAL_KETERANGAN } from './constants';
import { SpreadsheetService } from './services/spreadsheetService';
import LoginPage from './pages/LoginPage';
import InspeksiPage from './pages/InspeksiPage';
import EksekusiPage from './pages/EksekusiPage';
import React, { useState, useEffect } from 'react';
import { AppRole, TemuanData, LoginSession, Inspector, ULP, Feeder, Keterangan } from './types';
import { INITIAL_INSPECTORS, INITIAL_ULP, INITIAL_FEEDERS, INITIAL_KETERANGAN } from './constants';
import { SpreadsheetService } from './services/spreadsheetService';
import LoginPage from './pages/LoginPage';
import InspeksiPage from './pages/InspeksiPage';
import EksekusiPage from './pages/EksekusiPage';
import AdminPage from './pages/AdminPage';
import DataViewPage from './pages/DataViewPage';

const App: React.FC = () => {
  const [session, setSession] = useState<LoginSession | null>(null);
  const [allData, setAllData] = useState<TemuanData[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>(INITIAL_INSPECTORS);
  const [ulpList, setUlpList] = useState<ULP[]>(INITIAL_ULP);
  const [feeders, setFeeders] = useState<Feeder[]>(INITIAL_FEEDERS);
  const [keteranganList, setKeteranganList] = useState<Keterangan[]>(INITIAL_KETERANGAN);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);

  const LOGO_URL = "https://lh3.googleusercontent.com/d/1kpaHfckdo0GhhCXtANR_Q38KWuBc0T9u";

  const refreshData = async () => {
    setIsLoading(true);
    setConnectionError(false);
    try {
      const config = await SpreadsheetService.fetchAllData();
      if (config.inspectors) setInspectors(config.inspectors);
      if (config.ulpList) setUlpList(config.ulpList);
      if (config.feeders) setFeeders(config.feeders);
      if (config.keteranganList) setKeteranganList(config.keteranganList);
      setAllData(config.allData || []);
    } catch (err) {
      console.error("Connection failed:", err);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleLogout = () => setSession(null);

  const handleAddTemuan = async (newTemuan: TemuanData) => {
    setIsLoading(true);
    const result = await SpreadsheetService.addTemuan(newTemuan);
    if (result.success) {
      alert('BERHASIL: Data temuan telah tersimpan.');
      await refreshData();
      setSession({ ...session!, role: AppRole.VIEWER, ulp: newTemuan.ulp });
    } else {
      alert('GAGAL: ' + (result.message || 'Terjadi kesalahan sistem.'));
    }
    setIsLoading(false);
  };

  const handleUpdateTemuan = async (updated: TemuanData) => {
    setIsLoading(true);
    try {
      const result = await SpreadsheetService.updateEksekusi(updated);
      if (result.success) {
        alert('BERHASIL: Status data diperbarui.');
        await refreshData();
        setSession({ ...session!, role: AppRole.VIEWER, ulp: updated.ulp });
      } else {
        alert('GAGAL: ' + (result.message || 'Server bermasalah.'));
      }
    } catch (e) {
      alert('ERROR: Kesalahan pada sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (connectionError && !session) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mb-6 border border-red-100">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Koneksi Server Terputus</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Tidak dapat sinkronisasi dengan database cloud. Periksa pengaturan Apps Script Anda.
          </p>
          <button onClick={refreshData} className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all text-sm">
            HUBUNGKAN ULANG
          </button>
        </div>
      );
    }

    if (isLoading && !session) {
      return (
        <div className="flex flex-col items-center justify-center py-40 px-10 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-6"></div>
          <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">Sinkronisasi Database...</p>
        </div>
      );
    }

    if (!session) {
      return <LoginPage onLogin={setSession} inspectors={inspectors} ulpList={ulpList} />;
    }

    switch (session.role) {
      case AppRole.INSPEKSI:
        return (
          <InspeksiPage 
            session={session} 
            onBack={handleLogout} 
            onSave={handleAddTemuan}
            feeders={feeders.filter(f => f.ulpId === ulpList.find(u => u.name === session.ulp)?.id)}
            keteranganList={keteranganList}
          />
        );
      case AppRole.EKSEKUSI:
        return (
          <EksekusiPage 
            session={session} 
            data={allData.filter(d => d.ulp === session.ulp && d.status !== 'SUDAH EKSEKUSI')} 
            onBack={handleLogout}
            onSave={handleUpdateTemuan}
          />
        );
      case AppRole.ADMIN:
        return (
          <AdminPage 
            data={allData} 
            ulpList={ulpList} 
            inspectors={inspectors}
            feeders={feeders}
            onBack={handleLogout}
            onUpdateInspectors={setInspectors}
            onUpdateUlp={setUlpList}
            onUpdateFeeders={setFeeders}
          />
        );
      case AppRole.VIEWER:
        return (
          <DataViewPage 
            ulp={session.ulp || ''} 
            data={allData.filter(d => d.ulp === session.ulp)} 
            onBack={handleLogout}
            onAddTemuan={session.inspektor1 ? () => setSession({ ...session, role: AppRole.INSPEKSI }) : undefined}
            onAddEksekusi={session.team ? () => setSession({ ...session, role: AppRole.EKSEKUSI }) : undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-slate-50 shadow-2xl relative pb-32 overflow-x-hidden">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
             <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
           </div>
           <div>
             <h1 className="font-bold text-sm tracking-tight uppercase">Input Temuan Gangguan & Eksekusi</h1>
             <p className="text-[10px] text-slate-400 font-medium">PLN ES Bukittinggi</p>
           </div>
        </div>
        {session && (
          <button 
            onClick={handleLogout} 
            className="text-[10px] font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
          >
            KELUAR
          </button>
        )}
      </header>
      
      <main className="p-5 animate-fade-in">{renderContent()}</main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-200 p-6 flex flex-col items-center justify-center z-40">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${connectionError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Sistem Terkoneksi
          </p>
        </div>
        <p className="text-[11px] font-bold text-slate-900">VERSI 1.0.0</p>
        <p className="text-[9px] text-slate-400 mt-0.5">©Jan 2026, IT PLN ES Bukittinggi</p>
      </footer>
    </div>
  );
};

export default App;

import AdminPage from './pages/AdminPage';
import DataViewPage from './pages/DataViewPage';

const App: React.FC = () => {
  const [session, setSession] = useState<LoginSession | null>(null);
  const [allData, setAllData] = useState<TemuanData[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>(INITIAL_INSPECTORS);
  const [ulpList, setUlpList] = useState<ULP[]>(INITIAL_ULP);
  const [feeders, setFeeders] = useState<Feeder[]>(INITIAL_FEEDERS);
  const [keteranganList, setKeteranganList] = useState<Keterangan[]>(INITIAL_KETERANGAN);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);

  const LOGO_URL = "https://lh3.googleusercontent.com/d/1kpaHfckdo0GhhCXtANR_Q38KWuBc0T9u";

  const refreshData = async () => {
    setIsLoading(true);
    setConnectionError(false);
    try {
      const config = await SpreadsheetService.fetchAllData();
      if (config.inspectors) setInspectors(config.inspectors);
      if (config.ulpList) setUlpList(config.ulpList);
      if (config.feeders) setFeeders(config.feeders);
      if (config.keteranganList) setKeteranganList(config.keteranganList);
      setAllData(config.allData || []);
    } catch (err) {
      console.error("Connection failed:", err);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleLogout = () => setSession(null);

  const handleAddTemuan = async (newTemuan: TemuanData) => {
    setIsLoading(true);
    const result = await SpreadsheetService.addTemuan(newTemuan);
    if (result.success) {
      alert('BERHASIL: Data temuan telah tersimpan.');
      await refreshData();
      setSession({ ...session!, role: AppRole.VIEWER, ulp: newTemuan.ulp });
    } else {
      alert('GAGAL: ' + (result.message || 'Terjadi kesalahan sistem.'));
    }
    setIsLoading(false);
  };

  const handleUpdateTemuan = async (updated: TemuanData) => {
    setIsLoading(true);
    try {
      const result = await SpreadsheetService.updateEksekusi(updated);
      if (result.success) {
        alert('BERHASIL: Status data diperbarui.');
        await refreshData();
        setSession({ ...session!, role: AppRole.VIEWER, ulp: updated.ulp });
      } else {
        alert('GAGAL: ' + (result.message || 'Server bermasalah.'));
      }
    } catch (e) {
      alert('ERROR: Kesalahan pada sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (connectionError && !session) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mb-6 border border-red-100">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Koneksi Server Terputus</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Tidak dapat sinkronisasi dengan database cloud. Periksa pengaturan Apps Script Anda.
          </p>
          <button onClick={refreshData} className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all text-sm">
            HUBUNGKAN ULANG
          </button>
        </div>
      );
    }

    if (isLoading && !session) {
      return (
        <div className="flex flex-col items-center justify-center py-40 px-10 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-6"></div>
          <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">Sinkronisasi Database...</p>
        </div>
      );
    }

    if (!session) {
      return <LoginPage onLogin={setSession} inspectors={inspectors} ulpList={ulpList} />;
    }

    switch (session.role) {
      case AppRole.INSPEKSI:
        return (
          <InspeksiPage 
            session={session} 
            onBack={handleLogout} 
            onSave={handleAddTemuan}
            feeders={feeders.filter(f => f.ulpId === ulpList.find(u => u.name === session.ulp)?.id)}
            keteranganList={keteranganList}
          />
        );
      case AppRole.EKSEKUSI:
        return (
          <EksekusiPage 
            session={session} 
            data={allData.filter(d => d.ulp === session.ulp && d.status !== 'SUDAH EKSEKUSI')} 
            onBack={handleLogout}
            onSave={handleUpdateTemuan}
          />
        );
      case AppRole.ADMIN:
        return (
          <AdminPage 
            data={allData} 
            ulpList={ulpList} 
            inspectors={inspectors}
            feeders={feeders}
            onBack={handleLogout}
            onUpdateInspectors={setInspectors}
            onUpdateUlp={setUlpList}
            onUpdateFeeders={setFeeders}
          />
        );
      case AppRole.VIEWER:
        return (
          <DataViewPage 
            ulp={session.ulp || ''} 
            data={allData.filter(d => d.ulp === session.ulp)} 
            onBack={handleLogout}
            onAddTemuan={session.inspektor1 ? () => setSession({ ...session, role: AppRole.INSPEKSI }) : undefined}
            onAddEksekusi={session.team ? () => setSession({ ...session, role: AppRole.EKSEKUSI }) : undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-slate-50 shadow-2xl relative pb-32 overflow-x-hidden">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
             <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
           </div>
           <div>
             <h1 className="font-bold text-sm tracking-tight uppercase">Input Temuan Gangguan & Eksekusi</h1>
             <p className="text-[10px] text-slate-400 font-medium">PLN ES Bukittinggi</p>
           </div>
        </div>
        {session && (
          <button 
            onClick={handleLogout} 
            className="text-[10px] font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
          >
            KELUAR
          </button>
        )}
      </header>
      
      <main className="p-5 animate-fade-in">{renderContent()}</main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-200 p-6 flex flex-col items-center justify-center z-40">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${connectionError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Sistem Terkoneksi
          </p>
        </div>
        <p className="text-[11px] font-bold text-slate-900">VERSI 1.0.0</p>
        <p className="text-[9px] text-slate-400 mt-0.5">©Jan 2026, IT PLN ES Bukittinggi</p>
      </footer>
    </div>
  );
};

export default App;
