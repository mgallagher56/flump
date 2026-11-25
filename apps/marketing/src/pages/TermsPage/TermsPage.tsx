import { BUSINESS_DETAILS } from "@flump/business-details";
import { PROJECTION_NOTICE } from "@flump/finance-engine";
import type { FC } from "react";
import { ContactEmail, LegalLink, LegalPage, LegalSection } from "../../components/LegalPage";

const SUBJECT = "Flump terms";

/**
 * Terms of use (E19 C2). The "guidance, not advice" line is the canonical `PROJECTION_NOTICE`.
 * Regulatory-status wording is the owner's (E7) and is not on this page. The evidence and the
 * reviewer's verdict are in docs/legal/legal-pages-review.md. Change the wording and the version in
 * `@flump/business-details` together.
 */
export const TermsPage: FC = () => (
  <LegalPage
    description="The terms for using Flump during its test phase: what Flump is, what it is not, and what each of us is responsible for."
    intro="The agreement between you and Flump while Flump is in its test phase."
    page="terms"
  >
    <LegalSection id="about" title="About these terms">
      <p>
        Flump is run by {BUSINESS_DETAILS.legalName.value} ("we", "us"), of{" "}
        {BUSINESS_DETAILS.registeredOffice.value}. You can reach us at{" "}
        <ContactEmail subject={SUBJECT} />.
      </p>
      <p>
        These terms apply when you create an account or use Flump. If you do not agree to them,
        please do not use Flump.
      </p>
      <p>Flump is for people aged 18 or over who live in the UK.</p>
    </LegalSection>

    <LegalSection id="test-phase" title="Flump is in a test phase">
      <ul>
        <li>You need an invite to create an account.</li>
        <li>We do not charge for Flump during the test phase, and we take no payment details.</li>
        <li>
          Flump may change, have faults or be unavailable at times. We may add, change or remove
          features.
        </li>
        <li>
          If we start charging, we will tell you the price first. You will not be charged unless you
          agree.
        </li>
      </ul>
    </LegalSection>

    <LegalSection id="guidance" title="Guidance, not advice">
      <p>
        <strong>{PROJECTION_NOTICE}</strong>
      </p>
      <ul>
        <li>
          Flump does not know your full circumstances and does not tell you what to do with your
          money.
        </li>
        <li>
          Tax figures are estimates for the tax years and nations shown on the page. They are not a
          tax return and not a calculation from HMRC.
        </li>
        <li>
          Mortgage, pension, savings and debt figures are estimates from your figures and the
          assumptions shown. They are not an offer or a decision from a lender or provider.
        </li>
        <li>
          Before a decision that depends on a figure, check it with the organisation concerned or
          with a qualified adviser.
        </li>
      </ul>
    </LegalSection>

    <LegalSection id="account" title="Your account">
      <ul>
        <li>Your account is for you alone. Keep your sign-in details to yourself.</li>
        <li>The figures you enter are yours to get right. Flump works from what you give it.</li>
        <li>Tell us if you think someone else has used your account.</li>
      </ul>
    </LegalSection>

    <LegalSection id="use" title="Using Flump fairly">
      <p>You agree not to:</p>
      <ul>
        <li>try to get into anyone else's account or data</li>
        <li>interfere with Flump, overload it, or get round its limits</li>
        <li>copy data out of Flump in bulk with automated tools, other than your own data</li>
        <li>enter details about other people that you have no right to share</li>
        <li>use Flump to break the law</li>
      </ul>
      <p>
        If you find a security problem, please report it as set out on{" "}
        <LegalLink to="/security">Security and privacy</LegalLink>.
      </p>
    </LegalSection>

    <LegalSection id="your-data" title="Your figures stay yours">
      <p>
        What you enter belongs to you. You give us permission to store and process it only to run
        Flump for you. The <LegalLink to="/privacy">privacy notice</LegalLink> says what we hold and
        why.
      </p>
    </LegalSection>

    <LegalSection id="ai" title="The AI connection (preview)">
      <ul>
        <li>
          The AI connection lets an AI app you choose ask Flump for answers built from your saved
          figures.
        </li>
        <li>
          You decide which AI app to connect and what it can read. That app is run by another
          company under its own terms, and we are not responsible for what it does with the answers.
        </li>
        <li>
          Answers are calculations from your figures. What the AI app says about them is its own,
          and can be wrong.
        </li>
        <li>
          If you switch it on, your AI app can also send figures for you to import. Nothing is saved
          until you confirm it in Flump.
        </li>
        <li>You can remove a connection in Settings at any time.</li>
      </ul>
    </LegalSection>

    <LegalSection id="client-details" title="Client details you add for invoicing">
      <p>
        If you add details about your clients, you are responsible for having a lawful reason to
        store them. For those details you are the "controller" and we are your "processor". This
        covers client names, email addresses and postal addresses, for as long as you keep them in
        Flump. We agree to:
      </p>
      <ul>
        <li>
          use them only to provide invoicing and work logs to you, as these terms and your actions
          in Flump instruct
        </li>
        <li>
          act only on your instructions, unless the law requires otherwise, and tell you first where
          the law allows
        </li>
        <li>tell you if we think an instruction breaks data protection law</li>
        <li>keep them confidential and protect them with security measures suited to the risk</li>
        <li>
          use only the providers named in the <LegalLink to="/privacy">privacy notice</LegalLink>,
          on terms that protect the details, and update that list before a new provider starts
        </li>
        <li>stay responsible to you for what those providers do with the details</li>
        <li>send them outside the UK only with the safeguards described in the privacy notice</li>
        <li>help you answer a client who uses their data protection rights</li>
        <li>
          help you with security, breach reports and risk assessments that the law asks of you
        </li>
        <li>tell you without undue delay if a security incident affects them</li>
        <li>
          delete them when you delete a draft invoice or an entry, your financial data or your
          account
        </li>
        <li>let you download the details at any time, and answer reasonable checks you ask for</li>
      </ul>
      <p>
        If you object to a new provider, you can delete the details or your account before it
        starts.
      </p>
    </LegalSection>

    <LegalSection id="responsibility" title="What we are responsible for">
      <p>We will provide Flump with reasonable care and skill.</p>
      <p>
        <strong>
          Nothing in these terms limits what we are responsible for if our negligence causes death
          or personal injury. The same goes for fraud, and for anything else the law does not let us
          limit. Nothing in these terms affects your legal rights as a consumer.
        </strong>
      </p>
      <ul>
        <li>
          Flump may damage your device or your other digital content because we did not use
          reasonable care and skill. If so, we will repair the damage or pay you compensation.
        </li>
        <li>
          If we break these terms, we are responsible for loss you suffer that is a foreseeable
          result. Loss is foreseeable if it was clear it would happen, or if we both knew it might.
        </li>
        <li>We are not responsible for loss that was not foreseeable.</li>
        <li>
          We are not responsible for loss caused by events outside our reasonable control, or by
          your breaking these terms.
        </li>
        <li>
          If you use Flump for a business, such as invoicing, we are not responsible for lost
          profit, lost business or business interruption.
        </li>
      </ul>
      <p>
        Flump's figures are estimates and can be wrong, for example when a figure you entered is out
        of date or a tax rule has changed. This is why the section "Guidance, not advice" asks you
        to check a figure before a decision that depends on it.
      </p>
    </LegalSection>

    <LegalSection id="ending" title="Ending your account">
      <ul>
        <li>
          <strong>You can leave at any time.</strong> Delete your account in Settings, under "Data
          and export". You can download your data first.
        </li>
        <li>
          <strong>We can end or pause your account at once</strong> for a serious reason. That means
          you have broken the section "Using Flump fairly", or your account puts Flump or other
          people at risk. We will tell you why, unless the law stops us.
        </li>
        <li>
          <strong>For any other reason,</strong> including closing the test phase, we will email you
          at least 30 days before, so that you can download your data.
        </li>
      </ul>
      <p>
        The <LegalLink to="/privacy#how-long">privacy notice</LegalLink> says what happens to your
        data when an account ends.
      </p>
    </LegalSection>

    <LegalSection id="changes" title="Changes to these terms">
      <p>We may change these terms for one of these reasons:</p>
      <ul>
        <li>the law or a regulator's guidance changes</li>
        <li>we add, change or remove a feature</li>
        <li>we need to fix a security problem or stop misuse</li>
        <li>we can make the wording clearer or fix a mistake</li>
      </ul>
      <p>
        We will put the new version on this page, with its date, at least 14 days before it applies.
        We will also email you about any change that is more than a wording fix. A change needed
        urgently for legal or security reasons may apply sooner. If you do not agree with a change,
        you can delete your account before it applies.
      </p>
      <ul>
        <li>Version 0.1, 25 November 2026: first version, for the test phase.</li>
      </ul>
    </LegalSection>

    <LegalSection id="disputes" title="Complaints and disputes">
      <p>
        If something has gone wrong, email <ContactEmail subject="Complaint" /> and we will try to
        put it right.
      </p>
      <p>
        These terms are governed by the law of England and Wales. You can bring a claim in the
        courts of the part of the UK where you live: England and Wales, Scotland or Northern
        Ireland.
      </p>
      <p>
        If a court finds part of these terms cannot be enforced, the rest still applies. If we do
        not enforce a term straight away, we can still do so later.
      </p>
    </LegalSection>
  </LegalPage>
);
