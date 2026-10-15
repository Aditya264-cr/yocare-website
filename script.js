(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const progress = document.getElementById("progress-bar");
  const leaf = document.querySelector(".leaf-scroll");
  const skyCanvas = document.getElementById("living-sky");
  const ctx = skyCanvas && skyCanvas.getContext ? skyCanvas.getContext("2d", { alpha: false }) : null;
  const pointer = { x: -9999, y: -9999, active: false };
  let width = 0, height = 0, dpr = 1, particles = [], raf = 0, last = 0, lastScroll = 0;
  const skyStops = {
    morning: ["#fff9e6", "#e5f3e8", "#dcebe5"],
    afternoon: ["#e8f5ee", "#d7eaf6", "#dcece9"],
    evening: ["#246346", "#24556d", "#273a50"],
    night: ["#202344", "#182d3a", "#111c29"]
  };
  const mixHex = (a,b,t) => {
    const pa = [1,3,5].map(i => parseInt(a.slice(i,i+2),16));
    const pb = [1,3,5].map(i => parseInt(b.slice(i,i+2),16));
    return "#" + pa.map((v,i) => Math.round(v+(pb[i]-v)*t).toString(16).padStart(2,"0")).join("");
  };
  const getPeriod = () => {
    const h = new Date().getHours();
    return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : h >= 18 && h < 22 ? "evening" : "night";
  };
  let targetPeriod = getPeriod(), currentPeriod = targetPeriod, transitionAt = performance.now();
  const periodOrder = ["morning","afternoon","evening","night"];
  const particleCount = () => {
    const cores = navigator.hardwareConcurrency || 4;
    const base = width < 650 || cores < 4 ? 45 : cores >= 8 ? 130 : 85;
    return reduceMotion ? 20 : base;
  };
  const resize = () => {
    if (!skyCanvas || !ctx) return;
    width = window.innerWidth; height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    skyCanvas.width = Math.round(width*dpr); skyCanvas.height = Math.round(height*dpr);
    skyCanvas.style.width = width+"px"; skyCanvas.style.height = height+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count = particleCount();
    particles = Array.from({length:count},(_,i)=>({
      x:Math.random()*width,y:Math.random()*height,r:.45+Math.random()*1.65,
      phase:Math.random()*Math.PI*2,drift:.12+Math.random()*.45,
      speed:.08+Math.random()*.24,alpha:.18+Math.random()*.42,
      twinkle:.4+Math.random()*.6,seed:i
    }));
    draw(performance.now(), true);
  };
  const hexRgb = h => ({r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)});
  const draw = (now, staticFrame=false) => {
    if (!ctx || !width || !height) return;
    const elapsed = Math.min(1,(now-transitionAt)/90000);
    if (elapsed >= 1 && currentPeriod !== targetPeriod) currentPeriod = targetPeriod;
    const currentIndex = periodOrder.indexOf(currentPeriod);
    const targetIndex = periodOrder.indexOf(targetPeriod);
    const a = skyStops[currentPeriod], b = skyStops[targetPeriod];
    const stops = a.map((v,i)=>mixHex(v,b[i],elapsed));
    const grad = ctx.createLinearGradient(0,0,width,height);
    grad.addColorStop(0,stops[0]);grad.addColorStop(.56,stops[1]);grad.addColorStop(1,stops[2]);
    ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
    const warm = targetPeriod==="morning" || targetPeriod==="afternoon";
    const glow = ctx.createRadialGradient(width*.5,height*.3,0,width*.5,height*.3,Math.max(width,height)*.65);
    glow.addColorStop(0,warm?"rgba(255,249,220,.7)":"rgba(161,203,169,.18)");
    glow.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    const night = targetPeriod==="night", evening = targetPeriod==="evening";
    const scrollY = window.scrollY || 0;
    for(const p of particles){
      if(!staticFrame && !reduceMotion){
        p.phase += .004*p.drift;
        if(night || evening){p.y -= Math.sin(p.phase*.7)*.11;p.x += Math.cos(p.phase*.45)*.14;}
        else if(targetPeriod==="morning"){p.y -= p.speed*.12;p.x += Math.sin(p.phase)*.13;}
        else {p.x += p.speed*.22;p.y += Math.sin(p.phase)*.08;}
        if(p.y < -5)p.y=height+5;if(p.y>height+5)p.y=-5;if(p.x>width+5)p.x=-5;if(p.x < -5)p.x=width+5;
      }
      const dx=p.x-pointer.x,dy=p.y-pointer.y,dist=Math.sqrt(dx*dx+dy*dy);
      let px=p.x,py=p.y;
      if(pointer.active && dist<120 && dist>0){const push=(120-dist)/120*10;px+=dx/dist*push;py+=dy/dist*push;}
      const twinkle=night ? .38+(.62*(.5+.5*Math.sin(now*.0012+p.phase*3))) : evening ? .25+.7*(.5+.5*Math.sin(now*.001+p.phase*2)) : p.alpha;
      const alpha=(night ? .72 : evening ? .52 : warm ? .28 : .21)*twinkle;
      ctx.beginPath();ctx.arc(px,py,night?p.r*1.2:p.r,0,Math.PI*2);
      ctx.fillStyle=night?"rgba(255,250,226,"+alpha+")":evening?"rgba(231,247,212,"+alpha+")":targetPeriod==="morning"?"rgba(219,184,102,"+alpha+")":"rgba(255,255,255,"+alpha+")";
      if(evening || night){ctx.shadowBlur=evening?7:3;ctx.shadowColor=evening?"#c8e8a6":"#f8f4d9";}
      ctx.fill();ctx.shadowBlur=0;
    }
    if(night){
      ctx.strokeStyle="rgba(229,231,255,.13)";ctx.lineWidth=.7;
      const groups=[[{x:.18,y:.19},{x:.23,y:.14},{x:.28,y:.2}],[{x:.77,y:.2},{x:.81,y:.26},{x:.86,y:.18}],[{x:.65,y:.62},{x:.69,y:.57},{x:.73,y:.64}]];
      groups.forEach(g=>{ctx.beginPath();ctx.moveTo(g[0].x*width,g[0].y*height);g.slice(1).forEach(pt=>ctx.lineTo(pt.x*width,pt.y*height));ctx.stroke();});
    }
    if(!staticFrame && !reduceMotion) raf=requestAnimationFrame(draw);
  };
  const checkPeriod = () => {const next=getPeriod();if(next!==targetPeriod){currentPeriod=targetPeriod;targetPeriod=next;transitionAt=performance.now();const v=document.querySelector(".sky-vignette");if(v)v.classList.toggle("dusk",next==="evening"||next==="night");}};
  if(skyCanvas && ctx){resize();window.addEventListener("resize",resize,{passive:true});if(!reduceMotion)raf=requestAnimationFrame(draw);setInterval(checkPeriod,60000);}
  window.addEventListener("pointermove",e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointer.active=true;},{passive:true});
  window.addEventListener("pointerleave",()=>{pointer.active=false;});
  let scrollScheduled=false;
  const updateScroll=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;if(progress)progress.style.width=(max>0?Math.min(100,window.scrollY/max*100):0)+"%";if(leaf)leaf.classList.toggle("hidden",window.scrollY>50);scrollScheduled=false;};
  window.addEventListener("scroll",()=>{if(!scrollScheduled){scrollScheduled=true;requestAnimationFrame(updateScroll);}},{passive:true});updateScroll();
  const revealEls=[...document.querySelectorAll(".reveal")];
  if(reduceMotion || !("IntersectionObserver" in window)){revealEls.forEach(el=>el.classList.add("visible"));}
  else {const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");revealObserver.unobserve(entry.target);}}),{threshold:.16,rootMargin:"0px 0px -25px 0px"});revealEls.forEach((el,i)=>{if(i%3===1)el.style.transitionDelay=".1s";if(i%3===2)el.style.transitionDelay=".18s";revealObserver.observe(el);});}
  if(!coarsePointer && window.matchMedia("(hover:hover)").matches){
    const ring=document.querySelector(".cursor-ring"),dot=document.querySelector(".cursor-dot");
    let mx=-100,my=-100,rx=-100,ry=-100,cr=0,cd=0;
    window.addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY;ring.style.opacity="1";dot.style.opacity="1";},{passive:true});
    const cursorFrame=()=>{rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.transform="translate3d("+(rx-17)+"px,"+(ry-17)+"px,0)";dot.style.transform="translate3d("+(mx-2.5)+"px,"+(my-2.5)+"px,0)";cr=requestAnimationFrame(cursorFrame);};
    cursorFrame();
    document.querySelectorAll("a,button,input,[data-aura]").forEach(el=>{
      el.addEventListener("pointerenter",()=>{ring.classList.add("hover");if(el.matches("[data-aura]")){ring.classList.add("aura-hover");ring.classList.remove("hover");ring.querySelector("span").style.display="block";dot.classList.add("hide");}else if(el.matches("p,h1,h2,h3,span")){ring.classList.add("text-hover");}},{passive:true});
      el.addEventListener("pointerleave",()=>{ring.classList.remove("hover","aura-hover","text-hover");ring.querySelector("span").style.display="none";dot.classList.remove("hide");},{passive:true});
    });
    window.addEventListener("pointerdown",e=>{ring.classList.remove("burst");void ring.offsetWidth;ring.classList.add("burst");const ripple=document.createElement("span");ripple.className="tap-ripple";ripple.style.left=e.clientX+"px";ripple.style.top=e.clientY+"px";document.body.appendChild(ripple);setTimeout(()=>ripple.remove(),650);});
    window.addEventListener("pointerleave",()=>{ring.style.opacity="0";dot.style.opacity="0";});
    window.addEventListener("pointerenter",()=>{ring.style.opacity="1";dot.style.opacity="1";});
  }
  const send=document.getElementById("aura-send"),input=document.getElementById("aura-message"),response=document.getElementById("aura-response");
  const sendDemo=()=>{if(!input||!response)return;const value=input.value.trim();if(!value){response.textContent="You can start with a single word, or leave the page quiet for now.";return;}response.textContent="Thank you for putting that into words. This demo isn't connected to a live AI, so your message hasn't been sent anywhere.";input.value="";};
  if(send)send.addEventListener("click",sendDemo);if(input)input.addEventListener("keydown",e=>{if(e.key==="Enter")sendDemo();});
  // Optional generated ambient tone. It is silent until the user explicitly enables it.
  const soundButton=document.getElementById("sound-toggle");let audioCtx=null,master=null,oscillators=[];
  const setSound=async enabled=>{
    if(!soundButton)return;
    if(enabled){
      try{
        const AudioContextClass=window.AudioContext||window.webkitAudioContext;
        if(!AudioContextClass)throw new Error("Audio is unavailable");
        audioCtx=audioCtx||new AudioContextClass();await audioCtx.resume();
        if(!master){master=audioCtx.createGain();master.gain.value=0;master.connect(audioCtx.destination);[110,164.81,220].forEach((freq,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type="sine";osc.frequency.value=freq;gain.gain.value=[.035,.018,.01][i];osc.connect(gain);gain.connect(master);osc.start();oscillators.push(osc);});}
        master.gain.cancelScheduledValues(audioCtx.currentTime);master.gain.setTargetAtTime(.12,audioCtx.currentTime,.8);soundButton.setAttribute("aria-pressed","true");soundButton.innerHTML='<span class="sound-icon">♫</span><span>Sound on</span>';soundButton.setAttribute("aria-label","Turn ambient tone off");
      }catch(e){soundButton.innerHTML='<span class="sound-icon">♫</span><span>Unavailable</span>';soundButton.setAttribute("aria-label","Ambient tone unavailable");}
    }else{
      if(audioCtx&&master){master.gain.cancelScheduledValues(audioCtx.currentTime);master.gain.setTargetAtTime(0,audioCtx.currentTime,.15);}
      soundButton.setAttribute("aria-pressed","false");soundButton.innerHTML='<span class="sound-icon">♫</span><span>Sound off</span>';soundButton.setAttribute("aria-label","Turn ambient tone on");
    }
  };
  if(soundButton)soundButton.addEventListener("click",()=>setSound(soundButton.getAttribute("aria-pressed")!=="true"));
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&audioCtx&&master)master.gain.setTargetAtTime(0,audioCtx.currentTime,.2);});
})();