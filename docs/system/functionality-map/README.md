# The functionality map

One folder answers "what does a user see on this screen, what can they do here, and which values does it touch": `docs/system/functionality-map/`.

It complements [the value map](../README.md): the value map tracks where each fact and figure is stored and computed, while the functionality map drills down from the user's point of view in four layers:

**Page -> Section / Region -> Capability / Flow -> Action**

Pages are sharded into one YAML file per page under `pages/{web|marketing}/<page-id>.yaml` so feature PRs do not collide on a single file and agents only read the page they need. The `generated/` folder holds read-only Markdown views built by `bun run functionality-map`.

## Use it

| Question                                            | Open                                                       |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Which pages, sections, and capabilities exist?      | [generated/overview.md](./generated/overview.md)           |
| What controls and actions exist across the product? | [generated/actions-index.md](./generated/actions-index.md) |
| Which pages and capabilities read or write a fact?  | [generated/by-fact.md](./generated/by-fact.md)             |
| Which routes are excluded (non-UI endpoints)?       | [index.yaml](./index.yaml)                                 |

## The format

### `index.yaml`

- `version: 1`
- `excluded_routes`: non-UI routes (API proxies, file exports, health checks) with `route_file` and a one-line `reason`.
- 100% route-coverage enforcement: `unmapped_allowlist` is retired; every discovered route in `apps/web` and `apps/marketing` must be mapped in `pages/` or listed in `excluded_routes`.

### Page files (`pages/{web|marketing}/<page-id>.yaml`)

- **Layer 1 (Page):** `id` (kebab-case matching filename), `app` (`web` or `marketing` matching folder), `route`, `title`, `auth` (`required | public | anonymous-only | admin`), `purpose`, `entry_points`, `route_file`, `sections`.
- **Layer 2 (Section):** `id` (unique within page), `name`, `kind` (`header | hero | kpi-strip | scenario-zone | form | list | table | drawer | notice | navigation | content | footer`), `component` (repo-relative path), optional `when`, `capabilities`.
- **Layer 3 (Capability):** `id` (unique within section), `goal`, `mode` (`read | what-if | write | navigate | export | delete`), optional `facts_read`, `facts_written`, `figures_shown` (validated against `docs/system/value-map.yaml`), `actions`.
- **Layer 4 (Action):** `id` (unique within capability), `control` (`button | submit | link | input | slider | toggle | checkbox | select | tab | sort-header | drawer-toggle`), `label` (exact visible label or heading), `effect`, optional `target`, `validation`, `confirm`, `if_match`.

## Update it

Any PR that adds, removes, or changes a route, page section, capability, or user control updates the corresponding `pages/{web|marketing}/<page-id>.yaml` (or `excluded_routes` in `index.yaml`) and runs:

```sh
bun run functionality-map
```

`bun run check:laws` runs `scripts/check-functionality-map.ts`, which fails on invalid schema, duplicate IDs, dead file paths, unknown `value-map.yaml` fact/figure IDs, stale generated views, or unmapped routes.
