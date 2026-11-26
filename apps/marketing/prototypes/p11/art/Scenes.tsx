import type { FC } from "react";
import { CheckInPicture, OnboardingPicture, SecurityPicture } from "./Pictures";

/*
 * The page's three scene images, under the names the bands (and 11b) already import. Each is a
 * picture in the hero pieces' family (see Pictures.tsx); the glass versions are gone.
 */

/** Replaces Illustration "check-in" beside the rough figures steps. */
export const CheckInArt: FC = () => <CheckInPicture />;

/** Replaces the security strip's shield icon tile. Decorative: the sentence beside it says it. */
export const ShieldArt: FC = () => <SecurityPicture />;

/** Replaces Illustration "onboarding" on the closing band. Decorative beside the heading. */
export const OnboardingArt: FC = () => <OnboardingPicture decorative />;
