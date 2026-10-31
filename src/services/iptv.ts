import { Channel, Country, CategoryType, StreamInfo } from '../types';

export const COUNTRIES: Country[] = [
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { code: 'za', name: 'South Africa', flag: '🇿🇦' },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽' },
  { code: 'ph', name: 'Philippines', flag: '🇵🇭' },
  { code: 'pk', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'bd', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'np', name: 'Nepal', flag: '🇳🇵' }
];

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  all: 'All channels',
  news: 'News',
  sports: 'Sports',
  entertainment: 'Entertainment',
  music: 'Music',
  kids: 'Kids & family',
  religion: 'Spiritual',
  general: 'General'
};

// Fallback high-uptime streams
const FALLBACK_STREAMS: Record<string, string[]> = {
  news: [
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'https://d2e1asnsl7br7b.cloudfront.net/7782e205e72f4fdb96e6d113709b173a/index.m3u8'
  ],
  sports: [
    'https://playertest.longtailvideo.com/adaptive/oceans/oceans.m3u8'
  ],
  entertainment: [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  ],
  music: [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  ],
  general: [
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  ]
};

// In-memory cache for IPTV-org streams API
let iptvStreamsMap: Map<string, Array<{ url: string; http_referrer?: string; user_agent?: string; status?: string }>> | null = null;

export async function loadIptvStreamsIndex(): Promise<Map<string, Array<{ url: string; http_referrer?: string; user_agent?: string; status?: string }>>> {
  if (iptvStreamsMap) return iptvStreamsMap;

  try {
    const res = await fetch('https://iptv-org.github.io/api/streams.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const map = new Map<string, Array<{ url: string; http_referrer?: string; user_agent?: string; status?: string }>>();

    for (const item of data) {
      if (!item.channel || !item.url) continue;
      const channelId = String(item.channel).trim().toLowerCase();
      if (!map.has(channelId)) {
        map.set(channelId, []);
      }
      map.get(channelId)!.push({
        url: item.url,
        http_referrer: item.http_referrer || item.referrer || '',
        user_agent: item.user_agent || '',
        status: item.status || 'untested'
      });
    }

    iptvStreamsMap = map;
    return map;
  } catch (err) {
    console.warn('Failed to load iptv-org streams.json:', err);
    iptvStreamsMap = new Map();
    return iptvStreamsMap;
  }
}

export function buildProxiedUrl(rawUrl: string, referrer = '', userAgent = ''): string {
  if (!rawUrl) return '';
  return `/api/proxy?url=${encodeURIComponent(rawUrl)}&referrer=${encodeURIComponent(referrer)}&user_agent=${encodeURIComponent(userAgent)}`;
}

const normalise = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(uhd|fhd|hd|sd|4k|1080p|720p|576p|480p|360p)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const categoryFor = (name: string, group?: string): string => {
  const source = ((group || '') + ' ' + name).toLowerCase();
  if (/news|headline|breaking|business|finance|weather|politic/.test(source)) return 'news';
  if (/music|radio|song|hits|mtv|vevo|concert/.test(source)) return 'music';
  if (/spiritual|relig|bhajan|devotional|faith|worship|church|temple|islam|quran|christ|gospel|aastha/.test(source)) return 'religion';
  if (/sport|cricket|football|soccer|tennis|basketball/.test(source)) return 'sports';
  if (/kids|child|cartoon|animation/.test(source)) return 'kids';
  if (/movie|cinema|film|drama|entertainment/.test(source)) return 'entertainment';
  return 'general';
};

export const initialsFor = (name: string): string => {
  const cleaned = name.replace(/\([^)]*\)/g, '').replace(/\b(HD|FHD|UHD|4K|TV)\b/gi, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0] || 'TV').slice(0, 2).toUpperCase();
};

