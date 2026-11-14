import { Heading, Icon, IconTile, PageHeader, Text } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import { TOOL_CATALOGUE, TOOLS_INDEX_DESCRIPTION, TOOLS_INDEX_TITLE } from "@repo/ui/tools";
import { TOOL_ICONS } from "@repo/ui/tools/icons";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import {
  containerStyle,
  ctaLinkStyle,
  mainStyle,
  pageStyle,
  toolCardStyle,
  toolItemStyle,
  toolListStyle,
  toolTitleStyle,
} from "./ToolsIndexPage.styles";

/** The calculator index: the same titles, lines, icons and order as the web app (D11, E16 PR 11). */
export const ToolsIndexPage: FC = () => (
  <div className={pageStyle}>
    <PageMeta title={`${TOOLS_INDEX_TITLE} | Flump`} description={TOOLS_INDEX_DESCRIPTION} />

    <Header />

    <main className={mainStyle} id="main" tabIndex={-1}>
      <section className={containerStyle}>
        <PageHeader description={TOOLS_INDEX_DESCRIPTION} title={TOOLS_INDEX_TITLE} />

        {/* Eight tools: 1 column, then 2 from md (four full rows), so no card is orphaned. */}
        <ul
          aria-label="Calculators"
          className={cx(grid({ columns: { base: 1, md: 2 }, gap: "6" }), toolListStyle)}
        >
          {TOOL_CATALOGUE.map((tool) => (
            <li key={tool.slug} className={toolItemStyle}>
              <Link to={`/tools/${tool.slug}`} className={toolCardStyle}>
                <IconTile domain={tool.domain} icon={TOOL_ICONS[tool.icon]} />
                <Heading as="h2" className={toolTitleStyle} size="md">
                  {tool.title}
                </Heading>
                <Text color="secondary" textStyle="body.sm">
                  {tool.description}
                </Text>
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
