import React from 'react';
import { Search, Settings2, Tv } from 'lucide-react';
import { Country } from '../types';

type ActiveTab = 'tv' | 'health' | 'youtube';
interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedCountry: Country;
  countries: Country[];
  onSearchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, selectedCountry, countries, onSearchClick }) => (
  <header className="g-home-nav" id="top">
    <a className="g-brand" href="#discover" onClick={(event) => { event.preventDefault(); setActiveTab('tv'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Yocare Live home">
      <img className="g-brand-mark" src="/yocare-mark-live.svg" alt="" aria-hidden="true" /><span>yocare<span className="g-brand-light"> live</span></span>
    </a>
    <nav className="g-nav-links" aria-label="Main navigation">
      <a className={activeTab === 'tv' ? 'g-nav-active' : ''} href="#discover" onClick={(event) => { event.preventDefault(); setActiveTab('tv'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>For you</a>
      <a href="#channels" onClick={(event) => { event.preventDefault(); setActiveTab('tv'); window.setTimeout(() => document.getElementById('channels')?.scrollIntoView({ behavior: 'smooth' }), 0); }}>Live TV</a>
      <button type="button" className={activeTab === 'youtube' ? 'g-nav-active' : ''} onClick={() => { setActiveTab('youtube'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Tv size={15}/> YouTube</button>
      <a href="#guide" onClick={(event) => { event.preventDefault(); setActiveTab('tv'); window.setTimeout(() => document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth' }), 0); }}>Guide</a>
      <button type="button" className={activeTab === 'health' ? 'g-nav-active' : ''} onClick={() => setActiveTab('health')}>Library</button>
    </nav>
    <div className="g-nav-actions">
      <button type="button" className="g-icon-button" onClick={onSearchClick} aria-label="Search channels"><Search size={18}/></button>
      <label className="g-region-control" title="Choose your channel region">
        <span>{selectedCountry.flag}</span>
        <select aria-label="Content region" value={selectedCountry.code} onChange={(event) => window.dispatchEvent(new CustomEvent('yocare-region-change', { detail: event.target.value }))}>
          {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
        </select>
      </label>
      {activeTab === 'health' && <button type="button" className="g-icon-button" onClick={() => setActiveTab('tv')} aria-label="Return to live TV"><Settings2 size={18}/></button>}
    </div>
  </header>
);
