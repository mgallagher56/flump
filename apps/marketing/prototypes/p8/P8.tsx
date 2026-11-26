import { type FC, useRef } from "react";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { usePointerLightAndTilt } from "../shared/round3";
import { SectionNav } from "../shared/SectionNav";
import { AccountsScene } from "./AccountsScene";
import { AssembleHero } from "./AssembleHero";
import { BudgetScene } from "./BudgetScene";
import { DebtScene } from "./DebtScene";
import { PayScene } from "./PayScene";
import { SavingsScene } from "./SavingsScene";
import { P8AreasIntro, P8Rest } from "./Sections";
import "./p8-hero.css";
import "./p8-pieces.css";
import "./p8-scenes.css";
import "./p8.css";

/** The page body: one root for 1b's pointer light (buttons) and tilt (cards). */
const Page: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref);
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <AssembleHero />
      <P8AreasIntro />
      <AccountsScene />
      <BudgetScene />
      <PayScene />
      <SavingsScene />
      <DebtScene />
      <P8Rest />
    </main>
  );
};

/**
 * Prototype 8, "Assembled": everything the owner liked in 4 and 5, calmer. Prototype 4's hero,
 * where the pieces of a household's money travel together into one dashboard, slowed through the
 * pace tokens; then prototype 5's five area scenes (cards dealt with a counting total, the budget
 * bar, the payslip unfolding, the savings year as the one sideways stretch, the debt line); then
 * 4's bands, with the pay rise figures gliding, More detail and the FAQ dealing out of one stack,
 * 1b's pointer light and tilt, and a quiet bubble backdrop in a few bands. Server-rendered and
 * with reduced motion, every part is the finished, still page.
 */
export const P8: FC = () => (
  <PrototypeShell id="p8" paced panel="closed">
    <Header />
    <Page />
    <SectionNav />
    <Footer />
  </PrototypeShell>
);
