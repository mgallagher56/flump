import { type FC, useRef } from "react";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { usePointerLightAndTilt } from "../shared/round3";
import { SectionNav } from "../shared/SectionNav";
import { AssembleHero } from "./AssembleHero";
import { DebtScene } from "./DebtScene";
import { JourneyMiddle } from "./JourneyMiddle";
import { PayRise } from "./PayRise";
import { PayScene } from "./PayScene";
import { Close, Faq, MoreDetail } from "./Rest";
import "./hero.css";
import "./pieces.css";
import "./scenes.css";
import "./p10.css";

/** The page inside the shell, so the pointer light and tilt read the shell's motion state. */
const Page: FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  usePointerLightAndTilt(mainRef);
  return (
    <main className={mainContent()} id="main" ref={mainRef} tabIndex={-1}>
      <AssembleHero />
      <JourneyMiddle />
      <DebtScene />
      <PayScene />
      <PayRise />
      <MoreDetail />
      <Faq />
      <Close />
    </main>
  );
};

/**
 * Prototype 10: both. Prototype 4's assembling hero, slowed; prototype 9's journey, shortened to
 * three areas; prototype 5's scenes for the other two (the debt line drawing, the payslip
 * unfolding); the pay rise tool with figures that glide; More detail and the questions dealing
 * out of one stack; the close. 1b's pointer light and tilt throughout, bubbles behind. Every
 * duration and scroll distance comes from the pace tokens. Server-rendered and with reduced
 * motion: the finished page.
 */
export const P10: FC = () => (
  <PrototypeShell id="p10" paced panel="closed">
    <Header />
    <Page />
    <SectionNav />
    <Footer />
  </PrototypeShell>
);
