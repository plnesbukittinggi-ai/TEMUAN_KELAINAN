
import React, { useState, useEffect } from 'react';
import { AppRole, TemuanData, LoginSession, Inspector, ULP, Feeder, Keterangan, Pekerjaan } from './types';
import { INITIAL_INSPECTORS, INITIAL_ULP, INITIAL_FEEDERS, INITIAL_KETERANGAN, INITIAL_PEKERJAAN, APP_VERSION } from './constants';
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
  const [pekerjaanList, setPekerjaanList] = useState<Pekerjaan[]>(INITIAL_PEKERJAAN);
  const [keteranganList, setKeteranganList] = useState<Keterangan[]>(INITIAL_KETERANGAN);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  
  const [editingData, setEditingData] = useState<TemuanData | null>(null);

  const LOGO_URL = "https://lh3.googleusercontent.com/d/1kpaHfckdo0GhhCXtANR_Q38KWuBc0T9u";

  const refreshData = async () => {
    setIsLoading(true);
    setConnectionError(false);
    try {
      const config = await SpreadsheetService.fetchAllData() as any;
      
      if (config.inspectors && config.inspectors.length > 0) setInspectors(config.inspectors);
      if (config.ulpList && config.ulpList.length > 0) setUlpList(config.ulpList);
      if (config.feeders && config.feeders.length > 0) setFeeders(config.feeders);
      if (config.pekerjaanList && config.pekerjaanList.length > 0) setPekerjaanList(config.pekerjaanList);
      if (config.keteranganList && config.keteranganList.length > 0) setKeteranganList(config.keteranganList);
      
      if (config.allData) setAllData(config.allData);
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

  const handleLogout = () => {
    setSession(null);
    setEditingData(null);
  };

  const handleAddTemuan = async (newTemuan: TemuanData) => {
    setIsLoading(true);
    const isEdit = !!editingData;
    const result = isEdit 
      ? await SpreadsheetService.updateEksekusi(newTemuan)
      : await SpreadsheetService.addTemuan(newTemuan);

    if (result.success) {
      alert(`BERHASIL: Data temuan telah ${isEdit ? 'diperbarui' : 'tersimpan'}.`);
      await refreshData();
      setEditingData(null);
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
        alert('BERHASIL: Perubahan data disimpan.');
        await refreshData();
        setEditingData(null);
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

  const startEdit = (data: TemuanData) => {
    setEditingData(data);
    if (data.status === 'SUDAH EKSEKUSI') {
      setSession({ ...session!, role: AppRole.EKSEKUSI });
    } else {
      setSession({ ...session!, role: AppRole.INSPEKSI });
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
      return (
        <LoginPage 
          onLogin={setSession} 
          inspectors={inspectors} 
          ulpList={ulpList} 
          pekerjaanList={pekerjaanList} 
          isLoading={isLoading}
        />
      );
    }

    switch (session.role) {
      case AppRole.INSPEKSI:
        return (
          <InspeksiPage 
            session={session} 
            onBack={() => editingData ? setSession({...session, role: AppRole.VIEWER}) : handleLogout()} 
            onSave={handleAddTemuan}
            feeders={feeders.filter(f => f.ulpId === ulpList.find(u => u.name === session.ulp)?.id)}
            keteranganList={keteranganList}
            initialData={editingData || undefined}
          />
        );
      case AppRole.EKSEKUSI:
        return (
          <EksekusiPage 
            session={session} 
            data={editingData ? [editingData] : allData.filter(d => d.ulp === session.ulp && d.status !== 'SUDAH EKSEKUSI')} 
            onBack={() => editingData ? setSession({...session, role: AppRole.VIEWER}) : handleLogout()}
            onSave={handleUpdateTemuan}
            initialData={editingData || undefined}
          />
        );
      case AppRole.ADMIN:
        return (
          /* Added missing keteranganList prop to AdminPage to fix missing property error */
          <AdminPage 
            data={allData} 
            ulpList={ulpList} 
            inspectors={inspectors}
            feeders={feeders}
            pekerjaanList={pekerjaanList}
            keteranganList={keteranganList}
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
            onAddTemuan={session.inspektor1 ? () => { setEditingData(null); setSession({ ...session, role: AppRole.INSPEKSI }); } : undefined}
            onAddEksekusi={session.team ? () => { setEditingData(null); setSession({ ...session, role: AppRole.EKSEKUSI }); } : undefined}
            onEdit={startEdit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-slate-50 shadow-2xl relative pb-12 overflow-x-hidden">
      <header className="bg-slate-900 text-white p-5 sticky top-0 z-50 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center shadow-inner">
             <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
           </div>
           <div>
             <h1 className="font-bold text-sm tracking-tight uppercase">Manajemen Temuan & Eksekusi</h1>
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

      {/* Footer Super Minimalis (Status Bar Style) */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/80 backdrop-blur-sm border-t border-slate-100 py-1 px-4 flex items-center justify-between z-[60] h-7 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-1">
          <div className={`w-1 h-1 rounded-full ${connectionError ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></div>
          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
            {connectionError ? 'Offline' : 'Online'}
          </p>
        </div>
        
        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">
          v{APP_VERSION}
        </p>

        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
          © JAN 2026 - IT PLN ES BKT
        </p>
      </footer>
    </div>
  );
};

export default App;
