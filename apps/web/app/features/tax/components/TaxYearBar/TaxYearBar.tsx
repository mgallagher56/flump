import { Button, Icon } from "@repo/ui";
import { Copy, Trash2 } from "lucide-react";
import type { FC } from "react";
import { actions, bar, chip, iconButton, label, yearGroup } from "./TaxYearBar.styles";

export interface TaxYearBarProps {
  years: string[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
  previousYear: string;
  onCopy: () => void;
  /** Shown only when the selected year has records. */
  onDeleteYear?: () => void;
}

/** Tax year picker with the year-level actions (copy last year in, delete this year). */
export const TaxYearBar: FC<TaxYearBarProps> = ({
  years,
  selectedYear,
  onSelectYear,
  previousYear,
  onCopy,
  onDeleteYear,
}) => (
  <div className={bar()}>
    <fieldset className={yearGroup()} aria-label="Tax year">
      <span aria-hidden="true" className={label()}>
        Tax year
      </span>
      {years.map((year) => {
        const selected = year === selectedYear;
        return (
          <button
            key={year}
            aria-pressed={selected}
            className={chip({ selected })}
            type="button"
            onClick={() => onSelectYear(year)}
          >
            {year}
          </button>
        );
      })}
    </fieldset>
    <div className={actions()}>
      <Button className={iconButton()} size="sm" type="button" variant="outline" onClick={onCopy}>
        <Icon icon={Copy} size="sm" />
        Copy from {previousYear}
      </Button>
      {onDeleteYear ? (
        <Button
          className={iconButton()}
          size="sm"
          type="button"
          variant="ghost"
          onClick={onDeleteYear}
        >
          <Icon icon={Trash2} size="sm" />
          Delete {selectedYear}
        </Button>
      ) : null}
    </div>
  </div>
);

export default TaxYearBar;
