(() => {
  const year=document.getElementById("year");
  if(year)year.textContent=new Date().getFullYear();
  const toggle=document.getElementById("nav-toggle");
  const nav=document.getElementById("primary-nav");
  if(toggle&&nav){
    const closeNav=()=>{nav.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Open navigation");};
    toggle.addEventListener("click",()=>{const open=toggle.getAttribute("aria-expanded")!=="true";toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");nav.classList.toggle("is-open",open);});
    nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",closeNav));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeNav();});
    window.addEventListener("resize",()=>{if(window.innerWidth>720)closeNav();},{passive:true});
  }
  const revealItems=[...document.querySelectorAll(".section-kicker,.intro-grid,.metrics-strip,.platform-heading,.platform-card,.statement-inner,.principles-layout,.contact-inner")];
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches||!("IntersectionObserver"in window)){revealItems.forEach(el=>el.classList.add("is-visible"));}
  else{
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:"0px 0px -24px 0px"});
    revealItems.forEach((el,i)=>{el.classList.add("reveal");if(i%3===1)el.style.transitionDelay=".08s";if(i%3===2)el.style.transitionDelay=".16s";observer.observe(el);});
  }


  // Multi-axis orbital rings adapted from the supplied prototype.
  const orbitalScene=document.querySelector(".hero-visual");
  const ringHost=document.getElementById("orbital-rings");
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(orbitalScene&&ringHost){
    const ringConfigs=[
      {size:220,speed:.42,dir:1,tiltX:70,tiltY:18,tiltZ:0,color:"rgba(94,234,212,.8)",phase:0},
      {size:290,speed:.51,dir:-1,tiltX:52,tiltY:30,tiltZ:22,color:"rgba(147,197,253,.75)",phase:1.1},
      {size:360,speed:.61,dir:1,tiltX:35,tiltY:48,tiltZ:48,color:"rgba(167,139,250,.72)",phase:2.2},
      {size:430,speed:.73,dir:-1,tiltX:20,tiltY:62,tiltZ:80,color:"rgba(254,215,170,.74)",phase:3.3},
      {size:500,speed:.88,dir:1,tiltX:8,tiltY:78,tiltZ:120,color:"rgba(253,186,116,.6)",phase:4.4}
    ];
    const rings=ringConfigs.map((config,index)=>{
      const el=document.createElement("div");
      el.className="ring";
      el.style.setProperty("--stroke",config.color);
      el.style.setProperty("--alpha",(0.58+index*.08).toFixed(2));
      el.style.setProperty("--z",(index*10)+"px");
      ringHost.appendChild(el);
      return {...config,el,rotation:0,velocity:0};
    });
    const pointer={x:0,y:0,targetX:0,targetY:0};
    let lastTime=0,elapsed=0,frameId=0,sceneScale=1;
    const resizeRings=()=>{
      const rect=orbitalScene.getBoundingClientRect();
      sceneScale=Math.min(rect.width,rect.height,540)/500;
      rings.forEach(ring=>ring.el.style.setProperty("--size",Math.max(130,ring.size*sceneScale)+"px"));
    };
    resizeRings();
    if("ResizeObserver" in window)new ResizeObserver(resizeRings).observe(orbitalScene);
    else window.addEventListener("resize",resizeRings,{passive:true});
    const pointerEnabled=window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if(pointerEnabled&&!reduceMotion.matches){
      orbitalScene.addEventListener("pointermove",event=>{
        const rect=orbitalScene.getBoundingClientRect();
        pointer.targetX=((event.clientX-rect.left)/rect.width-.5)*2;
        pointer.targetY=((event.clientY-rect.top)/rect.height-.5)*2;
      },{passive:true});
      orbitalScene.addEventListener("pointerleave",()=>{pointer.targetX=0;pointer.targetY=0;},{passive:true});
    }
    const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const animate=now=>{
      if(!lastTime)lastTime=now;
      const dt=Math.min((now-lastTime)/1000,.04);
      lastTime=now;
      elapsed+=dt;
      pointer.x+=(pointer.targetX-pointer.x)*Math.min(1,dt*3.5);
      pointer.y+=(pointer.targetY-pointer.y)*Math.min(1,dt*3.5);
      rings.forEach((ring,index)=>{
        const targetVelocity=ring.speed*25;
        ring.velocity+=(targetVelocity-ring.velocity)*Math.min(1,dt*2.4);
        ring.rotation+=ring.velocity*dt*ring.dir;
        const depth=.5+.5*Math.sin(elapsed*.9+ring.phase);
        const tiltX=ring.tiltX+pointer.y*10+Math.sin(elapsed*.8+ring.phase)*5;
        const tiltY=ring.tiltY+pointer.x*12+Math.cos(elapsed*.7+ring.phase)*6;
        const tiltZ=ring.tiltZ+ring.rotation*.9;
        const scale=1+Math.sin(elapsed*.9+ring.phase)*.025;
        ring.el.style.transform=`translate(-50%,-50%) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${tiltZ}deg) scale(${scale})`;
        ring.el.style.opacity=String(clamp(.28+depth*.62,.2,.9));
        ring.el.style.filter=`brightness(${.72+depth*.55})`;
        ring.el.style.setProperty("--alpha",(.22+depth*.58).toFixed(2));
        ring.el.style.setProperty("--stroke-width",(.75+depth*.65).toFixed(2)+"px");
      });
      if(!reduceMotion.matches)frameId=requestAnimationFrame(animate);
    };
    if(reduceMotion.matches){
      rings.forEach(ring=>{
        ring.el.style.transform=`translate(-50%,-50%) rotateX(${ring.tiltX}deg) rotateY(${ring.tiltY}deg) rotateZ(${ring.tiltZ}deg)`;
        ring.el.style.opacity=".58";
      });
    }else{
      frameId=requestAnimationFrame(animate);
      reduceMotion.addEventListener?.("change",event=>{
        if(event.matches&&frameId)cancelAnimationFrame(frameId);
      });
    }
  }

})();