import React from 'react';
import { Play, ChevronRight } from 'lucide-react';
import { Play, ChevronDown } from 'lucide-react';
import { Channel, Country } from '../types';
import { initialsFor } from '../services/iptv';

interface HeroSectionProps {
  country: Country;
  spotlightChannel: Channel | null;
  onPlayChannel: (channel: Channel) => void;
  onBrowseChannelsClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ country, spotlightChannel, onPlayChannel, onBrowseChannelsClick }) => (
  <section className="ytv-hero" id="discover">
    <div className="ytv-hero-backdrop" aria-hidden="true">
      {spotlightChannel?.logo ? <img src={spotlightChannel.logo} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} /> : null}
    </div>
    <div className="ytv-hero-shade" />
    <div className="ytv-hero-copy">
      <div className="ytv-provider"><span className="ytv-live-dot"/> YOCARE LIVE <span>·</span> {country.name.toUpperCase()}</div>
      <p className="ytv-kicker">ON AIR IN YOUR REGION</p>
      <h1>{spotlightChannel?.name || 'Your world, on air.'}</h1>
      <p className="ytv-hero-description">{spotlightChannel ? `Watch ${spotlightChannel.name} and discover more live channels available in ${country.name}.` : `Explore live television available in ${country.name}.`}</p>
      <div className="ytv-hero-actions">
        <button className="ytv-primary" disabled={!spotlightChannel?.url} onClick={() => spotlightChannel && onPlayChannel(spotlightChannel)}><Play size={17} fill="currentColor"/> Watch live</button>
        <button className="ytv-secondary" onClick={onBrowseChannelsClick}>Explore channels <ChevronRight size={17}/></button>
      </div>
      <div className="ytv-hero-meta"><span>{country.flag} {country.name}</span><i/> <span>{spotlightChannel?.category || 'LIVE TV'} CHANNEL</span></div>
    </div>
    {spotlightChannel ? <button className="ytv-feature-logo" onClick={() => onPlayChannel(spotlightChannel)} aria-label={`Play ${spotlightChannel.name}`}>{spotlightChannel.logo ? <img src={spotlightChannel.logo} alt={spotlightChannel.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }}/> : <strong>{initialsFor(spotlightChannel.name)}</strong>}</button> : null}
  <section className="g-hero" id="discover" aria-labelledby="home-title">
    <div className="g-hero-backdrop" aria-hidden="true">
      {spotlightChannel?.logo && <img src={spotlightChannel.logo} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}/>}
    </div>
    <div className="g-hero-shade" aria-hidden="true"/>
    <div className="g-hero-copy">
      <p className="g-eyebrow"><span className="g-live-dot"/> YOCARE LIVE · {country.name.toUpperCase()}</p>
      <p className="g-channel-kicker">{spotlightChannel ? 'FEATURED CHANNEL · AVAILABLE IN YOUR REGION' : 'YOUR REGIONAL TV GUIDE'}</p>
      <h1 id="home-title">{spotlightChannel?.name || 'Discover live TV.'}</h1>
      <p className="g-hero-description">{spotlightChannel ? `Watch ${spotlightChannel.name} and explore more channels available in ${country.name}.` : `Explore channels listed for ${country.name}. Choose a channel to start watching.`}</p>
      <div className="g-hero-actions">
        <button className="g-primary-button" type="button" disabled={!spotlightChannel?.url} onClick={() => spotlightChannel && onPlayChannel(spotlightChannel)}><Play size={17} fill="currentColor"/> Watch live</button>
        <button className="g-secondary-button" type="button" onClick={onBrowseChannelsClick}>Explore channels <ChevronDown size={17}/></button>
      </div>
      <div className="g-hero-meta"><span>{country.flag} {country.name}</span><span>·</span><span>{spotlightChannel?.category || 'Live TV'}</span></div>
    </div>
    {spotlightChannel && <button type="button" className="g-hero-logo" onClick={() => onPlayChannel(spotlightChannel)} aria-label={`Play ${spotlightChannel.name}`}>
      {spotlightChannel.logo ? <img src={spotlightChannel.logo} alt={spotlightChannel.name} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}/> : <span>{initialsFor(spotlightChannel.name)}</span>}
    </button>}
  </section>
);
