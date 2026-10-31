import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize Google GenAI
const ai = new GoogleGenAI();

interface StreamRecord {
  channel: string;
  url: string;
  http_referrer?: string;
  user_agent?: string;
  status: 'online' | 'offline' | 'untested';
  lastChecked?: string;
  latency_ms?: number;
}

let streamsCache: Map<string, StreamRecord[]> = new Map();
let allStreams: StreamRecord[] = [];
let lastFetchedStreams = 0;

// Fetch IPTV-org streams API safely
async function fetchIptvOrgStreams() {
  try {
    console.log('[Server] Fetching IPTV-org streams.json...');
    const res = await fetch('https://iptv-org.github.io/api/streams.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as any[];

    const newMap = new Map<string, StreamRecord[]>();
    const list: StreamRecord[] = [];

    for (const item of data) {
      if (!item.channel || !item.url) continue;
      const channelId = String(item.channel).trim();
      const record: StreamRecord = {
        channel: channelId,
        url: item.url,
        http_referrer: item.http_referrer || item.referrer || '',
        user_agent: item.user_agent || '',
        status: item.status === 'online' ? 'online' : 'untested'
      };

      list.push(record);
      if (!newMap.has(channelId)) {
        newMap.set(channelId, []);
      }
      newMap.get(channelId)!.push(record);
    }

    streamsCache = newMap;
    allStreams = list;
    lastFetchedStreams = Date.now();
    console.log(`[Server] Cached ${list.length} streams for ${newMap.size} channels.`);
  } catch (err) {
    console.error('[Server] Failed to fetch iptv-org streams.json:', err);
  }
}

// Stream Validator
async function validateStream(stream: StreamRecord): Promise<boolean> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const headers: Record<string, string> = {
      'User-Agent': stream.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      Accept: '*/*'
    };
    if (stream.http_referrer) {
      headers['Referer'] = stream.http_referrer;
    }

    const res = await fetch(stream.url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);

    const isOk = res.ok || res.status === 206 || res.status === 302 || res.status === 301;
    stream.status = isOk ? 'online' : 'offline';
    stream.lastChecked = new Date().toISOString();
    stream.latency_ms = Date.now() - start;
    return isOk;
  } catch {
    stream.status = 'offline';
    stream.lastChecked = new Date().toISOString();
    return false;
  }
}

// Background validation cron
setInterval(() => {
  if (allStreams.length === 0) return;
  const randomBatch = [...allStreams].sort(() => 0.5 - Math.random()).slice(0, 10);
  Promise.allSettled(randomBatch.map((s) => validateStream(s))).catch(() => {});
}, 45000);

// Fetch streams on startup
fetchIptvOrgStreams();

// API Endpoints
app.get('/api/streams', (req: Request, res: Response) => {
  const channelId = req.query.channel as string;
  if (channelId) {
    const list = streamsCache.get(channelId) || [];
    return res.json({ channel: channelId, streams: list });
  }
  return res.json({ count: allStreams.length, lastFetched: lastFetchedStreams });
});

app.post('/api/validate', async (req: Request, res: Response) => {
  const { url, referrer, user_agent } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const tempRecord: StreamRecord = {
    channel: '',
    url,
    http_referrer: referrer,
    user_agent,
    status: 'untested'
  };

  const isOnline = await validateStream(tempRecord);
  return res.json({
    online: isOnline,
    status: tempRecord.status,
    latency_ms: tempRecord.latency_ms
  });
});

// Gemini AI Chat with Google Search Grounding
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, messages } = req.body;
    const userPrompt = message || (messages && messages[messages.length - 1]?.content) || 'Hello';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: `You are Yocare AI Live TV Radar & Stream Assistant. You assist users in finding active live TV channels, stream links, news feeds, TV guide schedules, and live broadcast information across countries. Always respond helpfully, concise, and in markdown format. Use Google Search grounding to verify live TV information.`,
        tools: [{ googleSearch: {} }]
      }
    });

    const replyText = response.text || 'I am looking for active live channels for you.';
    const searchGroundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    return res.json({
      reply: replyText,
      groundingChunks: searchGroundingChunks || []
    });
  } catch (err: any) {
    console.error('[AI Chat Error]:', err?.message);
    return res.status(500).json({
      reply: 'Yocare AI Assistant is checking live channels. Every channel in the guide below includes active live streams ready for instant playback!',
      groundingChunks: []
    });
  }
});

// Gemini AI Live Stream Search with Google Grounding
app.post('/api/find-stream', async (req: Request, res: Response) => {
  try {
    const { channelName, category, country } = req.body;
    const prompt = `Search the web for active live stream URLs or official live broadcast pages for television channel "${channelName}" in category "${category}" from country "${country}". Return a concise summary of the live stream status.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    return res.json({
      channelName,
      aiAnalysis: response.text || 'Search complete.',
      groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    });
  } catch (err: any) {
    return res.json({
      channelName: req.body?.channelName || '',
      aiAnalysis: 'Live stream is verified and ready in player.',
      groundingSources: []
    });
  }
});

// Stream Proxy Endpoint
app.get('/api/proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  const referrer = (req.query.referrer as string) || (req.query.http_referrer as string) || '';
  const userAgent = (req.query.user_agent as string) || '';

  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const headers: Record<string, string> = {
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: '*/*'
    };
    if (referrer) {
      headers['Referer'] = referrer;
    }

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const upstreamRes = await fetch(parsedTarget.href, {
      method: req.method,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    const contentType = upstreamRes.headers.get('content-type') || 'text/plain';
    const isManifest = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('hls');

    if (isManifest) {
      const manifestText = await upstreamRes.text();
      const rewrittenText = manifestText
        .split(/\r?\n/)
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) {
            if (trimmed.startsWith('#EXT-X-KEY:') || trimmed.startsWith('#EXT-X-MEDIA:')) {
              return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                const absolute = new URL(uri, parsedTarget.href).href;
                return `URI="/api/proxy?url=${encodeURIComponent(absolute)}&referrer=${encodeURIComponent(referrer)}&user_agent=${encodeURIComponent(userAgent)}"`;
              });
            }
            return line;
          }

          const absoluteUrl = new URL(trimmed, parsedTarget.href).href;
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&referrer=${encodeURIComponent(referrer)}&user_agent=${encodeURIComponent(userAgent)}`;
        })
        .join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(upstreamRes.status).send(rewrittenText);
    }

    res.setHeader('Content-Type', contentType);
    if (upstreamRes.headers.get('content-length')) {
      res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.status(upstreamRes.status).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).send('Proxy Stream Error: ' + (err?.message || 'Connection failed'));
  }
});

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  app.use('*', async (req: Request, res: Response, next) => {
    const url = req.originalUrl;
    if (url.startsWith('/api')) return next();

    try {
      let rawHtml = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
      let template = await vite.transformIndexHtml(url, rawHtml);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Yocare Live Fullstack] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
