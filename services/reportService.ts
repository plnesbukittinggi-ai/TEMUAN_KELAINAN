
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TemuanData, Keterangan } from '../types';

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

 async downloadRekapExcel(
  data: TemuanData[],
  findings: Keterangan[],
  filters: any
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Rekap Temuan');

  /** Helper: convert column index to Excel letter */
  const colLetter = (n: number) => {
    let s = '';
    while (n > 0) {
      let m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  const totalCols = 3 + (findings?.length || 0);
  const lastColLetter = colLetter(totalCols);

  /* ================= HEADER (Row 1–4) ================= */
  const titleRows = [
    `LAPORAN INSPEKSI BULANAN KELAINAN PADA ${filters.pekerjaan?.toUpperCase() || ''}`,
    'PLN ELECTRICITY SERVICES UNIT LAYANAN BUKITTINGGI',
    `REKAP LAPORAN ${filters.feeder?.toUpperCase() || ''}`,
    filters.bulan?.toUpperCase() || ''
  ];

  titleRows.forEach((text, i) => {
    const rowNum = i + 1;
    worksheet.mergeCells(`A${rowNum}:${lastColLetter}${rowNum}`);
    const cell = worksheet.getCell(`A${rowNum}`);
    cell.value = text;
    cell.font = { bold: true, size: 11, name: 'Times New Roman' };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  worksheet.addRow([]); // row 5 spacer

  /* ================= TABLE HEADER ================= */
  const row6 = worksheet.getRow(6);
  row6.values = ['NO', 'NAMA PENYULANG', 'NAMA REGU'];

  ['A', 'B', 'C'].forEach(col => {
    worksheet.mergeCells(`${col}6:${col}7`);
    const cell = worksheet.getCell(`${col}6`);
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  if (findings.length > 0) {
    worksheet.mergeCells(6, 4, 6, totalCols);
    const cell = worksheet.getCell(6, 4);
    cell.value = 'JENIS TEMUAN';
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }

  const row7 = worksheet.getRow(7);
  row7.height = 180;

  findings.forEach((f, i) => {
    const col = 4 + i;
    const cell = row7.getCell(col);
    cell.value = f.text.toUpperCase();
    cell.alignment = {
      textRotation: 90,
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };
    cell.font = { bold: true, size: 8 };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheet.getColumn(col).width = 4;
  });

  row6.commit();
  row7.commit();

  /* ================= DATA ================= */
  const grouped: Record<string, any> = {};

  data.forEach(item => {
    const regu = [item.inspektor1, item.inspektor2].filter(Boolean).join(' & ');
    const key = `${item.feeder}|${regu}`;

    if (!grouped[key]) {
      grouped[key] = {
        feeder: item.feeder,
        regu,
        counts: Object.fromEntries(findings.map(f => [f.text, 0]))
      };
    }
    if (grouped[key].counts[item.keterangan] !== undefined) {
      grouped[key].counts[item.keterangan]++;
    }
  });

  let rowNum = 8;
  Object.values(grouped).forEach((r: any, idx: number) => {
    const row = worksheet.getRow(rowNum);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = r.feeder;
    row.getCell(3).value = r.regu;

    findings.forEach((f, i) => {
      const cell = row.getCell(4 + i);
      cell.value = r.counts[f.text] || 0;
      cell.alignment = { horizontal: 'center' };
    });

    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { size: 9 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    row.commit();
    rowNum++;
  });

  /* ================= TOTAL ================= */
  const totalRow = worksheet.getRow(rowNum);
  worksheet.mergeCells(`A${rowNum}:C${rowNum}`);
  totalRow.getCell(1).value = 'Jumlah';
  totalRow.getCell(1).font = { bold: true };

  findings.forEach((_, i) => {
    const col = colLetter(4 + i);
    totalRow.getCell(4 + i).value = {
      formula: `SUM(${col}8:${col}${rowNum - 1})`
    };
    totalRow.getCell(4 + i).font = { bold: true };
    totalRow.getCell(4 + i).alignment = { horizontal: 'center' };
  });

  totalRow.commit();

  /* ================= COLUMN WIDTH ================= */
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 25;
  worksheet.getColumn(3).width = 25;

  /* ================= EXPORT ================= */
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Temuan_${filters.pekerjaan}_${filters.feeder}_${filters.bulan}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}


  /**
   * Generates and downloads an Excel report containing inspection details and photos.
   */
  async downloadExcel(data: TemuanData[], filters: any) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');

    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'LAPORAN BULANAN';
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = `FOTO INSPEKSI TEMUAN KELAINAN KONTRUKSI ${filters.pekerjaan || 'SEMUA'}`;
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
    worksheet.getColumn(10).width = 25; // Wider for detailed status
    worksheet.getColumn(11).width = 45;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      // Bersihkan tanggal eksekusi dari komponen waktu (Time)
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

    worksheet.addRow([]);
    worksheet.addRow(['', '', '', '', '', '', '', '', 'DILAKSANAKAN', `: ${filters.bulan || '-'}`]);
    worksheet.addRow(['', '', '', '', '', '', '', '', 'JAM', ': 07.30 S/D 17.00 WIB']);
    worksheet.addRow(['', '', '', '', '', '', '', '', 'PETUGAS', `: ${filters.inspektor1 || '-'}`]);
    worksheet.addRow(['', '', '', '', '', '', '', '', '', `: ${filters.inspektor2 || '-'}`]);
    worksheet.addRow(['', '', '', '', '', '', '', '', 'ADMINSPEKSI', `: ENDANG WINARNINGSIH`]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_${filters.pekerjaan || 'PLN'}_${filters.bulan || 'Export'}.xlsx`;
    a.click();
  },

  /**
   * Generates and downloads a PDF report.
   */
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
      return [
        i + 1,
        item.tanggal.split(',')[0],
        item.noTiang,
        item.noWO,
        item.feeder,
        item.lokasi || "-",
        item.geotag || "-",
        '',
        '',
        item.keterangan,
        displayStatus
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEB', 'FOTO SES', 'STATUS', 'SARAN']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], fontSize: 7, halign: 'center' },
      styles: { fontSize: 6, cellPadding: 1.5, minCellHeight: 25, valign: 'middle' },
      columnStyles: {
        5: { cellWidth: 30 },
        6: { cellWidth: 20 },
        7: { cellWidth: 25 },
        8: { cellWidth: 25 },
        9: { cellWidth: 40 }, 
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.text(`DILAKSANAKAN : ${filters.bulan || '-'}`, 220, finalY + 10);
    doc.text(`JAM          : 07.30 S/D 17.00 WIB`, 220, finalY + 15);
    doc.text(`PETUGAS      : ${filters.inspektor1 || '-'}`, 220, finalY + 20);
    doc.text(`               ${filters.inspektor2 || '-'}`, 220, finalY + 25);
    doc.text(`ADMINSPEKSI  : ENDANG WINARNINGSIH`, 220, finalY + 30);

    doc.save(`Laporan_${filters.pekerjaan || 'PLN'}.pdf`);
  }
};
