
import { GoogleGenAI } from "@google/genai";
import { TemuanData } from "../types";

export const getDashboardInsights = async (data: TemuanData[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "API Key AI belum dikonfigurasi.";

    const ai = new GoogleGenAI({ apiKey });
    
    const summary = data.reduce((acc: any, curr) => {
      acc[curr.ulp] = acc[curr.ulp] || { total: 0, done: 0 };
      acc[curr.ulp].total++;
      if (curr.status === 'SUDAH EKSEKUSI') acc[curr.ulp].done++;
      return acc;
    }, {});

    const prompt = `Lakukan analisis data pemeliharaan jaringan listrik berikut dan berikan ringkasan singkat (maks 2-3 kalimat) dalam Bahasa Indonesia:
    Total Temuan: ${data.length}
    Rincian per ULP: ${JSON.stringify(summary)}
    Tentukan ULP mana yang butuh perhatian segera berdasarkan jumlah temuan yang belum dieksekusi.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Gagal mendapatkan analisis AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Analisis AI tidak tersedia saat ini.";
  }
};
