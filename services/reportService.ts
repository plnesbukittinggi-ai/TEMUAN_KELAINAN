
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TemuanData } from '../types';

/**
 * Utility to format Google Drive URLs for direct image access.
 */
const formatDriveUrl = (url?: string) => {
  if (!url) return '';
  if (url.indexOf('data:image') === 0) return url;
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
};

/**
 * Utility to convert image URL or base64 to base64 for PDF/Excel inclusion.
 * Robust handling to prevent the whole export from failing if one image fails.
 */
const getBase64FromUrl = async (url: string): Promise<string> => {
  if (!url) return "";
  if (url.indexOf('data:image') === 0) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch image for report:", url);
    return "";
  }
};

/**
 * Sanitize filename to avoid "Failed to download" errors caused by invalid characters.
 */
const sanitizeFilename = (name: string) => {
  return name.replace(/[/\\?%*:|"<>]/g, '-');
};

export const ReportService = {
  /**
   * Generates and downloads an Excel report containing inspection details and a summary sheet.
   */
  async downloadExcel(data: TemuanData[], filters: any) {
    const workbook = new ExcelJS.Workbook();
    
    // --- SHEET 1: REKAP LAPORAN ---
    const rekapSheet = workbook.addWorksheet('Rekap Laporan');
    const findingTypes = filters.relevantKeterangan || []; 
    const totalCols = 3 + findingTypes.length;

    // Judul Rekap
    const titleRow1 = rekapSheet.addRow([`LAPORAN INSPEKSI BULANAN KELAINAN PADA ${String(filters.pekerjaan || '').toUpperCase()}`]);
    rekapSheet.mergeCells(1, 1, 1, totalCols);
    titleRow1.getCell(1).font = { bold: true, size: 12 };
    titleRow1.getCell(1).alignment = { horizontal: 'center' };

    const titleRow2 = rekapSheet.addRow(['PT. HALEYORA POWER UNIT LAYANAN BUKITTINGGI']);
    rekapSheet.mergeCells(2, 1, 2, totalCols);
    titleRow2.getCell(1).font = { bold: true, size: 11 };
    titleRow2.getCell(1).alignment = { horizontal: 'center' };

    const titleRow3 = rekapSheet.addRow([`REKAP LAPORAN ${String(filters.feeder || '').toUpperCase()}`]);
    rekapSheet.mergeCells(3, 1, 3, totalCols);
    titleRow3.getCell(1).font = { bold: true, size: 11 };
    titleRow3.getCell(1).alignment = { horizontal: 'center' };

    const titleRow4 = rekapSheet.addRow([String(filters.bulan || '').toUpperCase()]);
    rekapSheet.mergeCells(4, 1, 4, totalCols);
    titleRow4.getCell(1).font = { bold: true, size: 11 };
    titleRow4.getCell(1).alignment = { horizontal: 'center' };

    rekapSheet.addRow([]);

    const headerRow1 = rekapSheet.addRow(['NO', 'NAMA PENYULANG', 'NAMA REGU']);
    rekapSheet.mergeCells(6, 4, 6, totalCols);
    rekapSheet.getCell(6, 4).value = 'JENIS TEMUAN';
    
    const findingNames = findingTypes.map((k: any) => k.text);
    const headerRow2 = rekapSheet.addRow(['', '', '', ...findingNames]);

    const satuanMapping = findingTypes.map((k: any) => {
      const text = k.text.toLowerCase();
      if (text.includes('pohon')) return '(BTG)';
      if (text.includes('layangan') || text.includes('kawat')) return '(T)';
      return '(BH)';
    });
    const headerRow3 = rekapSheet.addRow(['', '', 'SATUAN', ...satuanMapping]);

    [1, 2, 3].forEach(col => {
      rekapSheet.mergeCells(6, col, 8, col);
    });

    [6, 7, 8].forEach(rowNum => {
      const row = rekapSheet.getRow(rowNum);
      row.eachCell(cell => {
        cell.font = { bold: true, size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E0E0' } };
      });
    });

    rekapSheet.getColumn(1).width = 5;
    rekapSheet.getColumn(2).width = 25;
    rekapSheet.getColumn(3).width = 25;
    findingTypes.forEach((_: any, idx: number) => {
      rekapSheet.getColumn(4 + idx).width = 12;
    });

    const feederReguGroups: Record<string, any> = {};
    data.forEach(item => {
      const key = `${item.feeder}|${item.inspektor1}|${item.inspektor2}`;
      if (!feederReguGroups[key]) {
        feederReguGroups[key] = {
          feeder: item.feeder,
          ins1: item.inspektor1,
          ins2: item.inspektor2,
          counts: {}
        };
      }
      feederReguGroups[key].counts[item.keterangan] = (feederReguGroups[key].counts[item.keterangan] || 0) + 1;
    });

    let rowCounter = 1;
    Object.values(feederReguGroups).forEach((group: any) => {
      const r1 = rekapSheet.addRow([
        rowCounter,
        group.feeder,
        group.ins1,
        ...findingTypes.map((k: any) => group.counts[k.text] || 0)
      ]);
      const r2 = rekapSheet.addRow(['', '', group.ins2, ...Array(findingTypes.length).fill('')]);

      rekapSheet.mergeCells(r1.number, 1, r2.number, 1);
      rekapSheet.mergeCells(r1.number, 2, r2.number, 2);
      findingTypes.forEach((_: any, fIdx: number) => {
        rekapSheet.mergeCells(r1.number, 4 + fIdx, r2.number, 4 + fIdx);
      });

      [r1, r2].forEach(row => {
        row.eachCell(cell => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.font = { size: 9 };
        });
      });
      rowCounter++;
    });

    const grandTotals = findingTypes.map((k: any) => {
      return data.filter(d => d.keterangan === k.text).length;
    });
    const totalRow = rekapSheet.addRow(['Jumlah', '', '', ...grandTotals]);
    rekapSheet.mergeCells(totalRow.number, 1, totalRow.number, 3);
    totalRow.eachCell(cell => {
      cell.font = { bold: true, italic: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF99' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // --- SHEET 2: LAPORAN DETAIL ---
    const worksheet = workbook.addWorksheet('Laporan Detail');

    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'LAPORAN BULANAN';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = `FOTO INSPEKSI TEMUAN KELAINAN KONTRUKSI ${String(filters.pekerjaan || 'SEMUA').toUpperCase()}`;
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:K3');
    worksheet.getCell('A3').value = 'TIM DIVISI INSPEKSI PLN ELECTRICITY SERVICES UL BUKITTINGGI';
    worksheet.getCell('A3').font = { bold: true, size: 11 };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow(['NAMA FEEDER', `: ${filters.feeder || 'SEMUA'}`]);
    worksheet.addRow(['BULAN', `: ${filters.bulan || '-'}`]);
    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEBELUM', 'FOTO SESUDAH', 'KETERANGAN', 'SARAN'
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '333333' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 35;
    worksheet.getColumn(7).width = 25;
    worksheet.getColumn(8).width = 30;
    worksheet.getColumn(9).width = 30;
    worksheet.getColumn(10).width = 25; 
    worksheet.getColumn(11).width = 45;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const cleanEksekusiDate = item.tanggalEksekusi ? item.tanggalEksekusi.split(',')[0] : '-';
      let displayStatus: string = item.status;
      if (item.status === 'SUDAH EKSEKUSI') {
        displayStatus = `SUDAH EKSEKUSI oleh ${item.timEksekusi || '-'} pada ${cleanEksekusiDate}`;
      }

      const row = worksheet.addRow([
        i + 1,
        item.tanggal.split(',')[0],
        item.noTiang,
        item.noWO,
        item.feeder,
        item.lokasi || "-",
        item.geotag || "-",
        "",
        "",
        item.keterangan,
        displayStatus 
      ]);
      row.height = 100;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      if (item.fotoTemuan) {
        try {
          const base64 = await getBase64FromUrl(formatDriveUrl(item.fotoTemuan));
          if (base64) {
            const imgId = workbook.addImage({ base64, extension: 'png' });
            worksheet.addImage(imgId, {
              tl: { col: 7, row: row.number - 1 },
              ext: { width: 220, height: 130 }
            });
          }
        } catch (e) {}
      }

      if (item.fotoEksekusi) {
        try {
          const base64 = await getBase64FromUrl(formatDriveUrl(item.fotoEksekusi));
          if (base64) {
            const imgId = workbook.addImage({ base64, extension: 'png' });
            worksheet.addImage(imgId, {
              tl: { col: 8, row: row.number - 1 },
              ext: { width: 220, height: 130 }
            });
          }
        } catch (e) {}
      }
    }

    // --- TANDA TANGAN (SIGNATURE BLOCK) ---
    const startSignRow = worksheet.lastRow.number + 2;
    const signData = [
      ['DILAKSANAKAN', filters.bulan || '-'],
      ['JAM', ': 07.30 S/D 16.30 WIB'],
      ['PETUGAS', filters.inspektor1 || '-'],
      ['', filters.inspektor2 || '-'],
      ['ADM INSPEKSI', 'ENDANG WINARNINGSIH']
    ];

    signData.forEach((rowData, idx) => {
      const row = worksheet.getRow(startSignRow + idx);
      row.getCell(9).value = rowData[0];
      row.getCell(10).value = rowData[1];
      
      [9, 10].forEach(colIdx => {
        const cell = row.getCell(colIdx);
        cell.font = { size: 9, bold: idx !== 3 && colIdx === 9 };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeFeeder = sanitizeFilename(filters.feeder || 'All');
      const safePek = sanitizeFilename(filters.pekerjaan || 'PLN');
      const safeBulan = sanitizeFilename(filters.bulan || 'Export');
      a.download = `Laporan_${safeFeeder}_${safePek}_${safeBulan}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel generation error:", err);
      throw err;
    }
  },

  async downloadPDF(data: TemuanData[], filters: any) {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('LAPORAN BULANAN', 148, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`FOTO INSPEKSI TEMUAN KELAINAN KONTRUKSI ${filters.pekerjaan || 'SEMUA'}`, 148, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text('TIM DIVISI INSPEKSI PLN ELECTRICITY SERVICES UL BUKITTINGGI', 148, 28, { align: 'center' });

    doc.text(`NAMA FEEDER : ${filters.feeder || 'SEMUA'}`, 15, 38);
    doc.text(`BULAN       : ${filters.bulan || '-'}`, 15, 43);

    const body = data.map((item, i) => {
      let displayStatus: string = item.status;
      if (item.status === 'SUDAH EKSEKUSI') {
        displayStatus = `SUDAH EKSEKUSI oleh ${item.timEksekusi || '-'} pada ${item.tanggalEksekusi ? item.tanggalEksekusi.split(',')[0] : '-'}`;
      }
      return [i + 1, item.tanggal.split(',')[0], item.noTiang, item.noWO, item.feeder, item.lokasi || "-", item.geotag || "-", '', '', item.keterangan, displayStatus];
    });

    autoTable(doc, {
      startY: 48,
      head: [['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEB', 'FOTO SES', 'KETERANGAN', 'SARAN']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], fontSize: 7, halign: 'center' },
      styles: { fontSize: 6, cellPadding: 1.5, minCellHeight: 25, valign: 'middle' },
      columnStyles: { 5: { cellWidth: 30 }, 6: { cellWidth: 20 }, 7: { cellWidth: 25 }, 8: { cellWidth: 25 }, 9: { cellWidth: 40 } }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.text(`DILAKSANAKAN : ${filters.bulan || '-'}`, 220, finalY + 10);
    doc.text(`JAM          : 07.30 S/D 16.30 WIB`, 220, finalY + 15);
    doc.text(`PETUGAS      : ${filters.inspektor1 || '-'}`, 220, finalY + 20);
    doc.text(`               ${filters.inspektor2 || '-'}`, 220, finalY + 25);
    doc.text(`ADMIN INSPEKSI : ENDANG WINARNINGSIH`, 220, finalY + 30);
    doc.save(`Laporan_${sanitizeFilename(filters.pekerjaan || 'PLN')}.pdf`);
  }
};
