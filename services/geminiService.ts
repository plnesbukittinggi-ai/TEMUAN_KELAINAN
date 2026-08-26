
// Fixed: Using the latest Gemini SDK and following guidelines for text tasks.
import { GoogleGenAI } from "@google/genai";
import { TemuanData } from "../types";

/**
 * Utility to wait for a specified duration.
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analisis data menggunakan Gemini API untuk memberikan insight dashboard.
 * Menggunakan gemini-3-flash-preview karena tugas utama adalah perangkuman (summarization)
 * dan analisis data sederhana, yang merupakan kategori Basic Text Task.
 */
export const getDashboardInsights = async (data: TemuanData[], retryCount = 0): Promise<string> => {
  if (!data || data.length === 0) return "Tidak ada data untuk dianalisis.";

  try {
    // CRITICAL: Initialization with named parameter and process.env.GEMINI_API_KEY.
    // Create a new instance right before the call to ensure up-to-date configuration.
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const summary = data.reduce((acc: any, curr) => {
      const key = curr.ulp || 'Tanpa Unit';
      acc[key] = acc[key] || { total: 0, done: 0 };
      acc[key].total++;
      if (curr.status === 'SUDAH EKSEKUSI') acc[key].done++;
      return acc;
    }, {});

    const prompt = `Lakukan analisis data pemeliharaan jaringan listrik berikut dan berikan ringkasan singkat (maks 3 kalimat) dalam Bahasa Indonesia yang profesional:
    Total Temuan: ${data.length}
    Rincian per ULP: ${JSON.stringify(summary)}
    Tentukan unit mana yang kinerjanya paling rendah (temuan belum selesai terbanyak) dan berikan saran singkat.`;

    // CRITICAL: Calling generateContent directly on ai.models with the model name and prompt.
    // Using gemini-3-flash-preview as recommended for Basic Text Tasks like summarization.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // CRITICAL: Accessing the .text property directly (do not call text()).
    return response.text || "AI memberikan respons kosong.";
  } catch (error: any) {
    console.error("Gemini Error Detail:", error);
    
    // Check for 429 (Resource Exhausted) errors and implement retry logic.
    const is429 = 
      error.status === 429 || 
      error.code === 429 ||
      (error.message && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')));

    if (is429) {
      if (retryCount < 2) {
        console.log(`Rate limited. Retrying in ${2000 * (retryCount + 1)}ms...`);
        await sleep(2000 * (retryCount + 1));
        return getDashboardInsights(data, retryCount + 1);
      }
      return "⚠️ KUOTA TERLAMPAUI (429): Batas penggunaan API Gemini tercapai. Mohon tunggu 1 menit.";
    }
    
    if (error.status === 403 || error.code === 403) {
      return "⚠️ AKSES DITOLAK (403): API Key tidak valid atau tidak memiliki izin akses.";
    }

    return "Gagal memuat analisis cerdas karena kendala teknis pada server AI.";
  }
};
