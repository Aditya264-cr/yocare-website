import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In-memory stream cache
const streamsCache = new Map<string, any[]>();
let allStreams: any[] = [];

async function fetchIptvOrgStreams() {
  try {
    const res = await fetch('https://iptv-org.github.io/api/streams.json');
    if (!res.ok) return;
    const data = (await res.json()) as any[];
    for (const item of data) {
      if (!item.channel || !item.url) continue;
      const channelId = String(item.channel).trim();
      const record = {
        channel: channelId,
        url: item.url,
        http_referrer: item.http_referrer || item.referrer || '',
        user_agent: item.user_agent || '',
        status: item.status === 'online' ? 'online' : 'untested'
      };
      allStreams.push(record);
      if (!streamsCache.has(channelId)) streamsCache.set(channelId, []);
      streamsCache.get(channelId)!.push(record);
    }
  } catch (e) {
    console.error('Failed to pre-fetch iptv-org streams:', e);
  }
}

fetchIptvOrgStreams();

function apiProxyPlugin() {
  return {
    name: 'api-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        const url = new URL(req.url, 'http://localhost:3000');

        if (url.pathname === '/api/streams') {
          const channelId = url.searchParams.get('channel');
          res.setHeader('Content-Type', 'application/json');
          if (channelId) {
            return res.end(JSON.stringify({ channel: channelId, streams: streamsCache.get(channelId) || [] }));
          }
          return res.end(JSON.stringify({ count: allStreams.length }));
        }

        if (url.pathname === '/api/proxy') {
          const targetUrl = url.searchParams.get('url');
          const referrer = url.searchParams.get('referrer') || url.searchParams.get('http_referrer') || '';
          const userAgent = url.searchParams.get('user_agent') || '';

          if (!targetUrl) {
            res.statusCode = 400;
            return res.end('Missing url parameter');
          }

          try {
            const parsedTarget = new URL(targetUrl);
            const headers: Record<string, string> = {
              'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: '*/*'
            };
            if (referrer) headers['Referer'] = referrer;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const upstreamRes = await fetch(parsedTarget.href, {
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
              res.statusCode = upstreamRes.status;
              return res.end(rewrittenText);
            }

            res.setHeader('Content-Type', contentType);
            const arrayBuffer = await upstreamRes.arrayBuffer();
            res.statusCode = upstreamRes.status;
            return res.end(Buffer.from(arrayBuffer));
          } catch (err: any) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = 502;
            return res.end('Proxy Error: ' + (err?.message || 'Connection failed'));
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiProxyPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
