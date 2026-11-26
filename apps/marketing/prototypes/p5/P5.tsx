import type { FC } from "react";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { SectionNav } from "../shared/SectionNav";
import { AccountsScene } from "./AccountsScene";
import { BudgetScene } from "./BudgetScene";
import { DebtScene } from "./DebtScene";
import { Hero } from "./Hero";
import { PayScene } from "./PayScene";
import { Rest } from "./Rest";
import { SavingsScene } from "./SavingsScene";
import "./p5.css";

/**
 * Prototype 5: five scenes, one per area. A compact hero whose five area names gather into one
 * row, then one short section per area, each with its own scroll-tied scene built from the sample
 * household (cards dealt into a net worth, a budget bar filling, a payslip unfolding, a savings
 * year travelling sideways, a debt balance running down to its end date), then the rest of the
 * home page. Server-rendered and with reduced motion, every scene is already finished.
 */
export const P5: FC = () => (
  <PrototypeShell id="p5" panel="closed">
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <Hero />
      <AccountsScene />
      <BudgetScene />
      <PayScene />
      <SavingsScene />
      <DebtScene />
      <Rest />
    </main>
    <SectionNav />
    <Footer />
  </PrototypeShell>
);
