import React, { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Blocks, ChevronDown, Menu, Play, Tv, X,
} from 'lucide-react';

export const YocareHome: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <div className="yc-home">
      <header className="yc-header">
        <a className="yc-logo" href="/" aria-label="Yocare home">
          <span className="yc-logo-mark">y</span><span>yocare</span>
        </a>
        <button className="yc-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={menuOpen ? 'yc-nav open' : 'yc-nav'} aria-label="Main navigation">
          <a href="/" className="yc-nav-active" onClick={() => setMenuOpen(false)}>Home</a>
          <div className="yc-products-nav">
            <button type="button" onClick={() => setProductsOpen(!productsOpen)} aria-expanded={productsOpen}>
              Products <ChevronDown size={15} />
            </button>
            {productsOpen && (
              <div className="yc-products-dropdown">
                <a href="/live"><Tv size={17} /><span><b>Yocare Live</b><small>Entertainment discovery</small></span></a>
                <a href="/tools"><Blocks size={17} /><span><b>Yocare Tools</b><small>Digital tools · Coming soon</small></span></a>
              </div>
            )}
          </div>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="mailto:hello@yocare.online" onClick={() => setMenuOpen(false)}>Contact</a>
          <a className="yc-nav-cta" href="#products" onClick={() => setMenuOpen(false)}>Explore Yocare <ArrowUpRight size={16} /></a>
        </nav>
      </header>

      <main>
        <section className="yc-hero">
          <div className="yc-hero-copy">
            <div className="yc-eyebrow"><span className="yc-eyebrow-mark">✳</span> A WORLD OF DIGITAL EXPERIENCES</div>
            <h1>Make room for<br /><em>what matters.</em></h1>
            <p>Yocare brings thoughtful digital experiences together — from discovering what to watch to finding useful tools for everyday life.</p>
            <div className="yc-hero-actions">
              <a className="yc-primary-button" href="#products">Explore Yocare <ArrowRight size={17} /></a>
              <a className="yc-secondary-button" href="#about">Get to know us</a>
            </div>
            <div className="yc-hero-note"><span /> One growing ecosystem. Different ways to explore.</div>
          </div>

          <div className="yc-hero-visual" aria-label="Preview of Yocare products">
            <div className="yc-visual-orbit yc-orbit-one" />
            <div className="yc-visual-orbit yc-orbit-two" />
            <div className="yc-visual-spark yc-spark-one">✳</div>
            <div className="yc-visual-spark yc-spark-two">✦</div>
            <div className="yc-product-window">
              <div className="yc-window-top">
                <div className="yc-window-brand"><span className="yc-mini-mark">y</span> yocare</div>
                <span className="yc-window-status"><i /> YOUR DIGITAL SPACE</span>
              </div>
              <div className="yc-window-content">
                <div className="yc-window-greeting">A little more of what you love.</div>
                <a href="/live" className="yc-window-card yc-window-live">
                  <div className="yc-window-card-icon"><Play size={19} fill="currentColor" /></div>
                  <div><span>ENTERTAINMENT</span><b>Yocare Live</b><small>Discover videos and live TV</small></div>
                  <ArrowUpRight size={18} />
                </a>
                <a href="/tools" className="yc-window-card yc-window-tools">
                  <div className="yc-window-card-icon"><Blocks size={19} /></div>
                  <div><span>EVERYDAY UTILITIES</span><b>Yocare Tools</b><small>A useful collection is taking shape</small></div>
                  <span className="yc-coming-pill">SOON</span>
                </a>
              </div>
              <div className="yc-window-footer"><span>Thoughtfully made for everyday life</span><span>01 / 02</span></div>
            </div>
            <div className="yc-visual-caption">THE YOCARE ECOSYSTEM <span>DESIGNED TO GROW</span></div>
          </div>
        </section>

        <section className="yc-trust-strip">
          <span>ONE PLACE TO START</span><i /><p>Discover the products shaping the Yocare experience.</p>
        </section>

        <section className="yc-products-section" id="products">
          <div className="yc-section-heading">
            <div><div className="yc-eyebrow">EXPLORE YOCARE</div><h2>Different experiences.<br /><em>One thoughtful home.</em></h2></div>
            <p>Start with Yocare Live. And keep an eye out for what we’re building next.</p>
          </div>
          <div className="yc-product-grid">
            <a href="/live" className="yc-product-card yc-live-card">
              <div className="yc-card-topline"><span>01 / ENTERTAINMENT</span><span className="yc-card-arrow"><ArrowUpRight size={18} /></span></div>
              <div className="yc-card-art yc-live-art">
                <div className="yc-live-art-glow" />
                <div className="yc-live-art-screen"><span className="yc-screen-play"><Play size={22} fill="currentColor" /></span><span className="yc-screen-caption">FIND YOUR NEXT WATCH</span></div>
                <div className="yc-art-chip"><Tv size={14} /> LIVE TV + VIDEO</div>
              </div>
              <div className="yc-card-copy"><span>WATCH. DISCOVER. ENJOY.</span><h3>Yocare Live</h3><p>Explore videos and live television through a clear, easy-to-use experience.</p><b>Explore Yocare Live <ArrowRight size={16} /></b></div>
            </a>
            <a href="/tools" className="yc-product-card yc-tools-card">
              <div className="yc-card-topline"><span>02 / DIGITAL TOOLS</span><span className="yc-card-arrow"><ArrowUpRight size={18} /></span></div>
              <div className="yc-card-art yc-tools-art">
                <div className="yc-tools-art-orb yc-tools-orb-a" /><div className="yc-tools-art-orb yc-tools-orb-b" />
                <div className="yc-tools-art-panel"><div className="yc-tools-panel-icon"><Blocks size={24} /></div><span>THE TOOLKIT</span><b>Useful things,<br />beautifully simple.</b><div className="yc-tools-panel-lines"><i /><i /><i /></div></div>
                <div className="yc-art-chip"><Blocks size={14} /> IN DEVELOPMENT</div>
              </div>
              <div className="yc-card-copy"><span>COMING SOON</span><h3>Yocare Tools</h3><p>A future collection of practical digital tools designed to make everyday tasks simpler.</p><b>Discover what’s coming <ArrowRight size={16} /></b></div>
            </a>
          </div>
        </section>

        <section className="yc-about-section" id="about">
          <div className="yc-about-symbol">y<span>.</span></div>
          <div className="yc-about-copy"><div className="yc-eyebrow">A NOTE ABOUT YOCARE</div><h2>Technology should feel<br /><em>clear, useful and human.</em></h2><p>Yocare is an independent digital ecosystem in the making. We bring focused products together under one roof, with an emphasis on thoughtful design and experiences that are easy to understand.</p><a href="mailto:hello@yocare.online">Connect with Yocare <ArrowUpRight size={16} /></a></div>
        </section>
      </main>

      <footer className="yc-footer">
        <a className="yc-logo" href="/"><span className="yc-logo-mark">y</span><span>yocare</span></a>
        <span className="yc-footer-tagline">A growing home for digital experiences.</span>
        <div className="yc-footer-links"><a href="/live">Yocare Live</a><a href="/tools">Yocare Tools</a><a href="mailto:hello@yocare.online">Contact</a></div>
        <span className="yc-copyright">© {new Date().getFullYear()} Yocare</span>
      </footer>
    </div>
  );
};
