import React, { useState, useEffect } from 'react';
import { AppRole, TemuanData, LoginSession, Inspector, ULP, Feeder, Pekerjaan, Keterangan, Yandal, MarqueeMessage } from './types';
import { INITIAL_INSPECTORS, INITIAL_ULP, INITIAL_FEEDERS, INITIAL_KETERANGAN, INITIAL_PEKERJAAN, INITIAL_YANDAL, APP_VERSION } from './constants';
import { Shield } from 'lucide-react';
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
  const [yandalList, setYandalList] = useState<Yandal[]>(INITIAL_YANDAL);
  const [pekerjaanList, setPekerjaanList] = useState<Pekerjaan[]>(INITIAL_PEKERJAAN);
  const [keteranganList, setKeteranganList] = useState<Keterangan[]>(INITIAL_KETERANGAN);
  const [marqueeMessages, setMarqueeMessages] = useState<MarqueeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  
  const [editingData, setEditingData] = useState<TemuanData | null>(null);

  // Derived state to cleanup and simplify variables
  const activeMarqueeMessages = marqueeMessages ? marqueeMessages.filter(m => m.isActive) : [];
  const sessionUlpData = session && session.ulp ? allData.filter(d => d.ulp === session.ulp) : [];
  const filteredFeeders = session && session.ulp 
    ? feeders.filter(f => f.ulpId === ulpList.find(u => u.name === session.ulp)?.id)
    : [];

  const LOGO_URL = "https://lh3.googleusercontent.com/d/1kpaHfckdo0GhhCXtANR_Q38KWuBc0T9u";

  const refreshData = async () => {
    setIsLoading(true);
    setConnectionError(false);
    try {
      const config = await SpreadsheetService.fetchAllData() as any;
      
      const normalize = (input: any, label: string) => {
        if (!input) return [];
        
        let arr: any[] = [];
        
        // Handle { headers, values } format
        if (input.headers && Array.isArray(input.values)) {
          const headers = input.headers.map((h: string) => h.toLowerCase().replace(/_/g, '').replace(/\s/g, ''));
          arr = input.values.map((row: any[]) => {
            const obj: any = {};
            row.forEach((cell, i) => {
              const header = headers[i];
              let mappedKey = input.headers[i];
              if (header === 'ulpid' || header === 'idulp') mappedKey = 'ulpId';
              else if (header === 'idpekerjaan') mappedKey = 'idPekerjaan';
              else if (header === 'notiang') mappedKey = 'noTiang';
              else if (header === 'nowo') mappedKey = 'noWO';
              else if (header === 'fototemuan') mappedKey = 'fotoTemuan';
              else if (header === 'fotoeksekusi') mappedKey = 'fotoEksekusi';
              else if (header === 'timeksekusi') mappedKey = 'timEksekusi';
              else if (header === 'tanggaleksekusi') mappedKey = 'tanggalEksekusi';
              else if (header === 'namayandal1') mappedKey = 'namaYandal1';
              else if (header === 'namayandal2') mappedKey = 'namaYandal2';
              else if (header === 'nama' || header === 'name') mappedKey = 'name';
              else if (header === 'isactive') mappedKey = 'isActive';
              obj[mappedKey] = cell;
            });
            return obj;
          });
        } else if (Array.isArray(input)) {
          arr = input;
        } else if (input.data && Array.isArray(input.data)) {
          arr = input.data;
        } else {
          console.warn(`Data for ${label} is not in a recognized format:`, input);
          return [];
        }

        const normalized = arr.map((item, index) => {
          const newItem: any = {};
          newItem.id = item.id || item.ID || `item-${index}`;
          
          for (const key in item) {
            const val = item[key];
            const lowerKey = key.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
            
            let mappedKey = key;
            if (lowerKey === 'ulpid' || lowerKey === 'idulp') mappedKey = 'ulpId';
            else if (lowerKey === 'idpekerjaan') mappedKey = 'idPekerjaan';
            else if (lowerKey === 'notiang') mappedKey = 'noTiang';
            else if (lowerKey === 'nowo') mappedKey = 'noWO';
            else if (lowerKey === 'fototemuan') mappedKey = 'fotoTemuan';
            else if (lowerKey === 'fotoeksekusi') mappedKey = 'fotoEksekusi';
            else if (lowerKey === 'timeksekusi') mappedKey = 'timEksekusi';
            else if (lowerKey === 'tanggaleksekusi') mappedKey = 'tanggalEksekusi';
            else if (lowerKey === 'namayandal1') mappedKey = 'namaYandal1';
            else if (lowerKey === 'namayandal2') mappedKey = 'namaYandal2';
            else if (lowerKey === 'nama' || lowerKey === 'name') mappedKey = 'name';
            else if (lowerKey === 'isactive') mappedKey = 'isActive';
            
            let finalVal = val;
            if (mappedKey === 'isActive') {
              finalVal = val === true || val === 'TRUE' || val === 'true';
            }
            newItem[mappedKey] = finalVal;
          }
          return newItem;
        });
        console.log(`Normalized ${label}:`, normalized.length, "items.");
        return normalized;
      };

      // Extremely aggressive key finding
      const findDataInConfig = (obj: any, targetKey: string): any => {
        if (!obj || typeof obj !== 'object') return undefined;
        
        const lowerTarget = targetKey.toLowerCase().replace(/list$/, '');
        
        // 1. Try direct match (case insensitive, ignoring 'List' suffix)
        const keys = Object.keys(obj);
        let foundKey = keys.find(k => {
          const kLower = k.toLowerCase().replace(/list$/, '');
          return kLower === lowerTarget;
        });
        
        if (foundKey) return obj[foundKey];
        
        // 2. Try partial match
        foundKey = keys.find(k => k.toLowerCase().includes(lowerTarget));
        if (foundKey) return obj[foundKey];
        
        // 3. Deep search (one level)
        for (const k of keys) {
          if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
            const deepResult: any = findDataInConfig(obj[k], targetKey);
            if (deepResult) return deepResult;
          }
        }
        
        return undefined;
      };

      const inspectorsData = findDataInConfig(config, 'inspectors');
      if (inspectorsData) setInspectors(normalize(inspectorsData, 'Inspectors'));
      
      const ulpData = findDataInConfig(config, 'ulpList');
      if (ulpData) setUlpList(normalize(ulpData, 'ULP'));
      
      const feedersData = findDataInConfig(config, 'feeders');
      if (feedersData) setFeeders(normalize(feedersData, 'Feeders'));
      
      const yandalData = findDataInConfig(config, 'yandalList');
      if (yandalData) setYandalList(normalize(yandalData, 'Yandal'));
      
      const pekerjaanData = findDataInConfig(config, 'pekerjaanList');
      if (pekerjaanData) setPekerjaanList(normalize(pekerjaanData, 'Pekerjaan'));
      
      const keteranganData = findDataInConfig(config, 'keteranganList');
      if (keteranganData) setKeteranganList(normalize(keteranganData, 'Keterangan'));
      
      const marqueeData = findDataInConfig(config, 'marqueeMessages');
      if (marqueeData) setMarqueeMessages(normalize(marqueeData, 'MarqueeMessages'));
      
      const allDataItems = findDataInConfig(config, 'allData');
      if (allDataItems) setAllData(normalize(allDataItems, 'AllData'));
      
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

  const handleDeleteTemuans = async (ids: string[]): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await SpreadsheetService.deleteTemuans(ids);
      if (result.success) {
        setAllData(prev => prev.filter(item => !ids.includes(item.id)));
        alert('BERHASIL: ' + (result.message || `${ids.length} data temuan berhasil dihapus.`));
        await refreshData();
        return true;
      } else {
        alert('GAGAL: ' + (result.message || 'Gagal menghapus data dari server.'));
        return false;
      }
    } catch (e) {
      alert('ERROR: Terjadi kesalahan sistem saat menghapus data.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (data: TemuanData) => {
    setEditingData(data);
    const executionStatuses = ['SUDAH EKSEKUSI', 'BUTUH PADAM', 'TIDAK DAPAT IZIN', 'KENDALA MATERIAL'];
    
    // Temukan ID Pekerjaan dari list master berdasarkan nama di data temuan
    const activePek = pekerjaanList.find(p => p.name === data.pekerjaan);

    if (executionStatuses.includes(data.status)) {
      setSession({ ...session!, role: AppRole.EKSEKUSI, ulp: data.ulp });
    } else {
      // Pastikan session mendapatkan idPekerjaan agar dropdown Kategori Kelainan terisi
      setSession({ 
        ...session!, 
        role: AppRole.INSPEKSI, 
        ulp: data.ulp,
        pekerjaan: data.pekerjaan,
        idPekerjaan: activePek ? activePek.id : undefined 
      });
    }
  };

  const renderContent = () => {
    if (!session) {
      return (
        <LoginPage 
          onLogin={setSession} 
          inspectors={inspectors} 
          ulpList={ulpList} 
          pekerjaanList={pekerjaanList} 
          isLoading={isLoading}
          marqueeMessages={marqueeMessages}
        />
      );
    }

    switch (session.role) {
      case AppRole.INSPEKSI:
        return (
          <div className="w-full max-w-full">
            <InspeksiPage 
              session={session!} 
              onBack={() => editingData ? setSession({...session!, role: AppRole.VIEWER}) : handleLogout()} 
              onSave={handleAddTemuan}
              feeders={filteredFeeders}
              keteranganList={keteranganList}
              initialData={editingData || undefined}
            />
          </div>
        );
      case AppRole.EKSEKUSI:
        return (
          <div className="w-full max-w-full">
            <EksekusiPage 
              session={session!} 
              data={editingData ? [editingData] : sessionUlpData} 
              onBack={() => editingData ? setSession({...session!, role: AppRole.VIEWER}) : handleLogout()}
              onSave={handleUpdateTemuan}
              initialData={editingData || undefined}
              yandalList={yandalList}
              ulpList={ulpList}
            />
          </div>
        );
      case AppRole.ADMIN:
      case AppRole.SUPER_ADMIN:
        return (
          <div className="w-full max-w-full">
            <AdminPage 
              data={allData} 
              ulpList={ulpList} 
              inspectors={inspectors}
              feeders={feeders}
              yandalList={yandalList}
              pekerjaanList={pekerjaanList}
              keteranganList={keteranganList}
              marqueeMessages={marqueeMessages}
              onBack={handleLogout}
              onUpdateInspectors={setInspectors}
              onUpdateUlp={setUlpList}
              onUpdateFeeders={setFeeders}
              onUpdateYandal={setYandalList}
              onUpdateMessages={setMarqueeMessages}
              currentRole={session!.role}
              onDeleteTemuans={handleDeleteTemuans}
            />
          </div>
        );
      case AppRole.VIEWER:
        return (
          <div className="w-full max-w-full">
            <DataViewPage 
              ulp={session!.ulp || ''} 
              data={sessionUlpData} 
              onBack={handleLogout}
              onAddTemuan={session!.inspektor1 ? () => { setEditingData(null); setSession({ ...session!, role: AppRole.INSPEKSI }); } : undefined}
              onAddEksekusi={session!.team ? () => { setEditingData(null); setSession({ ...session!, role: AppRole.EKSEKUSI }); } : undefined}
              onEdit={startEdit}
              currentSession={session!}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // 1. SINKRONISASI KONEKSI PUTUS (KONDISI BELUM LOGIN)
  if (connectionError && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#dfefe2]/30 via-[#e2f1fc] to-[#e4f6fc] flex flex-col justify-between items-center py-10 px-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in max-w-lg mx-auto">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-3 shadow-lg border border-slate-200/50 mb-6">
            <img src={LOGO_URL} alt="Logo PLN" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mb-6 border border-red-100 shadow-md">⚠️</div>
          <h2 className="text-xl font-black text-slate-950 mb-2 uppercase tracking-tight">Koneksi Server Terputus</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed font-semibold">
            Tidak dapat sinkronisasi dengan database cloud. <br/>Periksa koneksi jaringan atau pengaturan spreadsheet Anda.
          </p>
          <button onClick={refreshData} className="w-full bg-[#003b71] hover:bg-[#002b54] text-white font-extrabold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">
            HUBUNGKAN ULANG
          </button>
        </div>
        <footer className="text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pb-4">
          © DO : 2026 - IT PLN ES BKT
        </footer>
      </div>
    );
  }

  // 2. AWAL MEMBUKA APLIKASI / LOADING DATA (KONDISI BELUM LOGIN)
  if (isLoading && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#dfefe2]/30 via-[#e2f1fc] to-[#e4f6fc] flex flex-col justify-between items-center py-12 px-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="inline-flex items-center justify-center bg-white w-28 h-28 sm:w-32 sm:h-32 rounded-3xl shadow-xl border border-blue-100/70 p-3.5 mb-6 animate-pulse">
            <img 
              src={LOGO_URL} 
              alt="Logo PLN ES Bukittinggi" 
              className="w-full h-full object-contain" 
              referrerPolicy="no-referrer" 
            />
          </div>
          
          <div className="animate-spin h-9 w-9 border-4 border-[#005ba3] border-t-transparent rounded-full mb-4"></div>
          <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase animate-pulse">
            Sinkronisasi Database...
          </p>
        </div>
        
        <footer className="text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          © DO : 2026 - IT PLN ES BKT
        </footer>
      </div>
    );
  }

  // 3. MAIN LAYOUT UNTUK PENGGUNA (LOGIN MAUPUN SESSION ACTIVE)
  return (
    <div className={`min-h-screen ${session ? 'bg-slate-50' : 'bg-[#edf6fc]'} pb-16 sm:pb-14 relative overflow-x-hidden flex flex-col`}>
      <header className="bg-gradient-to-r from-[#003b71] to-[#005ba3] text-white py-3 px-4 sm:px-6 shadow-xl rounded-b-[2rem] border-b border-[#002b54]/50 relative z-50 sticky top-0">
        <div className="max-w-full mx-auto flex items-center justify-between w-full px-2 sm:px-4">
          
          {/* Logo & title stack */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-lg border border-white/20 overflow-hidden flex-shrink-0 animate-fade-in">
              <img 
                src={LOGO_URL} 
                alt="Logo PLN" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-200">SISTEM INFORMASI</p>
              <h1 className="text-sm sm:text-lg font-black uppercase tracking-tight text-white leading-none -mt-0.5">TEMUAN KELAINAN</h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-blue-200/90 leading-none mt-0.5 animate-pulse">PLN ES Bukittinggi</p>
            </div>
          </div>

          {/* Action buttons (Gear and KELUAR button if logged in) */}
          <div className="flex items-center gap-3">
            {session && (
              <button 
                onClick={handleLogout} 
                className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase bg-[#002042] border border-[#001730] hover:bg-[#001730] active:scale-95 px-3 py-2 rounded-xl transition-all shadow-md animate-fade-in"
              >
                KELUAR
              </button>
            )}
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-lg border border-white/20 flex-shrink-0">
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

      <div className="w-full bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 backdrop-blur-sm border-b border-amber-500/20 py-2 sm:py-2.5 shadow-sm relative z-30 flex items-center overflow-hidden">
        <div className="w-full max-w-full mx-auto flex items-center gap-3 px-4 sm:px-6 relative">
          
          {/* Integrity Pill Label */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 To-amber-600 text-white text-[9px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-md shadow-amber-500/20 z-40 flex-shrink-0 animate-pulse uppercase tracking-wider">
            <Shield className="w-3 h-3 text-white fill-white/20" />
            <span>INTEGRITAS</span>
          </div>

          <div className="flex-1 overflow-hidden relative h-5 flex items-center select-none ml-1 sm:ml-2">
            {/* Edge Fades */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#eaf4fa] to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#eaf4fa] to-transparent z-20 pointer-events-none" />
            
            <div className="animate-marquee whitespace-nowrap text-amber-950 text-[10px] sm:text-xs font-black tracking-widest uppercase flex items-center" style={{ animationDuration: '45s' }}>
              <span className="inline-flex items-center gap-8 px-4 font-black">
                {activeMarqueeMessages.length > 0 ? (
                  activeMarqueeMessages.map((m, idx) => (
                    <span key={m.id} className="inline-flex items-center gap-2">
                      <span className="text-amber-500">✨</span>
                      {m.text}
                      {idx < activeMarqueeMessages.length - 1 && (
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
      
      <main className={session ? "p-4 sm:p-6 lg:p-8 w-full max-w-full mx-auto animate-fade-in flex-1" : "animate-fade-in w-full flex-1 flex flex-col"}>
        {renderContent()}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a3a60] text-blue-100 py-3 px-4 sm:px-6 shadow-2xl border-t border-blue-900/30 animate-fade-in">
        <div className="max-w-full mx-auto flex flex-row items-center justify-between gap-2 text-[6.5px] xs:text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`w-1 h-1 sm:w-1.5 rounded-full ${connectionError ? 'bg-red-400' : 'bg-emerald-400'} inline-block animate-pulse`}></span>
            <span className={`${connectionError ? 'text-red-400' : 'text-emerald-400'} font-black tracking-widest text-[6.5px] xs:text-[7.5px] sm:text-[8.5px]`}>
              {connectionError ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>

          <div className="text-slate-300 font-extrabold truncate px-1 flex-1 text-center text-[6.5px] xs:text-[7.5px] sm:text-[8.5px] tracking-[0.05em]">
            SISTEM INFORMASI TEMUAN KELAINAN V{APP_VERSION}
          </div>

          <div className="text-blue-200/70 flex-shrink-0 text-right text-[6.2px] xs:text-[7.2px] sm:text-[8.5px] font-black tracking-wider">
            © DO : 2026 - IT PLN ES BKT
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
