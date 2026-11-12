# E15 iconography: Lucide and the `Icon` primitive

Icons come from [`lucide-react`](https://lucide.dev) (pinned, `packages/ui`) through the `Icon` primitive. `react-icons` (`fa`, `fi`) is being retired: `scripts/check-react-icons.ts` counts `react-icons/` imports per file against `scripts/react-icons-baseline.json`. A file may not gain imports, and its baseline entry must shrink (the check fails as STALE until you run `bun scripts/check-react-icons.ts --write-baseline`). Call sites migrate per screen in Phase 3; nothing in `apps/web` or `apps/marketing` has been changed yet.

## Using `Icon`

```tsx
import { Icon } from "@repo/ui";
import { TrendingUp } from "lucide-react";

<Icon icon={TrendingUp} size="sm" />            // decorative: aria-hidden
<Icon icon={TriangleAlert} label="Warning" />   // meaningful on its own: role="img" + aria-label
```

- `size`: `sm` 16px, `md` 20px (default), `lg` 24px. `strokeWidth` defaults to the token `ICON_STROKE_WIDTH` (1.75).
- Colour is `currentColor`. Set it on the parent with a semantic token (`color: "status.danger.text"`). Do not pass hex or primitive colours.
- `lucide-react` is a dependency of `@repo/ui`; apps should import the icon glyphs from `lucide-react` directly (add it to the app's dependencies when migrating) and wrap them in `Icon`.

### Icon-only buttons

Put the accessible name on the button, and keep the icon decorative:

```tsx
<button type="button" aria-label="Delete account">
  <Icon icon={Trash2} />
</button>;
```

Do not give both the button and the icon a label (it is announced twice). Keep a 44px touch target (`sizes.touch`) on the button, not the icon. Use `label` on `Icon` only when the icon stands alone and carries meaning (a status glyph with no adjacent text).

## Migration table (most common icons in `apps/web/app`)

Counts are import occurrences at the time of writing.

| react-icons                                                           | Uses | Lucide                                                       | Notes                                                                     |
| --------------------------------------------------------------------- | ---: | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `FiArrowRight`, `FaArrowRight`                                        |   14 | `ArrowRight`                                                 |                                                                           |
| `FaArrowLeft`, `FiArrowLeft`                                          |    4 | `ArrowLeft`                                                  |                                                                           |
| `FiArrowUpRight`                                                      |    1 | `ArrowUpRight`                                               |                                                                           |
| `FaPlus`                                                              |    8 | `Plus`                                                       |                                                                           |
| `FaTimes`, `FaTimesCircle`                                            |    8 | `X`, `CircleX`                                               |                                                                           |
| `FaCheck`, `FiCheck`                                                  |    4 | `Check`                                                      |                                                                           |
| `FaCheckCircle`, `FiCheckCircle`                                      |    9 | `CircleCheck`                                                | Lucide alias `CheckCircle` also exists.                                   |
| `FaCoins`                                                             |    6 | `Coins`                                                      |                                                                           |
| `FaRocket`                                                            |    5 | `Rocket`                                                     |                                                                           |
| `FaFire`                                                              |    5 | `Flame`                                                      |                                                                           |
| `FiTrendingUp`                                                        |    4 | `TrendingUp`                                                 | Keep the arrow faithful to the numeric change (see polarity rule).        |
| `FiShield`, `FaShieldAlt`                                             |    5 | `Shield`                                                     | `ShieldCheck` where a tick is intended.                                   |
| `FaPiggyBank`                                                         |    4 | `PiggyBank`                                                  |                                                                           |
| `FaInfoCircle`, `FiInfo`                                              |    5 | `Info`                                                       |                                                                           |
| `FiLock`                                                              |    3 | `Lock`                                                       |                                                                           |
| `FiAlertTriangle`, `FaExclamationTriangle`                            |    6 | `TriangleAlert`                                              | Alias `AlertTriangle` also exists. `FiAlertCircle` maps to `CircleAlert`. |
| `FaUndo`                                                              |    3 | `Undo2`                                                      |                                                                           |
| `FaSlidersH`, `FiSliders`                                             |    4 | `SlidersHorizontal`                                          |                                                                           |
| `FaEdit`, `FiEdit3`                                                   |    4 | `Pencil`                                                     | `SquarePen` if the boxed pen look is needed.                              |
| `FaTrash`, `FaTrashAlt`                                               |    3 | `Trash2`                                                     |                                                                           |
| `FiPercent`, `FaPercent`, `FaPercentage`                              |    5 | `Percent`                                                    |                                                                           |
| `FiHome`                                                              |    2 | `House`                                                      | Alias `Home` also exists.                                                 |
| `FiCompass`                                                           |    2 | `Compass`                                                    |                                                                           |
| `FiClock`                                                             |    2 | `Clock`                                                      |                                                                           |
| `FiChevronDown`, `FiChevronRight`                                     |    3 | `ChevronDown`, `ChevronRight`                                |                                                                           |
| `FiCalendar`, `FaCalendarCheck`                                       |    3 | `Calendar`, `CalendarCheck`                                  |                                                                           |
| `FaSnowflake`                                                         |    2 | `Snowflake`                                                  |                                                                           |
| `FaCreditCard`                                                        |    2 | `CreditCard`                                                 |                                                                           |
| `FaChartArea`                                                         |    2 | `ChartArea`                                                  | `FiPieChart` maps to `ChartPie` (alias `PieChart`).                       |
| `FaCalculator`                                                        |    2 | `Calculator`                                                 |                                                                           |
| `FaBolt`                                                              |    2 | `Zap`                                                        |                                                                           |
| `FaBalanceScale`                                                      |    2 | `Scale`                                                      |                                                                           |
| `FiUserCheck`, `FaUser`                                               |    2 | `UserCheck`, `User`                                          |                                                                           |
| `FiSmile`, `FiMail`, `FiLayers`, `FiEyeOff`, `FiDollarSign`, `FiCode` |    6 | `Smile`, `Mail`, `Layers`, `EyeOff`, `PoundSterling`, `Code` | Use `PoundSterling`, not a dollar glyph, for UK money.                    |
| `FaTable`, `FaSun`                                                    |    2 | `Table`, `Sun`                                               |                                                                           |

Marketing and `packages/ui` also use `FiCpu`, `FiShield`, `FiTerminal` (`Cpu`, `Shield`, `Terminal`) and `FiHome`/`FiTrendingUp`/`FiArrowRight` in the calculators.

## Migration checklist per file

1. Replace each `react-icons` import with `lucide-react` and wrap in `Icon` (set `size`, drop `style={{ fontSize, color }}`).
2. Replace hard-coded icon colours with a semantic token on the parent.
3. Decorative by default; add `label` only for stand-alone meaning.
4. Run `bun scripts/check-react-icons.ts --write-baseline` and commit the shrunken baseline.
