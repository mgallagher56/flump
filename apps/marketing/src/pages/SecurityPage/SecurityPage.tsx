import { IconTile } from "@repo/ui";
import { Ban, Bot, Keyboard, type LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";
import { DisclosurePolicySection } from "../../components/DisclosurePolicySection";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import {
  container,
  factItem,
  factLink,
  factList,
  factText,
  headerBlock,
  heading,
  intro,
  mainContent,
  pageShell,
} from "./SecurityPage.styles";

interface SecurityFact {
  id: string;
  icon: LucideIcon;
  text: ReactNode;
}

/** Facts that are true today, each said once (E16 PR 12). No promise of a future feature. */
const SECURITY_FACTS: SecurityFact[] = [
  {
    id: "own-figures",
    icon: Keyboard,
    text: "You type in your own figures. Flump does not connect to your bank, so no bank login is needed.",
  },
  {
    id: "no-payments",
    icon: Ban,
    text: "Flump has no feature to make payments or move money.",
  },
  {
    id: "ai",
    icon: Bot,
    text: (
      <>
        The{" "}
        <Link className={factLink()} to="/mcp">
          AI connection
        </Link>{" "}
        (preview) answers questions from the figures you have saved. {AI_STAGING_SENTENCE}
      </>
    ),
  },
];

/** Security and privacy (E16 PR 12): an intro, one list of facts and the reporting route. */
export const SecurityPage: FC = () => (
  <div className={pageShell()}>
    <PageMeta
      title="Security and privacy | Flump"
      description="What Flump does with your money and your figures today: no bank login, no payments, and how to report a security issue."
    />

    <Header />

    <main className={mainContent()} id="main" tabIndex={-1}>
      <div className={container()}>
        <div className={headerBlock()}>
          <h1 className={heading()}>Security and privacy</h1>
          <p className={intro()}>What Flump can and cannot do with your money and your figures.</p>
        </div>

        <ul aria-label="Security facts" className={factList()}>
          {SECURITY_FACTS.map((fact) => (
            <li className={factItem()} data-fact={fact.id} key={fact.id}>
              <IconTile icon={fact.icon} tone="teal" />
              <p className={factText()}>{fact.text}</p>
            </li>
          ))}
        </ul>

        <DisclosurePolicySection />
      </div>
    </main>

    <Footer />
  </div>
);

export default SecurityPage;
