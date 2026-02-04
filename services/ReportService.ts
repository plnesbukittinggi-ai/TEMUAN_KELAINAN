
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TemuanData } from '../types';

const formatDriveUrl = (url?: string) => {
  if (!url) return '';
  if (url.indexOf('data:image') === 0) return url;
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1]?.split('/')[0];
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
};

const getBase64FromUrl = async (url: string): Promise<string> => {
  if (!url) return "";
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

const extractCoordinates = (geotag: string): string => {
  if (!geotag || geotag === "-") return "-";
  const str = geotag.toString().trim();
  const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
  const match = str.match(coordRegex);
  if (match) return `${match[1]}, ${match[2]}`;
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return `${atMatch[1]}, ${atMatch[2]}`;
  const qMatch = str.match(/[?&]q=([-.\d]+)(?:,|%2C)([-.\d]+)/);
  if (qMatch) return `${qMatch[1]}, ${qMatch[2]}`;
  return str.replace(/[📍]/g, '').replace(/https?:\/\/\S+/g, '').replace(/pukul\s\d{2}[:.]\d{2}[:.]\d{2}/gi, '').trim() || str;
};

export const ReportService = {
  async downloadExcel(data: TemuanData[], filters: any) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');
    worksheet.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

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
    worksheet.addRow(['', 'NAMA FEEDER', `: ${(filters.feeder || 'SEMUA').toUpperCase()}`]);
    worksheet.addRow(['', 'BULAN', `: ${(filters.bulan || '-').toUpperCase()}`]);
    worksheet.addRow([]);

    const headers = ['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEBELUM', 'FOTO SESUDAH', 'KETERANGAN', 'SARAN'];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB7DFF5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    /**
     * Konversi Piksel ke Unit Lebar Excel:
     * (Pixels - 5) / 7 ≈ Units.
     * 128 Pixels ≈ 17.57 Units.
     */
    const colWidths = [5, 15, 15, 10, 20, 35, 25, 17.57, 17.57, 25, 45];
    colWidths.forEach((w, i) => { 
      worksheet.getColumn(i + 1).width = w; 
    });

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const cleanInspeksiDate = item.tanggal ? item.tanggal.split(/[ T,]/)[0] : '-';
      const cleanEksekusiDate = item.tanggalEksekusi ? item.tanggalEksekusi.split(/[ T,]/)[0] : '-';
      
      let statusText: string = item.status;
      if (item.status === 'SUDAH EKSEKUSI') {
        statusText = `SUDAH EKSEKUSI oleh ${item.timEksekusi || '-'} pada ${cleanEksekusiDate}`;
      }

      const row = worksheet.addRow([
        i + 1, cleanInspeksiDate, item.noTiang, item.noWO, item.feeder, item.lokasi || "-", extractCoordinates(item.geotag || ""), "", "", item.keterangan, statusText
      ]);
      
      /**
       * Konversi Piksel ke Poin Tinggi Baris:
       * 1 Pixel = 0.75 Poin.
       * 135 Pixels = 101.25 Poin.
       */
      row.height = 101.25;
      
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      if (item.fotoTemuan) {
        try {
          const b64 = await getBase64FromUrl(formatDriveUrl(item.fotoTemuan));
          if (b64) {
            const imgId = workbook.addImage({ base64: b64, extension: 'png' });
            // Posisi kolom H (indeks 7), ukuran pixel 128x135
            worksheet.addImage(imgId, { 
              tl: { col: 7, row: row.number - 1 }, 
              ext: { width: 128, height: 135 } 
            });
          }
        } catch (e) {
          console.error("Gagal memuat foto temuan ke Excel", e);
        }
      }

      if (item.fotoEksekusi) {
        try {
          const b64 = await getBase64FromUrl(formatDriveUrl(item.fotoEksekusi));
          if (b64) {
            const imgId = workbook.addImage({ base64: b64, extension: 'png' });
            // Posisi kolom I (indeks 8), ukuran pixel 128x135
            worksheet.addImage(imgId, { 
              tl: { col: 8, row: row.number - 1 }, 
              ext: { width: 128, height: 135 } 
            });
          }
        } catch (e) {
          console.error("Gagal memuat foto eksekusi ke Excel", e);
        }
      }
    }

    worksheet.addRow([]);
    const footerData = [
      ['DILAKSANAKAN', `: ${(filters.bulan || '-').toUpperCase()}`],
      ['JAM', ': 07.30 S/D 17.00 WIB'],
      ['PETUGAS', `: ${filters.inspektor1 || '-'}`],
      ['', `: ${filters.inspektor2 || '-'}`],
      ['ADMINSPEKSI', ': ENDANG WINARNINGSIH']
    ];

    footerData.forEach(f => {
      const row = worksheet.addRow(['', '', '', '', '', '', '', '', '', f[0], f[1]]);
      const cJ = row.getCell(10);
      const cK = row.getCell(11);
      [cJ, cK].forEach(c => {
        c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        c.font = { bold: true, size: 9 };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_${filters.bulan || 'Export'}.xlsx`;
    a.click();
  },

  async downloadPDF(data: TemuanData[], filters: any) {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('LAPORAN BULANAN', 148, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`FOTO INSPEKSI TEMUAN KELAINAN KONTRUKSI ${filters.pekerjaan || 'SEMUA'}`, 148, 22, { align: 'center' });
    doc.text('TIM DIVISI INSPEKSI PLN ELECTRICITY SERVICES UL BUKITTINGGI', 148, 28, { align: 'center' });
    
    const tableBody = data.map((item, i) => {
      const cleanEksekusiDate = item.tanggalEksekusi ? item.tanggalEksekusi.split(/[ T,]/)[0] : '-';
      const statusText = item.status === 'SUDAH EKSEKUSI' ? `SUDAH EKSEKUSI oleh ${item.timEksekusi || '-'} pada ${cleanEksekusiDate}` : item.status;
      return [ 
        i + 1, item.tanggal ? item.tanggal.split(/[ T,]/)[0] : '-', item.noTiang, item.noWO, item.feeder, item.lokasi || "-", 
        extractCoordinates(item.geotag || ""), '', '', item.keterangan, statusText 
      ];
    });

    autoTable(doc, {
      startY: 48,
      head: [['NO', 'TANGGAL', 'NO TIANG', 'NO WO', 'FEEDER', 'ALAMAT', 'GEOTAG', 'FOTO SEB', 'FOTO SES', 'KETERANGAN', 'SARAN']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [51, 153, 255], fontSize: 7, halign: 'center' },
      styles: { fontSize: 6, minCellHeight: 25, valign: 'middle' },
      columnStyles: { 5: { cellWidth: 30 }, 6: { cellWidth: 15 }, 9: { cellWidth: 40 } }
    });

    doc.save(`Laporan_${filters.bulan || 'PDF'}.pdf`);
  }
};
