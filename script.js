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
})();