import type { FC } from "react";
import { Footer } from "../../src/components/Footer";
import { Header } from "../../src/components/Header";
import { mainContent } from "../../src/pages/HomePage/HomePage.styles";
import { PrototypeShell } from "../shared/PrototypeShell";
import { SectionNav } from "../shared/SectionNav";
import { AssembleHero } from "./AssembleHero";
import { P4Sections } from "./Sections";
import "./p4.css";
import "./p4-pieces.css";

/**
 * Prototype 4: the picture assembles. The hero opens with the pieces of a household's money
 * floating in depth (a savings card, a payslip, a receipt, a mortgage statement, a pension jar and
 * a credit card); scrolling flies them together into the one sample dashboard. Below, compact
 * bands, each with one scroll-scrubbed moment. Server-rendered and reduced motion: the assembled
 * dashboard with every piece's figures in it.
 */
export const P4: FC = () => (
  <PrototypeShell id="p4" panel="closed">
    <Header />
    <main className={mainContent()} id="main" tabIndex={-1}>
      <AssembleHero />
      <P4Sections />
    </main>
    <SectionNav />
    <Footer />
  </PrototypeShell>
);
