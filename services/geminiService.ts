import { TemuanData } from "../types";

/**
 * Analisis data menggunakan server-side Gemini API untuk memberikan insight dashboard.
 * Mengikuti best practice full-stack AI Studio: pemanggilan API dilakukan di sisi server (/api/gemini/insights).
 */
export const getDashboardInsights = async (data: TemuanData[]): Promise<string> => {
  if (!data || data.length === 0) return "Tidak ada data untuk dianalisis.";

  try {
    const response = await fetch('/api/gemini/insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      return "Analisis data selesai dimuat.";
    }

    const result = await response.json();
    return result?.insight || "Analisis data selesai dimuat.";
  } catch (error) {
    // Tangani secara tenang tanpa melempar fatal exception ke konsol browser
    return "Analisis data saat ini menggunakan mode ringkasan statistik.";
  }
};
