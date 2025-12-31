
# ⚡ Input Temuan Gangguan dan Eksekusi (PLN ES Bukittinggi)

Aplikasi berbasis web untuk monitoring temuan kelainan jaringan listrik dan manajemen eksekusi perbaikan secara real-time.

## 🚀 Fitur Utama
- **Inspeksi**: Input temuan dengan foto dan geotagging otomatis.
- **Eksekusi**: Update status perbaikan lapangan.
- **Admin Panel**: Dashboard analitik dengan integrasi **Google Gemini AI**.
- **Database**: Terintegrasi dengan Google Spreadsheet (Google Apps Script).

## 🛠️ Cara Deploy ke Vercel

1. **GitHub**:
   - Push folder ini ke repository GitHub Anda.
   
2. **Vercel**:
   - Import project dari GitHub.
   - Pilih **Framework Preset**: `Vite`.
   - Di bagian **Environment Variables**, tambahkan:
     - `API_KEY`: (API Key Gemini Anda dari Google AI Studio).
   - Klik **Deploy**.

## ⚙️ Konfigurasi Spreadsheet
Pastikan `SPREADSHEET_WEB_APP_URL` di file `constants.ts` sudah mengarah ke URL Apps Script Anda yang sudah di-deploy sebagai "Web App" dengan akses "Anyone".

---
© 2026 IT PLN ES Bukittinggi
