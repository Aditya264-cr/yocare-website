import React from 'react';
import { ArrowLeft, ArrowRight, Blocks, Clock3, Sparkles } from 'lucide-react';
export const YocareTools: React.FC = () => <main className="yocare-tools-page">
  <header className="ytp-header"><a className="ytp-brand" href="/"><svg className="ytp-brand-symbol" viewBox="0 0 48 48" role="img" aria-label="Yocare" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="yocare-mark-gradient" x1="5" y1="5" x2="43" y2="43" gradientUnits="userSpaceOnUse"><stop stopColor="#34D399"/><stop offset=".52" stopColor="#14B8A6"/><stop offset="1" stopColor="#38BDF8"/></linearGradient></defs><path fill="url(#yocare-mark-gradient)" d="M6 7h8.2c5.5 0 9.5 2.7 12.3 7.4l2.7 4.5L39 7h8L27.4 39.1c-2 3.3-5.1 5-9.1 5H9.5l11.9-19.8L6 7Z"/></svg><span>yocare</span></a><a href="/" className="ytp-back"><ArrowLeft size={15}/> Ecosystem home</a></header>
  <section className="ytp-main"><div className="ytp-glow" aria-hidden="true"/><div className="ytp-icon"><Blocks size={34}/></div><div className="ytp-kicker"><span/> THE NEXT YOCARE EXPERIENCE</div>
    <h1>Useful tools.<br/><em>Flexible access.</em></h1><p>Find digital tools for the work you need to get done. We’re exploring affordable, task-friendly access through authorized providers and services.</p>
    <div className="ytp-coming"><Clock3 size={16}/> Yocare Tools is coming soon</div><a className="ytp-link" href="mailto:hello@yocare.online?subject=Yocare%20Tools%20early%20interest">Share your interest <ArrowRight size={16}/></a><div className="ytp-note"><Sparkles size={15}/> Built around access that works for you.</div>
  </section><footer className="ytp-footer"><span>© {new Date().getFullYear()} Yocare</span><a href="/">Back to Yocare home</a></footer>
</main>;
