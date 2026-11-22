# The functionality map

One folder answers "which routes exist, what is each page for, and which values does each part of it read": `docs/system/functionality-map/`.

The map is for AI agents. It complements [the value map](../README.md): the value map tracks where each fact and figure is stored and computed, while the functionality map lists each route and its sections with the facts and figures they read. It stops at section level. It has no per-control entries (buttons, links, inputs, labels), because hand-kept control lists go stale; read the component for those (owner decision, 22 November 2026).

Pages are sharded into one YAML file per page under `pages/{web|marketing}/<page-id>.yaml` so feature PRs do not collide on a single file and agents only read the page they need. The `generated/` folder holds read-only Markdown views built by `bun run functionality-map`.

## Use it

| Question                                      | Open                                             |
| --------------------------------------------- | ------------------------------------------------ |
| Which pages and sections exist?               | [generated/overview.md](./generated/overview.md) |
| Which sections read a fact or show a figure?  | [generated/by-fact.md](./generated/by-fact.md)   |
| Which routes are excluded (non-UI endpoints)? | [index.yaml](./index.yaml)                       |

## The format

### `index.yaml`

- `version: 1`
- `excluded_routes`: non-UI routes (API proxies, file exports, health checks) with `route_file` and a one-line `reason`.
- 100% route coverage: every discovered route in `apps/web` and `apps/marketing` must be mapped in `pages/` or listed in `excluded_routes`. `unmapped_allowlist` is retired.

### Page files (`pages/{web|marketing}/<page-id>.yaml`)

- **Page:** `id` (kebab-case matching the filename), `app` (`web` or `marketing` matching the folder), `route`, `title`, `auth` (`required | public | anonymous-only | admin`), `purpose`, `route_file`, `sections`.
- **Section:** `id` (kebab-case, unique within the page), `component` (repo-relative path), optional `facts_read` and `figures_shown` (validated against `docs/system/value-map.yaml`).

Any other key is rejected, including the retired `entry_points`, `name`, `kind`, `when`, `capabilities` and `actions`.

## Update it

Update the page file (or `excluded_routes` in `index.yaml`) when a route is added or removed, or when a section changes which facts or figures it reads. Then run:

```sh
bun run functionality-map
```

`bun run check:laws` runs `scripts/check-functionality-map.ts`, which fails on invalid schema, duplicate IDs, dead file paths, unknown `value-map.yaml` fact or figure IDs, stale generated views (`overview.md`, `by-fact.md`) or unmapped routes.
