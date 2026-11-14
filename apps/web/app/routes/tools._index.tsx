import { PageHeader } from "@repo/ui";
import { TOOLS_INDEX_DESCRIPTION, TOOLS_INDEX_TITLE } from "@repo/ui/tools";
import type { FC } from "react";
import type { MetaFunction } from "react-router";
import { SignedOutPage } from "~/features/signed-out/components/SignedOutPage";
import { ToolsGrid } from "~/features/signed-out/components/ToolsGrid";

export const meta: MetaFunction = () => [
  { title: `${TOOLS_INDEX_TITLE} | Flump` },
  { name: "description", content: TOOLS_INDEX_DESCRIPTION },
];

/** The calculator index: h1, one line and the tiles, with no notice (E16 PR 11, D11). */
export const ToolsIndex: FC = () => (
  <SignedOutPage width="wide">
    <PageHeader description={TOOLS_INDEX_DESCRIPTION} title={TOOLS_INDEX_TITLE} />
    <ToolsGrid />
  </SignedOutPage>
);

export default ToolsIndex;
