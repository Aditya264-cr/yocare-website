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
  if (!key) throw new Error('YouTube discovery is not configured yet. Add VITE_YOUTUBE_API_KEY to the deployment environment.');
  const url = new URL(`${API_BASE}/${path}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => url.searchParams.set(name, value));
  const response = await fetch(url.toString());
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || `YouTube API request failed (${response.status})`);
  }
  const payload = await response.json();
  return (payload.items || []).map(mapVideo).filter(Boolean) as YouTubeVideo[];
}

export function fetchTrendingVideos(regionCode = 'IN'): Promise<YouTubeVideo[]> {
  return youtubeRequest('videos', {
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode,
    maxResults: '18'
  });
}

export function fetchLiveVideos(regionCode = 'IN'): Promise<YouTubeVideo[]> {
  return youtubeRequest('search', {
    part: 'snippet',
    type: 'video',
    eventType: 'live',
    regionCode,
    maxResults: '18',
    order: 'viewCount'
  });
}

export function searchYouTubeVideos(query: string, regionCode = 'IN'): Promise<YouTubeVideo[]> {
  return youtubeRequest('search', {
    part: 'snippet',
    type: 'video',
    q: query,
    regionCode,
    maxResults: '18',
    order: 'relevance',
    safeSearch: 'moderate'
  });
}
