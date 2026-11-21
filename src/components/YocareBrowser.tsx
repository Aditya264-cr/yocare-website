import React,{useEffect,useMemo,useRef,useState}from'react';
import{ArrowLeft,ArrowRight,ExternalLink,Globe,Home,Lock,RefreshCw,Search,ShieldAlert,MonitorPlay}from'lucide-react';

const HOME='https://duckduckgo.com/';
function resolveAddress(value:string):string{
  const input=value.trim();
  if(!input)return HOME;
  if(/^https?:\/\//i.test(input)){const u=new URL(input);if(u.protocol!=='https:'&&u.protocol!=='http:')throw Error('Only HTTP and HTTPS pages can be opened.');return u.href;}
  if(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(input))return 'https://'+input;
  return 'https://duckduckgo.com/?q='+encodeURIComponent(input);
}
export const YocareBrowser:React.FC=()=>{
 const [address,setAddress]=useState(HOME),[draft,setDraft]=useState(HOME),[history,setHistory]=useState<string[]>([HOME]),[index,setIndex]=useState(0),[failed,setFailed]=useState(false);
 const frame=useRef<HTMLIFrameElement>(null);
 const current=history[index]||HOME;
 const host=useMemo(()=>{try{return new URL(current).hostname}catch{return 'Web'}} ,[current]);
 useEffect(()=>{setAddress(current);setDraft(current);setFailed(false)},[current]);
 const navigate=(raw:string)=>{try{const next=resolveAddress(raw);setHistory(old=>[...old.slice(0,index+1),next]);setIndex(index+1);setDraft(next)}catch(e){setFailed(true)}};
 const go=(e:React.FormEvent)=>{e.preventDefault();navigate(address)};
 const back=()=>setIndex(i=>Math.max(0,i-1));
 const forward=()=>setIndex(i=>Math.min(history.length-1,i+1));
 const reload=()=>{setFailed(false);frame.current?.setAttribute('src',current)};
 return <div className="yb-app">
  <header className="yb-top"><a href="/movies" className="yb-brand"><span className="yb-mark">Y</span><span>yocare <i>browser</i></span></a><span className="yb-caption">A web experience inside Yocare</span><a href="/movies/screen" className="yb-exit"><MonitorPlay size={15}/> Screen view</a><a href="/movies" className="yb-exit">Movies & Series</a></header>
  <main className="yb-main">
   <section className="yb-welcome"><span className="yb-kicker"><Globe size={14}/> YOCARE WEB</span><h1>The web, <em>within reach.</em></h1><p>Search the web or enter a website address. Pages that allow embedding can appear here; other sites can be opened in a separate browser tab. To display a tab inside Yocare, use Screen view.</p></section>
   <form className="yb-toolbar" onSubmit={go}>
    <button type="button" aria-label="Back" onClick={back} disabled={index===0}><ArrowLeft/></button><button type="button" aria-label="Forward" onClick={forward} disabled={index>=history.length-1}><ArrowRight/></button><button type="button" aria-label="Home" onClick={()=>navigate(HOME)}><Home/></button>
    <label className="yb-address"><Lock size={14}/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Search or enter website address"/></label>
    <button type="submit" className="yb-go" aria-label="Go"><Search size={17}/></button><button type="button" aria-label="Reload" onClick={reload}><RefreshCw size={16}/></button>
   </form>
   <div className="yb-page-meta"><span><span className="yb-dot"/> {host}</span><a href={current} target="_blank" rel="noopener noreferrer">Open in new tab <ExternalLink size={13}/></a></div>
   <section className="yb-viewport">
    <iframe ref={frame} key={current} src={current} title="Yocare Browser webpage" sandbox="allow-scripts allow-same-origin allow-forms allow-presentation" allow="fullscreen; autoplay; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" onError={()=>setFailed(true)}/>
    {failed?<div className="yb-blocked"><ShieldAlert size={25}/><h2>This page can't be displayed here</h2><p>The website may block embedded browsers or require its own secure login, cookies or playback environment. Yocare cannot override those restrictions.</p><a href={current} target="_blank" rel="noopener noreferrer">Continue in browser tab <ExternalLink size={15}/></a></div>:null}
   </section>
   <p className="yb-footnote">Some websites prevent embedding or restrict video playback in third-party frames. For those sites, open them in a new tab and use Screen view to share that tab. Protected playback restrictions still apply.</p>
  </main>
 </div>
};
