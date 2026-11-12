# E16 execution ledger: PR 2 (en-GB only, F38 / D13-A)

- Removed the `es` locale (`public/locales/es/*`), the empty `home` namespace (`en/home.json`), and `es` from `supportedLngs`; `lng` is pinned to `en`.
- Removed the client `i18next-browser-languagedetector` (dependency and use in `entry.client.tsx`); lockfile updated.
- Removed 9 verifiably unused keys from `en/common.json` (auth magic-link strings, `featureNum`, `accountType`, `addNewValue`). Keys that might be read dynamically (`about`, `add`, `remove`, nav `*Desc`) were left.
- The i18next layer itself stays: about 20 components still call `t()` for English strings. Replacing those with literals is a separate refactor, not part of this cut.
- No routes removed. No ratchet changes. Docs (`app_functionality.md`, `pages_and_features.md`) do not mention languages.
