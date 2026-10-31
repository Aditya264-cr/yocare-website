import React from 'react';
import { Search, Settings2, Radio } from 'lucide-react';
import { Search, Settings2 } from 'lucide-react';
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
      <span className="ytv-region-pill">{selectedCountry.flag} {selectedCountry.name}</span>
      <span className="ytv-brand-end">YOCARE TV</span>
  <header className="g-home-nav" id="top">
    <a className="g-brand" href="#discover" onClick={(event) => { event.preventDefault(); setActiveTab('tv'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Yocare Live home">
      <span className="g-brand-mark">Y</span><span>yocare<span className="g-brand-light"> live</span></span>
    </a>
    <nav className="g-nav-links" aria-label="Main navigation">
      <a className="g-nav-active" href="#discover">For you</a>
      <a href="#movies">Movies</a>
      <a href="#shows">Shows</a>
      <a href="#apps">Apps</a>
      <a href="#channels">Library</a>
    </nav>
    <div className="g-nav-actions">
      <button type="button" className="g-icon-button" onClick={onSearchClick} aria-label="Search channels"><Search size={18}/></button>
      <label className="g-region-control" title="Choose your channel region">
        <span>{selectedCountry.flag}</span>
        <select aria-label="Channel region" value={selectedCountry.code} onChange={(e) => {
          const event = new CustomEvent('yocare-region-change', { detail: e.target.value });
          window.dispatchEvent(event);
        }}>
          <option value="in">India</option><option value="us">United States</option><option value="gb">United Kingdom</option><option value="ca">Canada</option><option value="au">Australia</option><option value="jp">Japan</option><option value="kr">South Korea</option><option value="de">Germany</option><option value="fr">France</option><option value="it">Italy</option><option value="br">Brazil</option><option value="za">South Africa</option><option value="sg">Singapore</option><option value="es">Spain</option><option value="nl">Netherlands</option><option value="mx">Mexico</option><option value="ph">Philippines</option><option value="pk">Pakistan</option><option value="bd">Bangladesh</option><option value="np">Nepal</option>
        </select>
      </label>
      {activeTab === 'health' && <button type="button" className="g-icon-button" onClick={() => setActiveTab('tv')} aria-label="Return to live TV"><Settings2 size={18}/></button>}
      <span className="g-region-name">{selectedCountry.name}</span>
    </div>
  </header>
);
