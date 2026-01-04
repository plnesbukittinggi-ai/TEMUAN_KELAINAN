
import { GoogleGenAI } from "@google/genai";
import { TemuanData } from "../types";

export const getDashboardInsights = async (data: TemuanData[]): Promise<string> => {
  // Cek keberadaan kunci sebelum inisialisasi
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("AI Analysis: API_KEY tidak ditemukan di environment variables.");
    return "Konfigurasi AI belum lengkap (API_KEY Kosong).";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "AI memberikan respons kosong.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes('403')) return "Error AI: API Key ditolak atau tidak valid.";
    return "Gagal memuat analisis cerdas saat ini.";
  }
};
