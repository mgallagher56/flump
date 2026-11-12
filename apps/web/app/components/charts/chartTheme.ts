/**
 * Unified chart theming and tooltip tokens for Recharts across Flump.
 * Ensures consistent dark/light mode surface elevation and high-contrast typography.
 */
import type { CSSProperties } from "react";

export const chartTooltipContentStyle: CSSProperties = {
  backgroundColor: "var(--colors-surface)",
  borderColor: "var(--colors-border)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: "10px",
  boxShadow: "var(--shadows-floating)",
  padding: "10px 14px",
  color: "var(--colors-text-primary)",
  fontSize: "12px",
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--colors-text-primary)",
  padding: "2px 0",
  fontSize: "12px",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--colors-text-muted)",
  fontWeight: 600,
  marginBottom: "4px",
  fontSize: "11px",
};
