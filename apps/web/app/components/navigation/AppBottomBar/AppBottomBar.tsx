import type { FC } from "react";
import { useLocation } from "react-router";
import MobileBottomBar from "../MobileBottomBar";
import { isSandboxPath } from "../navConfig";
import { spacer } from "./AppBottomBar.styles";

export interface AppBottomBarProps {
  user?: unknown;
}

/**
 * The app's bottom bar. Signed-in users get it everywhere (the shell reserves its space); the
 * signed-out visitor gets it on the demo sandbox only, with a spacer so it never covers content.
 */
export const AppBottomBar: FC<AppBottomBarProps> = ({ user }) => {
  const { pathname } = useLocation();
  if (user) return <MobileBottomBar user={user} />;
  if (!isSandboxPath(pathname)) return null;
  return (
    <>
      <div aria-hidden="true" className={spacer()} />
      <MobileBottomBar sandbox user={null} />
    </>
  );
};
