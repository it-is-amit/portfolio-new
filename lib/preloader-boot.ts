/**
 * Preloader boot: runs inline in <head>, before the first paint, so the loader is on screen from the very first
 * frame instead of appearing only after hydration (which showed the hero, then the loader, then the hero again).
 *
 * - Sets `data-preloader="run"` on <html>; the loader is only displayed while that attribute is present, so
 *   reduced-motion visitors (and no-JS visitors) never see it.
 * - Drives the counter and progress line itself until React hydrates and takes over from `window.__preloader.value`.
 * - Starts every load at the top (the loader hands off into the hero intro), unless the URL targets a #section.
 * - Failsafe: if the app never hydrates, the loader removes itself.
 */
export const PRELOADER_ATTRIBUTE = "data-preloader";

export type PreloaderBootState = {
  value: number;
  frame: number;
  handedOff: boolean;
};

declare global {
  interface Window {
    __preloader?: PreloaderBootState;
  }
}

export const preloaderBootScript = `(function () {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var root = document.documentElement;
    root.setAttribute("${PRELOADER_ATTRIBUTE}", "run");
    if ("scrollRestoration" in history && !location.hash) history.scrollRestoration = "manual";
    var state = (window.__preloader = { value: 0, frame: 0, handedOff: false });
    var start = performance.now();
    var tick = function (now) {
      if (state.handedOff) return;
      // Eases towards 40% while the page's scripts load; the app continues from here.
      state.value = 40 * (1 - Math.exp(-Math.max(0, now - start) / 1400));
      var count = document.querySelector("[data-preloader-count]");
      var bar = document.querySelector("[data-preloader-bar]");
      if (count) count.textContent = String(Math.round(state.value)).padStart(3, "0");
      if (bar) bar.style.transform = "scaleX(" + state.value / 100 + ")";
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
    setTimeout(function () {
      if (!state.handedOff) root.removeAttribute("${PRELOADER_ATTRIBUTE}");
    }, 12000);
  } catch (error) {}
})();`;
