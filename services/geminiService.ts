
// Fixed: Using the latest Gemini SDK and following guidelines for text tasks.
import { GoogleGenAI } from "@google/genai";
import { TemuanData } from "../types";

/**
 * Analisis data menggunakan Gemini API untuk memberikan insight dashboard.
 * Menggunakan gemini-3-flash-preview karena tugas utama adalah perangkuman (summarization)
 * dan analisis data sederhana, yang merupakan kategori Basic Text Task.
 */
export const getDashboardInsights = async (data: TemuanData[]): Promise<string> => {
  try {
    // CRITICAL: Initialization with named parameter and process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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

    // CRITICAL: Accessing .text property directly (not a method call text()) as per guidelines.
    return response.text || "AI memberikan respons kosong.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Robust error handling for common API issues
    if (error.message?.includes('403')) return "Error AI: API Key ditolak atau tidak valid.";
    return "Gagal memuat analisis cerdas saat ini.";
  }
};
