import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo } from "react";
import { FiCalendar, FiInfo } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

export interface PaymentsOnAccountCardProps {
  annualSelfAssessmentTax: number;
}

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "20px 18px", md: "24px 28px" },
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
});

const gridLayout = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "14px",
});

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const PaymentsOnAccountCard: FC<PaymentsOnAccountCardProps> = ({
  annualSelfAssessmentTax,
}) => {
  const tax = Math.max(0, annualSelfAssessmentTax);
  const requiresPaymentsOnAccount = tax > 1000;

  // Payments on Account are each 50% of the prior year bill
  const paymentOnAccount50Pct = Math.round(tax * 0.5);

  // Suggested monthly transfer: spread over 12 months
  const monthlyPotTransfer = Math.round(tax / 12);

  // Calculate days to next 31 Jan
  const daysToJan31 = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let target = new Date(currentYear, 0, 31, 23, 59, 59); // 31 Jan of current year
    if (now > target) {
      target = new Date(currentYear + 1, 0, 31, 23, 59, 59);
    }
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  if (tax <= 0) {
    return null;
  }

  return (
    <div className={cardStyle} data-testid="payments-on-account-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
              }}
            >
              <FiCalendar />
            </span>
            <FLPHeading as="h3" size="sm">
              HMRC Payments on Account & Cash-Flow Reserve
            </FLPHeading>
          </div>
          <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
            HMRC requires self-assessment taxpayers with bills &gt; £1,000 to make advance payments
            on 31 Jan and 31 July.
          </FLPText>
        </div>

        {/* Highlight Pot Metric */}
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "12px",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--colors-text-muted)" }}>
            Monthly Tax Pot Set-Aside
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--colors-status-positive-text)",
            }}
          >
            {formatGBP(monthlyPotTransfer)}{" "}
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--colors-text-muted)" }}>
              / mo
            </span>
          </div>
        </div>
      </div>

      {/* 2 Key Payment Milestone Cards */}
      <div className={gridLayout}>
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            border: "1px solid var(--colors-border)",
            backgroundColor: "var(--colors-background)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "13px" }}>31 January Deadline</strong>
            <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>
              {daysToJan31} days left
            </span>
          </div>
          <div
            style={{ fontSize: "18px", fontWeight: 700, marginTop: "6px", color: "text.primary" }}
          >
            {formatGBP(requiresPaymentsOnAccount ? tax + paymentOnAccount50Pct : tax)}
          </div>
          <div style={{ fontSize: "11px", color: "var(--colors-text-muted)", marginTop: "2px" }}>
            {requiresPaymentsOnAccount
              ? `Balancing bill (${formatGBP(tax)}) + 1st payment on account (${formatGBP(paymentOnAccount50Pct)})`
              : "Single annual balancing payment"}
          </div>
        </div>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            border: "1px solid var(--colors-border)",
            backgroundColor: "var(--colors-background)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "13px" }}>31 July Deadline</strong>
            <span style={{ fontSize: "11px", color: "var(--colors-primary)", fontWeight: 600 }}>
              2nd Payment on Account
            </span>
          </div>
          <div
            style={{ fontSize: "18px", fontWeight: 700, marginTop: "6px", color: "text.primary" }}
          >
            {formatGBP(requiresPaymentsOnAccount ? paymentOnAccount50Pct : 0)}
          </div>
          <div style={{ fontSize: "11px", color: "var(--colors-text-muted)", marginTop: "2px" }}>
            {requiresPaymentsOnAccount
              ? `50% advance payment towards upcoming tax year`
              : "No July payment required (bill < £1,000)"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px",
          color: "var(--colors-text-muted)",
          backgroundColor: "rgba(99, 102, 241, 0.05)",
          padding: "10px 14px",
          borderRadius: "8px",
        }}
      >
        <FiInfo style={{ flexShrink: 0, color: "var(--colors-primary)" }} />
        <span>
          Transfer <strong>{formatGBP(monthlyPotTransfer)}/mo</strong> into a separate high-yield
          savings account (earning interest until HMRC deadlines).
        </span>
      </div>
    </div>
  );
};

export default PaymentsOnAccountCard;
