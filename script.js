const yearElement = document.getElementById("year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js-ready");

(() => {
  const progress = document.getElementById("progress-bar");
  let scheduled = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + "%";
    scheduled = false;
  };
  window.addEventListener("scroll", () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();
})();

(() => {
  const selectors = [
    ".section-meta", ".philosophy-layout > div", ".quiet-banner",
    ".ritual-heading", ".ritual-card", ".interlude-quote",
    ".principles-heading", ".principle-list article", ".access-content"
  ];
  const items = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
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
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
  items.forEach((item) => observer.observe(item));
})();
