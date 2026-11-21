import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Channel } from '../types';
import { initialsFor } from '../services/iptv';

interface TopPicksRailProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  isLoading: boolean;
  countryName: string;
}

const ChannelShelf: React.FC<{
  title: string;
  id: string;
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  loading: boolean;
  empty: string;
}> = ({ title, id, channels, activeChannel, onSelectChannel, loading, empty }) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [railState, setRailState] = useState({ hasOverflow: false, canGoBack: false, canGoForward: false });
  const updateRailState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setRailState({ hasOverflow: rail.scrollWidth > rail.clientWidth + 4, canGoBack: rail.scrollLeft > 4, canGoForward: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    updateRailState();
    rail.addEventListener('scroll', updateRailState, { passive: true });
    const observer = new ResizeObserver(updateRailState);
    observer.observe(rail);
    return () => { rail.removeEventListener('scroll', updateRailState); observer.disconnect(); };
  }, [channels.length, loading, updateRailState]);
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (rail) rail.scrollBy({ left: direction * Math.max(rail.clientWidth * 0.78, 260), behavior: 'smooth' });
  };
  return (
  <section className="g-shelf" id={id}>
    <div className="g-shelf-heading"><h2>{title}</h2><a href="#channels">See all <ChevronRight size={16} /></a></div>
    {loading ? <div className="g-shelf-loading">Loading channels…</div> : channels.length ? (
      <div className="g-rail-wrap">
        {railState.hasOverflow && <button type="button" className="g-rail-arrow g-rail-arrow-left" onClick={() => scrollRail(-1)} disabled={!railState.canGoBack} aria-label="Scroll this shelf left"><ChevronLeft size={22}/></button>}
        <div className="g-channel-rail" ref={railRef}>
        {channels.slice(0, 12).map((channel) => (
          <button type="button" key={channel.id} className={`g-channel-tile ${activeChannel?.id === channel.id ? 'is-active' : ''}`} onClick={() => onSelectChannel(channel)} aria-label={`Play ${channel.name}`}>
            <span className="g-logo-stage">{channel.logo ? <img src={channel.logo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <b>{initialsFor(channel.name)}</b>}</span>
            <span className="g-tile-name">{channel.name}</span><span className="g-tile-meta">{channel.category}</span><span className="g-tile-play"><Play size={13} fill="currentColor" /></span>
          </button>
        ))}
        </div>
        {railState.hasOverflow && <button type="button" className="g-rail-arrow g-rail-arrow-right" onClick={() => scrollRail(1)} disabled={!railState.canGoForward} aria-label="Scroll this shelf right"><ChevronRight size={22}/></button>}
      </div>
    ) : <p className="g-shelf-empty">{empty}</p>}
  </section>
  );
};

export const TopPicksRail: React.FC<TopPicksRailProps> = ({ channels, activeChannel, onSelectChannel, isLoading, countryName }) => {
  const entertainment = channels.filter((channel) => channel.category === 'entertainment');
  const shows = channels.filter((channel) => channel.category !== 'entertainment');
  const apps = channels.filter((channel) => ['news', 'sports', 'music', 'kids'].includes(channel.category));

  return (
    <div className="g-shelves">
      <ChannelShelf id="for-you" title="Top picks for you" channels={channels} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty={`No channels are listed for ${countryName} yet.`} />
      <ChannelShelf id="movies" title="Movies & entertainment" channels={entertainment} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty="No entertainment channels are listed in this region." />
      <ChannelShelf id="shows" title="Shows, news & more" channels={shows} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty="No additional channels are listed in this region." />
      <ChannelShelf id="apps" title="Your channels" channels={apps} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty="No category channels are available in this region." />
    </div>
  );
};
