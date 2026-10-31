import { Channel } from '../types';

export interface DiagnosticResult {
  channelId: string;
  isAvailable: boolean;
  status: string;
  latencyMs: number;
}

export type ChannelDiagnostic = {
  isAvailable: boolean;
  latencyMs: number;
  status: string;
};

const REQUEST_TIMEOUT_MS = 5000;
const BATCH_SIZE = 4;

/**
 * Performs an opt-in, read-only HEAD check against a small channel sample.
 * This never touches the active video element or the playback/registry APIs.
 *
 * Browser CORS failures are reported as inconclusive: the browser may block
 * inspection even when the stream itself is healthy. A successful HEAD request
 * proves URL responsiveness only, never HLS validity or actual playback.
 */
export async function testChannelSubset(
  channels: Channel[],
  maxChannels: number = 24
): Promise<Map<string, ChannelDiagnostic>> {
  const subset = channels.slice(0, Math.min(maxChannels, 24));
  const resultMap = new Map<string, ChannelDiagnostic>();

  for (let i = 0; i < subset.length; i += BATCH_SIZE) {
    const batch = subset.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch.map(async (channel) => {
      const streamUrl = channel.url || channel.urls[0];
      if (!streamUrl) {
        resultMap.set(channel.id, { isAvailable: false, latencyMs: 0, status: 'No candidate URL' });
        return;
      }

      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(streamUrl, {
          method: 'HEAD',
          mode: 'cors',
          cache: 'no-store',
          redirect: 'follow',
          signal: controller.signal
        });
        const latencyMs = Date.now() - startedAt;
        const status = response.status;
        let label = 'HTTP response (not playback-verified)';
        if (status === 401 || status === 403) label = `Restricted (HTTP ${status})`;
        else if (status === 404 || status === 410) label = `Not found (HTTP ${status})`;
        else if (status === 405 || status === 501) label = 'HEAD unsupported (inconclusive)';
        else if (status >= 500) label = `Upstream error (HTTP ${status})`;
        else if (response.ok || status === 301 || status === 302 || status === 307 || status === 308) {
          label = 'URL reachable (not playback-verified)';
        } else {
          label = `HTTP ${status}`;
        }
        resultMap.set(channel.id, {
          isAvailable: response.ok || [301, 302, 307, 308].includes(status),
          latencyMs,
          status: label
        });
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        resultMap.set(channel.id, {
          isAvailable: false,
          latencyMs,
          status: isTimeout ? 'Timeout (inconclusive)' : 'Browser/CORS blocked (inconclusive)'
        });
      } finally {
        clearTimeout(timeout);
      }
    }));
  }

  return resultMap;
}
