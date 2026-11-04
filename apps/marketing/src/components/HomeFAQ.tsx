import { css } from "@repo/ui/styled-system/css";
import { stack } from "@repo/ui/styled-system/patterns";
import { type FC, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const containerStyle = css({
  maxWidth: "4xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const faqItemStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "xl",
  overflow: "hidden",
  transition: "border-color 0.15s ease",
  _hover: { borderColor: "indigo.500" },
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
  fontSize: "1rem",
  fontWeight: "700",
  color: { base: "slate.900", _dark: "#ffffff" },
  cursor: "pointer",
});

const answerStyle = css({
  padding: "0 24px 20px 24px",
  fontSize: "14px",
  lineHeight: "1.7",
  color: { base: "slate.600", _dark: "slate.300" },
});

const FAQS = [
  {
    q: "Can Flump move my money or execute payments?",
    a: "No. Flump connects strictly through read-only Account Information Services (AISP) regulated by the Financial Conduct Authority (FCA). Flump has zero payment initiation capability and can never move money, initiate transfers, or change your account details.",
  },
  {
    q: "Can I use Flump without connecting my bank accounts?",
    a: "Yes! Flump offers an air-gapped manual mode where you can input balances, income, mortgage rates, and debts by hand or via CSV import. You retain 100% of the tax, debt payoff, and forecasting engines without ever linking bank credentials.",
  },
  {
    q: "How does Flump calculate the £100k tax trap and childcare cliff?",
    a: "HMRC reduces your Personal Allowance by £1 for every £2 your adjusted net income exceeds £100,000, creating an effective 60% marginal tax rate between £100,000 and £125,140. Furthermore, exceeding £100k eliminates the 15/30 hours of government-funded childcare and Tax-Free Childcare. Flump calculates the exact salary sacrifice required into a workplace pension or SIPP to restore your allowance.",
  },
  {
    q: "How does the Live Demo Sandbox differ from a real account?",
    a: "The Live Demo Sandbox runs entirely in your browser memory against realistic UK financial personas. You can test every dashboard widget, tax tool, and debt calculator with zero sign-up. When you are ready to track your real numbers, clicking 'Save My Changes' commits your custom inputs directly to your new secure account.",
  },
  {
    q: "What is your data retention and deletion policy under UK GDPR?",
    a: "Your personal financial data is yours alone. We do not sell data to lenders, brokers, or advertisers. If you decide to leave Flump, clicking 'Delete Account' in your profile permanently and irrevocably purges all transaction records, balances, and credentials from our encrypted database.",
  },
];

export const HomeFAQ: FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className={containerStyle}>
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            color: "#6363f1",
          }}
        >
          Got Questions?
        </span>
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: "800",
            color: "var(--colors-text-primary, #0f172a)",
            marginTop: "8px",
          }}
        >
          Frequently Asked Questions
        </h2>
      </div>

      <div className={stack({ gap: "4" })}>
        {FAQS.map((faq, idx) => (
          <div key={idx} className={faqItemStyle}>
            <button type="button" className={questionStyle} onClick={() => toggle(idx)}>
              <span>{faq.q}</span>
              {openIdx === idx ? (
                <FiChevronUp size={20} color="#6363f1" />
              ) : (
                <FiChevronDown size={20} color="#94a3b8" />
              )}
            </button>
            {openIdx === idx && <div className={answerStyle}>{faq.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
};
