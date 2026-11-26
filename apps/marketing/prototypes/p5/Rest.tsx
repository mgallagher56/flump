import { type FC, type ReactNode, useRef } from "react";
import {
  ClosingSection,
  FaqSection,
  MoreDetailSection,
  PaySection,
  RoughFiguresSection,
  SecuritySection,
} from "../shared/sections";
import { useGsap } from "../shared/useGsap";

/** A section-nav stop around one of the real home page sections (the stop stays in normal flow). */
const Stop: FC<{ name: string; heading: string; children: ReactNode }> = ({
  name,
  heading,
  children,
}) => (
  // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the section nav reads the heading to focus from aria-labelledby; the real section inside carries the landmark.
  <div aria-labelledby={heading} data-proto-name={name} data-proto-section="">
    {children}
  </div>
);

/**
 * The rest of the home page, compact, with one restrained movement: the steps and the detail lines
 * rise into place the first time they come into view. Everything is in place without script.
 */
export const Rest: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, ({ gsap, ScrollTrigger }, root) => {
    const items = root.querySelectorAll<HTMLElement>(".proto-steps > li, .proto-depth > li");
    const below = Array.from(items).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight,
    );
    gsap.set(below, { opacity: 0, y: 18 });
    ScrollTrigger.batch(below, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "flump", stagger: 0.08 }),
    });
  });
  return (
    <div className="p5-rest" ref={ref}>
      <Stop heading="rough-figures-title" name="Rough figures">
        <RoughFiguresSection />
      </Stop>
      <Stop heading="more-detail-title" name="More detail">
        <MoreDetailSection />
      </Stop>
      <Stop heading="pay-rise-title" name="Pay rise">
        <PaySection />
      </Stop>
      <Stop heading="security-title" name="Security">
        <SecuritySection />
      </Stop>
      <Stop heading="faq-title" name="FAQ">
        <FaqSection />
      </Stop>
      <Stop heading="home-cta-title" name="Get started">
        <ClosingSection />
      </Stop>
    </div>
  );
};
