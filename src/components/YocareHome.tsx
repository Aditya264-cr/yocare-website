import React, { useState } from 'react';
import { ArrowDownRight, ArrowRight, Blocks, ChevronDown, Compass, Menu, Sparkles, Tv, X } from 'lucide-react';

const products = [
  { name: 'Yocare Live', eyebrow: 'ENTERTAINMENT', description: 'Discover videos, explore content and experience live television in one place.', href: '/live', icon: Tv, status: 'Explore platform', className: 'live' },
  { name: 'Yocare Tools', eyebrow: 'DIGITAL WORKSPACE', description: 'Find practical digital tools with flexible, task-friendly access. Our marketplace is coming soon.', href: '/tools', icon: Blocks, status: 'Coming soon', className: 'tools' },
];

export const YocareHome: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  return <div className="yocare-home">
    <header className="yh-header">
      <a className="yh-brand" href="/" aria-label="Yocare home"><span className="yh-brand-mark">Y</span><span>yocare<span className="yh-brand-period">.</span></span></a>
      <button className="yh-mobile-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
      <nav className={`yh-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <a className="yh-nav-link active" href="/">Home</a>
        <div className="yh-products-menu"><button className="yh-nav-link yh-products-trigger" type="button" aria-expanded={productsOpen} onClick={() => setProductsOpen(!productsOpen)}>Products <ChevronDown size={14}/></button>
          {productsOpen && <div className="yh-dropdown"><a href="/live"><Tv size={17}/><span><strong>Yocare Live</strong><small>Entertainment discovery</small></span></a><a href="/tools"><Blocks size={17}/><span><strong>Yocare Tools</strong><small>Digital tools marketplace</small></span></a></div>}
        </div>
        <a className="yh-nav-link" href="#about" onClick={() => setMenuOpen(false)}>About</a>
        <a className="yh-nav-link" href="mailto:hello@yocare.online">Contact</a>
        <a className="yh-nav-cta" href="#products" onClick={() => setMenuOpen(false)}>Explore ecosystem <ArrowRight size={15}/></a>
      </nav>
    </header>
    <main>
      <section className="yh-hero">
        <div className="yh-hero-grid" aria-hidden="true"/><div className="yh-orbit yh-orbit-one" aria-hidden="true"/><div className="yh-orbit yh-orbit-two" aria-hidden="true"/>
        <div className="yh-orb" aria-hidden="true"><div className="yh-orb-core"/><span className="yh-orb-glint"/></div>
        <div className="yh-hero-copy"><div className="yh-eyebrow"><span/> A CONNECTED DIGITAL ECOSYSTEM</div>
          <h1>One ecosystem.<br/><em>More ways to</em> explore.</h1>
          <p>Discover entertainment, find useful digital tools and explore experiences designed to make your digital life more accessible.</p>
          <div className="yh-hero-actions"><a className="yh-button-primary" href="#products">Explore Yocare <ArrowRight size={17}/></a><a className="yh-button-quiet" href="#about">Get to know us <ArrowDownRight size={16}/></a></div>
          <div className="yh-hero-note"><span className="yh-note-line"/> Built around useful digital experiences</div>
        </div>
        <div className="yh-hero-caption"><span>YOCARE ECOSYSTEM</span><span>01 / 02</span></div>
      </section>
      <section className="yh-products-section" id="products">
        <div className="yh-section-heading"><div><div className="yh-eyebrow">THE ECOSYSTEM</div><h2>Explore what’s <em>possible.</em></h2></div><p>Different experiences, one connected home. Choose a Yocare product to get started.</p></div>
        <div className="yh-product-grid">{products.map((product,index)=>{const Icon=product.icon;return <article className={`yh-product-card ${product.className}`} key={product.name}>
          <div className="yh-card-top"><span>0{index+1} / PRODUCT</span><span className={product.className==='tools'?'yh-status upcoming':'yh-status'}>{product.status}</span></div>
          <div className="yh-product-art" aria-hidden="true"><div className="yh-art-ring ring-a"/><div className="yh-art-ring ring-b"/><div className="yh-art-icon"><Icon size={34} strokeWidth={1.35}/></div></div>
          <div className="yh-product-copy"><div className="yh-eyebrow">{product.eyebrow}</div><h3>{product.name}</h3><p>{product.description}</p><a className="yh-card-link" href={product.href}>{product.className==='tools'?'Discover the vision':'Explore Yocare Live'} <ArrowRight size={16}/></a></div>
        </article>})}</div>
      </section>
      <section className="yh-about" id="about"><div className="yh-about-symbol"><Compass size={28} strokeWidth={1.2}/><span>Y.</span></div><div className="yh-about-copy"><div className="yh-eyebrow">A LITTLE ABOUT US</div><h2>Technology should open<br/><em>more possibilities.</em></h2><p>Yocare is an evolving digital ecosystem bringing useful experiences together. We build focused products that help people discover, create and get more from the tools and content around them.</p></div><div className="yh-about-aside"><Sparkles size={18}/><span>Thoughtful experiences.<br/>Useful by design.</span></div></section>
    </main>
    <footer className="yh-footer"><a className="yh-brand" href="/"><span className="yh-brand-mark">Y</span><span>yocare<span className="yh-brand-period">.</span></span></a><span className="yh-footer-tagline">A connected digital ecosystem.</span><div className="yh-footer-links"><a href="/live">Yocare Live</a><a href="/tools">Yocare Tools</a><a href="mailto:hello@yocare.online">Contact</a></div><span className="yh-copyright">© {new Date().getFullYear()} Yocare</span></footer>
  </div>;
};
