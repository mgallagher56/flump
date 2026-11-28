# App design prototypes (never merge)

Throwaway prototypes of the web app in the marketing site's look, at three levels, for the owner to choose a direction. Branch `claude/app-design-prototypes-0a1930` only.

- `PrototypeLayer/` sets `html[data-proto-level]` and `html[data-proto-area]` and shows the level and theme control on every page. Query parameters: `?level=0|1|2|3`, `?theme=light|dark`, `?capture=1`.
- `prototype.css` holds all the level styling. It is plain CSS with raw values on purpose (prototype only); colours still read the app's token variables.
- `routes/prototype.tsx` is the index page at `/prototype`; `screens.ts` lists the screens.
- `public/prototype-origins.json` names the four local stacks (seeded data, empty, new user, finished check-in).

Hooks added to shared components, each marked `PROTOTYPE ONLY`: `data-card` on `Card`; an orb group and `data-proto-header` in `PageHeader`; the document picture beside each flat scene in `Illustration`; a hidden document picture in `EmptyState`; margin art in `OnboardingFlow`.
