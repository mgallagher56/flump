import { TOOL_CATALOGUE, type ToolCatalogueEntry } from "@repo/ui/tools";
import type { FC } from "react";
import { ToolTile } from "../ToolTile";
import { toolsGrid } from "./ToolsGrid.styles";

export interface ToolsGridProps {
  tools?: readonly ToolCatalogueEntry[];
}

/** Equal-sized calculator tiles in catalogue order. */
export const ToolsGrid: FC<ToolsGridProps> = ({ tools = TOOL_CATALOGUE }) => (
  <ul aria-label="Calculators" className={toolsGrid()}>
    {tools.map((tool) => (
      <li key={tool.slug}>
        <ToolTile tool={tool} />
      </li>
    ))}
  </ul>
);

export default ToolsGrid;
