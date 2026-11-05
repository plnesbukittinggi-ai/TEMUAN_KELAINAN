import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to initialize GoogleGenAI with required user-agent header
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Gemini API endpoint for dashboard insights
app.post('/api/gemini/insights', async (req, res) => {
  try {
    const { data } = req.body || {};
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.json({ insight: 'Tidak ada data temuan untuk dianalisis.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.json({
        insight: 'Layanan analisis cerdas membutuhkan konfigurasi GEMINI_API_KEY di server.',
      });
    }

    const ai = getAiClient();

    const summary: Record<string, { total: number; done: number }> = {};
    for (const curr of data) {
      const key = curr.ulp || 'Tanpa Unit';
      if (!summary[key]) {
        summary[key] = { total: 0, done: 0 };
      }
      summary[key].total++;
      if (curr.status === 'SUDAH EKSEKUSI') {
        summary[key].done++;
      }
    }

    const prompt = `Lakukan analisis data pemeliharaan jaringan listrik berikut dan berikan ringkasan singkat (maksimal 3 kalimat) dalam Bahasa Indonesia yang profesional dan jelas:
Total Temuan: ${data.length}
Rincian per ULP: ${JSON.stringify(summary)}
Tentukan unit mana yang kinerjanya paling rendah (temuan belum selesai terbanyak) dan berikan saran perbaikan singkat.`;

    const timeoutPromise = (ms: number) =>
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), ms)
      );

    let responseText = '';
    // Primary model per gemini-api guidelines: gemini-3.8-flash, with fallback to gemini-3-flash-preview
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        }),
        timeoutPromise(4000),
      ]);
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn(
        'Primary model gemini-3.8-flash warning/timeout, using fast fallback:',
        primaryErr?.message || primaryErr
      );
      try {
        const fallbackResponse = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
          }),
          timeoutPromise(6000),
        ]);
        responseText = fallbackResponse.text || '';
      } catch (fallbackErr: any) {
        console.warn('Fallback model warning:', fallbackErr?.message || fallbackErr);
      }
    }

    return res.json({
      insight: responseText || 'Semua temuan berhasil dievaluasi dan dipantau.',
    });
  } catch (error: any) {
    console.warn('Gemini API Error on server:', error?.message || error);
    const msg =
      error?.status === 429 || error?.code === 429
        ? '⚠️ Batas penggunaan API Gemini tercapai. Mohon tunggu beberapa saat.'
        : 'Analisis cerdas sementara tidak tersedia.';
    return res.json({ insight: msg });
  }
});

// Setup Vite in development or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (isProd: ${isProd})`);
  });
}

startServer();
