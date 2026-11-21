# Technology to check in on

Tools and projects that Flump does not use, and that are worth another look later. Each entry says what it is, why it is not used now, what would change that, and when it was last looked at. Nothing here is a decision to adopt anything: adopting a framework or naming an outside service is the owner's decision, recorded in [`docs/audit/plans/DECISIONS.md`](./audit/plans/DECISIONS.md).

When you check an entry, update "Last looked at" and the notes. Add a row for anything new the owner asks to keep an eye on.

## Exact (from the Expo team)

- **Where:** <https://github.com/expo/exact>
- **Asked for by:** the owner, 21 November 2026: "Should we consider Expo Exact in the future to create apps for every device?" and "add it to the general repo docs as a reminder to check in on progress of the Exact project".
- **Last looked at:** 21 November 2026, the README only.
- **Check again:** when the mobile app (E12) is next planned or re-planned, and at least every three months until then. Next check by the end of February 2027.

**What it is.** A framework for writing one app that runs on many kinds of device. The README lists web, iOS, macOS and Linux as working, Android as working with polish in progress, Windows as early, and hosts for tvOS, watchOS, Android TV and the terminal. Screens are written in its own declarative language; data logic can be TypeScript, Rust or declarative HTTP. MIT licence.

**Why Flump does not use it now.**

- It is very early. The README says it is "pre-1.0 and changes daily", with no packaged release and no promise that today's code keeps working. It is built from a checkout of the repository.
- It is not React. It has no JSX or React layer, and React Native and Flutter plugins do not work with it. The mobile plan ([`E12-mobile-rebuild-plan.md`](./audit/plans/E12-mobile-rebuild-plan.md), section 4.1) recommends Expo with React Native because that reuses the engine, contract, client, formatter and native theme already built. Exact would mean writing every screen again.
- The README does not say how it handles sign-in, encrypted storage on the device or store submission. Those are the parts of a money app that most need a settled foundation.

**What might carry over.** Its data logic can import plain JavaScript packages, so `@flump/finance-engine`, `@flump/format` and the API client might be usable. Not tested.

**What would make it worth a trial.**

- A stable release with a compatibility promise.
- A documented way to do the WorkOS sign-in flow and to keep data encrypted on the device.
- A documented path to the App Store and Google Play.
- A reason to want desktop, watch or TV apps, which React Native covers poorly.

**A cheap trial, if those are met.** One read-only screen (net worth) on the shared engine, on two kinds of device, to see whether the reuse is real. No commitment beyond that.

**What to look at on each check.** The README's status line and platform table; whether there is a packaged release and a version number; what it says about authentication, secure storage and store builds; and whether it still rules out React.

**Not verified.** Everything above is from the README as read on 21 November 2026. Nothing was built or run.
