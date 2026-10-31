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

// IPTV-org is a public discovery playlist. Stream URLs are attempted directly in
// the browser; catalogue membership is not a playback or redistribution guarantee.
type IptvStreamRecord = { channel?: string; url?: string; referrer?: string; http_referrer?: string; user_agent?: string; status?: string };
type IptvChannelRecord = { id?: string; name?: string; logo?: string };
let channelMetadataPromise: Promise<Map<string, IptvChannelRecord>> | null = null;

async function loadChannelMetadata(): Promise<Map<string, IptvChannelRecord>> {
  if (!channelMetadataPromise) {
    channelMetadataPromise = fetch('https://iptv-org.github.io/api/channels.json')
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const records = await response.json() as IptvChannelRecord[];
        return new Map(records.filter((item) => item.id).map((item) => [item.id!.toLowerCase(), item]));
      })
      .catch((error) => {
        console.warn('IPTV channel metadata unavailable:', error);
        return new Map<string, IptvChannelRecord>();
      });
  }
  return channelMetadataPromise;
}

let iptvStreamsMap: Map<string, Array<{ url: string; http_referrer?: string; user_agent?: string; status?: string }>> | null = null;

export async function loadIptvStreamsIndex(): Promise<Map<string, Array<{ url: string; http_referrer?: string; user_agent?: string; status?: string }>>> {
  if (iptvStreamsMap) return iptvStreamsMap;
  const map = new Map<string, Array<{ url: string; http_referrer?: string; user_agent?: string; status?: string }>>();
  try {
    const response = await fetch('https://iptv-org.github.io/api/streams.json', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const records = await response.json() as IptvStreamRecord[];
    for (const item of records) {
      if (!item.channel || !item.url || !isHttpStreamUrl(item.url)) continue;
      const id = item.channel.trim().toLowerCase();
      const entries = map.get(id) || [];
      entries.push({
        url: item.url,
        http_referrer: item.http_referrer || item.referrer || '',
        user_agent: item.user_agent || '',
        status: item.status || 'untested'
      });
      map.set(id, entries);
    }
  } catch (error) {
    console.warn('IPTV-org streams index unavailable:', error);
  }
  iptvStreamsMap = map;
  return map;
}

function isHttpStreamUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

// Kept for compatibility with StreamInfo; deliberately returns the original URL.
// No open proxy is used and submitted request headers are never forwarded.
export function buildProxiedUrl(rawUrl: string, _referrer?: string, _userAgent?: string): string {
  return isHttpStreamUrl(rawUrl) ? rawUrl : '';
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

export function parsePlaylist(text: string, countryCode: string, streamsIndex?: Map<string, any[]>, channelMetadata?: Map<string, IptvChannelRecord>): Channel[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const parsed: Channel[] = [];
  let pending: { name: string; group?: string; logo?: string; tvgId?: string; rawUrl?: string } | null = null;

  const commit = () => {
    if (!pending || !pending.name) return;
    const key = normalise(pending.name);
    const idKey = pending.tvgId || key;
    const registryId = `${idKey}@${countryCode.toLowerCase()}`;
    const category = categoryFor(displayName, pending.group);

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
          status: (st.status as any) || 'online'
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

    // Never attach unrelated demo videos or category-based fallback streams.
    // A channel with no real catalogue stream remains discoverable but unavailable.

    const proxiedUrls = streams.map(s => s.proxiedUrl);

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
      isAvailable: streams.length > 0
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

  // Deduplicate channels
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
        const uniqueStreams = new Map<string, StreamInfo>();
        for (const stream of [...(current.streams || []), ...item.streams]) {
          if (!uniqueStreams.has(stream.url)) uniqueStreams.set(stream.url, stream);
        }
        current.streams = [...uniqueStreams.values()];
        current.urls = current.streams.map(s => s.proxiedUrl);
        current.url = current.urls[0] || '';
      }
    }
  }

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCountryPlaylist(countryCode: string): Promise<Channel[]> {
  try {
    const [streamsIndex, channelMetadata] = await Promise.all([loadIptvStreamsIndex(), loadChannelMetadata()]);
    // Use the country-specific playlist so region selection never mixes countries.
    const url = `https://iptv-org.github.io/iptv/countries/${countryCode.toLowerCase()}.m3u`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    const channels = parsePlaylist(text, countryCode, streamsIndex, channelMetadata);
    if (channels.length > 0) return channels;
  } catch (err) {
    console.warn('Failed fetching country playlist; returning an empty channel catalogue for region:', countryCode, err);
  }

  return [];
}
