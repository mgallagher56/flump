import { Icon } from "@repo/ui";
import { ChevronDown } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { unstackMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { MarketingBand } from "../MarketingBand";
import {
  faqAnswer,
  faqAnswerInner,
  faqAnswerText,
  faqChevron,
  faqItem,
  faqLink,
  faqList,
  faqQuestion,
} from "./HomeFAQ.styles";

export interface HomeFaqEntry {
  id: string;
  q: string;
  a: ReactNode;
}

/**
 * The home FAQ (E16 PR 12, E42 S5). Answers use the app's own area names. The pricing answer
 * matches the pricing page; the AI answer says how a tester gets the AI connection (D5). No answer
 * promises a feature that does not exist today.
 */
export const HOME_FAQS: HomeFaqEntry[] = [
  {
    id: "bank",
    q: "Do I have to connect my bank accounts?",
    a: "No. You type in your own figures. Rough totals are enough to start in each area: accounts, budget, pay, savings and pension, and debt and borrowing.",
  },
  {
    id: "cover",
    q: "Which UK rules does Flump use?",
    a: "Flump is built for UK personal finance. It covers Income Tax bands, National Insurance, student loan plans 1, 2, 4, 5 and Postgraduate, pension contributions and salary sacrifice. It also shows the thresholds where take-home pay changes. It works the same whether you rent or pay a mortgage.",
  },
  {
    id: "start",
    q: "How do I get started?",
    a: "Enter a few rough numbers: your salary, rent or mortgage, bills, savings, pension and any debts. Flump shows your net worth, what is left over each month and your breathing room straight away. You can add detail whenever you want.",
  },
  {
    id: "pricing",
    q: "Is Flump free?",
    a: "Flump is free during the beta. A paid plan may come later and its price is not set.",
  },
  {
    id: "ai",
    q: "Can I ask an AI assistant about my figures?",
    a: (
      <>
        Yes. The AI connection lets an AI assistant such as Claude Desktop answer questions from the
        figures you have saved. During testing it is switched on one account at a time, so ask us to
        switch it on for yours.{" "}
        <Link className={faqLink} to="/features/ai-connection">
          About the AI connection
        </Link>
      </>
    ),
  },
];

/**
 * Prototype 10's cascade (owner, 28 Nov 2026): the questions start as one stack on the first and
 * deal out into the list in turn, once, started by scroll and finished by time (MK2). Transforms
 * are cleared afterwards, so an opening answer always pushes the next question down.
 */
export const faqMoment = unstackMoment("[data-deal-item]");

/**
 * "Frequently asked questions" (ROLLOUT-PLAN M1, from prototype 11), beside More detail on wide
 * screens (`pairBands` on the home page). One answer open at a time, the first on arrival. Every
 * answer is in the page; each opens in place and in order, and what follows moves down smoothly,
 * never overlapping (MK9).
 */
export const HomeFAQ: FC = () => {
  const [openId, setOpenId] = useState<string | null>(HOME_FAQS[0]?.id ?? null);
  const listRef = useRef<HTMLUListElement>(null);
  // Closed answers leave the tab order only once script runs; the server HTML keeps every answer
  // reachable for a page with no JavaScript.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  useGsapMoment(listRef, faqMoment);

  return (
    <MarketingBand
      bubbleFit="beside"
      bubbles="c"
      id="faq"
      stop="Questions"
      title="Frequently asked questions"
      tone="canvas"
      width="narrow"
    >
      <ul className={faqList} ref={listRef}>
        {HOME_FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <li className={faqItem} data-deal-item="" key={faq.id}>
              <button
                aria-controls={`faq-answer-${faq.id}`}
                aria-expanded={isOpen}
                className={faqQuestion}
                id={`faq-question-${faq.id}`}
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
              >
                <span>{faq.q}</span>
                <span aria-hidden="true" className={faqChevron({ open: isOpen })}>
                  <Icon icon={ChevronDown} size="sm" />
                </span>
              </button>
              <section
                aria-labelledby={`faq-question-${faq.id}`}
                className={faqAnswer({ open: isOpen })}
                data-open={isOpen}
                id={`faq-answer-${faq.id}`}
                inert={hydrated && !isOpen}
              >
                <div className={faqAnswerInner}>
                  <p className={faqAnswerText}>{faq.a}</p>
                </div>
              </section>
            </li>
          );
        })}
      </ul>
    </MarketingBand>
  );
};
