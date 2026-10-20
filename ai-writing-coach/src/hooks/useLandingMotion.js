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

/** Replay landing motion after its stable anchor leaves the nearby viewport. */
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

    const resetTarget = (target) => {
      const wasVisible = target.classList.contains("is-visible");
      target.classList.remove("is-visible");
      if (wasVisible && target.classList.contains("hero-dashboard")) {
        target.dispatchEvent(new Event("landing:motion-reset"));
      }
    };

    const entryObserver = new IntersectionObserver(
      (entries) => {
        if (disposed || preference.matches) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          for (const target of anchors.get(entry.target) ?? []) {
            target.classList.add("is-visible");
          }
          if (entry.target === headlineAnchor) setHeroActive(true);
        }
      },
      { root, threshold: 0.1 },
    );

    // Keep animations armed while close to view. Their own transforms must
    // not immediately cancel an entrance at the viewport's edge.
    const resetObserver = new IntersectionObserver(
      (entries) => {
        if (disposed || preference.matches) return;
        for (const entry of entries) {
          if (entry.isIntersecting) continue;
          for (const target of anchors.get(entry.target) ?? []) resetTarget(target);
          if (entry.target === headlineAnchor) setHeroActive(false);
        }
      },
      { root, rootMargin: "240px", threshold: 0 },
    );

    const unregister = (target, anchor) => {
      targets.delete(target);
      const group = anchors.get(anchor);
      group?.delete(target);
      if (group?.size) return;
      anchors.delete(anchor);
      entryObserver.unobserve(anchor);
      resetObserver.unobserve(anchor);
      if (anchor === headlineAnchor) {
        headlineAnchor = null;
        setHeroActive(preference.matches);
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
          if (!preference.matches) {
            entryObserver.observe(anchor);
            resetObserver.observe(anchor);
          }
        }
        group.add(target);
        if (preference.matches) target.classList.add("is-visible");
      }
    };

    const onPreferenceChange = () => {
      if (disposed) return;
      entryObserver.disconnect();
      resetObserver.disconnect();
      setHeroActive(preference.matches);
      for (const target of targets.keys()) {
        if (preference.matches) target.classList.add("is-visible");
        else resetTarget(target);
      }
      if (!preference.matches) {
        for (const anchor of anchors.keys()) {
          entryObserver.observe(anchor);
          resetObserver.observe(anchor);
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
      resetObserver.disconnect();
      mutations.disconnect();
      preference.removeEventListener("change", onPreferenceChange);
      targets.clear();
      anchors.clear();
    };
  }, []);

  return { pageRef, heroActive };
}
