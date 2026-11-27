import { createContext, type FC, type ReactNode, useContext } from "react";

/**
 * Renders the marketing page's finished, still state, as reduced motion does: no entrance, deal-in
 * or assembly runs, so nothing is ever caught part-faded. For Storybook, whose stories show each
 * block at rest (ROLLOUT-PLAN section 2, "stories ... showing the rest state and the reduced-motion
 * state") and are checked by axe on that state. The page never sets it: visitors get the motion
 * their own setting allows.
 */
const StillMotionContext = createContext(false);

export function useStillMotion(): boolean {
  return useContext(StillMotionContext);
}

export const StillMotionProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <StillMotionContext.Provider value={true}>{children}</StillMotionContext.Provider>
);
