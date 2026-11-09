import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { stack } from "@repo/ui/styled-system/patterns";
import { type FC, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const faqItemStyle = css({
  backgroundColor: "card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  overflow: "hidden",
  transition: "border-color 0.15s ease",
  _hover: { borderColor: "primary" },
});

const questionStyle = css({
  width: "100%",
  padding: "20px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  textAlign: "left",
  fontSize: "md",
  fontWeight: "700",
  fontFamily: "display",
  color: "text.primary",
  cursor: "pointer",
});

const answerStyle = css({
  padding: "0 24px 20px 24px",
  fontSize: "sm",
  lineHeight: "1.7",
  color: "text.secondary",
});

const FAQS = [
  {
    q: "Can Flump move my money or execute payments?",
    a: "No. Flump connects strictly through read-only Account Information Services (AISP) regulated by the Financial Conduct Authority (FCA). Flump has zero payment initiation capability and can never move money, initiate transfers, or change your account details.",
  },
  {
    q: "Do I have to connect my bank accounts?",
    a: "Not at all. Flump is designed from the ground up to be 100% manual-first. You can enter rough totals for income, expenses, and savings in 60 seconds and use every single tax, debt, mortgage, and forecasting tool without connecting a bank account.",
  },
  {
    q: "What makes Flump different from generic budgeting apps?",
    a: "Most budgeting tools are built for US tax laws (401k, credit scores). Flump is built natively for UK personal finance rules: HMRC income tax bands, National Insurance, £100k Personal Allowance taper, student loan plans (1, 2, 4, 5, PG), Section 24 buy-to-let calculations, and pension salary sacrifice.",
  },
  {
    q: "How does the 60-Second Baseline work?",
    a: "On your first visit, enter 6 rough figures: your salary, housing, core bills, savings, pension balance, and debt. Flump calculates your Net Worth, weekly Safe-to-Spend allowance, and emergency survival runway immediately. You can drill down and refine details later.",
  },
  {
    q: "Is there a free trial or free tier?",
    a: "Yes. Flump offers a free baseline tier with all core calculators, take-home tools, and dashboard summaries included. No credit card is required to start.",
  },
];

export const HomeFAQ: FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <SectionBand
      id="faq"
      tone="subtle"
      indexBadge="06 // FAQ"
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about Flump, UK financial rules, and our privacy-first design."
    >
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        <div className={stack({ gap: "3" })}>
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className={faqItemStyle}>
                <button
                  aria-controls={`faq-answer-${idx}`}
                  aria-expanded={isOpen}
                  className={questionStyle}
                  type="button"
                  onClick={() => toggle(idx)}
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <FiChevronUp
                      size={18}
                      style={{ color: "var(--colors-primary, #6363f1)", flexShrink: 0 }}
                    />
                  ) : (
                    <FiChevronDown size={18} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  )}
                </button>
                {isOpen && (
                  <div className={answerStyle} id={`faq-answer-${idx}`} role="region">
                    <p style={{ margin: 0 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SectionBand>
  );
};
