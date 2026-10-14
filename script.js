const yearElement = document.getElementById("year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

/* Gentle, one-time scroll reveals for the Yocare story. */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const revealGroups = [
    [".intro .section-kicker", ".intro-grid", ".quote-strip"],
    [".how .section-kicker", ".how .section-heading"],
    [".principles .section-kicker", ".principles-grid"],
    [".early-content"]
  ];
  revealGroups.flat().forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => element.classList.add("reveal-on-scroll"));
  });

  const revealItems = [
    ...document.querySelectorAll(".step"),
    ...document.querySelectorAll(".principle-list article")
  ];
  revealItems.forEach((element, index) => {
    element.classList.add("reveal-soft");
    element.style.setProperty("--reveal-delay", String((index % 3) * 100) + "ms");
  });

  const targets = document.querySelectorAll(".reveal-on-scroll, .reveal-soft");
  if (!targets.length) return;
  document.documentElement.classList.add("js-reveal-ready");

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });

  targets.forEach((target) => observer.observe(target));
})();
