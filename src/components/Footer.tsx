import React from 'react';

interface FooterProps {
  activeTab: 'tv' | 'health' | 'youtube';
}

export const Footer: React.FC<FooterProps> = ({ activeTab }) => {
  return (
    <footer className="footer border-t border-white/10 py-8 px-6 bg-[#080c0b] text-xs text-[#8f9e94]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <a href="#top" className="brand flex items-center gap-2 text-white font-extrabold text-lg">
          <svg className="brand-symbol" viewBox="0 0 48 48" role="img" aria-label="Yocare" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="yocare-mark-gradient" x1="5" y1="5" x2="43" y2="43" gradientUnits="userSpaceOnUse"><stop stopColor="#34D399"/><stop offset=".52" stopColor="#14B8A6"/><stop offset="1" stopColor="#38BDF8"/></linearGradient></defs><path fill="url(#yocare-mark-gradient)" d="M6 7h8.2c5.5 0 9.5 2.7 12.3 7.4l2.7 4.5L39 7h8L27.4 39.1c-2 3.3-5.1 5-9.1 5H9.5l11.9-19.8L6 7Z"/></svg>
          <span>yocare<span className="brand-light">.{activeTab === 'tv' ? 'live' : activeTab === 'youtube' ? 'youtube' : 'health'}</span></span>
        </a>

        <span className="footer-note text-[#8f9e94] text-center md:text-left">
          {activeTab === 'tv'
            ? 'A wider view of the world, one live signal at a time.'
            : activeTab === 'youtube' ? 'Discover videos and live moments from creators around the world.'
            : 'Private evidence-aware wellness reflections. Encrypted locally on your device.'}
        </span>

        <div className="footer-links flex items-center gap-4 text-xs font-semibold">
          <a href="#discover" className="hover:text-[#c8f28a] transition-colors">Discover</a>
          <a href="#channels" className="hover:text-[#c8f28a] transition-colors">Channel Guide</a>
          <a href="#top" className="hover:text-[#c8f28a] transition-colors">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
};
