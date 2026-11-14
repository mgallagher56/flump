import { CollapsibleDrawer } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { dataRow, dataRowDrawer, dataRowEnd, dataRowNote } from "./ChartDataRow.styles";

export interface ChartDataRowProps {
  /** The chart's data table, behind a quiet "Show data" drawer. */
  table?: ReactNode;
  /**
   * Quiet links (`Button variant="link"`) or a button for the row. Keep them short: with a table
   * they share the line with "Show data".
   */
  actions?: ReactNode;
  /** One line of quiet text under the row (for example "Next check-in: 1 December 2026"). */
  note?: ReactNode;
}

/**
 * "Show data" and the caller's quiet links in one aligned row under a chart, with an optional
 * note below. Shared by net worth history and the account page so both read the same.
 */
export const ChartDataRow: FC<ChartDataRowProps> = ({ table, actions, note }) => {
  if (!table && !actions && !note) return null;
  return (
    <div className={dataRow()}>
      {table ? (
        <CollapsibleDrawer className={dataRowDrawer()} title="Show data" variant="quiet">
          {table}
        </CollapsibleDrawer>
      ) : null}
      {actions ? (
        <div className={dataRowEnd({ besideDrawer: Boolean(table) })}>{actions}</div>
      ) : null}
      {note ? <p className={dataRowNote()}>{note}</p> : null}
    </div>
  );
};

export default ChartDataRow;
