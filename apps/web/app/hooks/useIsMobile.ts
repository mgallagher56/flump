import { NAV_INLINE_MEDIA_QUERY } from "@repo/ui";
import { useEffect, useState } from "react";

/**
 * Matches below the shared nav breakpoint (`NAV_BREAKPOINT`, 64rem = 1024px), where the top bar
 * collapses and the phone bottom bar shows. Built from the one token so the hook, the Panda
 * `_navInline` / `_navCollapsed` conditions and `lg` styles always switch at the same width.
 */
export const NAV_COLLAPSED_MEDIA_QUERY = `not all and ${NAV_INLINE_MEDIA_QUERY}`;

const useIsMobile = () => {
  // Start false so the first client render matches the server HTML (the server cannot know the
  // viewport); the effect below syncs the real value straight after hydration.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(NAV_COLLAPSED_MEDIA_QUERY);
    const listener = () => setIsMobile(media.matches);
    listener();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return isMobile;
};

export default useIsMobile;
