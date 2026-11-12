# Deploy log

Append-only. One entry per production deploy, newest at the bottom. Counts and timings only: **never row data, ids, connection strings, tokens or variable values.** Do not edit past entries.

## Template (copy below this line, fill in, do not edit the template)

```text
### YYYY-MM-DD HH:MM UTC - <release, e.g. PR 368 / vX.Y.Z>
Release merge commit (short SHA):
Merge time (UTC) / healthy time (UTC) / duration (min):
Backend migration seconds (from boot log):
Cleanup counts from backend log:
  taxRecords=  accounts=  budgetEntries=  mockIdentityRows=
Equal to cleanup-preview summary (yes/no):
Native backup id name and size (or "unavailable"):
Smoke test (G8) result (pass/fail, failing check names only):
Healthchecks switched to new paths (yes/no, time):
Row counts after vs before (diff clean apart from new writes) (yes/no):
24 h log check (errors found yes/no):
Rollback needed (none / web / backend / data) and time to recover:
Outcome (success / rolled back / fixed forward):
Notes (no row data):
```

## Entries

<!-- append new entries below -->