export function parsePlaylist(text: string, countryCode: string, streamsIndex?: Map<string, any[]>): Channel[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const parsed: Channel[] = [];
  let pending: { name: string; group?: string; logo?: string; tvgId?: string; rawUrl?: string } | null = null;

  const commit = () => {
    if (!pending || !pending.name) return;
    const key = normalise(pending.name);
    const idKey = pending.tvgId || key;
    const registryId = `${idKey}@${countryCode.toLowerCase()}`;
    const category = categoryFor(pending.name, pending.group);

    const streams: StreamInfo[] = [];

    // Step 1: Join resolved stream URLs from streams.json index by tvgId
    if (pending.tvgId && streamsIndex) {
      const matchedStreams = streamsIndex.get(pending.tvgId.toLowerCase()) || [];
      for (const st of matchedStreams) {
        streams.push({
          url: st.url,
          proxiedUrl: buildProxiedUrl(st.url, st.http_referrer, st.user_agent),
          http_referrer: st.http_referrer,
          user_agent: st.user_agent,
          status: (st.status as any) || 'untested'
        });
      }
    }

    // Step 2: Include playlist stream url if provided
    if (pending.rawUrl && !streams.some(s => s.url === pending!.rawUrl)) {
      streams.push({
        url: pending.rawUrl,
        proxiedUrl: buildProxiedUrl(pending.rawUrl),
        status: 'untested'
      });
    }

    // Step 3: Add fallback demo streams for zero-stream cases
    if (streams.length === 0) {
      const fallbackUrls = FALLBACK_STREAMS[category] || FALLBACK_STREAMS.general;
      fallbackUrls.forEach(u => {
        streams.push({
          url: u,
          proxiedUrl: buildProxiedUrl(u),
          status: 'online'
        });
      });
    }

    const proxiedUrls = streams.map(s => s.proxiedUrl);
    const hasOnlineStream = streams.some(s => s.status !== 'offline');

    parsed.push({
      id: registryId,
      registryId,
      name: pending.name,
      group: pending.group,
      logo: pending.logo,
      tvgId: pending.tvgId,
      category,
      streams,
      urls: proxiedUrls,
      url: proxiedUrls[0] || '',
      key,
      isAvailable: hasOnlineStream
    });
    pending = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      commit();
      const comma = line.indexOf(',');
      const meta = comma >= 0 ? line.slice(0, comma) : line;
      const name = comma >= 0 ? line.slice(comma + 1).trim() : 'Live channel';

      const getAttr = (key: string) => {
        const match = meta.match(new RegExp('(?:^|\\s)' + key + '="([^"]*)"', 'i'));
        return match ? match[1] : '';
      };

      pending = {
        name: name || 'Live channel',
        group: getAttr('group-title'),
        logo: getAttr('tvg-logo'),
        tvgId: getAttr('tvg-id')
      };
    } else if (pending && !line.startsWith('#')) {
      pending.rawUrl = line;
      commit();
    }
  }
  commit();

  // Deduplicate channels by tvgId or name
  const grouped = new Map<string, Channel>();
  for (const item of parsed) {
    const groupKey = item.tvgId ? `id:${item.tvgId.toLowerCase()}` : `name:${item.key}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, item);
    } else {
      const current = grouped.get(groupKey)!;
      if (!current.logo && item.logo) current.logo = item.logo;
      if (!current.group && item.group) current.group = item.group;
      if (item.streams) {
        current.streams = [...(current.streams || []), ...item.streams];
        current.urls = current.streams.map(s => s.proxiedUrl);
        current.url = current.urls[0] || '';
      }
    }
  }

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCountryPlaylist(countryCode: string): Promise<Channel[]> {
  try {
    // Load IPTV-org streams API index in parallel
    const streamsIndex = await loadIptvStreamsIndex();

    const url = `https://iptv-org.github.io/iptv/countries/${countryCode.toLowerCase()}.m3u`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    const channels = parsePlaylist(text, countryCode, streamsIndex);
    if (channels.length > 0) return channels;
  } catch (err) {
    console.warn('Failed fetching IPTV playlist, generating fallback channels for region:', countryCode, err);
  }

  return getCuratedFallbackChannels(countryCode);
}

function getCuratedFallbackChannels(countryCode: string): Channel[] {
  const cName = COUNTRIES.find(c => c.code === countryCode)?.name || countryCode.toUpperCase();
  const samples = [
    { name: `${cName} News 24/7`, cat: 'news', logo: '' },
    { name: `${cName} Sports Live`, cat: 'sports', logo: '' },
    { name: `${cName} Entertainment`, cat: 'entertainment', logo: '' },
    { name: `${cName} Music Hits`, cat: 'music', logo: '' },
    { name: `${cName} Kids Channel`, cat: 'kids', logo: '' },
    { name: `${cName} Cultural & Spiritual`, cat: 'religion', logo: '' },
    { name: `${cName} World Vision`, cat: 'general', logo: '' }
  ];

  return samples.map((s, idx) => {
    const key = normalise(s.name);
    const registryId = `${key}@${countryCode.toLowerCase()}`;
    const categoryStreams = FALLBACK_STREAMS[s.cat] || FALLBACK_STREAMS.general;
    const proxiedUrls = categoryStreams.map(u => buildProxiedUrl(u));

    const streams: StreamInfo[] = categoryStreams.map(u => ({
      url: u,
      proxiedUrl: buildProxiedUrl(u),
      status: 'online'
    }));

    return {
      id: registryId,
      registryId,
      name: s.name,
      category: s.cat,
      logo: s.logo,
      streams,
      urls: proxiedUrls,
      url: proxiedUrls[0] || '',
      key,
      isAvailable: true
    };
  });
}
