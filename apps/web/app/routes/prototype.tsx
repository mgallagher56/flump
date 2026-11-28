/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged): the index of the app design
 * prototypes. Pick a level, a theme and a width, then a screen; it opens in a window of that width.
 */
import { useEffect, useMemo, useState } from "react";
import type { MetaFunction } from "react-router";
import { PROTO_SCREENS, PROTO_WIDTHS, type ProtoStack } from "~/prototype/screens";

export const meta: MetaFunction = () => [{ title: "App design prototypes | Flump" }];

type Origins = Partial<Record<ProtoStack, string>>;

const LEVELS = [
  { value: 0, name: "Today", note: "The app as it is on main, for comparison." },
  {
    value: 1,
    name: "Level 1, material",
    note: "Marketing card material, type and spacing; document pictures in empty states. No ornament. Plan tier A.",
  },
  {
    value: 2,
    name: "Level 2, revised (round three)",
    note: "The owner's pick, revised: medium depth with a choice of paper texture, a pointer light on the larger clickable cards, header orbs that drift in and out (stop them in Settings or with Pause motion in the header), a choice of icon style, and an info button on each calculated headline figure that shows its working.",
  },
  {
    value: 3,
    name: "Level 3, boldest",
    note: "Level 2 plus area colour in page and section headers, a faint sheen on figure cards and a breathing orb group on Home that rests within 5 seconds. Goes beyond the plan's tiers.",
  },
] as const;

export default function PrototypeIndex() {
  const [origins, setOrigins] = useState<Origins>({});
  const [firstAccount, setFirstAccount] = useState<string | null>(null);
  const [level, setLevel] = useState(2);
  const [texture, setTexture] = useState("2");
  const [icons, setIcons] = useState("paper");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    fetch("/prototype-origins.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((o: Origins) => setOrigins(o))
      .catch(() => setOrigins({}));
    fetch("/api/accounts", { headers: { "x-flump-request": "1" } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ id: string }> | { accounts?: Array<{ id: string }> }) => {
        const rows = Array.isArray(list) ? list : (list.accounts ?? []);
        setFirstAccount(rows[0]?.id ?? null);
      })
      .catch(() => setFirstAccount(null));
  }, []);

  const urlFor = useMemo(
    () => (id: string) => {
      const s = PROTO_SCREENS.find((x) => x.id === id) ?? PROTO_SCREENS[0];
      const origin = origins[s.stack] ?? "";
      const path = s.path.replace(":first", firstAccount ?? "");
      const joiner = path.includes("?") ? "&" : "?";
      return `${origin}${path}${joiner}level=${level}&theme=${theme}&texture=${texture}&icons=${icons}`;
    },
    [origins, firstAccount, level, theme, texture, icons],
  );
  const levelInfo = LEVELS.find((l) => l.value === level) ?? LEVELS[1];

  return (
    <div className="proto-index">
      <h1>App design prototypes</h1>
      <p className="proto-index__lead">
        The real app screens with a sample household, in the marketing site's new look at three
        strengths. Nothing here is merged. Pick a level and a theme, then open a screen at a width.
        Every screen also has a small control at the bottom left to switch level and theme in place.
      </p>
      <div className="proto-index__controls">
        <fieldset>
          <legend>Level</legend>
          {LEVELS.map((l) => (
            <label key={l.value}>
              <input
                checked={level === l.value}
                name="level"
                onChange={() => setLevel(l.value)}
                type="radio"
              />
              {l.name}
            </label>
          ))}
        </fieldset>
        {level === 2 ? (
          <>
            <fieldset>
              <legend>Texture</legend>
              {[
                ["1", "Fine"],
                ["2", "Paper"],
                ["3", "Heavy"],
              ].map(([v, n]) => (
                <label key={v}>
                  <input
                    checked={texture === v}
                    name="texture"
                    onChange={() => setTexture(v)}
                    type="radio"
                  />
                  {n}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Icons</legend>
              {[
                ["paper", "Paper"],
                ["tab", "Tab"],
                ["cut", "Cut paper"],
                ["seal", "Seal"],
                ["mini", "Mini documents"],
              ].map(([v, n]) => (
                <label key={v}>
                  <input
                    checked={icons === v}
                    name="icons"
                    onChange={() => setIcons(v)}
                    type="radio"
                  />
                  {n}
                </label>
              ))}
            </fieldset>
          </>
        ) : null}
        <fieldset>
          <legend>Theme</legend>
          {(["light", "dark"] as const).map((t) => (
            <label key={t}>
              <input checked={theme === t} name="theme" onChange={() => setTheme(t)} type="radio" />
              {t === "light" ? "Light (mint)" : "Dark (Midnight)"}
            </label>
          ))}
        </fieldset>
      </div>
      <p className="proto-index__note">{levelInfo.note}</p>
      <ul className="proto-index__screens">
        {PROTO_SCREENS.map((s) => (
          <li key={s.id}>
            <span className="proto-index__name">{s.name}</span>
            <span className="proto-index__opens">
              {PROTO_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() =>
                    window.open(urlFor(s.id), `proto-${w}`, `popup,width=${w},height=900`)
                  }
                  type="button"
                >
                  {w}px window
                </button>
              ))}
              <a href={urlFor(s.id)}>Open here</a>
            </span>
            {s.note ? <span className="proto-index__note">{s.note}</span> : null}
          </li>
        ))}
      </ul>
      <p className="proto-index__note">
        The width buttons open the screen in a separate window of that width (the app refuses to be
        shown in a frame). Captures of every screen at every level, theme and width are in the notes
        folder named in the README.
      </p>
    </div>
  );
}
