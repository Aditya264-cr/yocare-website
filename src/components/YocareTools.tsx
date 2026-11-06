import React from 'react';
import { ArrowLeft, ArrowRight, Blocks, Clock3, Sparkles } from 'lucide-react';
export const YocareTools: React.FC = () => <main className="yocare-tools-page">
  <header className="ytp-header"><a className="ytp-brand" href="/"><img className="ytp-brand-symbol" src="/yocare-mark.svg" alt="" aria-hidden="true" /><span>yocare</span></a><a href="/" className="ytp-back"><ArrowLeft size={15}/> Ecosystem home</a></header>
  <section className="ytp-main"><div className="ytp-glow" aria-hidden="true"/><div className="ytp-icon"><Blocks size={34}/></div><div className="ytp-kicker"><span/> THE NEXT YOCARE EXPERIENCE</div>
    <h1>Useful tools.<br/><em>Flexible access.</em></h1><p>Find digital tools for the work you need to get done. We’re exploring affordable, task-friendly access through authorized providers and services.</p>
    <div className="ytp-coming"><Clock3 size={16}/> Yocare Tools is coming soon</div><a className="ytp-link" href="mailto:hello@yocare.online?subject=Yocare%20Tools%20early%20interest">Share your interest <ArrowRight size={16}/></a><div className="ytp-note"><Sparkles size={15}/> Built around access that works for you.</div>
  </section><footer className="ytp-footer"><span>© {new Date().getFullYear()} Yocare</span><a href="/">Back to Yocare home</a></footer>
</main>;
