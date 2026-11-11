import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiCheck } from "react-icons/fi";

const tableStyle = css({
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  borderRadius: "2xl",
  overflow: "hidden",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "card",
  boxShadow: "card",
});

const thStyle = css({
  padding: "16px 20px",
  fontSize: "xs",
  fontWeight: "600",
  letterSpacing: "0.01em",
  textAlign: "left",
  backgroundColor: "surface.subtle",
  borderBottom: "1px solid",
  borderColor: "border",
  color: "text.secondary",
});

const flumpThStyle = css({
  padding: "16px 20px",
  fontSize: "sm",
  fontWeight: "800",
  textAlign: "left",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: "surface.tinted",
  color: "primary",
  borderLeft: "2px solid",
  borderRight: "2px solid",
  borderLeftColor: "primary",
  borderRightColor: "primary",
});

const tdStyle = css({
  padding: "16px 20px",
  fontSize: "sm",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  color: "text.secondary",
});

const flumpTdStyle = css({
  padding: "16px 20px",
  fontSize: "sm",
  borderBottom: "1px solid",
  borderColor: "border",
  backgroundColor: "surface.tinted",
  color: "primary",
  fontWeight: "600",
  borderLeft: "2px solid",
  borderRight: "2px solid",
  borderLeftColor: "primary",
  borderRightColor: "primary",
});

const rowStyle = css({
  backgroundColor: "surface.card",
  "&:nth-of-type(even)": { backgroundColor: "surface.subtle" },
});

const featureCellStyle = css({ fontWeight: "600", color: "text.primary" });

const builtInStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "status.positive.text",
  fontWeight: "700",
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
    <SectionBand
      id="comparison"
      tone="canvas"
      indexBadge="Why Flump"
      title="Built for UK rules"
      subtitle="The UK-specific calculations Flump models."
    >
      <div style={{ overflowX: "auto" }}>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={thStyle} style={{ width: "70%" }}>
                Feature
              </th>
              <th className={flumpThStyle} style={{ width: "30%" }}>
                Flump
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature} className={rowStyle}>
                <td className={`${tdStyle} ${featureCellStyle}`}>{feature}</td>
                <td className={flumpTdStyle}>
                  <span className={builtInStyle}>
                    <FiCheck size={18} aria-hidden="true" /> Modelled
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionBand>
  );
};
