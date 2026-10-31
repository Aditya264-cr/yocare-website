import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Channel } from '../types';
import { initialsFor } from '../services/iptv';

interface TopPicksRailProps { channels: Channel[]; activeChannel: Channel | null; onSelectChannel: (channel: Channel) => void; isLoading: boolean; countryName: string; }

export const TopPicksRail: React.FC<TopPicksRailProps> = ({ channels, activeChannel, onSelectChannel, isLoading, countryName }) => {
  const rail = useRef<HTMLDivElement>(null);
  const picks = channels.slice(0, 18);
  return <section className="ytv-rail-section" id="for-you">
    <div className="ytv-section-head"><div><p className="ytv-eyebrow">TUNE IN NOW</p><h2>Top picks in {countryName}</h2></div><div className="ytv-rail-controls"><button onClick={() => rail.current?.scrollBy({left:-500,behavior:'smooth'})} aria-label="Scroll channels left"><ChevronLeft/></button><button onClick={() => rail.current?.scrollBy({left:500,behavior:'smooth'})} aria-label="Scroll channels right"><ChevronRight/></button></div></div>
    {isLoading ? <div className="ytv-loading">Loading channels for {countryName}…</div> : <div className="ytv-channel-rail" ref={rail}>
      {picks.map((channel) => <button key={channel.id} className={`ytv-channel-tile ${activeChannel?.id===channel.id?'is-selected':''}`} onClick={() => onSelectChannel(channel)} title={channel.name}>
        <span className="ytv-channel-art">{channel.logo ? <img src={channel.logo} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }}/> : <b>{initialsFor(channel.name)}</b>}<span className="ytv-tile-play"><Play size={18} fill="currentColor"/></span></span>
        <span className="ytv-tile-name">{channel.name}</span><span className="ytv-tile-category">{channel.category}</span>
      </button>)}
      {!picks.length ? <p className="ytv-empty-rail">No channels found for this region yet.</p> : null}
    </div>}
  </section>;
};
