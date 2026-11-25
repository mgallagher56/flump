import { CollapsibleDrawer, VisuallyHidden } from "@repo/ui";
import type { FC } from "react";
import { MTD_NOTICE_DETAILS_LABEL, type MtdNoticeCopy, type MtdNoticeLink } from "../../mtdNotice";
import { details, link, links, root, text } from "./MtdNotice.styles";

export interface MtdNoticeProps {
  /** From `mtdNoticeCopy`. Nothing renders when it is null. */
  copy: MtdNoticeCopy | null;
}

const LinkList: FC<{ items: readonly MtdNoticeLink[] }> = ({ items }) => (
  <ul className={links()}>
    {items.map((item) => (
      <li key={item.href}>
        <a className={link()} href={item.href} rel="noopener noreferrer" target="_blank">
          {item.label}
          <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
        </a>
      </li>
    ))}
  </ul>
);

/**
 * The Making Tax Digital for Income Tax line (E28 A3) on Self Assessment and Invoicing. Standing
 * information about a legal duty, not a prompt: one quiet line, always in place, with the detail
 * in a closed section. No alert styling, nothing to dismiss and nothing stored (coordinator, 25
 * November 2026).
 */
export const MtdNotice: FC<MtdNoticeProps> = ({ copy }) => {
  if (!copy) return null;
  return (
    <div className={root()} id="mtd-notice" data-testid="mtd-notice" data-kind={copy.kind}>
      <p className={text()}>{copy.lead.join(" ")}</p>
      {copy.details.length > 0 ? (
        <CollapsibleDrawer title={MTD_NOTICE_DETAILS_LABEL} variant="quiet">
          <div className={details()}>
            {copy.details.map((sentence) => (
              <p className={text()} key={sentence}>
                {sentence}
              </p>
            ))}
            <LinkList items={copy.links} />
          </div>
        </CollapsibleDrawer>
      ) : (
        <LinkList items={copy.links} />
      )}
    </div>
  );
};
