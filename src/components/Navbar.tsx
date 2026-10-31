import React from 'react';
import { Search, Settings2, Radio } from 'lucide-react';
import { Country } from '../types';

interface NavbarProps {
  activeTab: 'tv' | 'health';
  setActiveTab: (tab: 'tv' | 'health') => void;
  selectedCountry: Country;
  onSearchClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, selectedCountry, onSearchClick }) => (
  <header className="ytv-nav" id="top">
    <a className="ytv-brand" href="#top" onClick={(e) => { e.preventDefault(); setActiveTab('tv'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Yocare Live home">
      <span className="ytv-brand-mark">Y</span><span>yocare <b>live</b></span>
    </a>
    <nav className="ytv-tabs" aria-label="Main navigation">
      <button className={activeTab === 'tv' ? 'is-active' : ''} onClick={() => { setActiveTab('tv'); window.scrollTo({top:0,behavior:'smooth'}); }}>For you</button>
      <button onClick={() => { setActiveTab('tv'); document.getElementById('channels')?.scrollIntoView({behavior:'smooth'}); }}>Live TV</button>
      <button onClick={() => { setActiveTab('tv'); document.getElementById('guide')?.scrollIntoView({behavior:'smooth'}); }}>Guide</button>
      <button onClick={() => { setActiveTab('tv'); document.getElementById('player')?.scrollIntoView({behavior:'smooth'}); }}>Now playing</button>
      <button className={activeTab === 'health' ? 'is-active' : ''} onClick={() => setActiveTab('health')}>Library</button>
    </nav>
    <div className="ytv-nav-actions">
      {activeTab === 'tv' ? <button className="ytv-icon-btn" onClick={onSearchClick} aria-label="Search channels"><Search size={18}/></button> : null}
      <label className="ytv-region"><span>REGION</span><select value={selectedCountry.code} onChange={(e) => { const target = e.currentTarget; window.dispatchEvent(new CustomEvent('yocare-region-change',{detail:target.value})); }} aria-label="Select region">{/* region selection is controlled by the guide below */}<option value={selectedCountry.code}>{selectedCountry.flag} {selectedCountry.name}</option></select></label>
      <span className="ytv-brand-end">YOCARE TV</span>
    </div>
  </header>
);
