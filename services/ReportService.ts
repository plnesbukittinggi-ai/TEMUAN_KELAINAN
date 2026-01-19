'use client';

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TemuanData } from '../types';

const isBrowser = typeof window !== 'undefined';

/* =======================
   UTILITIES
======================= */

const formatDriveUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;

  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
};

const getBase64FromUrl = async (url: string): Promise<string> => {
  if (!isBrowser || !url) return '';
  if (url.startsWith('data:image')) return url;

  try {
    const res = await fetch(url);
    if (!res.ok) return '';

    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

const sanitizeFilename = (name: string) =>
  name.replace(/[/\\?%*:|"<>]/g, '-');

/* =======================
   REPORT SERVICE
======================= */

export const ReportService = {

  /* =======================
     EXCEL EXPORT
  ======================= */
  async downloadExcel(data: TemuanData[], filters: any) {
    if (!isBrowser) return;

    const workbook = new ExcelJS.Workbook();

    /* ===== SHEET 1 : REKAP ===== */
    const rekapSheet = workbook.addWorksheet('Rekap Laporan');
    const findingTypes = filters.relevantKeterangan || [];
    const totalCols = 3 + findingTypes.length;

    const makeTitle = (row: number, text: string, size = 11) => {
      const r = rekapSheet.addRow([text]);
      rekapSheet.mergeCells(row, 1, row, totalCols);
      r.getCell(1).font = { bold: true, size };
      r.getCell(1).alignment = { horizontal: 'center' };
    };

    makeTitle(1, `LAPORAN INSPEKSI BULANAN KELAINAN PADA ${String(filters.pekerjaan || '').toUpperCase()}`, 12);
    makeTitle(2, 'PT. HALEYORA POWER UNIT LAYANAN BUKITTINGGI');
    makeTitle(3, `REKAP LAPORAN ${String(filters.feeder || '').toUpperCase()}`);
    makeTitle(4, String(filters.bulan || '').toUpperCase());

    rekapSheet.addRow([]);

    rekapSheet.addRow(['NO', 'NAMA PENYULANG', 'NAMA REGU']);
    rekapSheet.mergeCells(6, 4, 6, totalCols);
    rekapSheet.getCell(6, 4).value = 'JENIS TEMUAN';

    rekapSheet.addRow(['', '', '', ...findingTypes.map((k: any) => k.text)]);
    rekapSheet.addRow(['', '', 'SATUAN', ...findingTypes.map((k: any) => {
      const t = k.text.toLowerCase();
      if (t.includes('pohon')) return '(BTG)';
      if (t.includes('layangan') || t.includes('kawat')) return '(T)';
      return '(BH)';
    })]);

    [1, 2, 3].forEach(col => rekapSheet.mergeCells(6, col, 8, col));

    [6, 7, 8].forEach(r => {
      const row = rekapSheet.getRow(r);
      row.eachCell(cell => {
        cell.font = { bold: true, size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E0E0' } };
      });
    });

    rekapSheet.columns = [
      { width: 5 },
      { width: 25 },
      { width: 25 },
      ...findingTypes.map(() => ({ width: 12 }))
    ];

    const groupMap: Record<string, any> = {};
    data.forEach(d => {
      const key = `${d.feeder}|${d.inspektor1}|${d.inspektor2}`;
      groupMap[key] ??= { feeder: d.feeder, ins1: d.inspektor1, ins2: d.inspektor2, count: {} };
      groupMap[key].count[d.keterangan] = (groupMap[key].count[d.keterangan] || 0) + 1;
    });

    let no = 1;
    Object.values(groupMap).forEach((g: any) => {
      const r1 = rekapSheet.addRow([
        no++, g.feeder, g.ins1,
        ...findingTypes.map((k: any) => g.count[k.text] || 0)
      ]);
      const r2 = rekapSheet.addRow(['', '', g.ins2, ...Array(findingTypes.length).fill('')]);

      rekapSheet.mergeCells(r1.number, 1, r2.number, 1);
      rekapSheet.mergeCells(r1.number, 2, r2.number, 2);
      findingTypes.forEach((_: any, i: number) =>
        rekapSheet.mergeCells(r1.number, 4 + i, r2.number, 4 + i)
      );
    });

    const totalRow = rekapSheet.addRow([
      'Jumlah', '', '',
      ...findingTypes.map((k: any) => data.filter(d => d.keterangan === k.text).length)
    ]);
    rekapSheet.mergeCells(totalRow.number, 1, totalRow.number, 3);

    /* ===== SHEET 2 : DETAIL ===== */
    const sheet = workbook.addWorksheet('Laporan Detail');

    sheet.mergeCells('A1:K1');
    sheet.getCell('A1').value = 'LAPORAN BULANAN';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    sheet.addRow(['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEBELUM', 'FOTO SESUDAH', 'KETERANGAN', 'SARAN']);

    sheet.columns = [
      { width: 5 }, { width: 15 }, { width: 15 }, { width: 10 },
      { width: 20 }, { width: 35 }, { width: 25 },
      { width: 30 }, { width: 30 }, { width: 25 }, { width: 45 }
    ];

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const row = sheet.addRow([
        i + 1,
        d.tanggal.split(',')[0],
        d.noTiang,
        d.noWO,
        d.feeder,
        d.lokasi || '-',
        d.geotag || '-',
        '', '', d.keterangan,
        d.status === 'SUDAH EKSEKUSI'
          ? `SUDAH EKSEKUSI oleh ${d.timEksekusi || '-'}`
          : d.status
      ]);
      row.height = 100;

      if (d.fotoTemuan) {
        const b64 = await getBase64FromUrl(formatDriveUrl(d.fotoTemuan));
        if (b64) {
          const img = workbook.addImage({ base64: b64, extension: 'png' });
          sheet.addImage(img, { tl: { col: 7, row: row.number - 1 }, ext: { width: 220, height: 130 } });
        }
      }

      if (d.fotoEksekusi) {
        const b64 = await getBase64FromUrl(formatDriveUrl(d.fotoEksekusi));
        if (b64) {
          const img = workbook.addImage({ base64: b64, extension: 'png' });
          sheet.addImage(img, { tl: { col: 8, row: row.number - 1 }, ext: { width: 220, height: 130 } });
        }
      }
    }

    /* ===== DOWNLOAD ===== */
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_${sanitizeFilename(filters.feeder || 'ALL')}_${sanitizeFilename(filters.pekerjaan || 'PLN')}_${sanitizeFilename(filters.bulan || 'EXPORT')}.xlsx`;
    a.click();

    window.URL.revokeObjectURL(url);
  },

  /* =======================
     PDF EXPORT (SAFE)
  ======================= */
  async downloadPDF(data: TemuanData[], filters: any) {
    if (!isBrowser) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text('LAPORAN BULANAN', 148, 15, { align: 'center' });

    autoTable(doc, {
      head: [['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'KETERANGAN', 'SARAN']],
      body: data.map((d, i) => [
        i + 1,
        d.tanggal.split(',')[0],
        d.noTiang,
        d.noWO,
        d.feeder,
        d.lokasi || '-',
        d.geotag || '-',
        d.keterangan,
        d.status
      ]),
      startY: 25,
      styles: { fontSize: 7 }
    });

    doc.save(`Laporan_${sanitizeFilename(filters.pekerjaan || 'PLN')}.pdf`);
  }
};
