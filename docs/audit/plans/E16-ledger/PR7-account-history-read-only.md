# E16 execution ledger: PR 7 (account history is read-only; F29 / D12-B)

- Removed the edit UI on the account detail page: edit/save buttons, per-cell number inputs, "add previous/next/current year" buttons and the delete-year confirm dialog, plus the three route-action intents (`deleteYear`, `addYear`, `updateValues`) that called endpoints that do not exist on the backend.
- Kept: header with balance and change, History trend chart, read-only Values table. History now comes from the monthly check-in (D12-B).
- Added `fontVariantNumeric: "tabular-nums"` to the values table cells (the file had only passed the law check through the deleted dialog).
- Tests and stories: removed the edit-mode, add-year and delete-year tests and the EditMode story; added read-only assertions; regenerated the two affected snapshots; dropped the three account-detail rows from `actions.test.ts`.
- Ratchets re-baselined (the cut is the reason): react-icons baseline entry for `AccountDetails.tsx` (removed `FaTrashAlt`). No routes removed (the detail page remains), no inventory change.
- Docs: neither `app_functionality.md` nor `pages_and_features.md` describes year editing.
