import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiCheck, FiX } from "react-icons/fi";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const tableStyle = css({
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  borderRadius: "xl",
  overflow: "hidden",
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  boxShadow: { base: "0 6px 20px rgba(0,0,0,0.03)", _dark: "0 6px 20px rgba(0,0,0,0.2)" },
});

const thStyle = css({
  padding: "16px",
  fontSize: "14px",
  fontWeight: "700",
  textAlign: "left",
  backgroundColor: { base: "slate.50", _dark: "dark.bg" },
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  color: { base: "slate.900", _dark: "#ffffff" },
});

const flumpThStyle = css({
  padding: "16px",
  fontSize: "14px",
  fontWeight: "700",
  textAlign: "left",
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  backgroundColor: { base: "#eef2ff", _dark: "rgba(99, 102, 241, 0.15)" },
  color: { base: "#4338ca", _dark: "#a5b4fc" },
});

const tdStyle = css({
  padding: "14px 16px",
  fontSize: "14px",
  borderBottom: "1px solid",
  borderColor: { base: "slate.100", _dark: "slate.800" },
  color: { base: "slate.700", _dark: "slate.300" },
});

const flumpTdStyle = css({
  padding: "14px 16px",
  fontSize: "14px",
  borderBottom: "1px solid",
  borderColor: { base: "slate.100", _dark: "slate.800" },
  backgroundColor: { base: "#f5f7ff", _dark: "rgba(99, 102, 241, 0.08)" },
  color: { base: "#3730a3", _dark: "#c7d2fe" },
  fontWeight: "600",
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
      feature: "FCA Open Banking Read-Only Sync (UK Banks & Cards)",
      flump: true,
      spreadsheet: false,
      genericApp: "US Centric / Incomplete",
    },
    {
      feature: "UK £100k–£125k Personal Allowance Taper & Childcare Trap",
      flump: true,
      spreadsheet: "Manual complex formulas",
      genericApp: false,
    },
    {
      feature: "Section 24 Buy-to-Let Finance Cost Disallowance",
      flump: true,
      spreadsheet: false,
      genericApp: false,
    },
    {
      feature: "Workplace Pension Auto-Enrolment & Salary Sacrifice",
      flump: true,
      spreadsheet: "Prone to formula drift",
      genericApp: false,
    },
    {
      feature: "Debt Avalanche vs Snowball with 3-Year Wealth Bridge",
      flump: true,
      spreadsheet: "Complex macro required",
      genericApp: "Basic snowball only",
    },
    {
      feature: "Safe-to-Spend Allowance factoring Emergency Runway",
      flump: true,
      spreadsheet: false,
      genericApp: "Static backward budgets",
    },
  ];

  return (
    <section className={containerStyle}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            color: "#6363f1",
          }}
        >
          Why Flump?
        </span>
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: "800",
            color: "var(--colors-text-primary, #0f172a)",
            marginTop: "8px",
          }}
        >
          Built for UK Rules, Not Generic Spreadsheets
        </h2>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={thStyle} style={{ width: "45%" }}>
                Feature / Capability
              </th>
              <th className={flumpThStyle} style={{ width: "25%" }}>
                Flump 🇬🇧
              </th>
              <th className={thStyle} style={{ width: "15%" }}>
                Excel / Sheets
              </th>
              <th className={thStyle} style={{ width: "15%" }}>
                Generic Apps
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
                      }}
                    >
                      <FiCheck size={18} /> Yes (Built-in)
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
    </section>
  );
};
