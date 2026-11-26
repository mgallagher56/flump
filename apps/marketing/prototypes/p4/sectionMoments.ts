import type { GsapKit } from "../shared/gsapKit";

/*
 * One moment per band below the hero, each scrubbed by its own scroll position (never pinned,
 * never snapped). Each sets its own start state, so before GSAP loads, and with reduced motion,
 * every band is the finished, still page.
 */

const scrub = (trigger: Element, start: string, end: string) => ({
  trigger,
  start,
  end,
  scrub: 0.6,
});

/** The five areas: each area's piece drops out of depth and lies flat in its slot, in turn. */
export function areasMoment({ gsap }: GsapKit, root: HTMLElement) {
  const list = root.querySelector(".p4-areas");
  const pieces = root.querySelectorAll(".p4-area__piece > .p4-piece");
  const rules = root.querySelectorAll(".p4-area");
  if (!list) return;
  gsap
    .timeline({ scrollTrigger: scrub(list, "top 92%", "bottom 62%"), defaults: { ease: "flump" } })
    .fromTo(
      pieces,
      { z: 260, y: -46, rotationX: -58, rotationZ: (i: number) => (i % 2 ? 9 : -9), opacity: 0 },
      {
        z: 0,
        y: 0,
        rotationX: 0,
        rotationZ: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.32,
        transformPerspective: 700,
      },
      0,
    )
    .fromTo(
      rules,
      { "--p4-rule": 0 },
      { "--p4-rule": 1, duration: 0.9, stagger: 0.32, ease: "flumpInOut" },
      0.15,
    );
}

/** Rough figures is a sequence, so one line runs through it and each step lights as it is reached. */
export function stepsMoment({ gsap }: GsapKit, root: HTMLElement) {
  const wrap = root.querySelector(".p4-steps");
  const line = root.querySelector(".p4-steps__line");
  const nodes = root.querySelectorAll(".p4-step__node");
  const steps = root.querySelectorAll(".p4-step");
  if (!wrap || !line) return;
  const across = window.matchMedia("(min-width: 768px)").matches;
  const tl = gsap.timeline({
    scrollTrigger: scrub(wrap, "top 80%", across ? "bottom 70%" : "bottom 60%"),
    defaults: { ease: "none" },
  });
  tl.fromTo(line, across ? { scaleX: 0 } : { scaleY: 0 }, { scaleX: 1, scaleY: 1, duration: 3 }, 0);
  nodes.forEach((node, i) => {
    const at = i * 1.25;
    tl.fromTo(node, { "--p4-lit": 0 }, { "--p4-lit": 1, duration: 0.35 }, at).fromTo(
      steps[i] ?? node,
      { opacity: 0.6, x: across ? 0 : 10, y: across ? 10 : 0 },
      { opacity: 1, x: 0, y: 0, duration: 0.6, ease: "flump" },
      at,
    );
  });
}

/** More detail is underneath: the sheets start as one stack and fan out into the list. */
export function depthMoment({ gsap }: GsapKit, root: HTMLElement) {
  const list = root.querySelector<HTMLElement>(".p4-depth");
  const sheets = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(".p4-depth__sheet"));
  if (!list || sheets.length === 0) return;
  const first = sheets[0];
  if (!first) return;
  gsap.fromTo(
    sheets,
    {
      y: (i: number) => -(sheets[i]?.offsetTop ?? 0) + first.offsetTop + i * 7,
      z: (i: number) => -i * 26,
      rotationX: (i: number) => (i ? 8 : 0),
      transformPerspective: 900,
      transformOrigin: "50% 0%",
    },
    {
      y: 0,
      z: 0,
      rotationX: 0,
      ease: "flumpInOut",
      stagger: 0.12,
      scrollTrigger: scrub(list, "top 82%", "top 30%"),
    },
  );
}

/** The pay rise tool is laid down like a sheet of paper on the table. */
export function payMoment({ gsap }: GsapKit, root: HTMLElement) {
  // The tool's card: the parent of its inner layout, found from the outcome panel inside it.
  const tool = root.querySelector('[data-testid="pay-rise-outcome"]')?.parentElement?.parentElement;
  if (!tool) return;
  gsap.fromTo(
    tool,
    { rotationX: 22, y: 40, transformPerspective: 1100, transformOrigin: "50% 0%" },
    { rotationX: 0, y: 0, ease: "flump", scrollTrigger: scrub(tool, "top 98%", "top 50%") },
  );
}

/** Security: the shield turns to face the reader as the strip arrives. */
export function securityMoment({ gsap }: GsapKit, root: HTMLElement) {
  const strip = root.firstElementChild;
  const tile = root.querySelector("h2")?.closest("div")?.previousElementSibling;
  if (!strip || !tile) return;
  gsap.fromTo(
    tile,
    { rotationY: -160, transformPerspective: 600 },
    { rotationY: 0, ease: "flump", scrollTrigger: scrub(strip, "top 95%", "top 55%") },
  );
}

/** Questions unroll one under another, like a list being printed. */
export function faqMoment({ gsap }: GsapKit, root: HTMLElement) {
  const items = root.querySelectorAll("ul > li");
  if (items.length === 0) return;
  gsap.fromTo(
    items,
    { clipPath: "inset(0% 0% 100% 0%)", y: -6 },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      y: 0,
      ease: "flump",
      stagger: 0.18,
      scrollTrigger: scrub(items[0] as Element, "top 90%", "top 40%"),
    },
  );
}

/** The close: the pieces from the hero gather into one neat pile beside the button. */
export function closingMoment({ gsap }: GsapKit, root: HTMLElement) {
  const deck = root.querySelector(".p4-deck");
  const pieces = root.querySelectorAll(".p4-deck__piece");
  if (!deck) return;
  gsap.fromTo(
    pieces,
    {
      x: (i: number) => [-150, 140, -120, 120, -60, 70][i] ?? 0,
      y: (i: number) => [-70, -60, 50, 60, -90, 80][i] ?? 0,
      z: (i: number) => 60 + i * 30,
      rotationZ: (i: number) => [-24, 18, -12, 22, -30, 14][i] ?? 0,
      rotationX: 30,
      transformPerspective: 900,
    },
    {
      x: 0,
      y: 0,
      z: 0,
      rotationZ: 0,
      rotationX: 0,
      ease: "flump",
      stagger: 0.06,
      scrollTrigger: scrub(deck, "top 100%", "top 45%"),
    },
  );
}
