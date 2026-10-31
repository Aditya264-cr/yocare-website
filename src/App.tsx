import React, { useState, useEffect } from 'react';
import { Channel, Country } from './types';
import { COUNTRIES, fetchCountryPlaylist } from './services/iptv';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TopPicksRail } from './components/TopPicksRail';
import { LivePlayer } from './components/LivePlayer';
import { ChannelGuide } from './components/ChannelGuide';
import { ProgramSchedule } from './components/ProgramSchedule';
import { HealthVault } from './components/HealthVault';
import { AiStreamChat } from './components/AiStreamChat';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tv' | 'health'>('tv');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // India default
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchCountryPlaylist(selectedCountry.code).then((data) => {
      if (isMounted) {
        setChannels(data);
        setIsLoading(false);
        if (data.length > 0 && !activeChannel) {
          setActiveChannel(data[0]);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCountry]);

  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    document.getElementById('player')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchClick = () => {
    setActiveTab('tv');
    document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' });
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.focus();
  };

  const spotlightChannel = channels.length > 0 ? channels[0] : null;

  return (
    <div className="min-h-screen bg-[#080c0b] text-[#f3f5ef] font-sans antialiased">
      <div className="film-grain" aria-hidden="true"></div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCountry={selectedCountry}
        onSearchClick={handleSearchClick}
      />

      <main id="main-content">
        {activeTab === 'tv' ? (
          <>
            <HeroSection
              country={selectedCountry}
              spotlightChannel={spotlightChannel}
              onPlayChannel={handleSelectChannel}
              onBrowseChannelsClick={() => {
                document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <TopPicksRail
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={handleSelectChannel}
              isLoading={isLoading}
              countryName={selectedCountry.name}
            />

            <LivePlayer
              channel={activeChannel}
              country={selectedCountry}
            />

            <ChannelGuide
              channels={channels}
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
              activeChannel={activeChannel}
              onSelectChannel={handleSelectChannel}
              isLoading={isLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            <ProgramSchedule
              channels={channels}
              onSelectChannel={handleSelectChannel}
            />

            {/* AI Stream Radar Assistant with Google Search Grounding */}
            <AiStreamChat
              onSelectChannel={handleSelectChannel}
              activeCountryName={selectedCountry.name}
            />
          </>
        ) : (
          <HealthVault />
        )}
      </main>

      <Footer activeTab={activeTab} />
    </div>
  );
};
