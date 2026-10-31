import React, { useEffect, useState } from 'react';
import { Channel, Country } from './types';
import { COUNTRIES, fetchCountryPlaylist, loadCountries } from './services/iptv';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { TopPicksRail } from './components/TopPicksRail';
import { LivePlayer } from './components/LivePlayer';
import { ChannelGuide } from './components/ChannelGuide';
import { ProgramSchedule } from './components/ProgramSchedule';
import { HealthVault } from './components/HealthVault';
import { AiStreamChat } from './components/AiStreamChat';
import { Footer } from './components/Footer';
import { YouTubeDiscovery } from './components/YouTubeDiscovery';

type ActiveTab = 'tv' | 'health' | 'youtube';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tv');
  const [countryOptions, setCountryOptions] = useState<Country[]>(COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    loadCountries().then((items) => {
      if (!active) return;
      setCountryOptions(items);
      setSelectedCountry((current) => items.find((item) => item.code === current.code) || items.find((item) => item.code === 'in') || items[0] || current);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleRegionChange = (event: Event) => {
      const code = (event as CustomEvent<string>).detail;
      const country = countryOptions.find((item) => item.code === code);
      if (country) setSelectedCountry(country);
    };
    window.addEventListener('yocare-region-change', handleRegionChange);
    return () => window.removeEventListener('yocare-region-change', handleRegionChange);
  }, [countryOptions]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setActiveChannel(null);
    setSearchQuery('');
    fetchCountryPlaylist(selectedCountry.code)
      .then((data) => {
        if (!isMounted) return;
        setChannels(data);
        setActiveChannel((current) => data.find((channel) => channel.id === current?.id) || data.find((channel) => channel.url) || null);
      })
      .catch((error) => {
        console.error('Unable to load regional channel catalogue:', error);
        if (isMounted) { setChannels([]); setActiveChannel(null); }
      })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, [selectedCountry.code]);

  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    document.getElementById('player')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSearchClick = () => {
    setActiveTab('tv');
    window.setTimeout(() => {
      document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => document.getElementById('channel-search')?.focus(), 250);
    }, 0);
  };

  const spotlightChannel = channels[0] || null;
  return (
    <div className="g-tv-app min-h-screen bg-[#08090c] text-white font-sans antialiased">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} selectedCountry={selectedCountry} countries={countryOptions} onSearchClick={handleSearchClick}/>
      <main id="main-content">
        {activeTab === 'tv' ? <>
          <HeroSection country={selectedCountry} spotlightChannel={spotlightChannel} onPlayChannel={handleSelectChannel} onBrowseChannelsClick={() => document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' })}/>
          <YouTubeDiscovery mode="rail" onOpen={() => setActiveTab('youtube')} regionCode={selectedCountry.code.toUpperCase()}/>
          <TopPicksRail channels={channels} activeChannel={activeChannel} onSelectChannel={handleSelectChannel} isLoading={isLoading} countryName={selectedCountry.name}/>
          <LivePlayer channel={activeChannel} country={selectedCountry}/>
          <ChannelGuide channels={channels} selectedCountry={selectedCountry} countryOptions={countryOptions} onCountryChange={setSelectedCountry} activeChannel={activeChannel} onSelectChannel={handleSelectChannel} isLoading={isLoading} searchQuery={searchQuery} setSearchQuery={setSearchQuery}/>
          <ProgramSchedule channels={channels} onSelectChannel={handleSelectChannel}/>
          <AiStreamChat onSelectChannel={handleSelectChannel} activeCountryName={selectedCountry.name}/>
        </> : activeTab === 'youtube' ? <YouTubeDiscovery mode="page" regionCode={selectedCountry.code.toUpperCase()}/> : <HealthVault/>}
      </main>
      <Footer activeTab={activeTab}/>
    </div>
  );
};
