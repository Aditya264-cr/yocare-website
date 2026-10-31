import React, { useState, useMemo } from 'react';
import {
  Search,
  Play,
  X,
  Grid,
  Newspaper,
  Trophy,
  Film,
  Music,
  Baby,
  Sparkles,
  Radio,
  SlidersHorizontal,
  Filter,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Loader2
} from 'lucide-react';
import { Channel, Country, CategoryType } from '../types';
import { COUNTRIES, CATEGORY_LABELS, initialsFor } from '../services/iptv';
import { testChannelSubset } from '../services/diagnostics';

interface ChannelGuideProps {
  channels: Channel[];
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const CATEGORY_ICONS: Record<CategoryType, React.ReactNode> = {
  all: <Grid className="w-3.5 h-3.5" />,
  news: <Newspaper className="w-3.5 h-3.5" />,
  sports: <Trophy className="w-3.5 h-3.5" />,
  entertainment: <Film className="w-3.5 h-3.5" />,
  music: <Music className="w-3.5 h-3.5" />,
  kids: <Baby className="w-3.5 h-3.5" />,
  religion: <Sparkles className="w-3.5 h-3.5" />,
  general: <Radio className="w-3.5 h-3.5" />
};

const CATEGORY_STYLES: Record<CategoryType, { bg: string; border: string; text: string; tagBg: string }> = {
  all: {
    bg: 'from-[#d5f477] to-[#a6dfaa]',
    border: 'border-[#d5f477]',
    text: 'text-[#11140c]',
    tagBg: 'bg-[#d5f477]/10 text-[#d5f477]'
  },
  news: {
    bg: 'from-[#ff7060] to-[#e04535]',
    border: 'border-[#ff7060]',
    text: 'text-white',
    tagBg: 'bg-red-500/15 text-red-300 border-red-500/30'
  },
  sports: {
    bg: 'from-[#3ed188] to-[#21a861]',
    border: 'border-[#3ed188]',
    text: 'text-black',
    tagBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  },
  entertainment: {
    bg: 'from-[#f5b041] to-[#d48817]',
    border: 'border-[#f5b041]',
    text: 'text-black',
    tagBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  music: {
    bg: 'from-[#af7ac5] to-[#884ea0]',
    border: 'border-[#af7ac5]',
    text: 'text-white',
    tagBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  },
  kids: {
    bg: 'from-[#54a0ff] to-[#2e86de]',
    border: 'border-[#54a0ff]',
    text: 'text-white',
    tagBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  },
  religion: {
    bg: 'from-[#f39c12] to-[#d35400]',
    border: 'border-[#f39c12]',
    text: 'text-white',
    tagBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30'
  },
  general: {
    bg: 'from-[#8395a7] to-[#576574]',
    border: 'border-[#8395a7]',
    text: 'text-white',
    tagBg: 'bg-gray-500/15 text-gray-300 border-gray-500/30'
  }
};

export const ChannelGuide: React.FC<ChannelGuideProps> = ({
  channels,
  selectedCountry,
  onCountryChange,
  activeChannel,
  onSelectChannel,
  isLoading,
  searchQuery,
  setSearchQuery
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [visibleCount, setVisibleCount] = useState<number>(48);
  const [diagnosticsMap, setDiagnosticsMap] = useState<Map<string, { isAvailable: boolean; latencyMs: number; status: string }>>(new Map());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testSummary, setTestSummary] = useState<string | null>(null);

  const categoriesList: CategoryType[] = [
    'all',
    'news',
    'sports',
    'entertainment',
    'music',
    'kids',
    'religion',
    'general'
  ];

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      const matchesCategory =
        selectedCategory === 'all' || channel.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        channel.name.toLowerCase().includes(q) ||
        (channel.group && channel.group.toLowerCase().includes(q)) ||
        channel.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [channels, selectedCategory, searchQuery]);

  const visibleChannels = useMemo(() => {
    return filteredChannels.slice(0, visibleCount);
  }, [filteredChannels, visibleCount]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: channels.length };
    channels.forEach((ch) => {
      counts[ch.category] = (counts[ch.category] || 0) + 1;
    });
    return counts;
  }, [channels]);

  const handleRunDiagnostics = async () => {
    if (isTesting || visibleChannels.length === 0) return;
    setIsTesting(true);
    setTestSummary(`Checking up to ${Math.min(24, visibleChannels.length)} candidate URLs. This does not start or interrupt playback.`);

    const results = await testChannelSubset(visibleChannels, 24);
    setDiagnosticsMap(results);

    let onlineCount = 0;
    let offlineCount = 0;
    results.forEach((res) => {
      if (res.isAvailable) onlineCount++;
      else offlineCount++;
    });

    setTestSummary(`URL checks complete: ${onlineCount} Live Stream Signals Verified (${offlineCount} Unavailable)`);
    setIsTesting(false);
  };

  return (
    <section className="channels-section page-section" id="channels">
      <div className="section-intro channels-intro flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="eyebrow"><span className="eyebrow-line"></span> THE WORLD, IN CHANNELS</p>
          <h2 className="text-3xl font-bold text-white">Find your <em>next channel.</em></h2>
          <p className="section-subtitle text-xs text-[#a0aea5] mt-1">
            Explore channels in {selectedCountry.name}, filtered by country, genre, or keyword. Stream checks are optional and do not interrupt the player.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={isTesting}
            onClick={handleRunDiagnostics}
            className="px-4 py-2.5 rounded-xl bg-[#18211e] border border-[#d5f477]/30 text-[#d5f477] text-xs font-semibold hover:bg-[#252c19] transition-all cursor-pointer flex items-center gap-2"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#d5f477]" />
            ) : (
              <Activity className="w-4 h-4 text-[#d5f477]" />
            )}
            <span>{isTesting ? 'Testing Streams...' : 'Run Stream Diagnostics'}</span>
          </button>

          <div className="channel-count flex flex-col items-end">
            <strong className="text-2xl font-bold text-[#d5f477]">{filteredChannels.length}</strong>
            <span className="text-[10px] text-[#85978b] tracking-wider uppercase">CHANNELS LISTED</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-[#85978b]">Diagnostics checks up to 24 visible candidate URLs using read-only requests. Reachable means only that the URL responded; browser playback is not verified. CORS blocks are inconclusive.</p>\n\n      {testSummary && (
        <div className="mb-4 p-3 rounded-xl bg-[#101715] border border-[#d5f477]/30 text-xs text-[#c8f28a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#d5f477]" />
            <span>{testSummary}</span>
          </div>
          <button
            type="button"
            className="text-[#85978b] hover:text-white bg-transparent border-0 cursor-pointer text-xs"
            onClick={() => setTestSummary(null)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="toolbar p-4 rounded-xl bg-[#101715] border border-white/10 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="country-control">
          <span className="text-[10px] tracking-widest text-[#a0aea5] font-semibold uppercase block mb-1">
            CHOOSE A REGION
          </span>
          <select
            id="country-select"
            className="w-full h-11 px-3 rounded-lg bg-[#090e0c] border border-white/15 text-white text-xs cursor-pointer focus:border-[#d5f477] outline-none"
            value={selectedCountry.code}
            onChange={(e) => {
              const country = COUNTRIES.find((c) => c.code === e.target.value);
              if (country) onCountryChange(country);
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="category-control">
          <span className="text-[10px] tracking-widest text-[#a0aea5] font-semibold uppercase block mb-1">
            FILTER BY GENRE
          </span>
          <select
            className="w-full h-11 px-3 rounded-lg bg-[#090e0c] border border-white/15 text-white text-xs cursor-pointer focus:border-[#d5f477] outline-none capitalize"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as CategoryType);
              setVisibleCount(48);
            }}
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]} ({categoryCounts[cat] || 0})
              </option>
            ))}
          </select>
        </div>

        <div className="search-control md:col-span-2 relative">
          <Search className="w-4 h-4 text-[#85978b] absolute left-3 top-3.5 pointer-events-none" />
          <input
            id="channel-search"
            type="search"
            className="w-full h-11 pl-9 pr-9 rounded-lg bg-[#090e0c] border border-white/15 text-white text-xs focus:border-[#d5f477] outline-none placeholder-[#6f7e76]"
            placeholder="Search channels, topics, places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-3 top-3 text-[#85978b] hover:text-white bg-transparent border-0 cursor-pointer"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="category-bar pb-4 border-b border-white/10 mb-6">
        <div className="category-heading flex items-center justify-between text-xs font-semibold text-[#a0aea5] mb-3">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Filter className="w-3.5 h-3.5 text-[#d5f477]" /> EXPLORE BY CATEGORY
          </span>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              className="text-[11px] text-[#d5f477] hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1 font-semibold"
              onClick={() => setSelectedCategory('all')}
            >
              <X className="w-3 h-3" /> Clear category filter
            </button>
          )}
        </div>

        <div id="apps" className="category-chips flex items-center gap-2 flex-wrap">
          {categoriesList.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            const icon = CATEGORY_ICONS[cat];
            const style = CATEGORY_STYLES[cat];

            return (
              <button
                key={cat}
                type="button"
                className={`category-chip flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? `bg-gradient-to-r ${style.bg} ${style.text} border-transparent shadow-[0_4px_18px_rgba(0,0,0,0.4)] scale-105`
                    : 'bg-[#101715] text-[#b4c1b7] border-white/15 hover:border-[#d5f477]/60 hover:text-white hover:scale-102'
                }`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(48);
                }}
              >
                <span className="flex-none">{icon}</span>
                <span>{CATEGORY_LABELS[cat]}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-black/20 text-current' : 'bg-white/10 text-[#85978b]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="guide-toolbar-note flex items-center justify-between text-xs text-[#85978b] mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="guide-live-dot"></span>
          <span>{selectedCountry.flag} {selectedCountry.name} Guide</span>
          <span className="text-white/20">/</span>
          <span className="text-[#d5f477] font-semibold">
            {selectedCategory === 'all' ? 'All Genres' : CATEGORY_LABELS[selectedCategory]}
          </span>
        </div>
        <span className="text-[11px] text-[#69716b]">
          Showing {visibleChannels.length} of {filteredChannels.length} channels
        </span>
      </div>

      {isLoading ? (
        <div className="load-state py-16 text-center text-xs text-[#85978b] flex items-center justify-center gap-3">
          <span className="spinner"></span>
          <span>Opening the channel guide for {selectedCountry.name}...</span>
        </div>
      ) : visibleChannels.length === 0 ? (
        <div className="empty-state py-12 text-center border border-dashed border-white/20 rounded-xl bg-[#101715] text-[#85978b]">
          <div className="text-3xl mb-2">⌕</div>
          <h3 className="text-lg font-bold text-white">No {CATEGORY_LABELS[selectedCategory]} channels found</h3>
          <p className="text-xs text-[#85978b] mt-1">
            Try choosing another category or clearing your search term.
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-[#18211e] text-[#d5f477] border border-[#d5f477]/30 hover:bg-[#252c19] cursor-pointer"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            Show all channels
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleChannels.map((channel) => {
            const isPlaying = activeChannel?.id === channel.id;
            const tagStyle = CATEGORY_STYLES[channel.category as CategoryType] || CATEGORY_STYLES.general;
            const diag = diagnosticsMap.get(channel.id);

            return (
              <button
                key={channel.id}
                type="button"
                className={`channel-card p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  isPlaying
                    ? 'border-[#d5f477] bg-gradient-to-r from-[#252c19] to-[#13150f] shadow-[0_0_20px_rgba(213,244,119,0.15)]'
                    : 'border-white/10 bg-[#101715] hover:border-[#d5f477]/50 hover:bg-[#18211e]'
                }`}
                onClick={() => onSelectChannel(channel)}
              >
                <div className="channel-logo w-11 h-11 rounded-lg flex items-center justify-center flex-none relative overflow-hidden bg-gradient-to-br from-[#2a3021] to-[#11130f]">
                  {channel.logo && (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="logo-fallback font-bold text-xs text-[#d5f477]">
                    {initialsFor(channel.name)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="channel-name text-xs font-semibold text-white truncate block">
                    {channel.name}
                  </span>
                  <div className="channel-meta flex items-center gap-2 mt-1">
                    <span className={`channel-tag text-[9px] uppercase px-2 py-0.5 rounded-full border font-bold ${tagStyle.tagBg}`}>
                      {channel.category}
                    </span>
                  </div>
                </div>

                <div className="channel-play flex-none">
                  {diag ? (
                    diag.isAvailable ? (
                      <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Reachable · {diag.latencyMs}ms
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-400 font-semibold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">
                        {diag.status}
                      </span>
                    )
                  ) : channel.isAvailable === false ? (
                    <span className="text-[10px] text-red-400 font-semibold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">
                      Unavailable
                    </span>
                  ) : (
                    <div className="text-[#d5f477]">
                      <Play className={`w-4 h-4 ${isPlaying ? 'fill-current' : ''}`} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filteredChannels.length > visibleCount && (
        <div className="load-more-wrap text-center mt-8">
          <button
            type="button"
            className="load-more px-6 py-3 rounded-full text-xs font-semibold bg-[#101715] border border-white/20 text-white hover:border-[#d5f477] hover:text-[#d5f477] cursor-pointer"
            onClick={() => setVisibleCount((prev) => prev + 48)}
          >
            Discover more channels ({filteredChannels.length - visibleCount} remaining) ↓
          </button>
        </div>
      )}

      <p className="source-note text-[11px] text-[#686a65] mt-8 leading-relaxed max-w-4xl">
        Guide metadata is aggregated from open public channels. Playback streams utilize public CORS and HLS/DASH media broadcasts.
      </p>
    </section>
  );
};
