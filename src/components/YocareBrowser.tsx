import React,{useMemo,useState}from'react';
import{ExternalLink,Globe,Film,Search,ShieldCheck,RefreshCw,ArrowLeft}from'lucide-react';

const SOURCE_HOME=(import.meta.env.VITE_YOCARE_BROWSER_HOME_URL as string|undefined)||'https://net77.cc/home';
type Session={sessionId:string;liveViewUrl:string;expiresInMs:number};
export const YocareBrowser:React.FC=()=>{
 const params=new URLSearchParams(window.location.search);
 const requestedTitle=params.get('title')||'';
 const [address,setAddress]=useState(params.get('source')||SOURCE_HOME);
 const [session,setSession]=useState<Session|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [embedFailed,setEmbedFailed]=useState(false);
 const host=useMemo(()=>{try{return new URL(address).hostname}catch{return 'Web'}},[address]);
 const startSession=async(e?:React.FormEvent)=>{
  e?.preventDefault();setBusy(true);setError('');setSession(null);setEmbedFailed(false);
  try{
   const target=new URL(address);
   if(!['https:','http:'].includes(target.protocol))throw new Error('Only HTTP and HTTPS websites are supported.');
   const response=await fetch('/api/browser/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:target.toString()})});
   const data=await response.json() as Session&{message?:string};
   if(!response.ok)throw new Error(data.message||'Yocare could not start the remote browser.');
   if(!data.liveViewUrl?.startsWith('https://live.browser.run/'))throw new Error('The remote browser returned an invalid viewing address.');
   setSession(data);
  }catch(err){setError(err instanceof Error?err.message:'Could not start browser session.');}
  finally{setBusy(false);}
 };
 const copyTitle=async()=>{try{await navigator.clipboard.writeText(requestedTitle)}catch{setError('Clipboard access is unavailable. You can select and copy the title manually.')}};
 return <div className="yb-app">
  <header className="yb-top"><a href="/movies" className="yb-brand"><span className="yb-mark">Y</span><span>yocare <i>browser</i></span></a><span className="yb-caption">Cloud browser session</span><a href="/movies" className="yb-exit">Movies & Series</a></header>
  <main className="yb-main">
   <section className="yb-welcome"><span className="yb-kicker"><Globe size={14}/> YOCARE WEB</span><h1>Your browser, <em>remotely.</em></h1><p>Yocare starts a real Chromium browser session on Cloudflare Browser Run. The source website is rendered by that browser, not embedded as a third-party page in Yocare.</p></section>
   {requestedTitle?<section className="yb-handoff"><div><span className="yb-kicker"><Film size={13}/> SELECTED IN YOCARE</span><h2>{requestedTitle}</h2><p>Copy the title into the source website's own search if needed.</p></div><button type="button" onClick={copyTitle}><Search size={15}/> Copy title</button></section>:null}
   <form className="yb-toolbar" onSubmit={startSession}>
    <label className="yb-address"><Globe size={14}/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Enter an allowed website address"/></label>
    <button type="submit" className="yb-go" disabled={busy}>{busy?<RefreshCw className="yb-spin" size={16}/>:<Search size={17}/>} {busy?'Starting…':'Start browser'}</button>
   </form>
   {error?<div className="yb-error" role="alert">{error}</div>:null}
   {!session?<section className="yb-empty"><Globe size={30}/><h2>{busy?'Starting your browser session':'Ready to open a remote browser'}</h2><p>{busy?'Cloudflare is creating a temporary Chromium session and loading '+host+'.':'Press Start browser to launch a separate remote browser. It can display sites that refuse ordinary iframe embedding, subject to their own access and security rules.'}</p><small>Sessions are temporary and may incur Cloudflare Browser Run usage charges.</small></section>:<section className="yb-session">
    <div className="yb-sessionbar"><span><span className="yb-dot"/> Remote session active</span><span>{host}</span><a href={session.liveViewUrl} target="_blank" rel="noopener noreferrer">Open full view <ExternalLink size={13}/></a></div>
    {!embedFailed?<iframe title="Yocare remote browser session" src={session.liveViewUrl} allow="clipboard-read; clipboard-write; fullscreen" onError={()=>setEmbedFailed(true)}/>:null}
    <div className="yb-sessionactions"><a href={session.liveViewUrl} target="_blank" rel="noopener noreferrer">Open remote browser <ExternalLink size={14}/></a><button type="button" onClick={()=>startSession()}> <RefreshCw size={14}/> New session</button></div>
    <p className="yb-sessionnote"><ShieldCheck size={14}/> The remote browser handles normal website navigation and security checks. It does not bypass login, CAPTCHA, DRM, paywalls or a site's access restrictions.</p>
   </section>}
   <a className="yb-back" href="/movies"><ArrowLeft size={14}/> Back to Movies & Series</a>
  </main>
  <style>{`.yb-handoff{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 17px;padding:15px 17px;border:1px solid #ffffff20;border-radius:13px;background:#11141a}.yb-handoff>div{flex:1;min-width:190px}.yb-handoff h2{margin:6px 0;font-size:20px}.yb-handoff p{margin:0;color:#9ca3ad;font-size:11px}.yb-handoff button,.yb-sessionactions button{display:inline-flex;align-items:center;gap:7px;padding:10px 12px;border:1px solid #ffffff24;border-radius:8px;background:#1a1f26;color:#f2f3f4;font-size:11px;cursor:pointer}.yb-empty{min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;border:1px solid #ffffff1c;border-radius:14px;background:#0d1015;color:#c7ccd4}.yb-empty h2{margin:15px 0 6px;color:#fff}.yb-empty p{max-width:560px;color:#9ca3ad;font-size:13px;line-height:1.6}.yb-empty small,.yb-sessionnote{color:#7e8793;font-size:11px}.yb-error{margin:12px 0;padding:12px;border:1px solid #a33a3a66;border-radius:9px;color:#ffb5b5;background:#35171766;font-size:12px}.yb-session{overflow:hidden;border:1px solid #ffffff20;border-radius:13px;background:#0b0d11}.yb-sessionbar,.yb-sessionactions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:11px 14px;color:#aeb5bf;font-size:11px}.yb-sessionbar a,.yb-sessionactions a,.yb-back{display:inline-flex;align-items:center;gap:6px;color:#e8edf5;text-decoration:none}.yb-session iframe{display:block;width:100%;height:min(72vh,760px);min-height:420px;border:0;background:#090b0f}.yb-sessionnote{display:flex;align-items:center;gap:7px;margin:0;padding:0 14px 14px}.yb-back{margin-top:16px;font-size:12px}.yb-spin{animation:ybspin 1s linear infinite}@keyframes ybspin{to{transform:rotate(360deg)}}`}</style>
 </div>;
};
