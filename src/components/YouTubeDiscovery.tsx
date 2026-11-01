import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3, ExternalLink, Flame, Radio, Search, Tv } from 'lucide-react';
import { fetchLiveVideos, fetchTrendingVideos, searchYouTubeVideos, YouTubeVideo } from '../services/youtube';

type Mode = 'rail' | 'page';
type Feed = 'trending' | 'live';
interface Props { mode: Mode; onOpen?: () => void; regionCode?: string; }

const categories = [
  { label: 'All', id: 'all' },
  { label: 'Technology', id: '28' },
  { label: 'Science & learning', id: '27' },
  { label: 'Sports', id: '17' },
  { label: 'Entertainment', id: '24' },
  { label: 'Music', id: '10' },
  { label: 'Gaming', id: '20' }
];

const categoryName = (id?: string) => categories.find((item) => item.id === id)?.label || 'YouTube';

function VideoCard({ video, onSelect, previewing, onPreviewStart, onPreviewEnd }: { video: YouTubeVideo; onSelect: (video: YouTubeVideo) => void; previewing: boolean; onPreviewStart: (id: string) => void; onPreviewEnd: () => void }) {
  return (
    <article
      className={`yt-video-card${previewing ? ' is-previewing' : ''}`}
      onMouseEnter={() => onPreviewStart(video.id)}
      onMouseLeave={onPreviewEnd}
      onFocus={() => onPreviewStart(video.id)}
      onBlur={onPreviewEnd}
    >
      <button type="button" className="yt-video-select" onClick={() => onSelect(video)} aria-label={`Watch ${video.title}`}>
        <span className="yt-video-thumb">
          {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy"/> : <span className="yt-thumb-fallback"><Tv/></span>}
          {previewing && <iframe
            className="yt-hover-preview"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1`}
            title={`${video.title} preview`}
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            aria-hidden="true"
          />}
          {video.live && <span className="yt-live-label"><i/> LIVE</span>}
        </span>
        <span className="yt-video-title">{video.title}</span>
        <span className="yt-video-meta">{video.channelTitle} · {categoryName(video.categoryId)}</span>
      </button>
    </article>
  );
}

export const YouTubeDiscovery: React.FC<Props> = ({ mode, onOpen, regionCode = 'IN' }) => {
  const [feed, setFeed] = useState<Feed>('trending');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selected, setSelected] = useState<YouTubeVideo | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = async (kind: Feed, selectedCategory = category) => {
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    setSelected(null);
    try {
      const results = kind === 'live'
        ? await fetchLiveVideos(regionCode, selectedCategory)
        : await fetchTrendingVideos(regionCode, selectedCategory);
      if (request === requestId.current) setVideos(results);
    } catch (err) {
      if (request === requestId.current) {
        setError(err instanceof Error ? err.message : 'Unable to load YouTube videos.');
        setVideos([]);
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load('trending', 'all');
    return () => { requestId.current += 1; };
  }, [regionCode]);

  const visibleVideos = useMemo(() => category === 'all' || videos.some((video) => !video.categoryId)
    ? videos
    : videos.filter((video) => video.categoryId === category), [videos, category]);
  const featuredVideo = visibleVideos[0] || videos[0] || null;
  const startPreview = (id: string) => setPreviewId(id);
  const stopPreview = () => setPreviewId(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    setSelected(null);
    try {
      const results = await searchYouTubeVideos(query.trim(), regionCode, category);
      if (request === requestId.current) {
        setFeed('trending');
        setVideos(results);
      }
    } catch (err) {
      if (request === requestId.current) {
        setError(err instanceof Error ? err.message : 'Search failed.');
        setVideos([]);
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  const changeCategory = (nextCategory: string) => {
    setCategory(nextCategory);
    if (query.trim()) {
      const request = ++requestId.current;
      setLoading(true);
      setError('');
      setSelected(null);
      searchYouTubeVideos(query.trim(), regionCode, nextCategory)
        .then((results) => { if (request === requestId.current) setVideos(results); })
        .catch((err) => {
          if (request === requestId.current) {
            setError(err instanceof Error ? err.message : 'Search failed.');
            setVideos([]);
          }
        })
        .finally(() => { if (request === requestId.current) setLoading(false); });
    } else if (mode === 'page') {
      void load(feed, nextCategory);
    }
  };

  if (mode === 'rail') return (
    <section className="yt-discovery-rail" aria-labelledby="yt-discovery-title">
      <div className="yt-discovery-heading">
        <div><p className="yt-overline"><Flame size={13}/> THE DAILY PULSE</p><h2 id="yt-discovery-title">Trending across YouTube</h2><p>Ideas, stories and moments people are watching now.</p></div>
        <button type="button" className="yt-view-all" onClick={onOpen}>Explore YouTube <ArrowRight size={15}/></button>
      </div>
      {loading ? <p className="yt-state">Loading trending videos…</p> : error ? <p className="yt-state">{error}</p> : (
        <div className="yt-video-rail">{videos.slice(0, 8).map((video) => <VideoCard key={video.id} video={video} onSelect={() => onOpen?.()} previewing={previewId === video.id} onPreviewStart={startPreview} onPreviewEnd={stopPreview}/>)}</div>
      )}
    </section>
  );

  return (
    <section className="yt-hub">
      <div className="yt-tv-heading">
        <div><p className="yt-overline"><Tv size={15}/> YOCARE LIVE · ENTERTAINMENT</p><h1>Discover what to watch.</h1></div>
        <p>One place for trending videos, live moments and creators worth your time.</p>
      </div>
      <div className="yt-hub-content">
        <form className="yt-search" onSubmit={handleSearch}><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos, creators or topics" aria-label="Search YouTube"/><button type="submit">Search</button></form>
        <div className="yt-feed-tabs">
          <button type="button" className={feed === 'trending' ? 'active' : ''} onClick={() => { setFeed('trending'); setQuery(''); void load('trending'); }}><Flame size={15}/> Trending</button>
          <button type="button" className={feed === 'live' ? 'active' : ''} onClick={() => { setFeed('live'); setQuery(''); void load('live'); }}><Radio size={15}/> Live now</button>
        </div>
        <div className="yt-category-list">{categories.map((item) => <button type="button" key={item.id} className={category === item.id ? 'active' : ''} onClick={() => changeCategory(item.id)}>{item.label}</button>)}</div>
        {selected && <div className="yt-player-panel"><div className="yt-player-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selected.id)}?autoplay=1&rel=0`} title={selected.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><div className="yt-player-details"><div><h2>{selected.title}</h2><p>{selected.channelTitle}</p></div><a href={`https://www.youtube.com/watch?v=${encodeURIComponent(selected.id)}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink size={14}/></a></div></div>}
        {!selected && !loading && !error && featuredVideo && <section className="yt-featured" style={{ backgroundImage: `linear-gradient(90deg,#08090bf2 0%,#08090bba 48%,#08090b18 100%),url("${featuredVideo.thumbnail}")` }}>
          <div className="yt-featured-copy"><span className="yt-featured-kicker">TOP PICK FOR {regionCode}</span><h2>{featuredVideo.title}</h2><p>{featuredVideo.channelTitle}</p><button type="button" onClick={() => setSelected(featuredVideo)}>Watch now <ArrowRight size={16}/></button></div>
        </section>}
        {loading ? <p className="yt-state">Finding videos for you…</p> : error ? <div className="yt-setup"><Tv size={30}/><h2>YouTube discovery needs a connection</h2><p>{error}</p><p>Check the restricted YouTube Data API v3 key in the production build environment.</p></div> : visibleVideos.length ? <section className="yt-tv-shelf"><div className="yt-shelf-heading"><h2>{feed === 'live' ? 'Live on YouTube' : query.trim() ? 'Search results' : 'Top picks for you'}</h2><span>{visibleVideos.length} videos</span></div><div className="yt-video-rail yt-main-rail">{visibleVideos.map((video) => <VideoCard key={video.id} video={video} onSelect={setSelected} previewing={previewId === video.id} onPreviewStart={startPreview} onPreviewEnd={stopPreview}/>)}</div></section> : <p className="yt-state">No videos in this category right now. Try another category.</p>}
        <p className="yt-policy-note"><Clock3 size={13}/> Video availability, playback and advertising are controlled by YouTube. Yocare does not remove or bypass YouTube ads.</p>
      </div>
    </section>
  );
};
