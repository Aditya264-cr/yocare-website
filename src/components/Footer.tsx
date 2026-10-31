import React from 'react';

interface FooterProps {
  activeTab: 'tv' | 'health';
}

export const Footer: React.FC<FooterProps> = ({ activeTab }) => {
  return (
    <footer className="footer border-t border-white/10 py-8 px-6 bg-[#080c0b] text-xs text-[#8f9e94]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <a href="#top" className="brand flex items-center gap-2 text-white font-extrabold text-lg">
          <span className="brand-symbol">
            <i></i><i></i><i></i><i></i>
          </span>
          <span>yocare<span className="brand-light">.{activeTab === 'tv' ? 'live' : 'health'}</span></span>
        </a>

        <span className="footer-note text-[#8f9e94] text-center md:text-left">
          {activeTab === 'tv'
            ? 'A wider view of the world, one live signal at a time.'
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
