import type { FC, ReactNode } from "react";
import { Route } from "react-router-dom";
import { Header } from "../src/components/Header";
import { AiConnectionProto } from "./others/pages/AiConnection";
import { DebtProto, PayProto } from "./others/pages/AreaPage";
import { ContactProto } from "./others/pages/Contact";
import { FeaturesIndexProto } from "./others/pages/FeaturesIndex";
import { NotFoundProto } from "./others/pages/NotFound";
import { PreviewProto } from "./others/pages/Preview";
import { PricingProto } from "./others/pages/Pricing";
import { PrivacyProto } from "./others/pages/Privacy";
import { SecurityProto } from "./others/pages/Security";
import { TermsProto } from "./others/pages/Terms";
import { P1 } from "./p1/P1";
import { P1b } from "./p1b/P1b";
import { P2 } from "./p2/P2";
import { P3 } from "./p3/P3";
import { P4 } from "./p4/P4";
import { P5 } from "./p5/P5";
import { P6 } from "./p6/P6";
import { P7 } from "./p7/P7";
import { P8 } from "./p8/P8";
import { P9 } from "./p9/P9";
import { P10 } from "./p10/P10";
import { P11 } from "./p11/P11";
import { P11Images } from "./p11/P11Images";
import { P11b } from "./p11b/P11b";
import "./shared/proto.css";

interface Entry {
  path: string;
  Page: FC;
  title: string;
  about: string;
}

const ROUND_ONE: Entry[] = [
  {
    path: "1",
    Page: P1,
    title: "1. Micro-interactions",
    about: "CSS only. Hover, focus and press responses, headings that clear as they arrive.",
  },
  {
    path: "2",
    Page: P2,
    title: "2. Scroll story",
    about: "The fog over the sample dashboard thins as you scroll, then sections with depth.",
  },
  {
    path: "3",
    Page: P3,
    title: "3. 3D hero",
    about: "The Flump orb as a lit sphere in soft fog that parts as you scroll.",
  },
];

const ROUND_TWO: Entry[] = [
  {
    path: "1b",
    Page: P1b,
    title: "1b. Micro-interactions, extended",
    about: "Prototype 1 with pointer light, tilt, counting figures, a theme wipe and page fades.",
  },
  {
    path: "4",
    Page: P4,
    title: "4. The picture assembles",
    about: "Six pieces of a household's money fly together into one sample dashboard.",
  },
  {
    path: "5",
    Page: P5,
    title: "5. Five scenes",
    about: "One short scene per area: cards dealt, a budget bar, a payslip unfolding, two lines.",
  },
  {
    path: "6",
    Page: P6,
    title: "6. The orb as a guide",
    about: "A glass orb travels beside the page and changes shape with each section.",
  },
  {
    path: "7",
    Page: P7,
    title: "7. Fly-through",
    about: "The camera moves forward past sample cards and ends on the finished dashboard.",
  },
];

const ROUND_THREE: Entry[] = [
  {
    path: "8",
    Page: P8,
    title: "8. Assembled",
    about: "Prototype 4's hero and pages with prototype 5's scenes, calmer.",
  },
  {
    path: "9",
    Page: P9,
    title: "9. The journey",
    about: "Prototype 7's fly-through, alternating sides, with coloured glass from 6.",
  },
  {
    path: "10",
    Page: P10,
    title: "10. Both",
    about: "The assembling hero, a short journey, two scenes, the pay rise and questions.",
  },
];

const ROUND_FOUR: Entry[] = [
  {
    path: "11",
    Page: P11,
    title: "11. Both, reworked",
    about:
      "Prototype 10 with a longer journey whose cards rest while the orb moves, glass images throughout.",
  },
  {
    path: "11b",
    Page: P11b,
    title: "11b. Both, reworked, no three.js",
    about: "The same page with the journey built from CSS depth and GSAP only, for comparison.",
  },
  {
    path: "11-images",
    Page: P11Images,
    title: "11 images",
    about: "Each spot illustration from the live site beside the image that replaces it in 11.",
  },
];

