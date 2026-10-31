import React from 'react';
import { ChevronRight, Play } from 'lucide-react';
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
}> = ({ title, id, channels, activeChannel, onSelectChannel, loading, empty }) => (
  <section className="g-shelf" id={id}>
    <div className="g-shelf-heading"><h2>{title}</h2><a href="#channels">See all <ChevronRight size={16} /></a></div>
    {loading ? <div className="g-shelf-loading">Loading channels…</div> : channels.length ? (
      <div className="g-channel-rail">
        {channels.slice(0, 12).map((channel) => (
          <button type="button" key={channel.id} className={`g-channel-tile ${activeChannel?.id === channel.id ? 'is-active' : ''}`} onClick={() => onSelectChannel(channel)} aria-label={`Play ${channel.name}`}>
            <span className="g-logo-stage">{channel.logo ? <img src={channel.logo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <b>{initialsFor(channel.name)}</b>}</span>
            <span className="g-tile-name">{channel.name}</span><span className="g-tile-meta">{channel.category}</span><span className="g-tile-play"><Play size={13} fill="currentColor" /></span>
          </button>
        ))}
      </div>
    ) : <p className="g-shelf-empty">{empty}</p>}
  </section>
);

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
