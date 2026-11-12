import type { FC } from "react";
import { sceneClasses as c } from "./Illustration.styles";

export type IllustrationScene = "empty-accounts" | "empty-goals" | "onboarding" | "not-found";

const Ground: FC = () => <ellipse className={c.sand} cx="120" cy="152" rx="106" ry="18" />;

/** Stacked cards, nothing linked yet. */
const EmptyAccounts: FC = () => (
  <>
    <Ground />
    <circle className={c.apricot} cx="196" cy="38" r="30" opacity="0.4" />
    <circle className={c.apricot} cx="196" cy="38" r="18" />
    <rect
      className={c.sage}
      height="62"
      rx="14"
      transform="rotate(8 152 97)"
      width="108"
      x="98"
      y="66"
    />
    <rect
      className={c.tealSoft}
      height="62"
      rx="14"
      transform="rotate(-6 110 99)"
      width="108"
      x="56"
      y="68"
    />
    <rect className={c.teal} height="66" rx="14" width="112" x="64" y="76" />
    <rect className={c.paper} height="10" opacity="0.85" rx="5" width="40" x="78" y="92" />
    <circle className={c.apricot} cx="160" cy="118" r="8" />
    <path className={c.dots} d="M40 70C52 54 66 46 84 42" />
  </>
);

/** A target with a flag on top, no goals set yet. */
const EmptyGoals: FC = () => (
  <>
    <Ground />
    <circle className={c.apricot} cx="50" cy="48" r="26" opacity="0.4" />
    <circle className={c.apricot} cx="50" cy="48" r="15" />
    <circle className={c.tealSoft} cx="120" cy="108" r="46" />
    <circle className={c.paper} cx="120" cy="108" r="32" />
    <circle className={c.teal} cx="120" cy="108" r="16" />
    <circle className={c.apricot} cx="120" cy="108" r="6" />
    <path className={c.pole} d="M120 108V40" />
    <path className={c.leaf} d="M120 40h34l-8 11 8 11h-34z" />
    <path className={c.dots} d="M174 118C190 108 200 96 204 80" />
  </>
);

/** Three rising steps with a sprout: the start of something. */
const Onboarding: FC = () => (
  <>
    <Ground />
    <circle className={c.apricot} cx="190" cy="40" r="34" opacity="0.4" />
    <circle className={c.apricot} cx="190" cy="40" r="20" />
    <path className={c.dots} d="M52 96C80 62 118 54 148 44" />
    <rect className={c.sage} height="44" rx="14" width="52" x="26" y="108" />
    <rect className={c.tealSoft} height="68" rx="14" width="52" x="84" y="84" />
    <rect className={c.teal} height="94" rx="14" width="52" x="142" y="58" />
    <path className={c.stem} d="M168 58V38" />
    <path className={c.sage} d="M168 44c-13 0-19-6-19-17 12 0 19 6 19 17z" />
    <path className={c.leaf} d="M168 38c11 0 17-5 17-14-11 0-17 5-17 14z" />
  </>
);

/** A signpost that points two ways, for pages that cannot be found. */
const NotFound: FC = () => (
  <>
    <Ground />
    <circle className={c.apricot} cx="44" cy="44" r="28" opacity="0.4" />
    <circle className={c.apricot} cx="44" cy="44" r="16" />
    <rect className={c.teal} height="104" rx="5" width="10" x="115" y="46" />
    <path className={c.tealSoft} d="M120 52h64l16 14-16 14h-64z" />
    <path className={c.sage} d="M120 90H64L48 104l16 14h56z" />
    <path className={c.leaf} d="M82 148c-12 0-18-6-18-16 11 0 18 5 18 16z" />
    <path className={c.dots} d="M150 128C170 128 186 122 200 112" />
  </>
);

export const scenes: Record<IllustrationScene, FC> = {
  "empty-accounts": EmptyAccounts,
  "empty-goals": EmptyGoals,
  onboarding: Onboarding,
  "not-found": NotFound,
};

export const illustrationScenes = Object.keys(scenes) as IllustrationScene[];
