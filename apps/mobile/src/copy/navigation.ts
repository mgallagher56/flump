/**
 * Navigation words (E12 S4, plan 9.7). Page names come from `src/navigation/navItems.ts`, which
 * mirrors web's locale strings; these are the words only the app needs. Plain en-GB per
 * docs/copy/COPY-GUIDE.md: say what is here today and where the rest is, never a promise or a date.
 */

/** The tab bar's name for screen readers, as web's bottom bar `nav` label (`AppBottomBar`). */
export const TAB_BAR_LABEL = "Main navigation";

/** Read after a tab's name: its place in the bar. */
export const tabPosition = (position: number, count: number) => `${position} of ${count}`;

/** The header's menu button, as web's top bar button. It opens the More list. */
export const OPEN_MENU = "Open navigation menu";

/** A page whose own slice is not built yet: what it is, and that it is on the website today. */
export const comingSoonBody = (page: string) =>
  `${page} is not in the app yet. You can use it on the Flump website.`;

export const comingSoonAction = (page: string) => `Open ${page} on the website`;

/** A link to a page the app does not know (an old or mistyped `flump://` link). */
export const PAGE_NOT_FOUND_HEADING = "We could not find that page";
/** A `flump://page/...` link whose page is not in the More list. */
export const PAGE_NOT_FOUND_BODY = "The link may be old. Go to More to find what you need.";
export const GO_TO_MORE = "Go to More";
/** Any other link the app does not know. */
export const LINK_NOT_FOUND_BODY = "The link may be old or mistyped.";
export const GO_TO_HOME = "Go to Home";
