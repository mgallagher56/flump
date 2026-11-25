import { BUSINESS_DETAILS } from "@flump/business-details";
import type { FC } from "react";
import {
  ContactEmail,
  ExternalLink,
  LegalLink,
  LegalPage,
  LegalSection,
} from "../../components/LegalPage";
import { versionHistory } from "./PrivacyPage.styles";

const SUBJECT = "Privacy request";

/**
 * Privacy notice (E19 C1). Every statement here was checked against the code and the hosting
 * settings on the page's version date; the evidence and the reviewer's verdict are in
 * docs/legal/legal-pages-review.md. Change the wording and the version in
 * `@flump/business-details` together.
 */
export const PrivacyPage: FC = () => (
  <LegalPage
    description="What personal data Flump holds, why, where it is kept, how long for, and how to get a copy or delete it."
    intro="What Flump holds about you, why, where it is kept and for how long, and what you can do about it."
    page="privacy"
  >
    <LegalSection id="who" title="Who is responsible for your data">
      <p>
        Flump is run by {BUSINESS_DETAILS.legalName.value} ("we", "us"). We decide how and why your
        personal data is used, which makes us the "controller" under UK data protection law.
      </p>
      <ul>
        <li>Address: {BUSINESS_DETAILS.registeredOffice.value}</li>
        <li>
          Email: <ContactEmail subject={SUBJECT} />
        </li>
      </ul>
      <p>
        Flump is in a test phase with a small number of invited people. This notice describes how
        Flump works today.
      </p>
    </LegalSection>

    <LegalSection id="what" title="What we hold and why">
      <p>
        UK GDPR lets us use personal data only with a lawful reason, called a "lawful basis". Each
        group below names the one we rely on.
      </p>

      <h3>Your sign-in</h3>
      <p>
        Your email address, your name and your password, which is stored in a scrambled form that
        cannot be read back. Our sign-in provider, WorkOS, holds these. We use them to let you in
        and to keep your account yours. Lawful basis: our contract with you (the{" "}
        <LegalLink to="/terms">terms of use</LegalLink>).
      </p>

      <h3>The figures and details you enter</h3>
      <p>Everything you type into Flump or import from a spreadsheet. That can include:</p>
      <ul>
        <li>your name, country, tax region, birth year and employment type</li>
        <li>your pay, housing costs, mortgage, pension and savings details</li>
        <li>your accounts and debts, their balances and their monthly history</li>
        <li>the months in which you started or finished a monthly check-in</li>
        <li>budget entries, goals and your retirement plan</li>
        <li>income and cost records by tax year, with any notes and receipt files you add</li>
        <li>
          work logs, invoices and invoicing settings, such as your business name, address, email
          address and VAT number
        </li>
      </ul>
      <p>
        We use these to show your figures and work out estimates from them. Lawful basis: our
        contract with you.
      </p>
      <p>
        Notes are free text. Please leave out health details and anything else sensitive that Flump
        does not need.
      </p>

      <h3>Accounts and costs you share with someone</h3>
      <p>
        You can mark an account, a debt or a budget line as joint. You then set your share of it.
        Flump then counts your share in your figures. We hold that it is joint and your share, as a
        percentage. Flump does not ask who the other person is, and it does not link or invite them.
        The whole balance of a joint account is held on your account only. If you type someone's
        name into a name or a note, we hold that as part of your figures. Lawful basis: our contract
        with you.
      </p>

      <h3>The AI connection (preview)</h3>
      <p>
        If you create an AI connection, we hold its name and what it is allowed to read. We also
        hold when it expires and when it was last used. We hold a scrambled form of its access
        token, never the token itself. We also keep a log of each request your AI app makes: which
        tool, when, whether it worked, and the name the app gives for itself. The log holds no
        amounts and no free text. Lawful basis: our contract with you for the connection, and our
        legitimate interest in keeping accounts secure for the log.
      </p>

      <h3>Security records</h3>
      <p>
        A record of sensitive actions on your account, such as creating or removing an AI connection
        or deleting data. A record of permissions you gave and withdrew. The day you last used
        Flump. Counters that limit how many requests an account or an internet address can make.
        Lawful basis: our legitimate interest in keeping Flump secure and stopping misuse.
      </p>
      <p>
        Which version of the terms you agreed to, which version of this notice we showed you, and
        when. We keep this until you delete your account. Lawful basis: our legitimate interest in
        keeping a record of the agreement between us.
      </p>

      <h3>Server logs and error reports</h3>
      <p>
        Our servers log each request: the page or action, the time and whether it worked. Our
        hosting provider's network logs may also record your internet address. When something
        breaks, an error report goes to our error reporting provider, Sentry. Reports are set up to
        leave out your figures, your name, your email address, cookies and the contents of requests.
        Lawful basis: our legitimate interest in finding and fixing faults.
      </p>

      <h3>Invites</h3>
      <p>
        While Flump is invite-only, we keep the label we gave your invite link, which may be your
        name, and when you used it. Lawful basis: our legitimate interest in running a small test
        phase.
      </p>

      <h3>Messages you send us</h3>
      <p>
        If you email us, we keep your message and address to reply and to keep a record of what we
        did. Lawful basis: our legitimate interest in answering you, or a legal duty where your
        message uses one of your rights.
      </p>

      <h3>What we do not hold</h3>
      <ul>
        <li>Flump does not connect to your bank and holds no bank login.</li>
        <li>Flump takes no payments, so it holds no card details.</li>
        <li>Flump uses no advertising or tracking tools and builds no advertising profile.</li>
        <li>
          Flump makes no decisions about you by automated means that have a legal or similar effect.
        </li>
      </ul>
    </LegalSection>

    <LegalSection id="clients" title="Details about your clients">
      <p>
        If you use invoicing, you can add details about the people or businesses you work for. On an
        invoice this is the client's name and, if you add them, their email address and postal
        address. On a work log entry it is the client's name, if you add it.
      </p>
      <p>
        These details are about your clients, not you. You decide what goes in, and we store it for
        you so that you can make invoices and keep track of your work. The{" "}
        <LegalLink to="/terms#client-details">terms of use</LegalLink> set out how we handle it on
        your behalf.
      </p>
      <ul>
        <li>We do not contact your clients and we do not send them invoices.</li>
        <li>
          We do not use their details for anything else. The AI connection cannot read invoices or
          work logs.
        </li>
        <li>
          If you add a paid invoice to your tax records, that record's name includes the client's
          name. The AI connection can read it only if you include names.
        </li>
        <li>They are in the copy of your data that you can download.</li>
        <li>
          They are deleted when you delete a draft invoice or a work log entry, delete your
          financial data or delete your account. Issued and paid invoices cannot be deleted one at a
          time.
        </li>
      </ul>
      <p>
        If you are a client of someone who uses Flump, ask them first, because they decide what is
        stored. If you write to us, we pass your request to them where we can identify them.
      </p>
    </LegalSection>

    <LegalSection id="sharing" title="Who we share data with">
      <p>We do not sell personal data, and we do not share it for advertising.</p>
      <p>These companies process data for us, under a contract with each:</p>
      <ul>
        <li>
          <strong>Railway</strong> (Railway Corporation, a US company) runs our servers and
          database, so it holds everything described above except your password.
        </li>
        <li>
          <strong>WorkOS</strong> (WorkOS, Inc., a US company) runs sign-in, so it holds your email
          address, name, password in scrambled form and sign-in sessions.
        </li>
        <li>
          <strong>Sentry</strong> (Functional Software, Inc., a US company) receives error reports.
        </li>
      </ul>
      <p>
        <strong>Your AI app.</strong> If you set up an AI connection, Flump sends answers built from
        your saved figures to the AI app you connected. It does so each time that app asks. You
        choose what the connection can read, and names and labels are left out unless you choose to
        include them. If you switch it on, your AI app can also send figures for you to import.
        Nothing is saved until you confirm it in Flump. The company behind your AI app handles what
        it receives under its own terms. We cannot take it back once sent. You can remove the
        connection in Settings at any time.
      </p>
      <p>
        We may also have to share data where the law requires it, such as a court order. If Flump
        were ever transferred to a new owner, we would tell you before your data moved.
      </p>
    </LegalSection>

    <LegalSection id="where" title="Where your data is kept">
      <p>
        Our servers and database are in the United States, and all three providers above are United
        States companies. So your data leaves the UK.
      </p>
      <p>
        UK law asks for a safeguard when that happens. For each provider it is one of two things.
        One is the UK-US data bridge, for providers certified under the UK extension to the Data
        Privacy Framework. The other is the UK addendum to the standard contractual clauses, in our
        contract with that provider. Email us to ask which applies to each provider.
      </p>
    </LegalSection>

    <LegalSection id="how-long" title="How long we keep it">
      <ul>
        <li>
          <strong>Your account and figures:</strong> until you delete them. You can delete single
          items, all your financial data, or your whole account.
        </li>
        <li>
          <strong>When you delete your account:</strong> your data is removed from our database
          straight away and your sign-in is removed from WorkOS. We keep one record that an account
          was deleted, for 24 months. It holds a one-way code, not your details.
        </li>
        <li>
          <strong>
            AI connection log, removed AI connections and the record of sensitive actions:
          </strong>{" "}
          13 months, or until you delete your account if that is sooner.
        </li>
        <li>
          <strong>Your record of permissions:</strong> until you delete your account.
        </li>
        <li>
          <strong>Spreadsheet imports:</strong> the uploaded copy is removed 30 days after its last
          change.
        </li>
        <li>
          <strong>Copies kept so we can undo an update to Flump:</strong> up to 90 days.
        </li>
        <li>
          <strong>Unused accounts:</strong> if you do not use Flump for 24 months, we treat the
          account as unused and may delete it.
        </li>
        <li>
          <strong>Invite records:</strong> for as long as you are in the test phase, then 30 days.
          An unused link is removed 30 days after it is cancelled or expires.
        </li>
        <li>
          <strong>Request counters:</strong> one day at most.
        </li>
        <li>
          <strong>Backups:</strong> any backup of the database is kept for a limited period. Deleted
          data can stay in a backup until it expires. We will state the period here once scheduled
          backups are running.
        </li>
        <li>
          <strong>Server logs and error reports:</strong> for the limited period our providers'
          plans keep them.
        </li>
        <li>
          <strong>Messages you send us:</strong> for as long as we need to deal with them and to
          keep a record of what we did.
        </li>
      </ul>
    </LegalSection>

    <LegalSection id="rights" title="Your rights">
      <p>You have these rights over your personal data. Using them costs nothing.</p>
      <ul>
        <li>
          <strong>Get a copy.</strong> In Flump, open Settings, then "Data and export", then
          "Download your data". You get one file with the data in your account. Your sign-in details
          are held by WorkOS and are not in the file, so email us for those.
        </li>
        <li>
          <strong>Correct it.</strong> Change any figure or detail in Flump, or ask us.
        </li>
        <li>
          <strong>Delete it.</strong> In Settings, under "Data and export", you can delete your
          financial data or your whole account.
        </li>
        <li>
          <strong>Take it elsewhere.</strong> The download is a JSON file that other software can
          read.
        </li>
        <li>
          <strong>Limit how we use it.</strong> You can ask us to pause using your data while a
          question about it is sorted out.
        </li>
        <li>
          <strong>Withdraw a permission.</strong> Remove an AI connection in Settings and it stops
          working at once.
        </li>
      </ul>
      <p>
        <strong>
          You can object to any use that rests on our legitimate interest. That covers security
          records, logs, error reports and invite records.
        </strong>{" "}
        Tell us why it affects you. We will stop unless we have a strong reason to carry on, such as
        keeping other people's accounts secure.
      </p>
      <p>
        To use a right that Flump has no button for, email <ContactEmail subject={SUBJECT} />. We
        answer within one month. We may ask for something to confirm it is you.
      </p>
    </LegalSection>

    <LegalSection id="complaints" title="Complaints">
      <p>
        If you think we have handled your data wrongly, email{" "}
        <ContactEmail subject="Data protection complaint" />. We will confirm we have your complaint
        within 30 days, look into it and tell you the outcome without undue delay.
      </p>
      <p>
        You can also complain to the UK's data protection regulator, the ICO, at any time:{" "}
        <ExternalLink href="https://ico.org.uk/make-a-complaint/">
          ico.org.uk/make-a-complaint
        </ExternalLink>
        .
      </p>
    </LegalSection>

    <LegalSection id="other" title="Other things to know">
      <ul>
        <li>
          <strong>Do you have to give us data?</strong> You need an email address to have an
          account. Everything else is your choice, but Flump can only work things out from figures
          you enter.
        </li>
        <li>
          <strong>Age.</strong> Flump is for people aged 18 or over. We do not knowingly hold data
          about children.
        </li>
        <li>
          <strong>Security.</strong> See <LegalLink to="/security">Security and privacy</LegalLink>{" "}
          for what Flump can and cannot do with your figures.
        </li>
        <li>
          <strong>Cookies.</strong> See{" "}
          <LegalLink to="/cookies">Cookies and browser storage</LegalLink> for what Flump keeps in
          your browser.
        </li>
      </ul>
    </LegalSection>

    <LegalSection id="changes" title="Changes to this notice">
      <p>
        When this notice changes, we put the new version and its date at the top of this page. If a
        change affects how we use data you have already given us, we will tell you before it takes
        effect.
      </p>
      <ul className={versionHistory()}>
        <li>
          Version 0.2, 25 November 2026: adds the record of which terms you agreed to and which
          version of this notice we showed you.
        </li>
        <li>Version 0.1, 25 November 2026: first version, for the test phase.</li>
      </ul>
    </LegalSection>
  </LegalPage>
);
