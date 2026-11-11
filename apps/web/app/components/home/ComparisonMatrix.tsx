import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiCheck } from "react-icons/fi";
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
  backgroundColor: "surface.card",
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
  backgroundColor: "surface.subtle",
  color: "text.primary",
});

const highlightThStyle = css({
  padding: "16px 20px",
  fontWeight: "bold",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: "primary.subtle",
  color: "primary",
});

const tdStyle = css({
  padding: "16px 20px",
  borderBottom: "1px solid",
  borderColor: "border",
  color: "text.primary",
  fontWeight: "medium",
  verticalAlign: "middle",
});

const highlightTdStyle = css({
  padding: "16px 20px",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: "primary.subtle",
  verticalAlign: "middle",
});

const checkBadge = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "status.positive.text",
  fontWeight: "semibold",
});

const FEATURES = [
  "UK £100k–£125k Personal Allowance taper and childcare trap",
  "Section 24 buy-to-let finance cost disallowance",
  "Workplace pension auto-enrolment and salary sacrifice",
  "Debt avalanche vs snowball payoff schedules",
  "Safe to spend allowance factoring emergency runway",
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
          Built for UK rules
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          The UK-specific calculations Flump models.
        </FLPText>
      </div>

      <div className={tableWrapperStyle}>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={thStyle} scope="col">
                Feature
              </th>
              <th className={highlightThStyle} scope="col">
                Flump
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature}>
                <td className={tdStyle}>{feature}</td>
                <td className={highlightTdStyle}>
                  <span className={checkBadge}>
                    <FiCheck aria-hidden="true" size={16} /> Modelled
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
