# Third-party licences

The repository is MIT licensed (README). Every dependency's licence field is collected automatically into the SBOM (`scripts/generate-sbom.ts`, run in CI). This file records the dependencies whose licence is not a standard open source licence, or which the owner approved with conditions, so the terms are written down where a reader of this public repository can find them.

| Package                           | Version | Where it may be used  | Licence                                                                                                                                                                                                                         | Read on          | Approved                    |
| --------------------------------- | ------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------- |
| `gsap` (with its bundled plugins) | 3.15.1  | `apps/marketing` only | Webflow's "Standard No Charge" licence: free, commercial use allowed, every plugin included. Not open source. It forbids use in a no-code visual animation builder that competes with Webflow, and Webflow may change or end it | 26 November 2026 | Owner, D1, 27 November 2026 |
| `three`                           | 0.187.0 | `apps/marketing` only | MIT                                                                                                                                                                                                                             | 26 November 2026 | Owner, D1, 27 November 2026 |

Rules:

- The version is pinned. A bump re-reads the licence and updates the row in the same PR.
- Neither package is imported outside `apps/marketing` (UX-GUIDELINES 12.1, rule AT4).
- No downloaded assets come with them: environment maps, textures and materials are generated in code.
