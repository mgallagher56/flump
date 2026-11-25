# Work log and invoicing

The Work log and invoicing page records self-employed hours, builds numbered draft invoices from unbilled entries, and moves each invoice from Draft to Issued to Paid. A paid invoice can be added to Self Assessment as one-off self-employed income.

## Sub-features

- `inv-log` add a work entry; its line amount is hours times the hourly rate.
- `inv-draft` select unbilled entries and create a draft invoice.
- `inv-issue` issue a draft invoice.
- `inv-paid` mark an issued invoice paid.
- `inv-persist` after a reload the invoice keeps its status and the entry shows as billed.

## How to get to it (user POV)

- Open `/app/invoicing`. Tabs `Work log`, `Invoices (<count>)` and `Invoicing settings`.

## Driving it with verify-flump

Preconditions:

- Any persona with no invoices; `selfemployed` fits (`V seed selfemployed <run-id>`). Shipped journey: `V drive invoicing <run-id>`.

- **Log work.** In tabpanel `Work log`, fill textboxes `Work description`, `Client name (optional)`, `Hours worked` (3) and `Hourly rate (£)` (65), then choose `Add work entry`. Region `Recorded work log entries` shows the entry and `£195`.
- **Draft.** Check checkbox `Select <description> for draft invoice`, fill textbox `Client name` (exact) and choose `Create draft invoice from selected`. The tab reads `Invoices (1)`.
- **Issue.** Choose tab `Invoices (1)`. In the `article` with the client name, `Draft` and `£195` show; choose `Issue invoice`. `Issued` and button `Mark as paid` show.
- **Paid.** Choose `Mark as paid`. `Paid` and button `Add to Self Assessment` show.
- **Persist.** Reload, choose the Invoices tab: the article still shows `Paid`, with no `Issue invoice` or `Mark as paid` button.

## Gotchas

- Work logs and invoices are not on the `/api` allow-list: prove saved state by a reload.
- The page opens on the Work log tab after a reload; choose the Invoices tab again.
- Every invoice card has an `Issued <date>` line even as a draft (it is the issue date field), so read the status pill and the action buttons, not that line.
- Deleting entries or invoices counts towards the backend's 10 destructive calls an hour; reseed instead.
