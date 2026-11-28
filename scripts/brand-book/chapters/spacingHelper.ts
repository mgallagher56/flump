import { renderSpacingBlocksDiagram } from "../diagrams/spacingBlocks";
import type { BrandTokens } from "../tokens";

export function spacingBlocks(tokens: BrandTokens): string {
  return renderSpacingBlocksDiagram(tokens);
}
