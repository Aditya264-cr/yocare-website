import React from 'react';
import { Play, Tv, Globe, Sparkles } from 'lucide-react';
import { Channel, Country } from '../types';
import { initialsFor } from '../services/iptv';

interface HeroSectionProps {
  country: Country;
  spotlightChannel: Channel | null;
  onPlayChannel: (channel: Channel) => void;
  onBrowseChannelsClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  country,
  spotlightChannel,
  onPlayChannel,
  onBrowseChannelsClick
}) => {
  return (
    <section className="hero" id="discover" aria-labelledby="home-title">
      <div className="hero-backdrop">
        <div className="hero-glow"></div>
        <div className="hero-stars"></div>
        <div className="hero-ring"></div>
        <div className="hero-ring ring-two"></div>
        <div className="hero-ring ring-three"></div>
        <div className="hero-orb"></div>
      </div>

      <div className="hero-content">
        <p className="eyebrow">
          <span className="eyebrow-line"></span> YOCARE LIVE · YOUR GLOBAL TV HOME
        </p>
        <h1 id="home-title">
          Find something<br />
          <em>live to watch.</em>
        </h1>
        <p className="hero-copy">
          Browse live news, sports, music, culture and entertainment from public live streams available in {country.name}.
        </p>

        <div className="hero-actions">
          <button
            className="primary-cta cursor-pointer border-0"
            onClick={() => spotlightChannel && onPlayChannel(spotlightChannel)}
            disabled={!spotlightChannel}
            type="button"
          >
            <span>Watch live</span> <Play className="w-4 h-4 fill-current inline-block ml-1" />
          </button>
          <button
            className="text-cta cursor-pointer bg-transparent border-0"
            onClick={onBrowseChannelsClick}
            type="button"
          >
            <span className="play-mini" aria-hidden="true">▤</span> Browse {country.name} guide
          </button>
        </div>

        <div className="hero-meta">
          <span className="live-dot"></span>
          <span>{country.flag} {country.name.toUpperCase()}</span>
          <span className="meta-divider"></span>
          <span>LIVE CHANNEL GUIDE</span>
        </div>
      </div>

      <div className="hero-world">
        <div className="world-globe">
          <div className="orbital-rings" aria-hidden="true">
            <div className="ring ring-depth orbit-a" style={{ '--size': '100%' } as React.CSSProperties}></div>
            <div className="ring ring-depth orbit-b" style={{ '--size': '85%' } as React.CSSProperties}></div>
            <div className="ring ring-depth orbit-c" style={{ '--size': '70%' } as React.CSSProperties}></div>
          </div>

          {spotlightChannel && (
            <button
              className="hero-spotlight cursor-pointer border-0 w-full text-left bg-transparent"
              onClick={() => onPlayChannel(spotlightChannel)}
              type="button"
              aria-label={`Tune into ${spotlightChannel.name}`}
              style={{
                position: 'relative',
                zIndex: 4,
                padding: '20px',
                borderRadius: '16px',
                background: 'linear-gradient(145deg, rgba(30, 42, 33, 0.9), rgba(12, 18, 14, 0.95))',
                border: '1px solid rgba(213, 244, 119, 0.35)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(213, 244, 119, 0.15)',
                backdropFilter: 'blur(16px)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="live-pill">
                  <i></i> LIVE SPOTLIGHT
                </span>
                <span className="text-xs font-semibold text-[#c8f28a] tracking-wider uppercase flex items-center gap-1">
                  <Globe className="w-3 h-3 inline" /> {country.code.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-4 my-2">
                <div className="channel-logo w-14 h-14 rounded-xl flex items-center justify-center flex-none bg-gradient-to-br from-[#2a3021] to-[#11130f]">
                  {spotlightChannel.logo ? (
                    <img
                      src={spotlightChannel.logo}
                      alt={spotlightChannel.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="logo-fallback font-bold text-lg text-[#d5f477]">
                    {initialsFor(spotlightChannel.name)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[10px] tracking-widest text-[#a9c8a0] font-bold block uppercase mb-0.5">
                    START WATCHING NOW
                  </span>
                  <h3 className="text-base font-bold text-white truncate m-0">
                    {spotlightChannel.name}
                  </h3>
                  <p className="text-xs text-[#a0aea5] m-0 capitalize truncate flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-[#d5f477]" /> {spotlightChannel.category} Channel
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-[#d5f477] font-semibold">
                <span>Click to play channel stream</span>
                <span>▶</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
