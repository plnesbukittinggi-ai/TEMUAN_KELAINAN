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

    worksheet.mergeCells('A4:K4');
    worksheet.getCell('A4').value = `ULP ${filters.ulp || 'SEMUA'}`;
    worksheet.getCell('A4').font = { bold: true, size: 11 };
    worksheet.getCell('A4').alignment = { horizontal: 'center' };

    worksheet.addRow([]);
    worksheet.addRow(['NAMA FEEDER', `: ${filters.feeder || 'SEMUA'}`]);
    worksheet.addRow(['BULAN', `: ${filters.bulan || '-'}`]);
    worksheet.addRow([]);

    // Headers excluding Priority
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
    
    // Width set to approx 128px (approx 18.2 units)
    worksheet.getColumn(8).width = 18.2; // Foto Sebelum
    worksheet.getColumn(9).width = 18.2; // Foto Sesudah
    
    worksheet.getColumn(10).width = 25; // Keterangan
    worksheet.getColumn(11).width = 45; // Saran

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      const cleanEksekusiDate = item.tanggalEksekusi ? item.tanggalEksekusi.split(',')[0] : '-';
      
      let displayStatus: string = item.status;
      if (item.status === 'SUDAH EKSEKUSI') {
        displayStatus = `SUDAH EKSEKUSI oleh ${item.timEksekusi || '-'} pada ${cleanEksekusiDate}`;
      }

      // Row content excluding Priority
      const row = worksheet.addRow([
        i + 1,
        item.tanggal.split(',')[0],
        item.noTiang,
        item.noWO,
        item.feeder,
        item.lokasi || "-",
        item.geotag || "-",
        "", // Foto Sebelum (Placeholder)
        "", // Foto Sesudah (Placeholder)
        item.keterangan,
        displayStatus
      ]);
      
      // Height set to 135px (101.25 points)
      row.height = 101.25;
      
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
              tl: { col: 7, row: row.number - 1 }, // Column H (index 7)
              ext: { width: 128, height: 135 } // Fill exact 128x135px
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
              tl: { col: 8, row: row.number - 1 }, // Column I (index 8)
              ext: { width: 128, height: 135 } // Fill exact 128x135px
            });
          }
        } catch (e) {}
      }
    }

    worksheet.addRow([]);
    worksheet.addRow(['', '', '', '', '', '', '', '', '', 'DILAKSANAKAN', `: ${filters.bulan || '-'}`]);
    worksheet.addRow(['', '', '', '', '', '', '', '', '', 'JAM', ': 07.30 S/D 17.00 WIB']);
    worksheet.addRow(['', '', '', '', '', '', '', '', '', 'PETUGAS', `: ${filters.inspektor1 || '-'}`]);
    worksheet.addRow(['', '', '', '', '', '', '', '', '', '', `: ${filters.inspektor2 || '-'}`]);
    worksheet.addRow(['', '', '', '', '', '', '', '', '', 'ADMINSPEKSI', `: ENDANG WINARNINGSIH`]);

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
        item.prioritas ? `${item.prioritas} Bintang` : "-",
        '',
        '',
        item.keterangan,
        displayStatus
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'PRIORITAS', 'FOTO SEB', 'FOTO SES', 'KETERANGAN', 'SARAN']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], fontSize: 7, halign: 'center' },
      styles: { fontSize: 6, cellPadding: 1.5, minCellHeight: 25, valign: 'middle' },
      columnStyles: {
        5: { cellWidth: 30 },
        6: { cellWidth: 15 },
        7: { cellWidth: 20 },
        8: { cellWidth: 20 },
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
