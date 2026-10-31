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

async function youtubeRequest(path: string, params: Record<string, string>): Promise<YouTubeVideo[]> {
  const key = getApiKey();
  if (!key) throw new Error('YouTube discovery is not configured. Add VITE_YOUTUBE_API_KEY to the Cloudflare build environment.');

  const url = new URL(`${API_BASE}/${path}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => url.searchParams.set(name, value));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = payload.error?.errors?.[0]?.reason;
      if (response.status === 403 && (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded')) {
        throw new Error('YouTube discovery has reached its API quota. Please try again later.');
      }
      if (response.status === 403 || response.status === 400) {
        throw new Error(payload.error?.message || 'The YouTube API key or API restrictions need checking.');
      }
      throw new Error(payload.error?.message || `YouTube API request failed (${response.status}).`);
    }
    return (payload.items || []).map(mapVideo).filter(Boolean) as YouTubeVideo[];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('YouTube is taking too long to respond. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function fetchTrendingVideos(regionCode = 'IN', categoryId = 'all'): Promise<YouTubeVideo[]> {
  return youtubeRequest('videos', {
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode,
    maxResults: '18',
    ...(categoryId !== 'all' ? { videoCategoryId: categoryId } : {})
  });
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
  });
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
  });
}
