import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function parseFrameGrid(frameStr: string): string[] {
  const rawLines = frameStr.replace(/\r/g, '').split('\n');
  const rows: string[] = [];
  for (let r = 0; r < 15; r++) {
    const cleaned = (rawLines[r] ?? '').replace(/[^ .:+*#@]/g, '+');
    rows.push(cleaned.padEnd(15, ' ').slice(0, 15));
  }
  return rows;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/creatures/generate', async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      res.status(400).json({ error: 'Please describe an animal to generate.' });
      return;
    }

    const ai = getAiClient();

    const systemInstruction = [
      'You are an ASCII pixel-sprite & kinetic simulation designer for a dark obsidian digital pond.',
      'Given a user description of a creature, synthesize EXACTLY 4 distinct creative variations of that creature.',
      'For example, for "Sea turtle", create 4 varieties like: 1. Green sea turtle (olive/amber), 2. Hawksbill (amber-gold serrated shell), 3. Bioluminescent Glow (cyan/teal), 4. Leatherback (slate-silver & ice).',
      'CRITICAL SPRITE RULES:',
      '- Each variant has `frameGrids`: an array of 3 strings representing a 3-step movement cycle (e.g. flippers forward, mid, swept back; or wings open, mid, folded).',
      '- Each string in `frameGrids` MUST contain EXACTLY 15 lines separated by "\\n", and each line MUST be 15 characters long.',
      '- The creature faces UPWARD (top line = snout/head/antennae, bottom line = tail/rear).',
      '- Use ONLY these ASCII density characters:',
      '  " " (space = transparent)',
      '  "." (dark border / fin edge / outline)',
      '  ":" (soft membrane / tail)',
      '  "+" (medium body texture)',
      '  "*" (bright shell / wing / scale)',
      '  "#" (dense core / carapace / torso)',
      '  "@" (eyes / bright bioluminescent spots)',
      '- `palette`: 4 hex colors [borderDeep, midBody, brightScale, eyeHighlight] designed to look natural and luminous on #050811.',
      '- `archetype`: one of "winged", "swimmer", "bell", "hover", "hopper", "crawler", "turtle".',
    ].join('\n');

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        speciesGroup: { type: Type.STRING },
        speciesLabel: { type: Type.STRING },
        variants: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              archetype: { type: Type.STRING },
              palette: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              frameGrids: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              motion: {
                type: Type.OBJECT,
                properties: {
                  speed: { type: Type.NUMBER },
                  size: { type: Type.NUMBER },
                  amount: { type: Type.INTEGER },
                  flutter: { type: Type.NUMBER },
                  glide: { type: Type.NUMBER },
                  flapRate: { type: Type.NUMBER },
                  shimmer: { type: Type.NUMBER },
                  sparkle: { type: Type.NUMBER },
                  trail: { type: Type.NUMBER },
                },
              },
            },
            required: ['name', 'description', 'archetype', 'palette', 'frameGrids', 'motion'],
          },
        },
      },
      required: ['speciesGroup', 'speciesLabel', 'variants'],
    };

    let rawText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create 4 distinct animated ASCII sprite variants for: "${prompt}"`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema,
        },
      });
      rawText = stripJsonFences(response.text ?? '');
    } catch (primaryErr) {
      console.warn('Primary creature synthesis failed, retrying with fallback model:', primaryErr);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Create 4 distinct animated ASCII sprite variants for: "${prompt}". Return JSON matching { speciesGroup, speciesLabel, variants: [{ name, description, archetype, palette: [4 hex], frameGrids: [3 15x15 newline strings], motion: { speed, size, amount, flutter, glide, flapRate, shimmer, sparkle, trail } }] }.`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });
      rawText = stripJsonFences(fallbackResponse.text ?? '');
    }

    const parsed = JSON.parse(rawText || '{}');

    if (!parsed || !Array.isArray(parsed.variants) || parsed.variants.length === 0) {
      throw new Error('Could not synthesize variants for that description. Try adding a bit more visual detail.');
    }

    const normalizedVariants = parsed.variants.slice(0, 4).map((v: Record<string, unknown>, idx: number) => {
      const paletteRaw = Array.isArray(v.palette) ? v.palette.map(String) : [];
      const palette: [string, string, string, string] = [
        paletteRaw[0] || '#1e3a8a',
        paletteRaw[1] || '#38bdf8',
        paletteRaw[2] || '#7dd3fc',
        paletteRaw[3] || '#f8fafc',
      ];

      let cleanFrames: string[][] = [];
      if (Array.isArray(v.frameGrids)) {
        cleanFrames = v.frameGrids.slice(0, 4).map((gridStr) => parseFrameGrid(String(gridStr || '')));
      } else if (Array.isArray(v.frames)) {
        cleanFrames = v.frames.slice(0, 4).map((frame: unknown) => {
          const rows = Array.isArray(frame) ? frame.map((r) => String(r)) : [];
          return parseFrameGrid(rows.join('\n'));
        });
      }

      while (cleanFrames.length < 2) {
        cleanFrames.push(
          cleanFrames[0] ?? Array.from({ length: 15 }, () => '      +*+      ')
        );
      }

      const m = (v.motion && typeof v.motion === 'object' ? v.motion : {}) as Record<string, unknown>;
      const clamp = (val: unknown, min: number, max: number, fallback: number) => {
        const n = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
        return Math.min(max, Math.max(min, n));
      };

      const validArchetypes = ['winged', 'swimmer', 'bell', 'hover', 'hopper', 'crawler', 'turtle'];
      const archetype = validArchetypes.includes(String(v.archetype))
        ? String(v.archetype)
        : 'swimmer';

      return {
        id: `variant-${Date.now()}-${idx}`,
        name: String(v.name || `Variant ${idx + 1}`),
        description: String(v.description || 'Custom synthesized ASCII creature'),
        dotColor: palette[2],
        blueprint: {
          archetype,
          palette,
          frames: cleanFrames,
        },
        motion: {
          speed: clamp(m.speed, 0.3, 2.2, 0.9),
          size: clamp(m.size, 0.9, 2.0, 1.38),
          amount: Math.round(clamp(m.amount, 14, 34, 20)),
          flutter: clamp(m.flutter, 0, 1.8, 0.55),
          glide: clamp(m.glide, 0, 3.5, 1.8),
          flapRate: clamp(m.flapRate, 0.3, 2.5, 1.0),
          shimmer: clamp(m.shimmer, 0, 1, 0.32),
          sparkle: clamp(m.sparkle, 0, 1, 0.24),
          trail: clamp(m.trail, 0, 2, 0.85),
        },
      };
    });

    res.json({
      speciesGroup: String(parsed.speciesGroup || prompt),
      speciesLabel: String(parsed.speciesLabel || prompt),
      variants: normalizedVariants,
    });
  } catch (err) {
    console.error('Creature generation error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate creature variants.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];

    if (!query) {
      res.status(400).json({ error: 'Please enter a search query or question.' });
      return;
    }

    const ai = getAiClient();

    let fullPrompt = query;
    if (attachments.length > 0) {
      const contextBlock = attachments
        .slice(0, 6)
        .map((a: { title?: string; content?: string }) => `--- ${String(a.title || 'Attachment')} ---\n${String(a.content || '').slice(0, 4000)}`)
        .join('\n\n');
      fullPrompt = `Context attached by user:\n${contextBlock}\n\nUser search/request:\n${query}`;
    }

    let response;
    let usedGrounding = true;

    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: fullPrompt,
        config: {
          systemInstruction:
            'You are the search and knowledge engine inside a minimalist dark browser workspace. Use Google Search when answering questions about facts, news, people, places, technology, or general web queries. Keep answers crisp, readable, and well-structured.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (searchErr) {
      console.warn('Google Search grounding unavailable, falling back to direct model response:', searchErr);
      usedGrounding = false;
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: fullPrompt,
        config: {
          systemInstruction:
            'You are the search and knowledge engine inside a minimalist dark browser workspace. Keep answers crisp, readable, and well-structured.',
        },
      });
    }

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const seenUrls = new Set<string>();
    const sources: { title: string; url: string }[] = [];

    if (Array.isArray(rawChunks)) {
      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (typeof uri === 'string' && uri.startsWith('http') && !seenUrls.has(uri)) {
          seenUrls.add(uri);
          sources.push({
            title: typeof title === 'string' && title.trim() ? title.trim() : new URL(uri).hostname,
            url: uri,
          });
          if (sources.length >= 6) break;
        }
      }
    }

    if (sources.length === 0) {
      sources.push({
        title: usedGrounding ? `Open Google results for "${query.slice(0, 40)}"` : `Search Google for "${query.slice(0, 40)}"`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      });
    }

    res.json({
      answer: (response.text ?? '').trim(),
      sources,
    });
  } catch (err) {
    console.error('Ask omnibar error:', err);
    let message = err instanceof Error ? err.message : 'Failed to complete search.';
    try {
      const parsedErr = JSON.parse(message);
      if (parsedErr?.error?.message) {
        message = parsedErr.error.message;
      }
    } catch {
      // keep string message
    }
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
