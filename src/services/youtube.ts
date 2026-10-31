export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
  categoryId?: string;
  live?: boolean;
  viewCount?: string;
}

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const REQUEST_TIMEOUT_MS = 12000;
const TRENDING_CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_CACHE_TTL_MS = 60 * 1000;
const SEARCH_CACHE_TTL_MS = 60 * 1000;

type CacheEntry = { expiresAt: number; videos: YouTubeVideo[] };
const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<YouTubeVideo[]>>();

function getApiKey(): string {
  return import.meta.env.VITE_YOUTUBE_API_KEY || '';
}

function mapVideo(item: any): YouTubeVideo | null {
  const id = typeof item.id === 'string' ? item.id : item.id?.videoId;
  const snippet = item.snippet;
  if (!id || !snippet) return null;
  const thumbnails = snippet.thumbnails || {};
  return {
    id,
    title: snippet.title || 'Untitled video',
    description: snippet.description || '',
    channelTitle: snippet.channelTitle || 'YouTube creator',
    publishedAt: snippet.publishedAt || '',
    thumbnail: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '',
    categoryId: snippet.categoryId,
    live: snippet.liveBroadcastContent === 'live',
    viewCount: item.statistics?.viewCount
  };
}

function cacheKey(path: string, params: Record<string, string>): string {
  const stableParams = Object.entries(params)
    .filter(([name]) => name !== 'key')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join('&');
  return `${path}?${stableParams}`;
}

async function youtubeRequest(
  path: string,
  params: Record<string, string>,
  cacheTtlMs: number
): Promise<YouTubeVideo[]> {
  const key = getApiKey();
  if (!key) {
    throw new Error('YouTube discovery is not configured. Add a restricted YouTube Data API v3 key to the Cloudflare build environment.');
  }

  const requestKey = cacheKey(path, params);
  const cached = responseCache.get(requestKey);
  if (cached && cached.expiresAt > Date.now()) return cached.videos;
  if (cached) responseCache.delete(requestKey);

  const pending = inFlightRequests.get(requestKey);
  if (pending) return pending;

  const url = new URL(`${API_BASE}/${path}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => url.searchParams.set(name, value));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const request = (async (): Promise<YouTubeVideo[]> => {
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const reason = payload.error?.errors?.[0]?.reason;
        if (response.status === 403 && ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'].includes(reason)) {
          throw new Error('YouTube discovery has reached its API quota or rate limit. Cached results remain available; try again later.');
        }
        if (response.status === 403 || response.status === 400) {
          throw new Error(payload.error?.message || 'The YouTube API key, API enablement, or referrer restrictions need checking.');
        }
        if (response.status === 429) {
          throw new Error('YouTube is temporarily rate-limiting requests. Please wait a moment and try again.');
        }
        throw new Error(payload.error?.message || `YouTube API request failed (${response.status}).`);
      }

      const videos = (payload.items || []).map(mapVideo).filter(Boolean) as YouTubeVideo[];
      responseCache.set(requestKey, { videos, expiresAt: Date.now() + cacheTtlMs });
      return videos;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('YouTube is taking too long to respond. Please try again.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
      inFlightRequests.delete(requestKey);
    }
  })();

  inFlightRequests.set(requestKey, request);
  return request;
}

export function fetchTrendingVideos(regionCode = 'IN', categoryId = 'all'): Promise<YouTubeVideo[]> {
  return youtubeRequest('videos', {
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode,
    maxResults: '18',
    ...(categoryId !== 'all' ? { videoCategoryId: categoryId } : {})
  }, TRENDING_CACHE_TTL_MS);
}

export function fetchLiveVideos(regionCode = 'IN', categoryId = 'all'): Promise<YouTubeVideo[]> {
  return youtubeRequest('search', {
    part: 'snippet',
    type: 'video',
    eventType: 'live',
    regionCode,
    maxResults: '18',
    order: 'viewCount',
    ...(categoryId !== 'all' ? { videoCategoryId: categoryId } : {})
  }, LIVE_CACHE_TTL_MS);
}

export function searchYouTubeVideos(query: string, regionCode = 'IN', categoryId = 'all'): Promise<YouTubeVideo[]> {
  return youtubeRequest('search', {
    part: 'snippet',
    type: 'video',
    q: query,
    regionCode,
    maxResults: '18',
    order: 'relevance',
    safeSearch: 'moderate',
    ...(categoryId !== 'all' ? { videoCategoryId: categoryId } : {})
  }, SEARCH_CACHE_TTL_MS);
}
