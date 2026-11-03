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
    question: "How accurate are the UK tax calculations?",
    answer:
      "Flump's engine is built directly around official HMRC legislation. It supports standard UK tax years (6 April to 5 April), accurate Personal Allowance tapering between £100,000 and £125,140, Class 4 National Insurance contributions (6% and 2% thresholds), and Section 24 finance cost tax reducers.",
  },
  {
    question: "What is Section 24 and why does Flump model it?",
    answer:
      "Section 24 restricts residential landlords from deducting mortgage interest from rental profits as an expense. Instead, HMRC grants a 20% basic rate tax reducer. For higher and additional rate taxpayers, this often pushes taxable income into higher brackets. Flump models this automatically so you are never surprised by your January Self-Assessment bill.",
  },
  {
    question: "Can I model joint mortgages or split rental property ownership?",
    answer:
      "Yes. You can assign custom ownership shares (e.g. 50/50, 70/30) to joint mortgages and rental properties. Flump automatically proportions rental turnover, allowable repairs, and finance cost credits to match your legal ownership share.",
  },
  {
    question: "How does the Mortgage vs. ISA comparison work?",
    answer:
      "Paying down a mortgage provides a guaranteed, tax-free return equal to your mortgage interest rate. Investing in a Stocks & Shares ISA provides variable compound market returns tax-free. Flump's modeler calculates the break-even expected return needed in an ISA to outperform your mortgage overpayment, adjusted for inflation and time horizon.",
  },
  {
    question: "Is Flump regulated to provide financial advice?",
    answer:
      "No. Flump is a decision-support and financial forecasting tool designed to provide personal clarity. It does not provide regulated FCA financial advice, and should be used alongside independent certified financial planners (IFA) or qualified tax advisors (CTA).",
  },
  {
    question: "How is my account secured?",
    answer:
      "We partner with WorkOS to deliver AuthKit: enterprise-grade authentication supporting biometric passkeys (FaceID/TouchID), OAuth social sign-ins, and passwordless magic links. We never store plain text passwords, and your financial data is never monetized.",
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
          Frequently Asked Questions
        </span>
        <FLPHeading as="h2" color="text.primary" id="faq-heading" mb={3} size="3xl">
          Everything you need to know about Flump
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          Clear answers regarding UK tax modeling, account security, and mortgage calculations.
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
