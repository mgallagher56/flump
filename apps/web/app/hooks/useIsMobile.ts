import { useEffect, useState } from "react";

const useIsMobile = () => {
  // Start false so the first client render matches the server HTML (the server cannot know the
  // viewport); the effect below syncs the real value straight after hydration.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(max-width: 767px)");
    const listener = () => setIsMobile(media.matches);
    listener();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return isMobile;
};

export default useIsMobile;
