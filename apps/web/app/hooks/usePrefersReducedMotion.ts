import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(QUERY);
    const listener = () => setReduced(media.matches);
    listener();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return reduced;
};

export { usePrefersReducedMotion };
export default usePrefersReducedMotion;
