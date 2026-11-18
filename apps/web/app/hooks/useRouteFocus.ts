import { useEffect, useRef } from "react";
import { NavigationType, useLocation, useNavigationType } from "react-router";

/**
 * After a link opens a new page, move focus to `<main id={mainId}>` (without scrolling), so a
 * keyboard or screen-reader user starts on the new page instead of on the link they used in the
 * bar or the drawer, low on the old page. Scroll position itself is `<ScrollRestoration>`'s job.
 *
 * Left alone: the first load, back and forward (the browser and `<ScrollRestoration>` restore the
 * old place), links to an anchor (the target is the place), a change of query string only (a tab
 * or filter on the same page), and a page that has already put focus inside `<main>` itself.
 */
export function useRouteFocus(mainId = "main-content"): void {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const lastPathname = useRef(pathname);
  // Read through a ref so the effect runs on a change of page only, not of query or history type.
  const latest = useRef({ hash, navigationType });
  latest.current = { hash, navigationType };

  useEffect(() => {
    // The first render, and a change of query or hash on the same page, keep focus where it is.
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (latest.current.navigationType === NavigationType.Pop || latest.current.hash) return;
    const main = document.getElementById(mainId);
    if (!main) return;
    const active = document.activeElement;
    if (active && active !== document.body && main.contains(active)) return;
    main.focus({ preventScroll: true });
  }, [pathname, mainId]);
}
