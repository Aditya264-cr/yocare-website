import { Channel } from '../types';

export interface DiagnosticResult {
  channelId: string;
  isAvailable: boolean;
  status: number | string;
  latencyMs: number;
}

/**
 * Diagnostic utility function to test a subset of IPTV channels
 * by performing a HEAD request through the existing proxy.
 */
export async function testChannelSubset(
  channels: Channel[],
  maxChannels: number = 24
): Promise<Map<string, { isAvailable: boolean; latencyMs: number; status: string }>> {
  const subset = channels.slice(0, maxChannels);
  const resultMap = new Map<string, { isAvailable: boolean; latencyMs: number; status: string }>();

  // Process in small parallel batches to avoid browser connection limits
  const batchSize = 6;
  for (let i = 0; i < subset.length; i += batchSize) {
    const batch = subset.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (channel) => {
        const streamUrl = channel.url || channel.urls[0];
        if (!streamUrl) {
          resultMap.set(channel.id, { isAvailable: false, latencyMs: 0, status: 'No URL' });
          return;
        }

        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(streamUrl, {
            method: 'HEAD',
            signal: controller.signal
          });
          clearTimeout(timeout);

          const latencyMs = Date.now() - start;
          const ok = res.ok || res.status === 206 || res.status === 302 || res.status === 301;

          resultMap.set(channel.id, {
            isAvailable: ok,
            latencyMs,
            status: ok ? '200 OK' : `HTTP ${res.status}`
          });
        } catch (err: any) {
          resultMap.set(channel.id, {
            isAvailable: false,
            latencyMs: Date.now() - start,
            status: err.name === 'AbortError' ? 'Timeout' : 'Offline'
          });
        }
      })
    );
  }

  return resultMap;
}
