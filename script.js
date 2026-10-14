const yearElement = document.getElementById("year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js-ready");

/* A small, responsive star field: deterministic dots, no image downloads, no WebGL. */
(() => {
  const canvas = document.getElementById("starfield");
  if (!canvas || reduceMotion) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let stars = [];
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let lastDraw = 0;

  const makeStars = () => {
    const count = Math.min(190, Math.max(65, Math.floor((width * height) / 10500)));
    let seed = 264;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    stars = Array.from({ length: count }, () => ({
      x: random() * width,
      y: random() * height,
      radius: .35 + random() * 1.05,
      alpha: .18 + random() * .58,
      phase: random() * Math.PI * 2,
      speed: .25 + random() * .7,
      depth: .15 + random() * .85
    }));
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.7);
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    makeStars();
  };

  const draw = (time) => {
    frame = requestAnimationFrame(draw);
    if (time - lastDraw < 40) return;
    lastDraw = time;
    context.clearRect(0, 0, width, height);
    for (const star of stars) {
      const shimmer = .68 + Math.sin(time * .00045 * star.speed + star.phase) * .32;
      const x = star.x + pointerX * star.depth * 9;
      const y = star.y + pointerY * star.depth * 7;
      context.beginPath();
      context.fillStyle = "rgba(211, 232, 203, " + (star.alpha * shimmer) + ")";
      context.arc(x, y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
  };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", (event) => {
    pointerX = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointerY = (event.clientY / Math.max(height, 1) - .5) * 2;
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else { lastDraw = 0; frame = requestAnimationFrame(draw); }
  });
  resize();
  frame = requestAnimationFrame(draw);
})();

/* Scroll progress and gentle parallax. Everything is skipped for reduced motion. */
(() => {
  const progress = document.getElementById("progress-bar");
  const cosmos = document.querySelector(".cosmos");
  let ticking = false;

  const updateScroll = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) {
      const amount = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
      progress.style.width = Math.min(100, amount) + "%";
    }
    if (!reduceMotion && cosmos && window.innerWidth > 760) {
      const shift = Math.min(34, window.scrollY * .045);
      cosmos.style.setProperty("--scroll-drift", shift + "px");
      cosmos.style.translate = "0 " + shift + "px";
    }
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });
  updateScroll();
})();

/* Reveal the narrative as it enters view; content remains visible without observer support. */
(() => {
  const items = document.querySelectorAll(
    ".section-meta, .manifesto-statement, .manifesto-copy, .horizon-art, .ritual-heading, .ritual-card, .interlude-quote, .principles-intro, .principle, .access-content"
  );
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  items.forEach((item, index) => {
    item.classList.add("reveal");
    if (index % 3 === 1) item.classList.add("reveal-delay-1");
    if (index % 3 === 2) item.classList.add("reveal-delay-2");
  });

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -35px 0px" });
  items.forEach((item) => observer.observe(item));
})();

/* On touch screens the artwork remains still and the page keeps its full breathing room. */
if (window.matchMedia("(hover: none)").matches) {
  document.documentElement.classList.add("touch-device");
}
