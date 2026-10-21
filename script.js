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


  // Multi-axis orbital rings with depth-aware foreground arcs.
  const orbitalScene=document.querySelector(".hero-visual");
  const ringHost=document.getElementById("orbital-rings");
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(orbitalScene&&ringHost){
    const foregroundHost=document.createElement("div");
    foregroundHost.className="orbital-rings orbital-rings-front";
    foregroundHost.setAttribute("aria-hidden","true");
    orbitalScene.appendChild(foregroundHost);
    const ringConfigs=[
      {size:220,speed:.42,dir:1,tiltX:70,tiltY:18,tiltZ:0,color:"rgba(94,234,212,.8)",phase:0},
      {size:290,speed:.51,dir:-1,tiltX:52,tiltY:30,tiltZ:22,color:"rgba(147,197,253,.75)",phase:1.1},
      {size:360,speed:.61,dir:1,tiltX:35,tiltY:48,tiltZ:48,color:"rgba(167,139,250,.72)",phase:2.2},
      {size:430,speed:.73,dir:-1,tiltX:20,tiltY:62,tiltZ:80,color:"rgba(254,215,170,.74)",phase:3.3},
      {size:500,speed:.88,dir:1,tiltX:8,tiltY:78,tiltZ:120,color:"rgba(253,186,116,.6)",phase:4.4}
    ];
    const createSvg=(host,config)=>{
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.classList.add("ring","ring-depth");
      svg.setAttribute("viewBox","0 0 500 500");
      svg.setAttribute("aria-hidden","true");
      const shape=document.createElementNS("http://www.w3.org/2000/svg",host===ringHost?"circle":"path");
      shape.setAttribute("fill","none");
      shape.setAttribute("stroke",config.color);
      shape.setAttribute("stroke-width","1.1");
      if(host===ringHost){
        shape.setAttribute("cx","250");
        shape.setAttribute("cy","250");
        shape.setAttribute("r","249");
        shape.setAttribute("stroke-opacity",".3");
        svg.appendChild(shape);
      }else{
        shape.setAttribute("stroke-linecap","round");
        shape.setAttribute("stroke-linejoin","round");
        svg.appendChild(shape);
      }
      host.appendChild(svg);
      return {svg,shape};
    };
    const rings=ringConfigs.map((config,index)=>{
      const back=createSvg(ringHost,config);
      const front=createSvg(foregroundHost,config);
      return {...config,back:back.svg,backShape:back.shape,front:front.svg,frontShape:front.shape,rotation:0,velocity:0,index};
    });
    const pointer={x:0,y:0,targetX:0,targetY:0};
    let lastTime=0,elapsed=0,frameId=0,sceneScale=1;
    const resizeRings=()=>{
      const rect=orbitalScene.getBoundingClientRect();
      sceneScale=Math.min(rect.width,rect.height,540)/500;
      rings.forEach(ring=>{
        const size=Math.max(130,ring.size*sceneScale);
        [ring.back,ring.front].forEach(svg=>{
          svg.style.setProperty("--size",size+"px");
          svg.style.width=size+"px";
          svg.style.height=size+"px";
        });
      });
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
    const frontArcPath=(ring,tiltX,tiltY,spin)=>{
      const segments=240,center=250,radius=248.8,parts=[];
      const tx=tiltX*Math.PI/180,ty=tiltY*Math.PI/180;
      for(let i=0;i<segments;i++){
        const a0=(i/segments)*Math.PI*2+spin;
        const a1=((i+1)/segments)*Math.PI*2+spin;
        const isFront=angle=>{
          const x=Math.cos(angle),y=Math.sin(angle);
          const z=y*Math.sin(tx)-x*Math.sin(ty)*Math.cos(tx);
          return z>.025;
        };
        if(!isFront((a0+a1)/2))continue;
        const x0=center+radius*Math.cos(a0),y0=center+radius*Math.sin(a0);
        const x1=center+radius*Math.cos(a1),y1=center+radius*Math.sin(a1);
        parts.push(`M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`);
      }
      return parts.join("");
    };
    const renderRings=dt=>{
      pointer.x+=(pointer.targetX-pointer.x)*Math.min(1,dt*3.5);
      pointer.y+=(pointer.targetY-pointer.y)*Math.min(1,dt*3.5);
      rings.forEach(ring=>{
        const targetVelocity=ring.speed*25;
        ring.velocity+=(targetVelocity-ring.velocity)*Math.min(1,dt*2.4);
        ring.rotation+=ring.velocity*dt*ring.dir;
        const tiltX=ring.tiltX+pointer.y*10+Math.sin(elapsed*.8+ring.phase)*5;
        const tiltY=ring.tiltY+pointer.x*12+Math.cos(elapsed*.7+ring.phase)*6;
        const spin=ring.tiltZ+ring.rotation*.9;
        const transform=`translate(-50%,-50%) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotateZ(${spin}deg)`;
        ring.back.style.transform=transform;
        ring.front.style.transform=transform;
        const baseOpacity=.22+ring.index*.025;
        ring.back.style.opacity=String(baseOpacity);
        ring.backShape.setAttribute("stroke-width",(.8+ring.index*.08).toFixed(2));
        ring.frontShape.setAttribute("d",frontArcPath(ring,tiltX,tiltY,spin*Math.PI/180));
        ring.frontShape.setAttribute("stroke-opacity",String(.48+ring.index*.045));
        ring.frontShape.setAttribute("stroke-width",(1.05+ring.index*.12).toFixed(2));
      });
    };
    if(reduceMotion.matches){
      renderRings(0);
      pointer.targetX=pointer.targetY=0;
    }else{
      const animate=now=>{
        if(!lastTime)lastTime=now;
        const dt=Math.min((now-lastTime)/1000,.04);
        lastTime=now;
        elapsed+=dt;
        renderRings(dt);
        frameId=requestAnimationFrame(animate);
      };
      frameId=requestAnimationFrame(animate);
      reduceMotion.addEventListener?.("change",event=>{
        if(event.matches&&frameId)cancelAnimationFrame(frameId);
      });
    }
  }

})();