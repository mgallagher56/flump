import { OPTIONAL_STORAGE_KEY, StoragePreference, THEME_STORAGE_KEY } from "@repo/ui";
import type { FC } from "react";
import { LegalLink, LegalPage, LegalSection } from "../../components/LegalPage";
import { MOTION_STORAGE_KEY } from "../../motion/motionScript";
import { item, itemList, versionHistory } from "./CookiesPage.styles";

interface StoredItem {
  /** The key as it appears in the browser's storage tools. */
  name: string;
  kind: string;
  purpose: string;
  lifetime: string;
}

/**
 * Needed to do what you asked: sign-in, your invite, and choices you made. PECR Schedule A1
 * paragraph 4 (strictly necessary). Mirrors `browser_storage` in docs/system/value-map.yaml.
 */
export const NEEDED_ITEMS: StoredItem[] = [
  {
    name: "__Host-wos-session",
    kind: "Cookie, set by the Flump app",
    purpose: "Keeps you signed in. It is sealed, and scripts on the page cannot read it.",
    lifetime: "Up to 14 days after you last used Flump, and removed when you sign out.",
  },
  {
    name: "flump_has_session",
    kind: "Cookie, set by the Flump app",
    purpose: "Holds the number 1 to show that you may be signed in. It holds nothing about you.",
    lifetime: "Up to 14 days after you last used Flump, and removed when you sign out.",
  },
  {
    name: "flump_invite",
    kind: "Cookie, set by the Flump app",
    purpose:
      "Holds the code from your invite link until you have signed in, so the invite can be used.",
    lifetime: "1 hour, or until the invite is used.",
  },
  {
    name: THEME_STORAGE_KEY,
    kind: "Local storage, on this site and in the Flump app",
    purpose: "Remembers that you chose the light or the dark theme. Set only when you choose one.",
    lifetime: 'Until you choose "System theme" again, which removes it.',
  },
  {
    name: MOTION_STORAGE_KEY,
    kind: "Local storage, on this site",
    purpose: "Remembers that you chose Reduce motion. Set only when you choose it.",
    lifetime: 'Until you press "Reduce motion" again, which removes it.',
  },
  {
    name: OPTIONAL_STORAGE_KEY,
    kind: "Local storage, on this site and in the Flump app",
    purpose: "Remembers that you switched off the optional notes below. Set only when you do.",
    lifetime: "Until you switch them back on, which removes it.",
  },
  {
    name: "flump_onboarding_seed",
    kind: "Cookie and local storage",
    purpose:
      "Carries the salary you typed into the pay calculator on this site into account setup. Not used while Flump is invite-only.",
    lifetime:
      "The cookie lasts 1 hour. The stored copy stays until you clear it or sign out of the Flump app.",
  },
];

/**
 * Only change how pages look or behave on a return view. PECR Schedule A1 paragraph 6: allowed
 * without consent when explained and when there is a simple way to object, which is the switch.
 * Mirrors `OPTIONAL_SESSION_KEY_PREFIXES` in `@repo/ui`.
 */
export const OPTIONAL_ITEMS: StoredItem[] = [
  {
    name: "flump-marketing-scroll",
    kind: "Session storage, on this site",
    purpose:
      "Remembers how far down each page you were, so going back returns you to the same place.",
    lifetime: "Until you close the tab.",
  },
  {
    name: "flump.scene-settled.*",
    kind: "Session storage, on this site and in the Flump app",
    purpose: "Remembers which illustrations have already moved into place, so they do not replay.",
    lifetime: "Until you close the tab.",
  },
  {
    name: "flump.setup-step-count",
    kind: "Session storage, in the Flump app",
    purpose: "Remembers how many setup steps were done, so the progress ring fills only once.",
    lifetime: "Until you close the tab.",
  },
];

const Items: FC<{ items: StoredItem[]; label: string }> = ({ items, label }) => (
  <dl aria-label={label} className={itemList()}>
    {items.map((stored) => (
      <div className={item()} data-storage-key={stored.name} key={stored.name}>
        <dt>
          <code>{stored.name}</code>
        </dt>
        <dd>{stored.kind}</dd>
        <dd>{stored.purpose}</dd>
        <dd>{stored.lifetime}</dd>
      </div>
    ))}
  </dl>
);

/**
 * Cookie and browser storage statement (E19 C3). No consent banner: nothing Flump stores needs
 * consent under PECR regulation 6 and Schedule A1. The three optional items carry the objection
 * switch that paragraph 6 requires. The evidence and the reviewer's verdict are in
 * docs/legal/legal-pages-review.md.
 */
export const CookiesPage: FC = () => (
  <LegalPage
    description="Every cookie and browser storage item Flump uses, what each is for, how long it lasts, and how to switch off the optional ones."
    intro="What Flump keeps in your browser, what each item is for, and how to switch off the ones that are optional."
    page="cookies"
  >
    <LegalSection id="summary" title="The short version">
      <ul>
        <li>Flump uses no advertising cookies and no tracking or analytics cookies.</li>
        <li>No other company's trackers are loaded on this site or in the Flump app.</li>
        <li>
          Flump keeps a few items it needs to sign you in and remember your choices. The law does
          not ask for your consent for these, so there is no cookie banner.
        </li>
        <li>
          Three optional items make pages behave the same when you come back. You can switch them
          off below.
        </li>
      </ul>
    </LegalSection>

    <LegalSection id="needed" title="Items Flump needs">
      <p>
        These are needed to do what you asked for: sign in, use an invite, or keep a choice you
        made. They cannot be switched off here. You can clear them in your browser, which signs you
        out.
      </p>
      <Items items={NEEDED_ITEMS} label="Items Flump needs" />
      <p>
        Sign-in pages are run by our sign-in provider, WorkOS, at its own web address. Those pages
        set the cookies WorkOS needs to sign you in.
      </p>
    </LegalSection>

    <LegalSection id="optional" title="Optional items">
      <p>
        These only change how pages look or behave on a return view. They stay in your browser tab
        and are not sent to Flump. They are on unless you switch them off.
      </p>
      <Items items={OPTIONAL_ITEMS} label="Optional items" />
      <StoragePreference id="cookies-storage-preference" />
      <p>
        The switch covers this site in this browser. The Flump app is at a different web address and
        has the same switch in Settings, under "Data and export".
      </p>
    </LegalSection>

    <LegalSection id="page-counts" title="Counting page views">
      <p>
        Flump can count how often each page of this site is opened. The count is made on our server
        from the page address and the name of the site you came from. It uses no cookie, no browser
        storage and nothing that identifies you. It is switched off today.
      </p>
    </LegalSection>

    <LegalSection id="clearing" title="Clearing what is stored">
      <p>
        Your browser's settings let you see and delete cookies and site data for any site. Signing
        out of Flump removes the sign-in cookies. Private or incognito windows clear everything when
        you close them.
      </p>
      <p>
        The <LegalLink to="/privacy">privacy notice</LegalLink> covers the data Flump holds on its
        servers.
      </p>
    </LegalSection>

    <LegalSection id="changes" title="Changes to this page">
      <p>When Flump starts or stops using an item, this page and its version change with it.</p>
      <ul className={versionHistory()}>
        <li>Version 0.2, 28 November 2026: adds the item that remembers Reduce motion.</li>
        <li>Version 0.1, 25 November 2026: first version, for the test phase.</li>
      </ul>
    </LegalSection>
  </LegalPage>
);
