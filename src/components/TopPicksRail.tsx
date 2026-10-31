import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import React from 'react';
import { ChevronRight, Play } from 'lucide-react';
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
const ChannelShelf: React.FC<{title:string;id:string;channels:Channel[];activeChannel:Channel|null;onSelectChannel:(channel:Channel)=>void;loading:boolean;empty:string}> = ({title,id,channels,activeChannel,onSelectChannel,loading,empty}) => (
  <section className="g-shelf" id={id}>
    <div className="g-shelf-heading"><h2>{title}</h2><a href="#channels">See all <ChevronRight size={16}/></a></div>
    {loading ? <div className="g-shelf-loading">Loading channels…</div> : channels.length ? <div className="g-channel-rail">
      {channels.slice(0,12).map(channel => <button type="button" key={channel.id} className={`g-channel-tile ${activeChannel?.id===channel.id?'is-active':''}`} onClick={()=>onSelectChannel(channel)} aria-label={`Play ${channel.name}`}>
        <span className="g-logo-stage">{channel.logo ? <img src={channel.logo} alt="" loading="lazy" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/> : <b>{initialsFor(channel.name)}</b>}</span>
        <span className="g-tile-name">{channel.name}</span><span className="g-tile-meta">{channel.category}</span><span className="g-tile-play"><Play size={13} fill="currentColor"/></span>
      </button>)}
    </div> : <p className="g-shelf-empty">{empty}</p>}
  </section>
);

export const TopPicksRail: React.FC<TopPicksRailProps> = ({channels,activeChannel,onSelectChannel,isLoading,countryName}) => {
  const entertainment=channels.filter(c=>c.category==='entertainment');
  const shows=channels.filter(c=>c.category!=='entertainment');
  const apps=channels.filter(c=>['news','sports','music','kids'].includes(c.category));
  return <div className="g-shelves">
    <ChannelShelf id="for-you" title="Top picks for you" channels={channels} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty={`No channels are listed for ${countryName} yet.`}/>
    <ChannelShelf id="movies" title="Movies & entertainment" channels={entertainment} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty="No entertainment channels are listed in this region."/>
    <ChannelShelf id="shows" title="Shows, news & more" channels={shows} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty="No additional channels are listed in this region."/>
    <ChannelShelf id="apps" title="Your channels" channels={apps} activeChannel={activeChannel} onSelectChannel={onSelectChannel} loading={isLoading} empty="No category channels are available in this region."/>
  </div>;
};
