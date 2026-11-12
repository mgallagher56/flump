import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import useIsMobile from "~/hooks/useIsMobile";

export interface ResponsiveContextValue {
  isMobile: boolean;
  isMobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleMobileDrawer: () => void;
}

const ResponsiveContext = createContext<ResponsiveContextValue>({
  isMobile: false,
  isMobileDrawerOpen: false,
  setMobileDrawerOpen: () => {},
  toggleMobileDrawer: () => {},
});

export const ResponsiveProvider: FC<{
  children: ReactNode;
  initialIsMobile?: boolean;
  /** Server guess (user agent) for the SSR and hydration render only; replaced by the real viewport after mount. */
  serverIsMobile?: boolean;
}> = ({ children, initialIsMobile, serverIsMobile }) => {
  const detectedIsMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const viewportIsMobile =
    !mounted && serverIsMobile !== undefined ? serverIsMobile : detectedIsMobile;
  const isMobile = initialIsMobile !== undefined ? initialIsMobile : viewportIsMobile;
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleMobileDrawer = useCallback(() => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  return (
    <ResponsiveContext.Provider
      value={{
        isMobile,
        isMobileDrawerOpen,
        setMobileDrawerOpen,
        toggleMobileDrawer,
      }}
    >
      {children}
    </ResponsiveContext.Provider>
  );
};

export const useResponsive = (): ResponsiveContextValue => useContext(ResponsiveContext);
