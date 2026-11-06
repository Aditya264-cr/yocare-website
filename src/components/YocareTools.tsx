import React from 'react';
import { ArrowLeft, ArrowRight, Blocks, Clock3, FileText, Sparkles, WandSparkles, Workflow } from 'lucide-react';

const previewItems = [
  { icon: FileText, number: '01', title: 'Everyday productivity', description: 'Thoughtful utilities for the little tasks that take up your day.' },
  { icon: WandSparkles, number: '02', title: 'Creative workflows', description: 'Simple ways to turn ideas into something useful.' },
  { icon: Workflow, number: '03', title: 'Work, made simpler', description: 'A considered collection of tools for getting things done.' },
];

export const YocareTools: React.FC = () => (
  <main className="yocare-tools-page">
    <header className="ytp-header">
      <a className="ytp-brand" href="/" aria-label="Yocare home">
        <img className="ytp-brand-symbol" src="/yocare-logo.png" alt="" aria-hidden="true" />
        <span>yocare</span>
      </a>
      <a href="/" className="ytp-back"><ArrowLeft size={15} /> Ecosystem home</a>
    </header>

    <section className="ytp-hero">
      <div className="ytp-ambient ytp-ambient-one" aria-hidden="true" />
      <div className="ytp-ambient ytp-ambient-two" aria-hidden="true" />
      <div className="ytp-hero-copy">
        <div className="ytp-eyebrow"><span className="ytp-eyebrow-dot" /> A NEW PART OF THE YOCARE ECOSYSTEM</div>
        <div className="ytp-icon"><Blocks size={25} strokeWidth={1.7} /></div>
        <h1>Useful things.<br /><em>Made simpler.</em></h1>
        <p className="ytp-description">A thoughtful collection of digital tools is taking shape. We’re working towards simple, practical experiences that help make everyday tasks feel a little easier.</p>
        <div className="ytp-status"><span className="ytp-status-pulse" /><Clock3 size={15} /> Yocare Tools is coming soon</div>
        <a className="ytp-primary-link" href="mailto:hello@yocare.online?subject=Yocare%20Tools%20early%20access">
          Keep me in the loop <ArrowRight size={16} />
        </a>
        <span className="ytp-reassurance"><Sparkles size={14} /> Thoughtfully built. Shared when ready.</span>
      </div>

      <div className="ytp-preview" aria-label="Preview of the Yocare Tools collection">
        <div className="ytp-preview-orbit ytp-preview-orbit-a" />
        <div className="ytp-preview-orbit ytp-preview-orbit-b" />
        <div className="ytp-preview-window">
          <div className="ytp-preview-top">
            <div className="ytp-preview-brand"><img src="/yocare-logo.png" alt="" /> <strong>yocare</strong></div>
            <span className="ytp-preview-label"><i /> IN THE MAKING</span>
          </div>
          <div className="ytp-preview-heading">
            <span>THE TOOLKIT</span>
            <h2>A little more room<br />to get things done.</h2>
            <p>One thoughtful place for useful digital experiences.</p>
          </div>
          <div className="ytp-preview-list">
            {previewItems.map(({ icon: Icon, number, title, description }) => (
              <div className="ytp-preview-item" key={number}>
                <span className="ytp-preview-item-icon"><Icon size={18} strokeWidth={1.7} /></span>
                <span className="ytp-preview-item-copy"><small>{number} / IN DEVELOPMENT</small><strong>{title}</strong><span>{description}</span></span>
                <span className="ytp-preview-lock"><Clock3 size={14} /></span>
              </div>
            ))}
          </div>
          <div className="ytp-preview-foot"><span>MADE FOR EVERYDAY LIFE</span><span>YOCARE TOOLS</span></div>
        </div>
        <div className="ytp-preview-caption">A NEW WAY TO GET THINGS DONE <span>COMING SOON</span></div>
      </div>
    </section>

    <section className="ytp-bottom-note">
      <span className="ytp-bottom-mark"><img src="/yocare-logo.png" alt="" /></span>
      <div><strong>Good things take thoughtful work.</strong><p>We’re shaping Yocare Tools with care. There’s nothing to install or sign up for just yet.</p></div>
      <a href="mailto:hello@yocare.online?subject=Yocare%20Tools%20early%20access">Get in touch <ArrowRight size={15} /></a>
    </section>

    <footer className="ytp-footer"><span>© {new Date().getFullYear()} Yocare</span><span className="ytp-footer-tagline">A growing home for digital experiences.</span><a href="/">Back to Yocare home <ArrowRight size={14} /></a></footer>
  </main>
);
