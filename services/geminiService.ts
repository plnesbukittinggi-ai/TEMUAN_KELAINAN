
import { GoogleGenAI } from "@google/genai";
import { TemuanData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDashboardInsights = async (data: TemuanData[]): Promise<string> => {
  try {
    const summary = data.reduce((acc: any, curr) => {
      acc[curr.ulp] = acc[curr.ulp] || { total: 0, done: 0 };
      acc[curr.ulp].total++;
      if (curr.status === 'SUDAH EKSEKUSI') acc[curr.ulp].done++;
      return acc;
    }, {});

    const prompt = `Analyze this maintenance data for an electrical grid and provide a concise summary (max 3 sentences) in Indonesian:
    Total Findings: ${data.length}
    Status Breakdown: ${JSON.stringify(summary)}
    Identify if any ULP needs urgent attention. Assume 'done' refers to 'SUDAH EKSEKUSI'.`;

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
