import { Icon, IconTile } from "@repo/ui";
import { css, cx } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import { TOOL_CATALOGUE, TOOLS_INDEX_DESCRIPTION, TOOLS_INDEX_TITLE } from "@repo/ui/tools";
import { TOOL_ICONS } from "@repo/ui/tools/icons";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PageMeta } from "../components/PageMeta";

const pageStyle = css({ minHeight: "100vh", display: "flex", flexDirection: "column" });

const mainStyle = css({ flex: "1" });

const containerStyle = css({ maxWidth: "6xl", mx: "auto", py: "12", px: "4" });

const headerBlockStyle = css({ marginBottom: "8", maxWidth: "3xl" });

const pageTitleStyle = css({
  fontFamily: "display",
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: "800",
  lineHeight: "1.15",
  color: "text.primary",
});

const pageLeadStyle = css({ fontSize: "lg", color: "text.secondary", marginTop: "3" });

const toolListStyle = css({ listStyle: "none", padding: "0", margin: "0" });

const toolItemStyle = css({ display: "flex", "& > a": { flex: "1" } });

const toolCardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  backgroundColor: "surface.card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  p: "6",
  textDecoration: "none",
  color: "inherit",
  boxShadow: "card",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "base",
  transitionTimingFunction: "standard",
  _hover: { borderColor: "primary", boxShadow: "cardHover" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

const toolTitleStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "700",
  color: "text.primary",
  lineHeight: "1.3",
});

const toolDescStyle = css({ fontSize: "sm", color: "text.secondary", lineHeight: "1.6" });

const ctaLinkStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  color: "primary",
  fontWeight: "600",
  fontSize: "sm",
  marginTop: "auto",
  paddingTop: "2",
});

/** The calculator index: the same titles, lines, icons and order as the web app (D11, E16 PR 11). */
export const ToolsIndexPage: FC = () => (
  <div className={pageStyle}>
    <PageMeta title={`${TOOLS_INDEX_TITLE} | Flump`} description={TOOLS_INDEX_DESCRIPTION} />

    <Header />

    <main className={mainStyle} id="main" tabIndex={-1}>
      <section className={containerStyle}>
        <div className={headerBlockStyle}>
          <h1 className={pageTitleStyle}>{TOOLS_INDEX_TITLE}</h1>
          <p className={pageLeadStyle}>{TOOLS_INDEX_DESCRIPTION}</p>
        </div>

        {/* Eight tools: 1 column, then 2 from md (four full rows), so no card is orphaned. */}
        <ul
          aria-label="Calculators"
          className={cx(grid({ columns: { base: 1, md: 2 }, gap: "6" }), toolListStyle)}
        >
          {TOOL_CATALOGUE.map((tool) => (
            <li key={tool.slug} className={toolItemStyle}>
              <Link to={`/tools/${tool.slug}`} className={toolCardStyle}>
                <IconTile domain={tool.domain} icon={TOOL_ICONS[tool.icon]} />
                <h2 className={toolTitleStyle}>{tool.title}</h2>
                <p className={toolDescStyle}>{tool.description}</p>
                <span className={ctaLinkStyle}>
                  Open calculator <Icon icon={ArrowRight} size="sm" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>

    <Footer />
  </div>
);
