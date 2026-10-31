import React, { useMemo, useState } from 'react';
import { Search, Play, ChevronDown, Grid2X2 } from 'lucide-react';
import { Channel, Country, CategoryType } from '../types';
import { COUNTRIES, CATEGORY_LABELS, initialsFor } from '../services/iptv';

interface ChannelGuideProps { channels: Channel[]; selectedCountry: Country; onCountryChange: (country: Country) => void; activeChannel: Channel | null; onSelectChannel: (channel: Channel) => void; isLoading: boolean; searchQuery: string; setSearchQuery: (query: string) => void; }
const categories: CategoryType[] = ['all','news','sports','entertainment','music','kids','religion','general'];

export const ChannelGuide: React.FC<ChannelGuideProps> = ({ channels, selectedCountry, onCountryChange, activeChannel, onSelectChannel, isLoading, searchQuery, setSearchQuery }) => {
  const [category,setCategory] = useState<CategoryType>('all');
  const filtered = useMemo(() => channels.filter(ch => (category==='all'||ch.category===category) && (!searchQuery.trim() || ch.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || (ch.group||'').toLowerCase().includes(searchQuery.trim().toLowerCase()))),[channels,category,searchQuery]);
  return <section className="ytv-guide" id="channels">
    <div className="ytv-section-head"><div><p className="ytv-eyebrow">YOUR REGION, YOUR CHANNELS</p><h2>Live TV guide</h2><p className="ytv-guide-subtitle">Browse the channel listings available for the selected country.</p></div><div className="ytv-channel-total"><strong>{filtered.length}</strong><span>CHANNELS</span></div></div>
    <div className="ytv-toolbar">
      <label className="ytv-select-wrap"><span>REGION</span><span className="ytv-select-control"><select value={selectedCountry.code} onChange={e => {const country=COUNTRIES.find(c=>c.code===e.target.value);if(country)onCountryChange(country);}}>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}</select><ChevronDown size={16}/></span></label>
      <label className="ytv-search-wrap"><span>SEARCH CHANNELS</span><span className="ytv-search-control"><Search size={17}/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={`Search ${selectedCountry.name} channels…`}/></span></label>
      <div className="ytv-category-wrap"><span>GENRE</span><div className="ytv-categories">{categories.map(cat=><button key={cat} className={category===cat?'is-active':''} onClick={()=>setCategory(cat)}>{CATEGORY_LABELS[cat]}</button>)}</div></div>
    </div>
    {isLoading ? <div className="ytv-loading">Loading {selectedCountry.name} channels…</div> : <div className="ytv-guide-grid">
      {filtered.slice(0,120).map(channel=><button key={channel.id} className={`ytv-guide-card ${activeChannel?.id===channel.id?'is-selected':''}`} onClick={()=>onSelectChannel(channel)} disabled={!channel.url}>
        <span className="ytv-guide-logo">{channel.logo?<img src={channel.logo} alt="" loading="lazy" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/>:<b>{initialsFor(channel.name)}</b>}</span>
        <span className="ytv-guide-info"><strong>{channel.name}</strong><small>{channel.group||CATEGORY_LABELS[channel.category as CategoryType]||'Television'}</small></span>
        <span className="ytv-guide-play"><Play size={15} fill="currentColor"/></span>
      </button>)}
      {!filtered.length ? <div className="ytv-no-results"><Grid2X2 size={25}/><strong>No channels in this selection</strong><span>Try another genre or region.</span></div> : null}
    </div>}
    <p className="ytv-source-note">Channel listings and stream availability depend on the broadcaster. A listing does not guarantee that a stream is currently online or authorized for redistribution.</p>
  </section>;
};
