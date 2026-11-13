import type { FC } from "react";
import { TOOL_TILES, type ToolTileData } from "../../toolsCatalog";
import { ToolTile } from "../ToolTile";
import { toolsGrid } from "./ToolsGrid.styles";

export interface ToolsGridProps {
  tools?: readonly ToolTileData[];
}

/** Equal-sized calculator tiles in catalogue order. */
export const ToolsGrid: FC<ToolsGridProps> = ({ tools = TOOL_TILES }) => (
  <ul aria-label="Calculators" className={toolsGrid()}>
    {tools.map((tool) => (
      <li key={tool.slug}>
        <ToolTile tool={tool} />
      </li>
    ))}
  </ul>
);

export default ToolsGrid;
