import React,{useEffect,useRef,useState}from'react';
import{ArrowLeft,ArrowRight,ExternalLink,Film,Globe,LoaderCircle,Search,Sparkles,Tv}from'lucide-react';

type Media='movie'|'tv';
type Title={id:number;media_type:Media;title?:string;name?:string;overview?:string;poster_path?:string|null;release_date?:string;first_air_date?:string;vote_average?:number};
type Provider={provider_id:number;provider_name:string;logo_path?:string};
type Availability={link?:string;flatrate?:Provider[];rent?:Provider[];buy?:Provider[]};
type Match={item:Title;availability:Availability|null;status:'checking'|'found'|'none'|'error'};
const KEY=import.meta.env.VITE_TMDB_API_KEY as string|undefined;
const API='https://api.themoviedb.org/3';
const IMAGE='https://image.tmdb.org/t/p/w342';
const name=(x:Title)=>x.title||x.name||'Untitled';
const year=(x:Title)=>(x.release_date||x.first_air_date||'').slice(0,4);
const poster=(x:Title)=>x.poster_path?IMAGE+x.poster_path:'';
async function tmdb<T>(path:string):Promise<T>{
 if(!KEY)throw Error('The movie catalogue is not configured. Add VITE_TMDB_API_KEY to the deployment environment.');
 const response=await fetch(API+path+(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(KEY));
 if(!response.ok)throw Error('Catalogue request failed ('+response.status+').');
 return response.json() as Promise<T>;
}
const groups=[['flatrate','Stream'],['rent','Rent'],['buy','Buy']] as const;
export const YocareSearchAgent:React.FC=()=>{
 const [query,setQuery]=useState(''),[region,setRegion]=useState('IN'),[matches,setMatches]=useState<Match[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[searched,setSearched]=useState(''),[filter,setFilter]=useState<'all'|Media>('all');
 const request=useRef(0);
 const runSearch=async(e?:React.FormEvent)=>{
  e?.preventDefault();const term=query.trim();if(!term)return;
  const id=++request.current;setLoading(true);setError('');setSearched(term);setMatches([]);
  try{
   const data=await tmdb<{results:Title[]}>('/search/multi?query='+encodeURIComponent(term)+'&include_adult=false&language=en-US&page=1');
   if(id!==request.current)return;
   const found=data.results.filter(x=>(x.media_type==='movie'||x.media_type==='tv')&&(filter==='all'||x.media_type===filter)).slice(0,10);
   setMatches(found.map(item=>({item,availability:null,status:'checking'})));
   const checked=await Promise.all(found.map(async item=>{
    try{const response=await tmdb<{results:Record<string,Availability>}>('/'+item.media_type+'/'+item.id+'/watch/providers');const availability=response.results?.[region]||null;return {item,availability,status:availability&&(availability.flatrate?.length||availability.rent?.length||availability.buy?.length)?'found' as const:'none' as const};}
    catch{return {item,availability:null,status:'error' as const};}
   }));
   if(id===request.current)setMatches(checked);
  }catch(err){if(id===request.current)setError(err instanceof Error?err.message:'Search failed. Please try again.');}
  finally{if(id===request.current)setLoading(false);}
 };
 useEffect(()=>{if(!searched)return;let cancelled=false;const id=++request.current;
  const refresh=async()=>{setMatches(old=>old.map(x=>({...x,status:'checking'})));const updated=await Promise.all(matches.map(async match=>{try{const d=await tmdb<{results:Record<string,Availability>}>('/'+match.item.media_type+'/'+match.item.id+'/watch/providers');const availability=d.results?.[region]||null;return {...match,availability,status:availability&&(availability.flatrate?.length||availability.rent?.length||availability.buy?.length)?'found' as const:'none' as const};}catch{return {...match,status:'error' as const};}}));if(!cancelled&&id===request.current)setMatches(updated);};
  if(matches.length&&matches.every(x=>x.status!=='checking'))void refresh();
  return()=>{cancelled=true};
 // Region changes intentionally refresh the current result set.
 },[region]);
 const total=matches.filter(x=>x.status==='found').length;
 return <div className="ya-app">
  <header className="ya-nav"><a href="/movies" className="ya-brand"><span className="ya-mark">Y</span><span>yocare <i>search agent</i></span></a><nav><a href="/movies"><Film size={15}/> Movies</a><a href="/movies/browser"><Globe size={15}/> Browser</a><a href="/live"><Tv size={15}/> Live TV</a></nav><label className="ya-region">Region <select value={region} onChange={e=>setRegion(e.target.value)}><option value="IN">India</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option></select></label></header>
  <main className="ya-main">
   <section className="ya-hero"><span className="ya-kicker"><Sparkles size={14}/> YOCARE DISCOVERY AGENT</span><h1>One search.<br/><em>Clearer choices.</em></h1><p>Tell Yocare what you want to watch. The agent searches the movie catalogue and checks reported streaming, rental and purchase availability for your region.</p>
    <form className="ya-search" onSubmit={runSearch}><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a movie or series…" aria-label="Search a movie or series"/><button disabled={loading||!query.trim()}>{loading?<><LoaderCircle className="ya-spin" size={16}/> Searching</>:<>Find availability <ArrowRight size={16}/></>}</button></form>
    <div className="ya-filters"><span>Search type</span>{(['all','movie','tv'] as const).map(x=><button type="button" key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x==='all'?'All titles':x==='movie'?'Movies':'Series'}</button>)}</div>
   </section>
   {error?<div className="ya-error">{error}</div>:null}
   {searched?<section className="ya-results"><div className="ya-results-head"><div><span className="ya-kicker">SEARCH REPORT</span><h2>Results for “{searched}”</h2><p>{loading?'Checking regional availability…':matches.length?total+' title'+(total===1?'':'s')+' with reported provider options in '+region:'No matching titles found.'}</p></div><button onClick={()=>{setSearched('');setMatches([]);setQuery('')}}>Clear <ArrowLeft size={14}/></button></div>
    {matches.length?<div className="ya-list">{matches.map(match=><article className="ya-result" key={match.item.media_type+'-'+match.item.id}><div className="ya-poster">{poster(match.item)?<img src={poster(match.item)} alt={name(match.item)} loading="lazy"/>:<Film/>}</div><div className="ya-info"><div className="ya-title-line"><div><span className="ya-type">{match.item.media_type==='tv'?'SERIES':'MOVIE'}{year(match.item)?' · '+year(match.item):''}</span><h3>{name(match.item)}</h3></div><span className={'ya-status ya-'+match.status}>{match.status==='checking'?'Checking…':match.status==='found'?'Options found':match.status==='none'?'No options listed':'Could not check'}</span></div><p className="ya-overview">{match.item.overview||'Synopsis unavailable.'}</p>
      {match.status==='checking'?<div className="ya-checkline"><LoaderCircle className="ya-spin" size={14}/> Checking providers for {region}</div>:null}
      {match.status==='found'&&match.availability?<div className="ya-provider-groups">{groups.map(([key,label])=>match.availability?.[key]?.length?<div className="ya-provider-row" key={key}><b>{label}</b><div>{match.availability[key]!.map(provider=><span className="ya-provider" key={provider.provider_id}>{provider.logo_path?<img src={'https://image.tmdb.org/t/p/w92'+provider.logo_path} alt=""/>:null}{provider.provider_name}</span>)}</div></div>:null)}{match.availability.link?<a className="ya-open-options" href={match.availability.link} target="_blank" rel="noopener noreferrer">View official watch options <ExternalLink size={14}/></a>:null}</div>:null}
      {match.status==='none'?<p className="ya-muted">No streaming, rental or purchase provider is currently listed for this title in {region}. Availability data can be incomplete or change.</p>:null}
      {match.status==='error'?<p className="ya-muted">Availability could not be checked. Try again later.</p>:null}
     </div></article>)}</div>:loading?<div className="ya-empty"><LoaderCircle className="ya-spin"/> Searching catalogue…</div>:<div className="ya-empty">No movie or series matches. Try another title or search spelling.</div>}
    <p className="ya-disclaimer">Availability is catalogue information supplied through TMDB/JustWatch. Provider names are not direct playback links; use the official watch-options page to confirm current access. Yocare does not claim a title is playable until the provider confirms it.</p>
   </section>:<section className="ya-start"><div className="ya-start-icon"><Globe size={22}/></div><div><h2>How the agent works</h2><p>Search title metadata → identify movie or series matches → check streaming, rental and purchase options by region → send you to the provider's official watch-options page.</p></div></section>}
   <footer className="ya-footer">Yocare Search Agent · Catalogue and availability data by TMDB. Not endorsed or certified by TMDB.</footer>
  </main>
 </div>
};
