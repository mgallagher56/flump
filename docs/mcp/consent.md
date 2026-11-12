# AI connection consent and disclosure copy (E17-N19)

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**
> Do not ship this wording until the owner has signed it. Placeholders are marked `[PLACEHOLDER]`.

Used at token creation (AI connections) and on any future OAuth consent page.

## 1. Consent screen copy

**Title:** Connect an AI assistant to Flump

**Body:**

You are about to let **[CLIENT NAME]** read parts of your Flump data. It will be able to see:

| Data category         | What the assistant can see                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Accounts              | Account balances and types. Names are replaced with generic labels unless you turn anonymising off. |
| Budget                | Your budget summary and entries.                                                                    |
| Debts                 | Debts, rates and payments.                                                                          |
| Forecast and planning | Net worth forecasts, pension and mortgage inputs you have saved.                                    |
| Profile basics        | Region, birth year and similar planning inputs.                                                     |

**Client:** [CLIENT NAME] (the app or tool holding this token). Only connect clients you trust.

**Revocation stops future access only.** When you revoke this connection, the assistant can no longer read your Flump data. Anything it has already read stays with that assistant and its provider, and Flump cannot take it back.

**Guidance, not advice.** Flump gives information and guidance. It is not regulated financial advice. [PLACEHOLDER: wording to match the E29 disclaimer.]

For how we handle your data, see the privacy policy: [PLACEHOLDER: privacy policy URL].

**Buttons:** Connect, Cancel

## 2. Token creation confirmation

"Your token is shown once. Copy it now. You can revoke it at any time under AI connections."

## 3. Notes for the owner

- The data categories must match what the live tools and resources return when N9, N11 and N12 land. Re-check the table before signing.
- Anonymising does not fully scrub free-text notes or transaction descriptions (see the E17 plan). Decide whether to disclose that here.
- The privacy link waits for the privacy page ticket.
- N18 shows this copy in the web UI and depends on this file being signed.