/** Other pages, round one (OTHER-PAGES-PLAN R1): built from prototype 11's blocks. */
const OTHER_PAGES: Entry[] = [
  {
    path: "others/features",
    Page: FeaturesIndexProto,
    title: "Features index",
    about: "The features page: hero with the scene, Start here cards, every group as a glass card.",
  },
  {
    path: "others/pay",
    Page: PayProto,
    title: "Area page template: Pay",
    about: "The area template with the payslip unfolding beside What you see.",
  },
  {
    path: "others/debt",
    Page: DebtProto,
    title: "Area page template: Debt and borrowing",
    about: "The same template with the debt running down; violet and teal, never rose.",
  },
  {
    path: "others/pricing",
    Page: PricingProto,
    title: "Pricing",
    about: "The beta plan as a glass card; no picture, tilt or counting near the price.",
  },
  {
    path: "others/privacy",
    Page: PrivacyProto,
    title: "Legal page: Privacy",
    about: "Production's privacy notice with orbs in the header band only, or nothing.",
  },
];

/** Other pages, round two (OTHER-PAGES-PLAN R2): the special pages, same blocks as round one. */
const OTHER_PAGES_TWO: Entry[] = [
  {
    path: "others/ai",
    Page: AiConnectionProto,
    title: "AI connection",
    about: "The feature template with the question card, example questions and technical details.",
  },
  {
    path: "others/preview",
    Page: PreviewProto,
    title: "Interactive preview",
    about: "The three previews in still, solid bands; document cards replace the flat scenes.",
  },
  {
    path: "others/security",
    Page: SecurityProto,
    title: "Security and privacy",
    about: "The six facts as glass cards beside the security card, then the reporting route.",
  },
  {
    path: "others/contact",
    Page: ContactProto,
    title: "Contact",
    about: "One glass card with the address and its note; still orbs in the header only.",
  },
  {
    path: "others/terms",
    Page: TermsProto,
    title: "Legal page: Terms",
    about: "Production's terms with still orbs in the header band only, or nothing. No script.",
  },
  {
    path: "others/not-found",
    Page: NotFoundProto,
    title: "Not found",
    about: "One glass card with the Where next card and one still orb.",
  },
];

const List: FC<{ entries: Entry[] }> = ({ entries }) => (
  <ol>
    {entries.map((entry) => (
      <li key={entry.path}>
        <a href={`/prototypes/${entry.path}`}>
          <strong>{entry.title}</strong>
          <span>{entry.about}</span>
        </a>
      </li>
    ))}
  </ol>
);

const PrototypeIndex = () => (
  <div className="proto">
    <Header />
    <main className="proto-index" id="main">
      <h1>Motion prototypes</h1>
      <p>
        Throwaway versions of the marketing pages, for judging the feel. Development only: a
        production build has none of this. Each page has a panel with a reduce motion switch, the
        frame rate and the added weight. Prototypes 8 to 11b also have Speed and Bubbles controls.
      </p>
      <h2>Other pages, round two</h2>
      <p>The special pages, from the same blocks as round one.</p>
      <List entries={OTHER_PAGES_TWO} />
      <h2>Other pages, round one</h2>
      <p>
        Pages other than home, from prototype 11's blocks. Each has a Scene switch in its panel: S0
        still orbs, S1 a live scene in the first band, S2 one canvas behind the whole page.
      </p>
      <List entries={OTHER_PAGES} />
      <h2>Round four: reworked</h2>
      <List entries={ROUND_FOUR} />
      <h2>Round three: combined</h2>
      <List entries={ROUND_THREE} />
      <h2>Round two</h2>
      <List entries={ROUND_TWO} />
      <h2>Round one</h2>
      <List entries={ROUND_ONE} />
    </main>
  </div>
);

export const prototypeRoutes: ReactNode = [
  <Route element={<PrototypeIndex />} key="index" path="/prototypes" />,
  ...[
    ...ROUND_ONE,
    ...ROUND_TWO,
    ...ROUND_THREE,
    ...ROUND_FOUR,
    ...OTHER_PAGES,
    ...OTHER_PAGES_TWO,
  ].map(({ path, Page }) => <Route element={<Page />} key={path} path={`/prototypes/${path}`} />),
];
