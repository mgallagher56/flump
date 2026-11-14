import { Icon } from "@repo/ui";
import { ChevronDown } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import {
  faqAnswer,
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
 * The home FAQ (E16 PR 12). The pricing answer matches the pricing page; the AI answer is the one
 * place the home page mentions MCP (D13). No answer promises a feature that does not exist today.
 */
export const HOME_FAQS: HomeFaqEntry[] = [
  {
    id: "payments",
    q: "Can Flump move my money or make payments?",
    a: "No. Flump has no feature to make payments or move money.",
  },
  {
    id: "bank",
    q: "Do I have to connect my bank accounts?",
    a: "No. You type in your own figures. Rough totals for income, spending and savings are enough to use the tax, debt, mortgage and forecast tools.",
  },
  {
    id: "cover",
    q: "What does Flump cover?",
    a: "Flump is built for UK personal finance. It covers Income Tax bands, National Insurance, student loan plans 1, 2, 4, 5 and Postgraduate, pension contributions and salary sacrifice. It also shows the thresholds where take-home pay changes. It works the same whether you rent or pay a mortgage.",
  },
  {
    id: "start",
    q: "How do I get started?",
    a: "Enter a few rough numbers: your salary, rent or mortgage, bills, savings, pension and any debts. Flump shows your net worth, what is left over each month and your months of cover straight away. You can add detail whenever you want.",
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
        Yes, as a preview. An AI assistant such as Claude Desktop can answer questions from the
        figures you have saved in Flump.{" "}
        <Link className={faqLink()} to="/mcp">
          About the AI connection
        </Link>
      </>
    ),
  },
];

export const HomeFAQ: FC = () => {
  const [openId, setOpenId] = useState<string | null>(HOME_FAQS[0]?.id ?? null);

  return (
    <ul className={faqList()}>
      {HOME_FAQS.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <li className={faqItem()} key={faq.id}>
            <button
              aria-controls={`faq-answer-${faq.id}`}
              aria-expanded={isOpen}
              className={faqQuestion()}
              id={`faq-question-${faq.id}`}
              type="button"
              onClick={() => setOpenId(isOpen ? null : faq.id)}
            >
              <span>{faq.q}</span>
              <span aria-hidden="true" className={faqChevron({ open: isOpen })}>
                <Icon icon={ChevronDown} size="sm" />
              </span>
            </button>
            {isOpen && (
              <section
                aria-labelledby={`faq-question-${faq.id}`}
                className={faqAnswer()}
                id={`faq-answer-${faq.id}`}
              >
                <p className={faqAnswerText()}>{faq.a}</p>
              </section>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default HomeFAQ;
