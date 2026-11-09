import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiCheck, FiMinus, FiX } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const containerStyle = css({
  maxWidth: "5xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "96px" },
});

const headerContainerStyle = css({
  textAlign: "center",
  maxWidth: "3xl",
  margin: "0 auto 40px auto",
});

const tableWrapperStyle = css({
  overflowX: "auto",
  borderRadius: "2xl",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  boxShadow: "sm",
});

const tableStyle = css({
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
  fontSize: "sm",
});

const thStyle = css({
  padding: "16px 20px",
  fontWeight: "semibold",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: "rgba(0, 0, 0, 0.02)",
  color: "text.primary",
});

const highlightThStyle = css({
  padding: "16px 20px",
  fontWeight: "bold",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: "rgba(99, 102, 241, 0.08)",
  color: "primary",
});

const tdStyle = css({
  padding: "16px 20px",
  borderBottom: "1px solid",
  borderColor: "border",
  color: "text.muted",
  verticalAlign: "middle",
});

const highlightTdStyle = css({
  padding: "16px 20px",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: "rgba(99, 102, 241, 0.03)",
  color: "text.primary",
  fontWeight: "medium",
  verticalAlign: "middle",
});

const checkBadge = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "#10b981",
  fontWeight: "semibold",
});

const xBadge = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "#ef4444",
});

const minusBadge = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "text.muted",
});

const rows = [
  {
    feature: "HMRC tax-year tracking (6 Apr – 5 Apr)",
    spreadsheets: "Manual maintenance",
    genericApps: "Calendar year only (Jan–Dec)",
    flump: "Automated UK tax ledger",
  },
  {
    feature: "£100k Personal Allowance taper alert",
    spreadsheets: "Complex nested formulas",
    genericApps: "Not supported",
    flump: "Built-in 60% tax trap engine",
  },
  {
    feature: "Section 24 landlord relief restriction",
    spreadsheets: "Fragile manual formulas",
    genericApps: "Not supported",
    flump: "20% basic rate credit built-in",
  },
  {
    feature: "Mortgage overpayment vs ISA comparison",
    spreadsheets: "Advanced custom modelling",
    genericApps: "Not supported",
    flump: "One-click comparison engine",
  },
  {
    feature: "UK auto-enrolment pension rules",
    spreadsheets: "Manual percentage updates",
    genericApps: "Flat contribution only",
    flump: "Qualifying earnings bands built-in",
  },
  {
    feature: "Zero tracker telemetry and private mode",
    spreadsheets: "Offline only",
    genericApps: "Often sells or monetises financial data",
    flump: "100% private and open source",
  },
];

export const ComparisonMatrix: FC = () => {
  return (
    <section aria-labelledby="comparison-heading" className={containerStyle}>
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
          Why Flump
        </span>
        <FLPHeading as="h2" color="text.primary" id="comparison-heading" mb={3} size="3xl">
          Engineered for UK reality, not generic budgets
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          See how Flump compares to spreadsheets and generic US-first budgeting applications.
        </FLPText>
      </div>

      <div className={tableWrapperStyle}>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={thStyle} scope="col">
                Capability
              </th>
              <th className={thStyle} scope="col">
                Spreadsheets
              </th>
              <th className={thStyle} scope="col">
                Generic budget apps
              </th>
              <th className={highlightThStyle} scope="col">
                Flump
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={tdStyle} style={{ fontWeight: "medium", color: "text.primary" }}>
                  {row.feature}
                </td>
                <td className={tdStyle}>
                  <span className={minusBadge}>
                    <FiMinus aria-hidden="true" /> {row.spreadsheets}
                  </span>
                </td>
                <td className={tdStyle}>
                  <span className={xBadge}>
                    <FiX aria-hidden="true" /> {row.genericApps}
                  </span>
                </td>
                <td className={highlightTdStyle}>
                  <span className={checkBadge}>
                    <FiCheck aria-hidden="true" size={16} /> {row.flump}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ComparisonMatrix;
