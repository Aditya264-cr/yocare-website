import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, Play, Tv, Blocks, X } from 'lucide-react';

export const YocareHome: React.FC = () => {
 const [menuOpen,setMenuOpen]=useState(false);
 const [productsOpen,setProductsOpen]=useState(false);
 return <div className="yc-home">
  <header className="yc-header">
   <a className="yc-logo" href="/"><span className="yc-logo-mark">y</span><span>yocare</span></a>
   <button className="yc-mobile-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
   <nav className={menuOpen?"yc-nav open":"yc-nav"} aria-label="Main navigation">
    <a href="/" className="yc-nav-active">Home</a>
    <div className="yc-products-nav"><button type="button" onClick={()=>setProductsOpen(!productsOpen)} aria-expanded={productsOpen}>Products <ChevronDown size={14}/></button>
     {productsOpen&&<div className="yc-products-dropdown"><a href="/live"><Tv size={17}/><span><b>Yocare Live</b><small>Entertainment discovery</small></span></a><a href="/tools"><Blocks size={17}/><span><b>Yocare Tools</b><small>Digital tools · Coming soon</small></span></a></div>}
    </div>
    <a href="#about" onClick={()=>setMenuOpen(false)}>About</a><a href="mailto:hello@yocare.online">Contact</a>
    <a className="yc-nav-cta" href="#products">Explore Yocare <ArrowUpRight size={15}/></a>
   </nav>
  </header>
  <main>
   <section className="yc-hero">
    <div className="yc-hero-copy">
     <div className="yc-kicker"><span/> A WORLD OF DIGITAL EXPERIENCES</div>
     <h1>Good things<br/>happen <em>here.</em></h1>
     <p>Meet Yocare — a growing home for entertainment and useful digital experiences. Discover what’s here today, and what’s coming next.</p>
     <div className="yc-hero-actions"><a className="yc-primary-button" href="#products">Explore our products <ArrowRight size={17}/></a><a className="yc-text-button" href="#about">Get to know Yocare</a></div>
     <div className="yc-hero-footnote"><span className="yc-footnote-dot"/> One home. Different ways to explore.</div>
    </div>
    <div className="yc-hero-art">
     <div className="yc-art-backdrop"/>
     <div className="yc-art-label"><span>THE YOCARE ECOSYSTEM</span><span>01 — 02</span></div>
     <a href="/live" className="yc-preview-live">
      <div className="yc-preview-top"><span className="yc-preview-brand"><i>y</i> yocare live</span><span className="yc-live-pill"><i/> DISCOVER</span></div>
      <div className="yc-preview-screen"><div className="yc-screen-glow"/><div className="yc-screen-play"><Play size={19} fill="currentColor"/></div><span>YOUR NEXT WATCH STARTS HERE</span></div>
      <div className="yc-preview-bottom"><div><b>Entertainment, in one place.</b><small>Explore videos and live TV</small></div><ArrowUpRight size={18}/></div>
     </a>
     <a href="/tools" className="yc-preview-tools"><div className="yc-tools-icon"><Blocks size={23}/></div><div><b>Yocare Tools</b><small>Something useful is on its way.</small></div><span className="yc-soon-tag">COMING SOON</span></a>
    </div>
   </section>
   <section className="yc-intro-strip"><span>BUILT FOR EVERYDAY DIGITAL LIFE</span><p>Thoughtful products. Clear experiences. Room to grow.</p></section>
   <section className="yc-products-section" id="products">
    <div className="yc-section-heading"><div><div className="yc-kicker">WHAT YOU CAN EXPLORE</div><h2>One home.<br/><em>More to discover.</em></h2></div><p>Start with what’s available today. There’s more being shaped for tomorrow.</p></div>
    <div className="yc-product-list">
     <article className="yc-product-row"><div className="yc-product-index">01</div><div className="yc-product-icon"><Tv size={25}/></div><div className="yc-product-description"><span>ENTERTAINMENT</span><h3>Yocare Live</h3><p>A place to discover videos and explore live television through a clean, easy-to-use experience.</p></div><a href="/live" className="yc-product-link">Explore Live <ArrowUpRight size={18}/></a></article>
     <article className="yc-product-row"><div className="yc-product-index">02</div><div className="yc-product-icon"><Blocks size={25}/></div><div className="yc-product-description"><span>EVERYDAY DIGITAL TOOLS</span><h3>Yocare Tools <i>Coming soon</i></h3><p>A future collection of useful digital tools, designed around flexible and accessible experiences.</p></div><a href="/tools" className="yc-product-link">Discover the idea <ArrowUpRight size={18}/></a></article>
    </div>
   </section>
   <section className="yc-about-section" id="about">
    <div className="yc-about-mark">y<span>.</span></div>
    <div className="yc-about-copy"><div className="yc-kicker">WHY YOCARE</div><h2>Make digital life<br/><em>a little more useful.</em></h2><p>Yocare is an independent digital ecosystem in the making. We bring focused products under one roof, with a simple idea: technology should feel approachable, useful and thoughtfully made.</p><a href="mailto:hello@yocare.online" className="yc-about-link">Say hello <ArrowUpRight size={16}/></a></div>
    <div className="yc-about-aside"><span>OUR APPROACH</span><b>Useful over noisy.</b><b>Simple over complicated.</b><b>Built to keep evolving.</b></div>
   </section>
  </main>
  <footer className="yc-footer"><a className="yc-logo" href="/"><span className="yc-logo-mark">y</span><span>yocare</span></a><span className="yc-footer-tagline">A growing home for digital experiences.</span><div className="yc-footer-links"><a href="/live">Yocare Live</a><a href="/tools">Yocare Tools</a><a href="mailto:hello@yocare.online">Contact</a></div><span className="yc-copyright">© {new Date().getFullYear()} Yocare</span></footer>
 </div>;
};
