import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const containerStyle = css({
  maxWidth: "4xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "96px" },
});

const headerContainerStyle = css({
  textAlign: "center",
  marginBottom: "40px",
});

const accordionListStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

const accordionItemStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  overflow: "hidden",
  transition: "all 0.2s ease",
});

const triggerButtonStyle = css({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 24px",
  backgroundColor: "transparent",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  color: "text.primary",
  fontSize: "md",
  fontWeight: "semibold",
  "&:hover": {
    color: "primary",
  },
  "&:focus-visible": {
    outline: "2px solid token(colors.primary)",
    outlineOffset: "-2px",
  },
});

const chevronIconStyle = (isOpen: boolean) =>
  css({
    transition: "transform 0.2s ease",
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    color: "text.muted",
    flexShrink: 0,
    marginLeft: "16px",
  });

const contentPanelStyle = (isOpen: boolean) =>
  css({
    display: isOpen ? "block" : "none",
    padding: "0 24px 20px 24px",
    color: "text.muted",
    fontSize: "sm",
    lineHeight: "1.6",
  });

const faqItems = [
  {
    question: "Can Flump move my money or make payments?",
    answer:
      "No. Flump connects strictly through read-only Account Information Services (AISP) regulated by the Financial Conduct Authority (FCA). Flump cannot initiate payments, move money, or change your account details.",
  },
  {
    question: "Do I have to connect my bank accounts?",
    answer:
      "No. Flump is designed to work completely manually. You can enter rough totals for income, expenses, and savings in 60 seconds and use every tax, debt, mortgage, and forecasting tool without connecting a bank account.",
  },
  {
    question: "What makes Flump different from generic budgeting apps?",
    answer:
      "Most budgeting apps are built around US tax rules. Flump is built natively for UK personal finance: HMRC income tax bands, National Insurance, the £100k Personal Allowance taper, student loan plans (1, 2, 4, 5, Postgraduate), Section 24 buy-to-let calculations, and pension salary sacrifice.",
  },
  {
    question: "How does the 60-second baseline work?",
    answer:
      "Enter 6 rough numbers: your salary, housing, core bills, savings, pension balance, and debt. Flump calculates your net worth, weekly safe to spend, and emergency runway immediately. You can add detail whenever you want.",
  },
  {
    question: "Is there a free tier?",
    answer:
      "Yes. Flump offers a free baseline tier with all core calculators, take-home pay tools, and dashboard summaries included. No credit card is required.",
  },
];

export const HomeFAQ: FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section aria-labelledby="faq-heading" className={containerStyle}>
      <div className={headerContainerStyle}>
        <span
          className={css({
            color: "primary",
            fontSize: "xs",
            fontWeight: "bold",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "8px",
          })}
        >
          Frequently asked questions
        </span>
        <FLPHeading as="h2" color="text.primary" id="faq-heading" mb={3} size="3xl">
          Frequently asked questions
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          Everything you need to know about Flump, UK financial rules, and our privacy-first design.
        </FLPText>
      </div>

      <div className={accordionListStyle}>
        {faqItems.map((item, idx) => {
          const isOpen = openIndex === idx;
          const buttonId = `faq-trigger-${idx}`;
          const panelId = `faq-panel-${idx}`;

          return (
            <div key={idx} className={accordionItemStyle}>
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className={triggerButtonStyle}
                id={buttonId}
                type="button"
                onClick={() => toggleItem(idx)}
              >
                <span>{item.question}</span>
                <FiChevronDown aria-hidden="true" className={chevronIconStyle(isOpen)} size={20} />
              </button>
              <section
                aria-labelledby={buttonId}
                className={contentPanelStyle(isOpen)}
                id={panelId}
              >
                <p style={{ margin: 0 }}>{item.answer}</p>
              </section>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HomeFAQ;
