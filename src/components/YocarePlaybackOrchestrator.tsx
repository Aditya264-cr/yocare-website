import React,{useEffect,useState}from'react';
import{ArrowLeft,ExternalLink,Film,Globe,LoaderCircle,Play,ShieldCheck,Tv}from'lucide-react';
import{MoviesPlayer}from'./MoviesPlayer';

type Media='movie'|'tv';
type Provider={provider_id:number;provider_name:string;logo_path?:string};
type Availability={link?:string;flatrate?:Provider[];rent?:Provider[];buy?:Provider[]};
type Resolution={rightsVerified?:boolean;playbackUrl?:string;message?:string;error?:string};
const KEY=import.meta.env.VITE_TMDB_API_KEY as string|undefined;
const API='https://api.themoviedb.org/3';
const IMAGE='https://image.tmdb.org/t/p/w92';
const labels=[['flatrate','Stream'],['rent','Rent'],['buy','Buy']] as const;

export const YocarePlaybackOrchestrator:React.FC=()=>{
 const params=new URLSearchParams(window.location.search);
 const id=params.get('tmdb_id')||'',media=(params.get('media_type')==='tv'?'tv':'movie') as Media,region=params.get('region')||'IN',title=params.get('title')||'Selected title';
 const [phase,setPhase]=useState<'checking'|'ready'|'playing'|'error'>('checking');
 const [message,setMessage]=useState('Checking whether an authorized in-app playback session is available.');
 const [availability,setAvailability]=useState<Availability|null>(null);
 const [playback,setPlayback]=useState('');
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  const run=async()=>{
   if(!id||!/^\d+$/.test(id)){setPhase('error');setMessage('The selected title is missing. Return to Movies and choose a title again.');return;}
   const jobs:Promise<void>[]=[];
   jobs.push((async()=>{
    try{
     const endpoint=new URL('/api/movies/playback',window.location.origin);
     endpoint.searchParams.set('tmdb_id',id);endpoint.searchParams.set('media_type',media);endpoint.searchParams.set('region',region);
     const response=await fetch(endpoint.toString(),{headers:{Accept:'application/json'}});
     const type=response.headers.get('content-type')||'';
     if(!type.toLowerCase().includes('application/json'))throw Error('The playback service returned an invalid response.');
     const data=await response.json() as Resolution;
     if(data.rightsVerified===true&&data.playbackUrl){
      const stream=new URL(data.playbackUrl);
      if(stream.protocol!=='https:')throw Error('The provider returned an insecure playback address.');
      if(active){setPlayback(stream.href);setPhase('playing');setMessage('Authorized playback session ready.');}
     }else if(active){setPhase('ready');setMessage(data.message||'No authorized in-app playback session is connected for this title yet.');}
    }catch(e){if(active){setPhase('ready');setMessage(e instanceof Error?e.message:'Playback could not be checked.');}}
   })());
   jobs.push((async()=>{
    try{
     if(!KEY)throw Error('Catalogue configuration is missing.');
     const r=await fetch(API+'/'+media+'/'+id+'/watch/providers?api_key='+encodeURIComponent(KEY));
     if(!r.ok)throw Error('Availability lookup failed.');
     const data=await r.json() as {results?:Record<string,Availability>};
     if(active)setAvailability(data.results?.[region]||null);
    }catch(e){if(active)setError(e instanceof Error?e.message:'Provider availability could not be checked.');}
   })());
   await Promise.all(jobs);
  };
  void run();
  return()=>{active=false};
 },[id,media,region,retry]);
 return <main className="ypo-page">
  <header className="ypo-nav"><a href="/movies" className="ypo-brand"><span>Y</span> yocare <i>movies</i></a><nav><a href="/movies"><Film size={15}/> Movies</a><a href="/movies/agent"><Globe size={15}/> Search Agent</a><a href="/live"><Tv size={15}/> Live TV</a></nav></header>
  <section className="ypo-main">
   <a href="/movies" className="ypo-back"><ArrowLeft size={15}/> Back to Movies</a>
   <div className="ypo-heading"><span>YOCARE PLAYBACK ORCHESTRATOR</span><h1>{title}</h1><p>One viewing experience. Yocare checks permitted playback sources and prepares the best available way to watch.</p></div>
   <section className="ypo-stage">
    {phase==='playing'&&playback?<MoviesPlayer src={playback} title={title} onClose={()=>{setPlayback('');setPhase('ready');setMessage('Playback session closed.')}}/>:<div className="ypo-stage-empty">
     {phase==='checking'?<LoaderCircle className="ypo-spin" size={30}/>:phase==='error'?<Film size={30}/>:<Play size={30}/>}
     <h2>{phase==='checking'?'Preparing your viewing session':phase==='error'?'Unable to open this title':'Yocare player is ready'}</h2>
     <p>{message}</p>
     {phase==='ready'?<><span className="ypo-ready"><ShieldCheck size={14}/> No third-party stream is loaded without a verified playback session</span><button className="ypo-retry" type="button" onClick={()=>{setPhase('checking');setMessage('Checking for an authorized playback session again.');setRetry(n=>n+1)}}>Check again</button></>:null}
    </div>}
   </section>
   <section className="ypo-source-panel">
    <div className="ypo-source-intro"><span>PLAYBACK SOURCES</span><h2>Where this title is available</h2><p>Yocare checks its authorized playback connection first. If a provider does not support in-app playback, you can continue through its official viewing options.</p></div>
    <div className="ypo-options">
     {labels.map(([key,label])=>availability?.[key]?.length?<div className="ypo-option-group" key={key}><h3>{label}</h3><div>{availability[key]!.map(provider=><span className="ypo-provider" key={provider.provider_id}>{provider.logo_path?<img src={IMAGE+provider.logo_path} alt=""/>:null}{provider.provider_name}</span>)}</div></div>:null)}
     {availability?.link?<a className="ypo-official" href={availability.link} target="_blank" rel="noopener noreferrer">Continue to official watch options <ExternalLink size={14}/></a>:<p className="ypo-no-options">{error||'No provider availability is currently listed for this region.'}</p>}
    </div>
   </section>
   <p className="ypo-note">Provider availability is catalogue information, not a playback authorization. In-app playback starts only when a connected distributor verifies the title, territory and viewer entitlement and returns a short-lived playback session. Some providers require their own app or website.</p>
  </section>
  <style>{`
  .ypo-page{min-height:100vh;background:#08090d;color:#f5f5f6;font-family:"DM Sans",Arial,sans-serif}.ypo-nav{height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px,5vw,68px);border-bottom:1px solid #ffffff14}.ypo-brand{display:flex;align-items:center;gap:9px;color:#fff;text-decoration:none;font-size:17px;font-weight:750}.ypo-brand span{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:linear-gradient(145deg,#eff4e8,#9dbd83);color:#111;font-weight:900}.ypo-brand i{font-style:normal;color:#a8abb4;font-weight:450}.ypo-nav nav{display:flex;gap:17px}.ypo-nav nav a,.ypo-back{display:flex;align-items:center;gap:7px;color:#b8bdc6;text-decoration:none;font-size:12px}.ypo-main{width:min(1120px,calc(100% - 34px));margin:auto;padding:35px 0 65px}.ypo-back{margin-bottom:25px}.ypo-heading>span,.ypo-source-intro>span{color:#c4d8aa;font-size:10px;font-weight:800;letter-spacing:.15em}.ypo-heading h1{margin:10px 0;font-size:clamp(32px,5vw,58px);letter-spacing:-.06em}.ypo-heading p,.ypo-source-intro p{max-width:650px;color:#969da8;font-size:13px;line-height:1.7}.ypo-stage{position:relative;display:grid;place-items:center;min-height:clamp(240px,48vw,590px);aspect-ratio:16/9;margin:22px 0;border:1px solid #ffffff1d;border-radius:16px;background:radial-gradient(ellipse at 50% 45%,#20252b,#08090d 72%);overflow:hidden}.ypo-stage-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;padding:25px;text-align:center}.ypo-stage-empty>svg{color:#d8edbd}.ypo-stage-empty h2{margin:17px 0 6px;font-size:20px}.ypo-stage-empty p{max-width:550px;color:#a0a6b0;font-size:12px;line-height:1.7}.ypo-ready{display:flex;align-items:center;gap:7px;margin-top:10px;color:#c8dcb2;font-size:10px}.ypo-retry{margin-top:14px;padding:9px 14px;border:1px solid #ffffff30;border-radius:8px;background:#171c22;color:#f3f4f5;font-size:11px;cursor:pointer}.ypo-spin{animation:ypo-spin 1s linear infinite}@keyframes ypo-spin{to{transform:rotate(360deg)}}.ypo-source-panel{display:grid;grid-template-columns:minmax(210px,.7fr) 1.3fr;gap:25px;padding:23px;border:1px solid #ffffff17;border-radius:15px;background:#11141a}.ypo-source-intro h2{margin:8px 0;font-size:19px}.ypo-source-intro p{font-size:11px}.ypo-options{display:grid;gap:13px;align-content:start}.ypo-option-group h3{margin:0 0 8px;color:#b9c9a5;font-size:10px;text-transform:uppercase;letter-spacing:.1em}.ypo-option-group>div{display:flex;flex-wrap:wrap;gap:7px}.ypo-provider{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #ffffff1a;border-radius:8px;color:#e0e2e6;font-size:11px}.ypo-provider img{width:19px;height:19px;border-radius:5px}.ypo-official{display:inline-flex;align-items:center;gap:7px;width:max-content;padding:10px 13px;border-radius:999px;background:#eaf2df;color:#151912;text-decoration:none;font-size:11px;font-weight:750}.ypo-no-options{color:#9299a4;font-size:11px}.ypo-note{margin-top:15px;color:#777f8a;font-size:10px;line-height:1.7}@media(max-width:650px){.ypo-nav{height:60px;padding:0 12px}.ypo-nav nav{gap:7px}.ypo-nav nav a{font-size:0}.ypo-nav nav a svg{width:17px}.ypo-main{padding-top:22px}.ypo-source-panel{grid-template-columns:1fr;padding:17px}.ypo-stage{border-radius:10px}}
  `}</style>
 </main>;
};
