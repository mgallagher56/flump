import { hasSessionPresenceCookie } from "@repo/common";
import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex } from "@repo/ui/styled-system/patterns";
import { type FC, useEffect, useState } from "react";
import { FiExternalLink, FiMenu, FiX } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { getAppUrl } from "../utils/url";
import { ThemeToggle } from "./ThemeToggle";

const headerStyle = css({
  position: "sticky",
  top: 0,
  zIndex: 40,
  backgroundColor: {
    base: "rgba(255, 255, 255, 0.9)",
    _dark: "rgba(22, 24, 29, 0.9)",
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

const mobileToggleButtonStyle = css({
  display: { base: "inline-flex", md: "none" },
  alignItems: "center",
  justifyContent: "center",
  width: "38px",
  height: "38px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  backgroundColor: { base: "white", _dark: "slate.900" },
  color: { base: "slate.700", _dark: "slate.200" },
  cursor: "pointer",
  fontSize: "20px",
  transition: "all 0.15s ease",
  _hover: {
    backgroundColor: { base: "slate.100", _dark: "slate.800" },
  },
});

const mobileDrawerStyle = css({
  display: { base: "block", md: "none" },
  borderTop: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  backgroundColor: {
    base: "rgba(255, 255, 255, 0.98)",
    _dark: "rgba(15, 23, 42, 0.98)",
  },
  backdropFilter: "blur(16px)",
  pt: "4",
  pb: "6",
  px: "2",
  mt: "3",
});

const mobileNavLinkStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  py: "3",
  px: "3",
  fontSize: "1rem",
  fontWeight: "500",
  color: { base: "slate.800", _dark: "slate.100" },
  borderRadius: "lg",
  textDecoration: "none",
  transition: "background-color 0.15s ease",
  _hover: {
    backgroundColor: { base: "slate.100", _dark: "slate.800" },
    color: { base: "indigo.600", _dark: "indigo.400" },
  },
});

const activeMobileNavLinkStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  py: "3",
  px: "3",
  fontSize: "1rem",
  fontWeight: "600",
  color: { base: "indigo.600", _dark: "indigo.400" },
  backgroundColor: { base: "indigo.50", _dark: "rgba(99, 102, 241, 0.12)" },
  borderRadius: "lg",
  textDecoration: "none",
});

export const Header: FC = () => {
  const [hasSession, setHasSession] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const appUrl = getAppUrl();

  useEffect(() => {
    setHasSession(hasSessionPresenceCookie());
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
            aria-label="Primary"
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
              Calculators
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
              Security
            </Link>
            <a href={`${appUrl}/sandbox`} className={navLinkStyle} target="_blank" rel="noreferrer">
              Live Demo
            </a>
          </nav>
        </div>

        <div className={flex({ align: "center", gap: "3" })}>
          <ThemeToggle />

          {/* Desktop Auth Buttons */}
          <div
            className={flex({ align: "center", gap: "2", display: { base: "none", md: "flex" } })}
          >
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

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className={mobileToggleButtonStyle}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className={mobileDrawerStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Link
              to="/tools"
              className={
                location.pathname.startsWith("/tools")
                  ? activeMobileNavLinkStyle
                  : mobileNavLinkStyle
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Calculators</span>
              <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #94a3b8)" }}>
                6 Tools
              </span>
            </Link>
            <Link
              to="/pricing"
              className={
                location.pathname === "/pricing" ? activeMobileNavLinkStyle : mobileNavLinkStyle
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Pricing</span>
              <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #94a3b8)" }}>
                Free & Pro
              </span>
            </Link>
            <Link
              to="/security"
              className={
                location.pathname === "/security" ? activeMobileNavLinkStyle : mobileNavLinkStyle
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Security</span>
              <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #94a3b8)" }}>
                FCA AISP
              </span>
            </Link>
            <a
              href={`${appUrl}/sandbox`}
              className={mobileNavLinkStyle}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                Live Demo <FiExternalLink size={14} />
              </span>
              <span style={{ fontSize: "12px", color: "var(--colors-text-muted, #94a3b8)" }}>
                Sandbox
              </span>
            </a>
          </div>

          <div
            style={{
              margin: "16px 0",
              borderTop: "1px solid var(--colors-border, rgba(148, 163, 184, 0.2))",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0 4px" }}>
            {hasSession ? (
              <a
                href={`${appUrl}/`}
                style={{ textDecoration: "none", width: "100%" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="primary" size="md" style={{ width: "100%" }}>
                  Go to Dashboard →
                </Button>
              </a>
            ) : (
              <>
                <a
                  href={`${appUrl}/signUp`}
                  style={{ textDecoration: "none", width: "100%" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="primary" size="md" style={{ width: "100%" }}>
                    Get Started Free
                  </Button>
                </a>
                <a
                  href={`${appUrl}/login`}
                  style={{ textDecoration: "none", width: "100%" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="outline" size="md" style={{ width: "100%" }}>
                    Sign In
                  </Button>
                </a>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
