/**
 * Unified chart theming and tooltip tokens for Recharts across Flump.
 * Ensures consistent dark/light mode surface elevation and high-contrast typography.
 */
import type { CSSProperties } from "react";

export const chartTooltipContentStyle: CSSProperties = {
  backgroundColor: "var(--colors-surface, #1e293b)",
  borderColor: "var(--colors-border, #334155)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: "10px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
  padding: "10px 14px",
  color: "var(--colors-text-primary, #f8fafc)",
  fontSize: "12px",
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--colors-text-primary, #f8fafc)",
  padding: "2px 0",
  fontSize: "12px",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--colors-text-muted, #94a3b8)",
  fontWeight: 600,
  marginBottom: "4px",
  fontSize: "11px",
};
