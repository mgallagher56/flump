import { Card, Heading, Icon, Text } from "@repo/ui";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import type { ToolTileData } from "../../toolsCatalog";
import { tileCard, tileCta, tileIcon, tileLink } from "./ToolTile.styles";

export interface ToolTileProps {
  tool: ToolTileData;
}

/** One calculator tile. Every tool uses the same size and treatment, so none is featured. */
export const ToolTile: FC<ToolTileProps> = ({ tool }) => (
  <RouterLink className={tileLink()} to={`/tools/${tool.slug}`}>
    <Card as="article" className={tileCard()} elevation="interactive" padding="lg">
      <span className={tileIcon()}>
        <Icon icon={tool.icon} />
      </span>
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
