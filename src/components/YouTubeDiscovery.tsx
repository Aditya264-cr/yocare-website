import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, Clock3, ExternalLink, Flame, Radio, Search, Youtube } from 'lucide-react';
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

const categoryName = (id?: string) => categories.find((item) => item.id === id)?.label || 'Trending';

function VideoCard({ video, onSelect }: { video: YouTubeVideo; onSelect: (video: YouTubeVideo) => void }) {
  return (
    <button type="button" className="yt-video-card" onClick={() => onSelect(video)} aria-label={`Play ${video.title}`}>
      <span className="yt-video-thumb">
        {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy"/> : <span className="yt-thumb-fallback"><Youtube/></span>}
        {video.live && <span className="yt-live-label"><i/> LIVE</span>}
        <span className="yt-play-overlay">▶</span>
      </span>
      <span className="yt-video-title">{video.title}</span>
      <span className="yt-video-meta">{video.channelTitle} · {categoryName(video.categoryId)}</span>
    </button>
  );
}

export const YouTubeDiscovery: React.FC<Props> = ({ mode, onOpen, regionCode = 'IN' }) => {
  const [feed, setFeed] = useState<Feed>('trending');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selected, setSelected] = useState<YouTubeVideo | null>(null);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (kind: Feed) => {
    setLoading(true); setError(''); setSelected(null);
    try {
      const results = kind === 'live' ? await fetchLiveVideos(regionCode) : await fetchTrendingVideos(regionCode);
      setVideos(results);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load YouTube videos.'); setVideos([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load('trending'); }, [regionCode]);

  const visibleVideos = useMemo(() => category === 'all' ? videos : videos.filter((video) => video.categoryId === category), [videos, category]);
  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setSelected(null);
    try { setFeed('trending'); setVideos(await searchYouTubeVideos(query.trim(), regionCode)); setCategory('all'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Search failed.'); setVideos([]); }
    finally { setLoading(false); }
  };

  if (mode === 'rail') return (
    <section className="yt-discovery-rail" aria-labelledby="yt-discovery-title">
      <div className="yt-discovery-heading">
        <div><p className="yt-overline"><Flame size={13}/> THE DAILY PULSE</p><h2 id="yt-discovery-title">Trending across YouTube</h2><p>Ideas, stories and moments people are watching now.</p></div>
        <button type="button" className="yt-view-all" onClick={onOpen}>Explore YouTube <ArrowRight size={15}/></button>
      </div>
      {loading ? <p className="yt-state">Loading trending videos…</p> : error ? <p className="yt-state">{error}</p> : (
        <div className="yt-video-rail">{videos.slice(0, 8).map((video) => <VideoCard key={video.id} video={video} onSelect={(item) => { setSelected(item); onOpen?.(); }}/>)}</div>
      )}
    </section>
  );

  return (
    <section className="yt-hub">
      <div className="yt-hub-hero">
        <div className="yt-hub-orb" aria-hidden="true"/>
        <div className="yt-hub-hero-copy"><p className="yt-overline"><Youtube size={15}/> YOCARE ORIGINAL DISCOVERY</p><h1>Find your next <em>rabbit hole.</em></h1><p>Fresh perspectives, fascinating ideas and live moments from creators around the world.</p></div>
        <div className="yt-hub-mark"><Youtube size={44}/><span>YOUTUBE</span></div>
      </div>
      <div className="yt-hub-content">
        <form className="yt-search" onSubmit={handleSearch}><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos, creators or topics" aria-label="Search YouTube"/><button type="submit">Search</button></form>
        <div className="yt-feed-tabs">
          <button className={feed === 'trending' ? 'active' : ''} onClick={() => { setFeed('trending'); void load('trending'); }}><Flame size={15}/> Trending</button>
          <button className={feed === 'live' ? 'active' : ''} onClick={() => { setFeed('live'); void load('live'); }}><Radio size={15}/> Live now</button>
        </div>
        <div className="yt-category-list">{categories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
        {selected && <div className="yt-player-panel"><div className="yt-player-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selected.id)}?rel=0`} title={selected.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div><div className="yt-player-details"><div><h2>{selected.title}</h2><p>{selected.channelTitle}</p></div><a href={`https://www.youtube.com/watch?v=${encodeURIComponent(selected.id)}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink size={14}/></a></div></div>}
        {loading ? <p className="yt-state">Finding videos for you…</p> : error ? <div className="yt-setup"><Youtube size={30}/><h2>YouTube discovery needs a connection</h2><p>{error}</p><p>Configure a YouTube Data API key restricted to this site's domain and the YouTube Data API v3.</p></div> : visibleVideos.length ? <div className="yt-video-grid">{visibleVideos.map((video) => <VideoCard key={video.id} video={video} onSelect={setSelected}/>)}</div> : <p className="yt-state">No videos in this category right now. Try another category.</p>}
        <p className="yt-policy-note"><Clock3 size={13}/> Video availability, playback and advertising are controlled by YouTube. Yocare does not remove or bypass YouTube ads.</p>
      </div>
    </section>
  );
};
