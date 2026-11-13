import { type FC, type KeyboardEvent, type ReactNode, useRef } from "react";
import { list, panel, root, tab } from "./TaxTabs.styles";

export interface TaxTabItem<V extends string = string> {
  value: V;
  label: string;
}

export interface TaxTabsProps<V extends string = string> {
  items: ReadonlyArray<TaxTabItem<V>>;
  value: V;
  onValueChange: (value: V) => void;
  /** Accessible name for the tab list. */
  label: string;
  /** Prefix for the tab and panel ids. */
  idBase: string;
  /** Content of the selected tab. */
  children: ReactNode;
}

/**
 * Tabs with automatic activation and arrow-key movement (WAI-ARIA tabs pattern). Only the
 * selected panel is rendered; it is labelled by its tab.
 * TODO(E15 T2.x): fold back into `@repo/ui` SegmentedTabs once it can own its panels.
 */
export const TaxTabs = <V extends string>({
  items,
  value,
  onValueChange,
  label,
  idBase,
  children,
}: TaxTabsProps<V>): ReturnType<FC> => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value),
  );

  const move = (next: number) => {
    const target = (next + items.length) % items.length;
    onValueChange(items[target].value);
    refs.current[target]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number;
    if (e.key === "ArrowRight") next = index + 1;
    else if (e.key === "ArrowLeft") next = index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    move(next);
  };

  return (
    <div className={root()}>
      <div aria-label={label} className={list()} role="tablist" onKeyDown={onKeyDown}>
        {items.map((item, i) => {
          const selected = i === index;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              aria-controls={`${idBase}-panel`}
              aria-selected={selected}
              className={tab()}
              id={`${idBase}-tab-${item.value}`}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
              onClick={() => onValueChange(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        aria-labelledby={`${idBase}-tab-${items[index]?.value}`}
        className={panel()}
        id={`${idBase}-panel`}
        role="tabpanel"
      >
        {children}
      </div>
    </div>
  );
};

export default TaxTabs;
