import { hasSessionPresenceCookie } from "@repo/common";
import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex } from "@repo/ui/styled-system/patterns";
import { type FC, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAppUrl } from "../utils/url";
import { ThemeToggle } from "./ThemeToggle";

const headerStyle = css({
  position: "sticky",
  top: 0,
  zIndex: 40,
  backgroundColor: {
    base: "rgba(255, 255, 255, 0.85)",
    _dark: "rgba(22, 24, 29, 0.85)",
  },
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  py: "3",
  px: { base: "4", md: "8" },
});

const navLinkStyle = css({
  fontSize: "sm",
  fontWeight: "500",
  color: { base: "slate.700", _dark: "slate.300" },
  textDecoration: "none",
  transition: "color 0.15s ease",
  _hover: { color: { base: "indigo.600", _dark: "indigo.400" } },
});

const activeNavLinkStyle = css({
  fontSize: "sm",
  fontWeight: "600",
  color: { base: "indigo.600", _dark: "indigo.400" },
  textDecoration: "none",
});

const logoTextStyle = css({
  fontSize: "1.5rem",
  fontWeight: "800",
  letterSpacing: "-0.03em",
  color: { base: "slate.900", _dark: "#ffffff" },
});

const ukBadgeStyle = css({
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  backgroundColor: { base: "#e0e7ff", _dark: "rgba(99, 102, 241, 0.2)" },
  color: { base: "#4338ca", _dark: "#a5b4fc" },
  padding: "2px 8px",
  borderRadius: "9999px",
});

export const Header: FC = () => {
  const [hasSession, setHasSession] = useState(false);
  const location = useLocation();
  const appUrl = getAppUrl();

  useEffect(() => {
    setHasSession(hasSessionPresenceCookie());
  }, []);

  return (
    <header className={headerStyle}>
      <div
        className={flex({
          justify: "space-between",
          align: "center",
          maxW: "7xl",
          mx: "auto",
        })}
      >
        <div className={flex({ align: "center", gap: "8" })}>
          <Link
            to="/"
            style={{ textDecoration: "none" }}
            className={flex({ align: "center", gap: "2" })}
          >
            <span className={logoTextStyle}>
              Flump<span style={{ color: "#6363F1" }}>.</span>
            </span>
            <span className={ukBadgeStyle}>UK</span>
          </Link>

          <nav
            className={flex({
              gap: "6",
              align: "center",
              display: { base: "none", md: "flex" },
            })}
          >
            <Link
              to="/tools"
              className={location.pathname.startsWith("/tools") ? activeNavLinkStyle : navLinkStyle}
            >
              Free Calculators
            </Link>
            <Link
              to="/pricing"
              className={location.pathname === "/pricing" ? activeNavLinkStyle : navLinkStyle}
            >
              Pricing
            </Link>
            <Link
              to="/security"
              className={location.pathname === "/security" ? activeNavLinkStyle : navLinkStyle}
            >
              Security & FCA
            </Link>
            <Link
              to="/guides"
              className={
                location.pathname.startsWith("/guides") ? activeNavLinkStyle : navLinkStyle
              }
            >
              Playbooks
            </Link>
            <a href={`${appUrl}/sandbox`} className={navLinkStyle} target="_blank" rel="noreferrer">
              Live Demo
            </a>
          </nav>
        </div>

        <div className={flex({ align: "center", gap: "3" })}>
          <ThemeToggle />
          {hasSession ? (
            <a href={`${appUrl}/`} style={{ textDecoration: "none" }}>
              <Button variant="primary" size="sm">
                Go to Dashboard →
              </Button>
            </a>
          ) : (
            <>
              <a href={`${appUrl}/login`} style={{ textDecoration: "none" }}>
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </a>
              <a href={`${appUrl}/signUp`} style={{ textDecoration: "none" }}>
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
