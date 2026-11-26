import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Pins the five-area section and steps through the areas as the reader scrolls. Progress is tied
 * to scroll position (scrub); nothing snaps or captures the wheel. Panels fade, they are never
 * `visibility: hidden`, so a screen reader can still read them, and focusing a link in a later
 * panel scrolls to that panel's step. Returns a clean-up that restores the stacked list.
 */
export function enhanceStepper(root: HTMLElement): () => void {
  const pin = root.querySelector<HTMLElement>(".p2-areas__pin");
  const panels = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(".p2-area"));
  const bars = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(".p2-areas__bar"));
  const navItems = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(".p2-areas__nav li"));
  if (!pin || panels.length < 2) return () => {};

  root.dataset.enhanced = "true";
  const steps = panels.length - 1;
  let trigger: ScrollTrigger | undefined;

  const setActive = (index: number) => {
    navItems.forEach((item, i) => {
      item.dataset.active = String(i === index);
    });
  };

  const ctx = gsap.context(() => {
    gsap.set(panels.slice(1), { opacity: 0 });
    panels.forEach((panel, i) => {
      gsap.set(panel.querySelectorAll(".p2-sample__card"), i === 0 ? {} : { opacity: 0 });
    });
    gsap.set(bars, { scaleX: 0, transformOrigin: "left center" });

    const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
    if (bars[0]) timeline.to(bars[0], { scaleX: 1, duration: 1, ease: "none" }, 0);

    for (let i = 1; i <= steps; i += 1) {
      const at = i * 1.2 - 0.2;
      const outgoing = panels[i - 1];
      const incoming = panels[i];
      const bar = bars[i];
      if (!outgoing || !incoming || !bar) continue;
      const cards = incoming.querySelectorAll(".p2-sample__card");
      timeline
        .to(outgoing, { opacity: 0, y: -32, duration: 0.4 }, at)
        .to(
          outgoing.querySelectorAll(".p2-sample__card"),
          { opacity: 0, y: -24, scale: 0.94, stagger: 0.04, duration: 0.35 },
          at,
        )
        .fromTo(incoming, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5 }, at + 0.25)
        // The sample cards assemble from different depths: further ones start smaller and lower.
        .fromTo(
          cards,
          {
            opacity: 0,
            y: (n: number) => 70 + n * 30,
            scale: (n: number) => 0.8 - n * 0.05,
            rotate: (n: number) => (n % 2 === 0 ? -4 : 4),
          },
          { opacity: 1, y: 0, scale: 1, rotate: 0, stagger: 0.08, duration: 0.55 },
          at + 0.35,
        )
        .to(bar, { scaleX: 1, duration: 1, ease: "none" }, at + 0.2);
    }

    trigger = ScrollTrigger.create({
      trigger: root,
      pin,
      // The site header is sticky, so the pinned stage starts below it.
      start: () => `top top+=${document.querySelector("header")?.offsetHeight ?? 0}`,
      end: () => `+=${Math.round(window.innerHeight * 0.85 * steps)}`,
      scrub: 0.5,
      animation: timeline,
      invalidateOnRefresh: true,
      onUpdate: (self) => setActive(Math.min(steps, Math.floor(self.progress * (steps + 0.999)))),
    });
    setActive(0);
  }, root);

  // Keyboard: focusing into a later panel scrolls to its step so the focused link is in view.
  const onFocusIn = (event: FocusEvent) => {
    const panel = (event.target as HTMLElement).closest<HTMLElement>(".p2-area");
    if (!panel || !trigger) return;
    const index = Number(panel.dataset.index ?? 0);
    const target = trigger.start + ((trigger.end - trigger.start) * (index + 0.5)) / (steps + 1);
    window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
  };
  root.addEventListener("focusin", onFocusIn);

  return () => {
    root.removeEventListener("focusin", onFocusIn);
    ctx.revert();
    root.dataset.enhanced = "false";
    navItems.forEach((item) => {
      delete item.dataset.active;
    });
  };
}
