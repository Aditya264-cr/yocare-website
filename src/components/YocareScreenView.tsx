import React,{useEffect,useRef,useState}from'react';
import{ArrowLeft,ExternalLink,MonitorPlay,Play,Square,Volume2,Maximize2,ShieldCheck}from'lucide-react';

export const YocareScreenView:React.FC=()=>{
 const videoRef=useRef<HTMLVideoElement>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const [sharing,setSharing]=useState(false);
 const [error,setError]=useState('');
 const [source,setSource]=useState('No screen is being shared');
 const stop=()=>{
  streamRef.current?.getTracks().forEach(track=>track.stop());
  streamRef.current=null;
  if(videoRef.current)videoRef.current.srcObject=null;
  setSharing(false);setSource('No screen is being shared');
 };
 const start=async()=>{
  setError('');
  if(!navigator.mediaDevices?.getDisplayMedia){setError('Screen sharing is not supported in this browser. Try the latest Chrome or Edge on desktop.');return;}
  try{
   const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
   streamRef.current=stream;
   if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play().catch(()=>{});}
   const track=stream.getVideoTracks()[0];
   const label=track?.getSettings().displaySurface||'shared screen';
   setSource(label==='browser'?'Browser tab':label==='window'?'Application window':label==='monitor'?'Entire screen':'Shared screen');
   setSharing(true);
   track?.addEventListener('ended',stop,{once:true});
  }catch(e){
   const err=e as DOMException;
   if(err.name==='NotAllowedError')setError('Screen sharing was cancelled or permission was not granted.');
   else setError(err.message||'Could not start screen sharing. Please try again.');
  }
 };
 useEffect(()=>()=>{streamRef.current?.getTracks().forEach(t=>t.stop())},[]);
 const fullscreen=()=>{const el=videoRef.current as (HTMLVideoElement&{requestFullscreen?:()=>Promise<void>})|null;el?.requestFullscreen?.().catch(()=>{});};
 return <main className="ysv-page">
  <header className="ysv-nav"><a href="/movies/browser" className="ysv-back"><ArrowLeft size={17}/> Browser</a><div className="ysv-brand"><span>Y</span> yocare <i>screen</i></div><a href="/movies" className="ysv-exit">Movies & Series</a></header>
  <section className="ysv-content">
   <div className="ysv-intro"><span className="ysv-kicker"><MonitorPlay size={14}/> YOCARE SCREEN VIEW</span><h1>Your screen.<br/><em>Inside Yocare.</em></h1><p>Share a browser tab, app window or screen and view it in Yocare’s cinematic player. You stay in control of what is shared.</p></div>
   <div className="ysv-stage">
    <video ref={videoRef} autoPlay playsInline controls muted={false}/>
    {!sharing&&<div className="ysv-empty"><div className="ysv-icon"><MonitorPlay size={32}/></div><h2>Ready when you are</h2><p>Open your chosen streaming service in another tab. Then start sharing and select that tab in your browser’s share picker.</p></div>}
    {sharing&&<div className="ysv-stage-tools"><span><i/> LIVE SCREEN</span><button onClick={fullscreen} aria-label="Fullscreen"><Maximize2 size={16}/></button></div>}
   </div>
   <div className="ysv-controls">
    {!sharing?<button className="ysv-start" onClick={start}><Play size={17} fill="currentColor"/> Start screen sharing</button>:<button className="ysv-stop" onClick={stop}><Square size={15} fill="currentColor"/> Stop sharing</button>}
    <span className="ysv-source"><Volume2 size={15}/>{source}</span>
   </div>
   {error&&<p className="ysv-error" role="alert">{error}</p>}
   <div className="ysv-guide"><div><ShieldCheck size={18}/><strong>Private by design</strong></div><p>Yocare displays the live screen stream locally in this tab. It does not record, upload or save the shared screen. Your browser asks you to choose what to share, and you can stop at any time.</p><p>Some services use protected video playback. Their browser may prevent the video from appearing in a shared capture. Yocare cannot remove that restriction or bypass DRM. Use the service’s official app or website when screen capture is blocked.</p></div>
   <a className="ysv-open" href="/movies/agent">Find where a title is available <ExternalLink size={14}/></a>
  </section>
  <style>{`
  .ysv-page{min-height:100vh;background:#08090c;color:#f5f5f6;font-family:inherit}.ysv-nav{height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(18px,5vw,70px);border-bottom:1px solid #ffffff15}.ysv-back,.ysv-exit{display:flex;align-items:center;gap:7px;color:#c5c7cc;text-decoration:none;font-size:12px}.ysv-brand{display:flex;align-items:center;gap:7px;font-size:15px;font-weight:750;letter-spacing:-.04em}.ysv-brand span{display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:linear-gradient(135deg,#d7f4a9,#76d9c1);color:#10130f;font-weight:900}.ysv-brand i{color:#9ca2aa;font-style:normal;font-weight:450}.ysv-content{width:min(1100px,calc(100% - 36px));margin:auto;padding:45px 0 70px}.ysv-intro{margin-bottom:25px}.ysv-kicker{display:flex;align-items:center;gap:7px;color:#c8e8a5;font-size:10px;font-weight:800;letter-spacing:.15em}.ysv-intro h1{margin:15px 0 10px;font-size:clamp(38px,6vw,65px);line-height:.98;letter-spacing:-.065em}.ysv-intro h1 em{color:#c8e8a5;font-style:normal}.ysv-intro>p{max-width:590px;color:#a2a6af;font-size:14px;line-height:1.7}.ysv-stage{position:relative;display:grid;place-items:center;overflow:hidden;min-height:clamp(230px,55vw,600px);aspect-ratio:16/9;border:1px solid #ffffff20;border-radius:17px;background:radial-gradient(ellipse at 50% 40%,#1c2027,#08090c 72%)}.ysv-stage video{width:100%;height:100%;max-height:72vh;object-fit:contain;background:#000}.ysv-empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:25px;text-align:center}.ysv-icon{display:grid;place-items:center;width:62px;height:62px;border:1px solid #ffffff20;border-radius:18px;color:#d7edbc;background:#ffffff08}.ysv-empty h2{margin:17px 0 5px;font-size:19px}.ysv-empty p{max-width:490px;margin:0;color:#969da7;font-size:12px;line-height:1.7}.ysv-stage-tools{position:absolute;top:13px;right:13px;display:flex;align-items:center;gap:9px}.ysv-stage-tools span{padding:7px 9px;border-radius:6px;background:#08090ccc;color:#fff;font-size:9px;letter-spacing:.1em}.ysv-stage-tools i{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:#d7edbc}.ysv-stage-tools button{display:grid;place-items:center;width:32px;height:32px;border:1px solid #ffffff25;border-radius:8px;background:#08090ccc;color:#fff}.ysv-controls{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:15px 0}.ysv-start,.ysv-stop{display:flex;align-items:center;gap:9px;padding:12px 17px;border:0;border-radius:999px;background:#e9f3dc;color:#11160d;font-size:12px;font-weight:750;cursor:pointer}.ysv-stop{background:#ffffff12;color:#f2f2f3;border:1px solid #ffffff25}.ysv-source{display:flex;align-items:center;gap:7px;color:#a3a9b1;font-size:11px}.ysv-error{padding:12px 14px;border:1px solid #bd766955;border-radius:9px;color:#ffc4b5;font-size:12px}.ysv-guide{margin-top:20px;padding:19px 20px;border:1px solid #ffffff17;border-radius:13px;background:#111319}.ysv-guide>div{display:flex;align-items:center;gap:8px;color:#d8edbd;font-size:13px}.ysv-guide p{margin:10px 0 0;color:#a0a5ae;font-size:11px;line-height:1.75}.ysv-open{display:inline-flex;align-items:center;gap:7px;margin-top:20px;color:#d7edbc;text-decoration:none;font-size:12px}@media(max-width:600px){.ysv-content{padding-top:30px}.ysv-nav{height:60px}.ysv-stage{border-radius:10px}.ysv-controls{align-items:flex-start;flex-direction:column}.ysv-source{font-size:10px}} `}</style>
 </main>;
};
