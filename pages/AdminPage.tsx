'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TemuanData, ULP, Inspector, Feeder, Pekerjaan, Keterangan } from '../types';
import { getDashboardInsights } from '../services/geminiService';
import { ReportService } from '../services/ReportService';

const isBrowser = typeof window !== 'undefined';

interface AdminPageProps {
  data: TemuanData[];
  ulpList: ULP[];
  inspectors: Inspector[];
  feeders: Feeder[];
  pekerjaanList: Pekerjaan[];
  keteranganList?: Keterangan[];
  onBack: () => void;
  onUpdateInspectors: (data: Inspector[]) => void;
  onUpdateUlp: (data: ULP[]) => void;
  onUpdateFeeders: (data: Feeder[]) => void;
}

const MONTHS = [
  { val: 1, label: 'Januari' }, { val: 2, label: 'Februari' },
  { val: 3, label: 'Maret' }, { val: 4, label: 'April' },
  { val: 5, label: 'Mei' }, { val: 6, label: 'Juni' },
  { val: 7, label: 'Juli' }, { val: 8, label: 'Agustus' },
  { val: 9, label: 'September' }, { val: 10, label: 'Oktober' },
  { val: 11, label: 'November' }, { val: 12, label: 'Desember' }
];

const AdminPage: React.FC<AdminPageProps> = ({
  data,
  ulpList,
  inspectors,
  feeders,
  pekerjaanList,
  keteranganList = [],
  onBack,
  onUpdateInspectors,
  onUpdateUlp,
  onUpdateFeeders
}) => {

  const [tab, setTab] = useState<'DATA' | 'KELOLA' | 'DASHBOARD' | 'REKAP'>('DASHBOARD');
  const [aiInsight, setAiInsight] = useState('Menganalisis performa data...');

  const [dashFilterMonth, setDashFilterMonth] = useState(new Date().getMonth() + 1);
  const [dashFilterYear, setDashFilterYear] = useState(new Date().getFullYear());
  const [dashFilterUlp, setDashFilterUlp] = useState('');
  const [dashFilterPekerjaan, setDashFilterPekerjaan] = useState('');

  const [rekapStartDate, setRekapStartDate] = useState('');
  const [rekapEndDate, setRekapEndDate] = useState('');

  const [filterFeeder, setFilterFeeder] = useState('');
  const [filterPekerjaan, setFilterPekerjaan] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const parseIndoDate = (dateStr?: string) => {
    try {
      if (!dateStr) return new Date(0);
      const clean = dateStr.replace('pukul ', '').replace('.', ':');
      const [d] = clean.split(',');
      const [day, month, year] = d.split('/').map(Number);
      return new Date(year, month - 1, day);
    } catch {
      return new Date(0);
    }
  };

  const dashboardData = useMemo(() => {
    return data.filter(d => {
      const dt = parseIndoDate(d.tanggal);
      return (
        dt.getMonth() + 1 === dashFilterMonth &&
        dt.getFullYear() === dashFilterYear &&
        (!dashFilterUlp || d.ulp === dashFilterUlp) &&
        (!dashFilterPekerjaan || d.pekerjaan === dashFilterPekerjaan)
      );
    });
  }, [data, dashFilterMonth, dashFilterYear, dashFilterUlp, dashFilterPekerjaan]);

  useEffect(() => {
    if (!isBrowser) return;

    if (tab === 'DASHBOARD' && dashboardData.length > 0) {
      getDashboardInsights(dashboardData).then(setAiInsight);
    } else if (tab === 'DASHBOARD') {
      setAiInsight('Tidak ada data temuan untuk periode yang dipilih.');
    }
  }, [tab, dashboardData]);

  const filteredAndSortedData = useMemo(() => {
    return data
      .filter(item => {
        if (filterFeeder && item.feeder !== filterFeeder) return false;
        if (filterPekerjaan && item.pekerjaan !== filterPekerjaan) return false;

        const d = parseIndoDate(item.tanggal);
        if (filterStartDate && d < new Date(filterStartDate)) return false;
        if (filterEndDate && d > new Date(filterEndDate + 'T23:59:59')) return false;
        return true;
      })
      .sort((a, b) => parseIndoDate(b.tanggal).getTime() - parseIndoDate(a.tanggal).getTime());
  }, [data, filterFeeder, filterPekerjaan, filterStartDate, filterEndDate]);

  const handleDownloadExcel = async () => {
    if (!isBrowser) return;

    if (filteredAndSortedData.length === 0) {
      alert('Tidak ada data untuk diunduh.');
      return;
    }

    setIsExporting(true);
    try {
      await ReportService.downloadExcel(filteredAndSortedData, {
        feeder: filterFeeder || 'SEMUA',
        pekerjaan: filterPekerjaan || 'SEMUA',
        bulan: `${MONTHS[dashFilterMonth - 1].label} ${dashFilterYear}`,
        inspektor1: filteredAndSortedData[0]?.inspektor1 || '-',
        inspektor2: filteredAndSortedData[0]?.inspektor2 || '-',
        relevantKeterangan: keteranganList
      });
    } catch (e) {
      console.error(e);
      alert('Gagal mengunduh Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="pb-10">
      <button onClick={onBack} className="mb-4 px-4 py-2 bg-slate-200 rounded-lg">← Kembali</button>

      <div className="flex gap-2 mb-6">
        {['DASHBOARD', 'REKAP', 'DATA', 'KELOLA'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold ${
              tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'DATA' && (
        <button
          onClick={handleDownloadExcel}
          disabled={isExporting}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold"
        >
          {isExporting ? 'Mengekspor…' : 'Download Excel'}
        </button>
      )}
    </div>
  );
};

export default AdminPage;
