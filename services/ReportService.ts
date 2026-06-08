
// Consolidated implementation in ReportService.ts
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
 */
const getBase64FromUrl = async (url: string): Promise<string> => {
  if (url.indexOf('data:image') === 0) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return "";
  }
};

export const ReportService = {
  /**
   * Generates and downloads an Excel report containing inspection details and photos.
   * NOTE: Priority column is excluded as per user request.
   */
  async downloadExcel(data: TemuanData[], filters: any) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');
    
    // PAGE & PRINT SETUP
    worksheet.pageSetup = {
      paperSize: 9,            // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,           // Semua kolom muat 1 halaman
      fitToHeight: 0,
      printTitlesRow: '9:9'    // BARIS HEADER
    };

    worksheet.pageSetup.margins = {
      left: 0.3,
      right: 0.3,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    };

    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'LAPORAN BULANAN';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = `FOTO INSPEKSI TEMUAN KELAINAN KONTRUKSI ${String(filters.pekerjaan || 'SEMUA').replace(/Tier/g, 'TIER')}`;
    worksheet.getCell('A2').font = { bold: true, size: 14 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:K3');
    worksheet.getCell('A3').value = 'TIM DIVISI INSPEKSI PLN ELECTRICITY SERVICES UL BUKITTINGGI';
    worksheet.getCell('A3').font = { bold: true, size: 14 };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A4:K4');
    worksheet.getCell('A4').value = `ULP ${filters.ulp || 'SEMUA'}`;
    worksheet.getCell('A4').font = { bold: true, size: 14 };
    worksheet.getCell('A4').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    const feederRow = worksheet.addRow(['', 'NAMA FEEDER', `: ${(filters.feeder || 'SEMUA').toUpperCase()}`]);
    feederRow.getCell(2).font = { bold: true };
    feederRow.getCell(3).font = { bold: true };

    const bulanRow = worksheet.addRow(['', 'BULAN', `: ${(filters.bulan || '-').toUpperCase()}`]);
    bulanRow.getCell(2).font = { bold: true };
    bulanRow.getCell(3).font = { bold: true };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEBELUM', 'FOTO SESUDAH', 'KETERANGAN', 'SARAN', 'CATATAN'
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: '000000' }, name: 'Arial', size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '87CEEB' } };
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
    worksheet.getColumn(8).width = 18.2;
    worksheet.getColumn(9).width = 18.2;
    worksheet.getColumn(10).width = 25;
    worksheet.getColumn(11).width = 45;
    worksheet.getColumn(12).width = 30;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const cleanEksekusiDate = item.tanggalEksekusi ? item.tanggalEksekusi.split(/[ T,]/)[0] : '-';
      let displayStatus: string = item.status;
      if (item.status === 'SUDAH EKSEKUSI') {
        let teamInfo = item.timEksekusi || '-';
        if (item.timEksekusi === 'Team Yandal' && (item.namaYandal1 || item.namaYandal2)) {
          teamInfo += ` (${item.namaYandal1} & ${item.namaYandal2})`;
        }
        displayStatus = `SUDAH EKSEKUSI oleh ${teamInfo} pada ${cleanEksekusiDate}`;
      }
      const cleanInspeksiDate = item.tanggal ? item.tanggal.split(/[ T,]/)[0] : '-';

      const row = worksheet.addRow([
        i + 1, cleanInspeksiDate, item.noTiang, item.noWO, item.feeder, item.lokasi || "-", item.geotag || "-", "", "", item.keterangan, displayStatus, item.catatan || "-"
      ]);
      row.height = 101.25;
      
      row.eachCell((cell) => {
        cell.font = { color: { argb: '000000' }, size: 10, name: 'Arial' };
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
              ext: { width: 128, height: 135 }
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
              ext: { width: 128, height: 135 }
            });
          }
        } catch (e) {}
      }
    }

    worksheet.addRow([]);
    const rowSig1 = worksheet.addRow(['', '', '', '', '', '', '', '', '', 'DILAKSANAKAN', `: ${(filters.bulan || '-').toUpperCase()}`]);
    const rowSig2 = worksheet.addRow(['', '', '', '', '', '', '', '', '', 'JAM', ': 07.30 S/D 17.00 WIB']);
    const rowSig3 = worksheet.addRow(['', '', '', '', '', '', '', '', '', 'PETUGAS', `: ${filters.inspektor1 || '-'}`]);
    const rowSig4 = worksheet.addRow(['', '', '', '', '', '', '', '', '', '', `: ${filters.inspektor2 || '-'}`]);
    const rowSig5 = worksheet.addRow(['', '', '', '', '', '', '', '', '', 'ADM INSPEKSI', `: ENDANG WINARNINGSIH`]);

    [rowSig1, rowSig2, rowSig3, rowSig4, rowSig5].forEach(row => {
      const cellJ = row.getCell(10);
      const cellK = row.getCell(11);
      const borderStyle: Partial<ExcelJS.Border> = { style: 'thin' };
      cellJ.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
      cellK.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileNameExcel = `${(filters.pekerjaan || 'LAPORAN')}_${(filters.feeder || 'SEMUA')}_${(filters.bulan || 'TAHUN')}`.toUpperCase();
    a.download = `${fileNameExcel}.xlsx`;
    a.click();
  },

  async downloadPDF(data: TemuanData[], filters: any) {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('LAPORAN BULANAN', 148, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`FOTO INSPEKSI TEMUAN KELAINAN KONTRUKSI ${String(filters.pekerjaan || 'SEMUA').replace(/Tier/g, 'TIER')}`, 148, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text('TIM DIVISI INSPEKSI PLN ELECTRICITY SERVICES UL BUKITTINGGI', 148, 28, { align: 'center' });
    doc.text(`NAMA FEEDER : ${filters.feeder || 'SEMUA'}`, 15, 38);
    doc.text(`BULAN       : ${filters.bulan || '-'}`, 15, 43);

    const body = data.map((item, i) => {
      let displayStatus: string = item.status;
      if (item.status === 'SUDAH EKSEKUSI') {
        const cleanEksekusiDate = item.tanggalEksekusi ? item.tanggalEksekusi.split(/[ T,]/)[0] : '-';
        let teamInfo = item.timEksekusi || '-';
        if (item.timEksekusi === 'Team Yandal' && (item.namaYandal1 || item.namaYandal2)) {
          teamInfo += ` (${item.namaYandal1} & ${item.namaYandal2})`;
        }
        displayStatus = `SUDAH EKSEKUSI oleh ${teamInfo} pada ${cleanEksekusiDate}`;
      }
      const cleanInspeksiDate = item.tanggal ? item.tanggal.split(/[ T,]/)[0] : '-';
      return [
        i + 1, cleanInspeksiDate, item.noTiang, item.noWO, item.feeder, item.lokasi || "-", item.prioritas ? `${item.prioritas} Bintang` : "-", '', '', item.keterangan, displayStatus
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEB', 'FOTO SES', 'KETERANGAN', 'SARAN']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], fontSize: 7, halign: 'center' },
      styles: { fontSize: 6, cellPadding: 1.5, minCellHeight: 25, valign: 'middle' },
      columnStyles: { 5: { cellWidth: 30 }, 6: { cellWidth: 15 }, 7: { cellWidth: 20 }, 8: { cellWidth: 20 }, 9: { cellWidth: 40 } }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.text(`DILAKSANAKAN : ${filters.bulan || '-'}`, 220, finalY + 10);
    doc.text(`JAM          : 07.30 S/D 17.00 WIB`, 220, finalY + 15);
    doc.text(`PETUGAS      : ${filters.inspektor1 || '-'}`, 220, finalY + 20);
    doc.text(`               ${filters.inspektor2 || '-'}`, 220, finalY + 25);
    doc.text(`ADMINSPEKSI  : ENDANG WINARNINGSIH`, 220, finalY + 30);
    doc.save(`Laporan_${filters.pekerjaan || 'PLN'}.pdf`);
  },

  async downloadYandalExcel(yandalData: { name: string, ulp: string, total: number, period: string }[], filters: { start: string, end: string, ulp: string }) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Yandal');
    
    // PAGE & PRINT SETUP
    worksheet.pageSetup = {
      paperSize: 9,            // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    };

    worksheet.pageSetup.margins = {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    };

    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'LAPORAN REKAP EKSEKUSI PETUGAS YANDAL';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = 'SISTEM INFORMASI TEMUAN KELAINAN';
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:E3');
    worksheet.getCell('A3').value = 'PLN ELECTRICITY SERVICES UL BUKITTINGGI';
    worksheet.getCell('A3').font = { bold: true, size: 12 };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    
    const filterRow1 = worksheet.addRow(['', 'PERIODE', `: ${filters.start ? filters.start : 'SEMUA'} S/D ${filters.end ? filters.end : 'SEMUA'}`]);
    filterRow1.getCell(2).font = { bold: true };
    filterRow1.getCell(3).font = { bold: true };

    const filterRow2 = worksheet.addRow(['', 'ULP', `: ${(filters.ulp || 'SEMUA ULP').toUpperCase()}`]);
    filterRow2.getCell(2).font = { bold: true };
    filterRow2.getCell(3).font = { bold: true };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'NO. URUT', 'BULAN / PERIODE', 'NAMA PETUGAS YANDAL', 'ULP / UNIT', 'TOTAL EKSEKUSI'
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Arial', size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4682B4' } }; // SteelBlue
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    worksheet.getColumn(1).width = 12; // No. Urut
    worksheet.getColumn(2).width = 25; // Bulan / Periode
    worksheet.getColumn(3).width = 35; // Nama Petugas Yandal
    worksheet.getColumn(4).width = 25; // ULP / Unit
    worksheet.getColumn(5).width = 20; // Total Eksekusi

    for (let i = 0; i < yandalData.length; i++) {
      const item = yandalData[i];
      const row = worksheet.addRow([
        i + 1, item.period, item.name, item.ulp, item.total
      ]);
      row.height = 24;
      
      row.eachCell((cell, colNum) => {
        cell.font = { color: { argb: '000000' }, size: 10, name: 'Arial' };
        if (colNum === 1 || colNum === 2 || colNum === 5) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    }

    worksheet.addRow([]);
    worksheet.addRow([]);
    
    // Add signature space
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const sigRow1 = worksheet.addRow(['', '', '', 'Bukittinggi, ' + dateStr]);
    const sigRow2 = worksheet.addRow(['', '', '', 'ADM INSPEKSI']);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    const sigRow6 = worksheet.addRow(['', '', '', 'ENDANG WINARNINGSIH']);
    
    [sigRow1, sigRow2, sigRow6].forEach(row => {
      row.getCell(4).font = { bold: true, name: 'Arial', size: 10 };
      row.getCell(4).alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileNameExcel = `REKAP_YANDAL_${(filters.ulp || 'SEMUA')}_${Date.now()}`.toUpperCase();
    a.download = `${fileNameExcel}.xlsx`;
    a.click();
  },

  async downloadJenisExcel(jenisData: { keterangan: string, total: number, belum: number, sudah: number, padam: number, tidakIzin: number, kendala: number }[], filters: { start: string, end: string, pekerjaan: string, ulp: string, feeder: string, status: string }) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Jenis Temuan');
    
    // PAGE & PRINT SETUP
    worksheet.pageSetup = {
      paperSize: 9,            // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    };

    worksheet.pageSetup.margins = {
      left: 0.5,
      right: 0.5,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    };

    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'LAPORAN REKAP JENIS TEMUAN KELAINAN';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = 'SISTEM INFORMASI TEMUAN KELAINAN';
    worksheet.getCell('A2').font = { bold: true, size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:H3');
    worksheet.getCell('A3').value = 'PLN ELECTRICITY SERVICES UL BUKITTINGGI';
    worksheet.getCell('A3').font = { bold: true, size: 12 };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    
    const filterRow1 = worksheet.addRow(['', 'PERIODE', `: ${filters.start ? filters.start : 'SEMUA'} S/D ${filters.end ? filters.end : 'SEMUA'}`]);
    filterRow1.getCell(2).font = { bold: true };
    filterRow1.getCell(3).font = { bold: true };

    const filterRow2 = worksheet.addRow(['', 'PEKERJAAN', `: ${(filters.pekerjaan || 'SEMUA PEKERJAAN').toUpperCase()}`]);
    filterRow2.getCell(2).font = { bold: true };
    filterRow2.getCell(3).font = { bold: true };

    const filterRow3 = worksheet.addRow(['', 'ULP', `: ${(filters.ulp || 'SEMUA ULP').toUpperCase()}`]);
    filterRow3.getCell(2).font = { bold: true };
    filterRow3.getCell(3).font = { bold: true };

    const filterRow4 = worksheet.addRow(['', 'FEEDER / STATUS', `: ${(filters.feeder || 'SEMUA FEEDER').toUpperCase()} / ${(filters.status || 'SEMUA STATUS').toUpperCase()}`]);
    filterRow4.getCell(2).font = { bold: true };
    filterRow4.getCell(3).font = { bold: true };

    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      'NO. URUT', 'KETERANGAN/JENIS TEMUAN', 'JUMLAH TEMUAN', 'BELUM EKSEKUSI', 'SUDAH EKSEKUSI', 'BUTUH PADAM', 'TIDAK DAPAT IZIN', 'KENDALA MATERIAL'
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Arial', size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } }; // emerald-700
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    worksheet.getColumn(1).width = 12; // No. Urut
    worksheet.getColumn(2).width = 45; // Keterangan
    worksheet.getColumn(3).width = 18; // Jumlah
    worksheet.getColumn(4).width = 18; // Belum
    worksheet.getColumn(5).width = 18; // Sudah
    worksheet.getColumn(6).width = 18; // Padam
    worksheet.getColumn(7).width = 18; // Tdk Izin
    worksheet.getColumn(8).width = 18; // Kendala

    for (let i = 0; i < jenisData.length; i++) {
      const item = jenisData[i];
      const row = worksheet.addRow([
        i + 1, item.keterangan, item.total, item.belum, item.sudah, item.padam, item.tidakIzin, item.kendala
      ]);
      row.height = 24;
      
      row.eachCell((cell, colNum) => {
        cell.font = { color: { argb: '000000' }, size: 10, name: 'Arial' };
        if (colNum === 1 || colNum > 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    }

    // Add total row
    const totalRow = worksheet.addRow([
      'TOTAL KESELURUHAN', 
      '', 
      jenisData.reduce((s, r) => s + r.total, 0),
      jenisData.reduce((s, r) => s + r.belum, 0),
      jenisData.reduce((s, r) => s + r.sudah, 0),
      jenisData.reduce((s, r) => s + r.padam, 0),
      jenisData.reduce((s, r) => s + r.tidakIzin, 0),
      jenisData.reduce((s, r) => s + r.kendala, 0)
    ]);
    totalRow.height = 26;
    worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);
    
    totalRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '111827' } }; // charcoal/black
      if (colNum === 1 || colNum > 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    worksheet.addRow([]);
    worksheet.addRow([]);
    
    // Add signature space
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const sigRow1 = worksheet.addRow(['', '', '', '', '', '', 'Bukittinggi, ' + dateStr]);
    const sigRow2 = worksheet.addRow(['', '', '', '', '', '', 'ADM INSPEKSI']);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    const sigRow6 = worksheet.addRow(['', '', '', '', '', '', 'ENDANG WINARNINGSIH']);
    
    [sigRow1, sigRow2, sigRow6].forEach(row => {
      row.getCell(7).font = { bold: true, name: 'Arial', size: 10 };
      row.getCell(7).alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileNameExcel = `REKAP_JENIS_TEMUAN_${(filters.ulp || 'SEMUA')}_${Date.now()}`.toUpperCase();
    a.download = `${fileNameExcel}.xlsx`;
    a.click();
  }
};
