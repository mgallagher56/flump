import type { FC } from "react";
import { ContactEmail, ExternalLink, LegalPage, LegalSection } from "../../components/LegalPage";
import { versionHistory } from "./AccessibilityPage.styles";

const SUBJECT = "Accessibility";

/**
 * Accessibility statement (E19 C4). It says what is tested and what is not; it claims no
 * conformance level. The checks named here are the Storybook a11y jobs in ci-pipeline.yml and the
 * page checks in apps/e2e/a11y (workflow a11y-gate.yml). Update this page when either changes. The
 * evidence and the reviewer's verdict are in docs/legal/legal-pages-review.md.
 */
export const AccessibilityPage: FC = () => (
  <LegalPage
    description="How accessible Flump aims to be, how it is tested, what has not been tested, and how to report a problem."
    intro="What we aim for, what we test, what we have not tested, and how to tell us about a problem."
    page="accessibility"
  >
    <LegalSection id="aim" title="What we aim for">
      <p>
        We want everyone to be able to use Flump. We build this site and the Flump app to the Web
        Content Accessibility Guidelines (WCAG) 2.2 at level AA.
      </p>
      <p>
        Flump has not had an independent accessibility audit. So we do not claim that it fully meets
        the standard, and parts of it may not.
      </p>
      <p>You can expect to be able to:</p>
      <ul>
        <li>use Flump with a keyboard, with a visible marker on the item in focus</li>
        <li>skip straight to the main content of a page</li>
        <li>use Flump in a light theme, a dark theme or your system's high contrast colours</li>
        <li>zoom in, or use a screen 320 pixels wide, without scrolling sideways</li>
        <li>turn off most movement with your device's reduced motion setting</li>
      </ul>
    </LegalSection>

    <LegalSection id="tested" title="What we test">
      <p>Automated checks run on every change to Flump:</p>
      <ul>
        <li>
          <strong>Every building block in our component library,</strong> such as a button, a form
          field or a chart, is checked for accessibility faults. Each is checked in the light and
          the dark theme. A fault stops the change.
        </li>
        <li>
          <strong>The main pages</strong> of this site and the signed-in app are checked against the
          WCAG 2.2 level A and AA rules that software can test. They are checked at phone and
          desktop widths, in light, dark and forced colours.
        </li>
        <li>
          <strong>On those pages</strong> a keyboard walk checks that focus is visible and not
          hidden behind a fixed bar, and that the skip link comes first. A 320 pixel check looks for
          sideways scrolling.
        </li>
      </ul>
      <p>
        On the date of this statement, our list of known failures from the page checks is empty. The
        page checks warn us about a new failure but do not stop a change.
      </p>
    </LegalSection>

    <LegalSection id="not-tested" title="What we have not tested">
      <p>Automated checks find only some accessibility problems. We have not yet:</p>
      <ul>
        <li>tested Flump with screen readers such as VoiceOver, NVDA, JAWS or TalkBack</li>
        <li>tested Flump with voice control or switch devices</li>
        <li>tested Flump with disabled people</li>
        <li>checked every chart for a text alternative that gives the same information</li>
        <li>checked invoices that you print or save as a PDF</li>
        <li>
          checked every setup step and dialog with the page checks, which cover main pages only
        </li>
      </ul>
      <p>
        Sign-in pages are run by our sign-in provider, WorkOS. We do not control them and have not
        tested them.
      </p>
    </LegalSection>

    <LegalSection id="report" title="Tell us about a problem">
      <p>
        If something in Flump is hard or impossible for you to use, email{" "}
        <ContactEmail subject={SUBJECT} />. Tell us the page, what you were trying to do and any
        assistive technology you use. Please leave out your financial details.
      </p>
      <p>
        If you need information from Flump in a different format, ask at the same address. Under the
        Equality Act 2010 we must make reasonable adjustments for disabled people, and we do not
        charge for them.
      </p>
      <p>
        If you are not happy with our answer, the equality helpline known as{" "}
        <ExternalLink href="https://www.equalityadvisoryservice.com/">EASS</ExternalLink> gives
        advice on discrimination.
      </p>
    </LegalSection>

    <LegalSection id="about" title="About this statement">
      <p>
        This statement was written from the checks that ran on its version date. We update it when
        the testing changes or when we learn of a problem.
      </p>
      <ul className={versionHistory()}>
        <li>Version 0.1, 25 November 2026: first version, for the test phase.</li>
      </ul>
    </LegalSection>
  </LegalPage>
);
