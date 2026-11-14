import type { HomeLogoLinkProps } from "@repo/ui";
import { Link } from "react-router";

/** Router link slot for the shared `HomeLogo` from `@repo/ui`. */
export const renderHomeLogoLink = (props: HomeLogoLinkProps) => <Link to="/" {...props} />;
