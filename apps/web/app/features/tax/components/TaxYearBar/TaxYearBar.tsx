import { Select } from "@repo/ui";
import { type FC, useId } from "react";
import { bar, label, select } from "./TaxYearBar.styles";

export interface TaxYearBarProps {
  years: string[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

/** The page's tax year control: one labelled select beside the h1. */
export const TaxYearBar: FC<TaxYearBarProps> = ({ years, selectedYear, onSelectYear }) => {
  const id = useId();
  return (
    <div className={bar()}>
      <label className={label()} htmlFor={id}>
        Tax year
      </label>
      <Select
        className={select()}
        id={id}
        size="sm"
        value={selectedYear}
        onChange={(e) => onSelectYear(e.target.value)}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default TaxYearBar;
