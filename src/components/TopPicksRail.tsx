import React from 'react';
import { Channel } from '../types';
import { initialsFor } from '../services/iptv';

interface TopPicksRailProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  isLoading: boolean;
  countryName: string;
}

export const TopPicksRail: React.FC<TopPicksRailProps> = ({
  channels,
  activeChannel,
  onSelectChannel,
  isLoading,
  countryName
}) => {
  const topPicks = channels.slice(0, 10);

  return (
    <section className="featured-section page-section" id="for-you" aria-labelledby="featured-title">
      <div className="featured-heading flex items-center justify-between mb-2">
        <div>
          <p className="eyebrow"><span className="eyebrow-line"></span> AVAILABLE IN YOUR REGION</p>
          <h2 id="featured-title" className="text-2xl font-bold text-white">
            Live channels in <em>{countryName}.</em>
          </h2>
        </div>
        <a className="featured-link text-xs text-[#d5f477] font-semibold" href="#channels">
          View full guide ↗
        </a>
      </div>
      <p className="featured-subtitle text-xs text-[#a0aea5] mb-4">
        Choose a channel logo to start watching immediately in your player.
      </p>

      {isLoading ? (
        <div className="rail-loading py-8 text-center text-xs text-[#a0aea5] flex items-center justify-center gap-2">
          <span className="spinner"></span>
          <span>Finding channels in {countryName}…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topPicks.map((channel) => {
            const isPlaying = activeChannel?.id === channel.id;
            return (
              <button
                key={channel.id}
                type="button"
                className={`channel-card p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  isPlaying
                    ? 'border-[#d5f477] bg-gradient-to-r from-[#252c19] to-[#13150f]'
                    : 'border-white/10 bg-[#101715] hover:border-[#d5f477]/50 hover:bg-[#18211e]'
                }`}
                onClick={() => onSelectChannel(channel)}
              >
                <div className="channel-logo w-10 h-10 rounded-lg flex items-center justify-center flex-none relative overflow-hidden bg-gradient-to-br from-[#2a3021] to-[#11130f]">
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
                  <span className="text-[10px] text-[#a0aea5] uppercase block truncate">
                    {channel.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
