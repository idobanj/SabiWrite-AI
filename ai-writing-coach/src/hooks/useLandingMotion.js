import { useEffect, useRef, useState } from "react";

const MOTION_TARGETS = ".reveal, .hero-motion, .animate-orb-1, .animate-orb-2";

function getAnchor(target) {
  if (target.classList.contains("hero-headline-line")) {
    return target.closest("h1") ?? target;
  }
  if (target.classList.contains("hero-description")) {
    return target.parentElement ?? target;
  }
  return target;
}

function getScrollRoot(page) {
  for (let parent = page.parentElement; parent; parent = parent.parentElement) {
    if (/^(auto|scroll|overlay)$/.test(window.getComputedStyle(parent).overflowY)) {
      return parent;
    }
  }
  return null;
}

/**
 * One-way landing motion: each animation plays the first time its anchor
 * scrolls into view and is never reset or replayed on scroll-back.
 */
export function useLandingMotion() {
  const pageRef = useRef(null);
  const [heroActive, setHeroActive] = useState(false);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = getScrollRoot(page);
    const targets = new Map();
    const anchors = new Map();
    let headlineAnchor = null;
    let disposed = false;

    // Once visible, stop observing so the animation never replays on scroll-back.
    // rootMargin: '0px 0px -28% 0px' delays the trigger until elements have scrolled
    // well into the viewport (near the middle / ~35-40% up from the bottom), matching
    // the reference video rather than firing immediately at the bottom cut-off edge.
    const entryObserver = new IntersectionObserver(
      (entries) => {
        if (disposed || preference.matches) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          for (const target of anchors.get(entry.target) ?? []) {
            target.classList.add("is-visible");
          }
          if (entry.target === headlineAnchor) setHeroActive(true);
          // Unobserve immediately — this anchor has played and must not reset.
          entryObserver.unobserve(entry.target);
        }
      },
      { root, rootMargin: "0px 0px -28% 0px", threshold: 0.12 },
    );

    const unregister = (target, anchor) => {
      targets.delete(target);
      const group = anchors.get(anchor);
      group?.delete(target);
      if (group?.size) return;
      anchors.delete(anchor);
      entryObserver.unobserve(anchor);
      if (anchor === headlineAnchor) {
        headlineAnchor = null;
      }
    };

    const syncTargets = () => {
      if (disposed) return;
      const current = new Set(page.querySelectorAll(MOTION_TARGETS));
      for (const [target, anchor] of targets) {
        if (!current.has(target) || getAnchor(target) !== anchor) {
          unregister(target, anchor);
        }
      }
      for (const target of current) {
        if (targets.has(target)) continue;
        const anchor = getAnchor(target);
        targets.set(target, anchor);
        if (target.classList.contains("hero-headline-line")) headlineAnchor = anchor;
        let group = anchors.get(anchor);
        if (!group) {
          group = new Set();
          anchors.set(anchor, group);
          if (!preference.matches && !anchor.classList.contains("is-visible")) {
            entryObserver.observe(anchor);
          }
        }
        group.add(target);
        if (preference.matches) target.classList.add("is-visible");
      }
    };

    const onPreferenceChange = () => {
      if (disposed) return;
      entryObserver.disconnect();
      setHeroActive(preference.matches);
      for (const target of targets.keys()) {
        if (preference.matches) target.classList.add("is-visible");
      }
      if (!preference.matches) {
        for (const anchor of anchors.keys()) {
          if (!anchor.classList.contains("is-visible")) {
            entryObserver.observe(anchor);
          }
        }
      }
    };

    syncTargets();
    setHeroActive(preference.matches);
    const mutations = new MutationObserver(syncTargets);
    mutations.observe(page, { childList: true, subtree: true });
    preference.addEventListener("change", onPreferenceChange);

    return () => {
      disposed = true;
      entryObserver.disconnect();
      mutations.disconnect();
      preference.removeEventListener("change", onPreferenceChange);
      targets.clear();
      anchors.clear();
    };
  }, []);

  return { pageRef, heroActive };
}
