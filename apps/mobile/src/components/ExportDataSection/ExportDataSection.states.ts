import type { ExportDataSectionProps } from "./ExportDataSection";

const onDownload = () => undefined;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const exportDataSectionStates = {
  idle: { state: "idle", onDownload },
  preparing: { state: "pending", onDownload },
  shared: { state: "shared", onDownload },
  rateLimited: { state: "rateLimited", onDownload },
  failed: { state: "failed", onDownload },
  offline: { state: "idle", disabled: true, onDownload },
} satisfies Record<string, ExportDataSectionProps>;
