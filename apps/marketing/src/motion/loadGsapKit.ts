/** The GSAP module, once loaded. */
export type GsapKit = typeof import("./gsapKit");

let painted: Promise<void> | undefined;

/**
 * Resolves after the page has loaded and the browser has had an idle moment: the earliest a motion
 * library may start downloading (MK12: GSAP and three.js load after first paint). Never rejects.
 */
export function afterFirstPaint(): Promise<void> {
  painted ??= new Promise((resolve) => {
    const idle = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => resolve(), { timeout: 1500 });
      } else {
        window.setTimeout(resolve, 200);
      }
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
  return painted;
}

let kit: Promise<GsapKit> | undefined;

/**
 * GSAP and its plugins, loaded once after first paint. Callers check reduced motion first (the
 * hooks in this folder do), so with reduced motion this is never called and GSAP never downloads.
 */
export function loadGsapKit(): Promise<GsapKit> {
  kit ??= afterFirstPaint().then(() => import("./gsapKit"));
  return kit;
}
