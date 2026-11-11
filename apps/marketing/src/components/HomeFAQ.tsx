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

const chevronOpenStyle = css({ color: "primary", flexShrink: 0 });
const chevronClosedStyle = css({ color: "text.muted", flexShrink: 0 });

const FAQS = [
  {
    q: "Can Flump move my money or make payments?",
    a: "No. Flump has no feature to make payments or move money.",
  },
  {
    q: "Do I have to connect my bank accounts?",
    a: "No. Flump is manual-first. You can enter rough totals for income, expenses, and savings in 60 seconds and use the tax, debt, mortgage, and forecasting tools without connecting a bank account. Bank connection is coming soon.",
  },
  {
    q: "What makes Flump different from generic budgeting apps?",
    a: "Flump is built for UK personal finance: income tax bands, National Insurance, the £100k Personal Allowance taper, student loan plans (1, 2, 4, 5, Postgraduate), Section 24 buy-to-let calculations, and pension salary sacrifice.",
  },
  {
    q: "How does the 60-second baseline work?",
    a: "Enter 6 rough numbers: your salary, housing, core bills, savings, pension balance, and debt. Flump calculates your net worth, weekly safe to spend, and emergency runway immediately. You can add detail whenever you want.",
  },
  {
    q: "Is Flump free?",
    a: "Pricing for Flump has not been announced.",
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
      indexBadge="Frequently asked questions"
      title="Frequently asked questions"
      subtitle="Answers about what Flump does and how its UK tax and finance tools work."
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
                    <FiChevronUp size={18} className={chevronOpenStyle} />
                  ) : (
                    <FiChevronDown size={18} className={chevronClosedStyle} />
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
