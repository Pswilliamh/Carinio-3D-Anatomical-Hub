import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  app.post('/api/gemini/pdf-review', async (req, res) => {
    try {
      const {
        title,
        textContent,
        pdfBase64,
        language,
        focusQuery,
      } = req.body as {
        title?: string;
        textContent?: string;
        pdfBase64?: string;
        language?: 'en' | 'id';
        focusQuery?: string;
      };

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel in AI Studio.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const langDirective =
        language === 'id'
          ? 'Write the review primarily in Bahasa Indonesia with English clinical/technical terms in parentheses.'
          : 'Write the review in clear English with Bahasa Indonesia vocational terms in parentheses.';

      const reviewInstruction = `You are the Senior Clinical & Biomedical Engineering Reviewer at Karina 3D Lab.
Review the provided PDF reference document ("${title || 'Clinical Reference PDF'}") and produce a structured, practical review and overview for medical-device technicians and CT segmentation trainees.
Structure your response clearly with these 4 sections:
1. EXECUTIVE OVERVIEW (Ringkasan Eksekutif): Core purpose, imaging modality, and clinical/educational scope.
2. KEY ANATOMICAL & TECHNICAL FINDINGS (Temuan Anatomi & Teknis Utama): Specific takeaways for CT Hounsfield thresholding, TMJ/craniomaxillofacial anatomy, scatter artifact cleanup, or 3D surface modeling.
3. PRACTICAL LAB APPLICATION (Aplikasi Praktis di Karina 3D Lab): Step-by-step guidance on how students can apply this document's lessons inside the 4-Viewport MPR & 3D workstation.
4. QUALITY & SAFETY CHECKLIST (Daftar Periksa Kualitas & Keselamatan): Calibration tolerances (0.5-1.0 mm) and non-clinical training reminders.
${langDirective}`;

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (pdfBase64 && typeof pdfBase64 === 'string' && pdfBase64.length > 0) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        });
      }

      const promptText = `Document Title: ${title || 'Reference Document'}
${textContent ? `\nExtracted Document Content / Metadata:\n${textContent}\n` : ''}
${focusQuery ? `\nSpecific Review Focus Requested by User: ${focusQuery}\n` : '\nPlease provide a complete review and overview of this PDF document.'}`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction: reviewInstruction,
        },
      });

      res.json({
        overview: response.text ?? '',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to review PDF document with Gemini API.';
      console.error('PDF Review Error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/gemini/assistant', async (req, res) => {
    try {
      const { prompt, language, context } = req.body as {
        prompt?: string;
        language?: 'en' | 'id';
        context?: string;
      };

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required.' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel in AI Studio.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const langInstruction =
        language === 'id'
          ? 'Respond in Bahasa Indonesia with clear English medical/technical terms in parentheses.'
          : 'Respond in clear, concise English with Indonesian vocational translations for key terms in parentheses.';

      const systemInstruction = `You are the Karina 3D Lab Vocational Instructor for medical-device technicians and biomedical students in Indonesia.
You specialize in:
1. Computed Tomography (CT) physics, Hounsfield Units (HU), Multi-Planar Reconstruction (MPR: Axial, Coronal, Sagittal), and Window/Level presets.
2. Temporomandibular Joint (TMJ) and craniomaxillofacial anatomy (mandibular condyle, glenoid fossa, coronoid process, inferior alveolar/mandibular nerve canal, maxillofacial and mandibular dentition).
3. Segmentation workflows (Hounsfield thresholding, 6-connected Region Growing, Island Removal, and metallic dental filling beam-hardening scatter artifact cleanup).
4. 3D surface mesh generation (Marching Cubes, Laplacian smoothing, STL/OBJ/STEP CAD formats), optical laser surface scanner alignment, SLA/DLP/SLS medical 3D printing, and custom titanium TMJ prosthetic implant design.
Keep answers practical, structured, and concise (under 180 words). Always remind students that this platform is for vocational training on virtualized data, not real surgical diagnosis.
${langInstruction}`;

      const fullPrompt = context
        ? `Current Lab Context: ${context}\n\nStudent Question: ${prompt}`
        : prompt;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: fullPrompt,
        config: {
          systemInstruction,
        },
      });

      res.json({
        reply: response.text ?? '',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate response from Gemini API.';
      console.error('Gemini API Error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Karina CranioTMJ 3D Lab server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
