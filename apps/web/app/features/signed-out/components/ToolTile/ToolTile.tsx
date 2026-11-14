import { Card, Heading, Icon, IconTile, Text } from "@repo/ui";
import type { ToolCatalogueEntry } from "@repo/ui/tools";
import { TOOL_ICONS } from "@repo/ui/tools/icons";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import { tileCard, tileCta, tileLink } from "./ToolTile.styles";

export interface ToolTileProps {
  tool: ToolCatalogueEntry;
}

/** One calculator tile. Every tool uses the same size and treatment, so none is featured. */
export const ToolTile: FC<ToolTileProps> = ({ tool }) => (
  <RouterLink className={tileLink()} to={`/tools/${tool.slug}`}>
    <Card as="article" className={tileCard()} elevation="interactive" padding="lg">
      <IconTile domain={tool.domain} icon={TOOL_ICONS[tool.icon]} />
      <Heading as="h2" size="md">
        {tool.title}
      </Heading>
      <Text color="secondary" textStyle="body.sm">
        {tool.description}
      </Text>
      <span className={tileCta()}>
        Open calculator <Icon icon={ArrowRight} size="sm" />
      </span>
    </Card>
  </RouterLink>
);

export default ToolTile;
