import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowRight, FiX } from "react-icons/fi";
import { Link as RouterLink } from "react-router";

const bannerStyle = css({
  position: "sticky",
  top: 0,
  zIndex: 100,
  backgroundColor: "#1e1b4b", // deep indigo
  color: "#ffffff",
  padding: "10px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "13px",
  fontWeight: "medium",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
  flexWrap: "wrap",
  gap: "10px",
});

export const DemoModeBanner: FC = () => {
  return (
    <div className={bannerStyle} data-testid="demo-mode-banner" id="demo-mode-banner">
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "full",
            backgroundColor: "rgba(99, 102, 241, 0.4)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Live Sandbox
        </span>
        <span style={{ opacity: 0.9 }}>
          Viewing interactive UK household demo data (£85k salary, Monzo, Vanguard ISA, Standard
          Life Pension, Mortgage).
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <RouterLink
          to="/signUp"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "6px",
            backgroundColor: "#6366f1",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Create Free Account to Save Your Own <FiArrowRight size={13} />
        </RouterLink>

        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            color: "rgba(255, 255, 255, 0.75)",
            fontSize: "12px",
            textDecoration: "none",
          }}
        >
          <FiX size={14} /> Exit Demo
        </a>
      </div>
    </div>
  );
};

export default DemoModeBanner;
