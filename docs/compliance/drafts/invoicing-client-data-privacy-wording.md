# Invoicing client details: proposed privacy wording

**DRAFT for owner review, not published; legal wording is owner-only.**

Status: draft, 22 November 2026. Decisions: open (the owner approves or rewrites every line before any of it goes on a legal page).

This file proposes wording only. It does not change the privacy notice, the record of processing, or any marketing or legal page. Those are E19 legal pages, and only the owner edits them.

## Why this draft exists

Invoicing (E37) lets a user record details about their own clients. On 22 November 2026 the owner decided that storing these details is fine (`docs/audit/plans/DECISIONS.md`). The privacy notice and the record of processing did not yet mention them. This draft proposes how they could.

## Facts the wording rests on

Checked in the code on 22 November 2026:

- **What is stored.** On each invoice: the client's name, and optionally their email address and postal address (`invoices.client_name`, `invoices.client_email`, `invoices.client_address`). On each work log entry: optionally the client's name (`work_log_entries.client_name`).
- **How it is stored.** As plain text in the database, like the other columns in those tables. There is no extra encryption on these columns.
- **Export.** All four columns are in the user's data export (`apps/backend/src/modules/privacy/user-data-registry.ts`, the `invoices` and `workLogEntries` entries).
- **Erasure.** Deleting the account deletes the rows in both tables (`deleteOnErasure: true`). "Reset all financial data" clears both tables too.
- **Sharing.** Flump does not send invoices or emails to clients. The AI connection tools do not read invoices or work log entries. Client details are not used for marketing or analytics.
- **Retention.** No separate retention period is set. The details stay until the user deletes the invoice or entry, resets their financial data or deletes their account.

## Proposed privacy notice wording

Suggested as a new subsection under what Flump stores.

> **Details about your clients**
>
> If you use invoicing, you can add details about the people or businesses you work for. On an invoice, this is the client's name, and if you add them, their email address and postal address. On a work log entry, it is the client's name if you add it.
>
> These details belong to your clients, not to you. We store them only so you can make invoices and keep track of your work. We do not contact your clients, and we do not share their details with anyone else or use them for marketing.
>
> We keep these details until you delete the invoice or entry, clear your financial data or close your account. They are included when you download your data, and they are deleted when you close your account.
>
> If you add someone's details, please make sure you are allowed to share them with us. If a client asks us about their details, we will pass the request to you, because you decide what is stored.

Open points for the owner:

1. The last paragraph assumes the user decides what is stored and Flump stores it on their behalf. Whether Flump acts as a processor for the user, or as a controller in its own right, is a legal question for the owner.
2. Whether to name the hosting provider here, or rely on the existing list of service providers in the notice.
3. Whether to set a fixed retention period, for example for closed accounts kept in backups.

## Proposed record of processing entry

| Field                    | Proposed entry                                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Processing activity      | Storing invoicing client details for users who use invoicing                                                                                                   |
| Data subjects            | The user's clients: people or businesses the user works for. They do not have a Flump account.                                                                 |
| Personal data            | Client name, email address and postal address on invoices. Client name on work log entries.                                                                    |
| Source                   | Typed in by the user                                                                                                                                           |
| Purpose                  | To let the user make invoices and record the work they have done                                                                                               |
| Lawful basis             | To be decided by the owner                                                                                                                                     |
| Recipients               | None. Not sent to clients, AI connection tools, marketing or analytics. Held by the hosting provider as part of the database, like all other user data.        |
| Transfers outside the UK | As for the rest of the database, to be confirmed by the owner                                                                                                  |
| Retention                | Until the user deletes the invoice or entry, resets their financial data or deletes their account. No separate period is set.                                  |
| Security                 | Stored as plain text in the database, like the other columns in those tables. Protected by the same access controls as the rest of the user's data.            |
| Data subject rights      | Included in the user's data export. Deleted when the user deletes their account or resets their financial data. Requests from a client are passed to the user. |
| Systems                  | `invoices` and `work_log_entries` tables. Export and erasure in `apps/backend/src/modules/privacy/user-data-registry.ts`.                                      |

## Not changed by this draft

- The privacy notice and any legal page.
- Any marketing page.
- The record of processing itself, wherever the owner keeps it.
