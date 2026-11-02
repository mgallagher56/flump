import { createContext, type FC, type ReactNode, useCallback, useContext, useState } from "react";
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
}> = ({ children, initialIsMobile }) => {
  const detectedIsMobile = useIsMobile();
  const isMobile = initialIsMobile !== undefined ? initialIsMobile : detectedIsMobile;
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
