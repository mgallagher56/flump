import type { FC } from "react";
import {
  ClosingSection,
  FaqSection,
  MoreDetailSection,
  PaySection,
  RoughFiguresSection,
  SecuritySection,
} from "../shared/sections";
import { AreaStepper } from "./AreaStepper";
import "./p2.css";

/** Soft shapes behind a band that move at different speeds as it scrolls past. Decoration only. */
export const DepthLayers: FC<{ variant: "a" | "b" }> = ({ variant }) => (
  <div aria-hidden="true" className={`p2-depth p2-depth--${variant}`}>
    <span className="p2-depth__shape p2-depth__shape--far" />
    <span className="p2-depth__shape p2-depth__shape--mid" />
    <span className="p2-depth__shape p2-depth__shape--near" />
  </div>
);

/**
 * Everything below the hero in prototype 2, also used by prototype 3: the pinned five-area
 * stepper, then the real bands with depth layers and parallax.
 */
export const StorySections: FC = () => (
  <>
    <AreaStepper />
    <div className="p2-band">
      <DepthLayers variant="a" />
      <RoughFiguresSection />
    </div>
    <div className="p2-band">
      <MoreDetailSection />
    </div>
    <div className="p2-band">
      <DepthLayers variant="b" />
      <PaySection />
    </div>
    <div className="p2-band p2-band--security">
      <SecuritySection />
    </div>
    <FaqSection />
    <div className="p2-band p2-band--closing">
      <ClosingSection />
    </div>
  </>
);
