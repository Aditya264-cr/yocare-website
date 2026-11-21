import React,{useEffect,useMemo,useRef,useState}from'react';
import{ArrowLeft,ArrowRight,ExternalLink,Globe,Home,Lock,RefreshCw,Search,ShieldAlert,Film}from'lucide-react';

const HOME='https://duckduckgo.com/';
const SOURCE_HOME=(import.meta.env.VITE_YOCARE_BROWSER_HOME_URL as string|undefined)||'https://net77.cc/home';
function resolveAddress(value:string):string{
 const input=value.trim();if(!input)return HOME;
 if(input.startsWith('https://')||input.startsWith('http://')){const u=new URL(input);if(u.protocol!=='https:'&&u.protocol!=='http:')throw Error('Only HTTP and HTTPS pages can be opened.');return u.href;}
 if(input.includes('.')&&!input.includes(' '))return 'https://'+input;
 return 'https://duckduckgo.com/?q='+encodeURIComponent(input);
}
export const YocareBrowser:React.FC=()=>{
 const params=new URLSearchParams(window.location.search);
 const requestedTitle=params.get('title')||'';
 const initialSource=params.get('source')||SOURCE_HOME;
 const [address,setAddress]=useState(initialSource),[history,setHistory]=useState<string[]>([initialSource]),[index,setIndex]=useState(0),[failed,setFailed]=useState(false);
 const frame=useRef<HTMLIFrameElement>(null);const current=history[index]||HOME;
 const host=useMemo(()=>{try{return new URL(current).hostname}catch{return 'Web'}},[current]);
 useEffect(()=>{setAddress(current);setFailed(false)},[current]);
 const navigate=(raw:string)=>{try{const next=resolveAddress(raw);setHistory(old=>[...old.slice(0,index+1),next]);setIndex(index+1)}catch{setFailed(true)}};
 const go=(e:React.FormEvent)=>{e.preventDefault();navigate(address)};
 const back=()=>setIndex(i=>Math.max(0,i-1)),forward=()=>setIndex(i=>Math.min(history.length-1,i+1));
 const reload=()=>{setFailed(false);if(frame.current)frame.current.src=current};
 const openSource=()=>navigate(SOURCE_HOME);
 const copyTitle=async()=>{try{await navigator.clipboard.writeText(requestedTitle)}catch{setAddress(requestedTitle)}};
 return <div className="yb-app">
  <header className="yb-top"><a href="/movies" className="yb-brand"><span className="yb-mark">Y</span><span>yocare <i>browser</i></span></a><span className="yb-caption">A web experience inside Yocare</span><a href="/movies" className="yb-exit">Movies & Series</a></header>
  <main className="yb-main">
   <section className="yb-welcome"><span className="yb-kicker"><Globe size={14}/> YOCARE WEB</span><h1>The web, <em>within reach.</em></h1><p>Continue from a movie or series selection, or enter a website address. Sites control whether their pages can be embedded.</p></section>
   {requestedTitle?<section className="yb-handoff"><div><span className="yb-kicker"><Film size={13}/> SELECTED IN YOCARE</span><h2>{requestedTitle}</h2><p>The source page is open below. Use its own catalogue search to locate this title.</p></div><button type="button" onClick={copyTitle}><Search size={15}/> Copy title for source search</button><button type="button" onClick={openSource}>Open source home <ExternalLink size={14}/></button></section>:null}
   <form className="yb-toolbar" onSubmit={go}>
    <button type="button" aria-label="Back" onClick={back} disabled={index===0}><ArrowLeft/></button><button type="button" aria-label="Forward" onClick={forward} disabled={index>=history.length-1}><ArrowRight/></button><button type="button" aria-label="Home" onClick={()=>navigate(HOME)}><Home/></button>
    <label className="yb-address"><Lock size={14}/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Search or enter website address"/></label>
    <button type="submit" className="yb-go" aria-label="Go"><Search size={17}/></button><button type="button" aria-label="Reload" onClick={reload}><RefreshCw size={16}/></button>
   </form>
   <div className="yb-page-meta"><span><span className="yb-dot"/> {host}</span><a href={current} target="_blank" rel="noopener noreferrer">Open in new tab <ExternalLink size={13}/></a></div>
   <section className="yb-viewport"><iframe ref={frame} key={current} src={current} title="Yocare Browser webpage" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" allow="fullscreen; autoplay; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" onError={()=>setFailed(true)}/>
    {failed?<div className="yb-blocked"><ShieldAlert size={25}/><h2>This page can't be displayed here</h2><p>The website may block embedded browsers or require its own secure login, cookies or playback environment. Yocare cannot override those restrictions.</p><a href={current} target="_blank" rel="noopener noreferrer">Continue in browser tab <ExternalLink size={15}/></a></div>:null}
   </section>
   <p className="yb-footnote">Yocare currently passes the selected title to this browser but does not submit searches inside third-party pages or extract their media streams. Cross-origin browser isolation and site restrictions prevent Yocare from controlling arbitrary page internals. Playback must use a source-authorised integration.</p>
  </main>
  <style>{`.yb-handoff{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 17px;padding:15px 17px;border:1px solid #ffffff20;border-radius:13px;background:#11141a}.yb-handoff>div{flex:1;min-width:190px}.yb-handoff h2{margin:6px 0;font-size:20px}.yb-handoff p{margin:0;color:#9ca3ad;font-size:11px}.yb-handoff button{display:inline-flex;align-items:center;gap:7px;padding:10px 12px;border:1px solid #ffffff24;border-radius:8px;background:#1a1f26;color:#f2f3f4;font-size:11px;cursor:pointer}`}</style>
 </div>
};
