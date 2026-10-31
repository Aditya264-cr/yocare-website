import React from 'react';
import { Search, Radio, HeartPulse, Tv } from 'lucide-react';
import { Country } from '../types';

interface NavbarProps {
  activeTab: 'tv' | 'health';
  setActiveTab: (tab: 'tv' | 'health') => void;
  selectedCountry: Country;
  onSearchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedCountry,
  onSearchClick
}) => {
  return (
    <header className="topbar" id="top">
      <a
        className="brand"
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('tv');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Yocare Home"
      >
        <span className="brand-symbol" aria-hidden="true">
          <i></i><i></i><i></i><i></i>
        </span>
        <span>
          yocare<span className="brand-light">.{activeTab === 'tv' ? 'live' : 'health'}</span>
        </span>
      </a>

      <nav className="topnav" aria-label="Main navigation">
        <button
          type="button"
          className={`flex items-center gap-1.5 cursor-pointer bg-transparent border-0 text-inherit ${activeTab === 'tv' ? 'active font-semibold text-white' : 'hover:text-white'}`}
          onClick={() => setActiveTab('tv')}
        >
          <Tv className="w-4 h-4 text-[#d5f477]" />
          <span>Live TV Guide</span>
        </button>

        <button
          type="button"
          className={`flex items-center gap-1.5 cursor-pointer bg-transparent border-0 text-inherit ${activeTab === 'health' ? 'active font-semibold text-white' : 'hover:text-white'}`}
          onClick={() => setActiveTab('health')}
        >
          <HeartPulse className="w-4 h-4 text-[#7cddbd]" />
          <span>Yocare Health</span>
        </button>

        {activeTab === 'tv' && (
          <button
            className="topnav-search cursor-pointer bg-transparent border-0 text-inherit hover:text-white flex items-center gap-1.5"
            onClick={onSearchClick}
            type="button"
            aria-label="Search channels"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
        )}
      </nav>

      <div className="flex items-center gap-3">
        {activeTab === 'tv' ? (
          <a
            className="top-action"
            href="#channels"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className="live-dot"></span> {selectedCountry.flag} {selectedCountry.name} ↗
          </a>
        ) : (
          <a
            className="top-action"
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('privacy')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#7cddbd] inline-block shadow-[0_0_10px_#7cddbd]"></span> Private Vault 🔒
          </a>
        )}
      </div>
    </header>
  );
};
