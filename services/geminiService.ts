
import { GoogleGenAI } from "@google/genai";
import { TemuanData } from "../types";

// Analisis data menggunakan Gemini API
export const getDashboardInsights = async (data: TemuanData[]): Promise<string> => {
  try {
    // Initialize Gemini API client as per guidelines using process.env.API_KEY
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

    // Use gemini-3-pro-preview for complex reasoning and analysis tasks as per guidelines
    // Call generateContent directly on ai.models
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    // Access .text property directly (it is a getter, not a method) as per guidelines
    return response.text || "AI memberikan respons kosong.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Robust error handling for common API issues
    if (error.message?.includes('403')) return "Error AI: API Key ditolak atau tidak valid.";
    return "Gagal memuat analisis cerdas saat ini.";
  }
};
