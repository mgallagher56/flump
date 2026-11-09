import { SectionBand } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiCheck, FiX } from "react-icons/fi";

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
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
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
  backgroundColor: { base: "#ffffff", _dark: "transparent" },
  "&:nth-of-type(even)": {
    backgroundColor: { base: "#fcfcfd", _dark: "rgba(255, 255, 255, 0.02)" },
  },
});

export const ComparisonMatrix: FC = () => {
  const rows = [
    {
      feature: "FCA Open Banking read-only sync (UK banks and cards)",
      flump: true,
      spreadsheet: false,
      genericApp: "US-centric / incomplete",
    },
    {
      feature: "UK £100k–£125k Personal Allowance taper and childcare trap",
      flump: true,
      spreadsheet: "Complex manual formulas",
      genericApp: false,
    },
    {
      feature: "Section 24 buy-to-let finance cost disallowance",
      flump: true,
      spreadsheet: false,
      genericApp: false,
    },
    {
      feature: "Workplace pension auto-enrolment and salary sacrifice",
      flump: true,
      spreadsheet: "Prone to formula drift",
      genericApp: false,
    },
    {
      feature: "Debt avalanche vs snowball payoff schedules",
      flump: true,
      spreadsheet: "Complex macro required",
      genericApp: "Basic snowball only",
    },
    {
      feature: "Safe to spend allowance factoring emergency runway",
      flump: true,
      spreadsheet: false,
      genericApp: "Static backward budgets",
    },
  ];

  return (
    <SectionBand
      id="comparison"
      tone="canvas"
      indexBadge="Why Flump"
      title="Built for UK rules, not spreadsheets"
      subtitle="How Flump compares directly with spreadsheets and generic US-first budgeting applications."
    >
      <div style={{ overflowX: "auto" }}>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={thStyle} style={{ width: "45%" }}>
                Feature
              </th>
              <th className={flumpThStyle} style={{ width: "25%" }}>
                Flump 🇬🇧
              </th>
              <th className={thStyle} style={{ width: "15%" }}>
                Excel / Sheets
              </th>
              <th className={thStyle} style={{ width: "15%" }}>
                Generic apps
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={rowStyle}>
                <td
                  className={tdStyle}
                  style={{ fontWeight: "600", color: "var(--colors-text-primary, #1e293b)" }}
                >
                  {row.feature}
                </td>
                <td className={flumpTdStyle}>
                  {row.flump === true ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#10b981",
                        fontWeight: "700",
                      }}
                    >
                      <FiCheck size={18} /> Built-in
                    </span>
                  ) : (
                    row.flump
                  )}
                </td>
                <td className={tdStyle}>
                  {row.spreadsheet === false ? (
                    <span style={{ color: "#94a3b8" }}>
                      <FiX size={16} />
                    </span>
                  ) : (
                    <span style={{ fontSize: "13px", color: "var(--colors-text-muted, #64748b)" }}>
                      {row.spreadsheet}
                    </span>
                  )}
                </td>
                <td className={tdStyle}>
                  {row.genericApp === false ? (
                    <span style={{ color: "#94a3b8" }}>
                      <FiX size={16} />
                    </span>
                  ) : (
                    <span style={{ fontSize: "13px", color: "var(--colors-text-muted, #64748b)" }}>
                      {row.genericApp}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionBand>
  );
};
