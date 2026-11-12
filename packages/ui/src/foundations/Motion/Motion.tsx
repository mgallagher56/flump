import { type FC, useState } from "react";
import { css } from "../../../styled-system/css";
import { durations, easings } from "../../tokens";
import { animationClass, motionGrid, motionSample, motionTile } from "./Motion.styles";

const KEYFRAMES = ["fadeIn", "slideUp", "scaleIn", "shimmer"] as const;

export const Motion: FC = () => {
  const [reduced, setReduced] = useState(false);
  const [run, setRun] = useState(0);

  return (
    <div
      className={css({
        p: { base: "16px", md: "24px" },
        backgroundColor: "surface.canvas",
        color: "text.primary",
        minHeight: "100%",
      })}
    >
      <h1 className={css({ textStyle: "heading.lg", mb: "4px" })}>Motion</h1>
      <p className={css({ textStyle: "body.sm", color: "text.muted", mb: "16px" })}>
        Durations and easings are plain strings. Keyframes run only under <code>_motionSafe</code>,
        so the operating system reduced-motion setting always wins.
      </p>

      <div className={css({ display: "flex", flexWrap: "wrap", gap: "16px", mb: "24px" })}>
        <label
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            textStyle: "label.md",
            minHeight: "44px",
          })}
        >
          <input
            type="checkbox"
            checked={reduced}
            onChange={(event) => setReduced(event.target.checked)}
          />
          Reduce motion
        </label>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className={css({
            minHeight: "44px",
            px: "16px",
            borderRadius: "md",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.strong",
            backgroundColor: "surface.card",
            color: "text.primary",
            textStyle: "label.md",
            cursor: "pointer",
          })}
        >
          Replay
        </button>
      </div>

      <h2 className={css({ textStyle: "heading.sm", mb: "12px" })}>Keyframes</h2>
      <div className={motionGrid()} data-reduced={reduced ? "true" : "false"}>
        {KEYFRAMES.map((name) => (
          <div key={name} className={motionTile()}>
            <span className={css({ textStyle: "label.md" })}>{name}</span>
            <div
              key={`${name}-${run}-${reduced}`}
              data-testid={`sample-${name}`}
              className={`${motionSample()} ${reduced ? "" : animationClass[name]}`}
            />
          </div>
        ))}
      </div>

      <h2 className={css({ textStyle: "heading.sm", mt: "32px", mb: "12px" })}>Durations</h2>
      <ul className={css({ display: "grid", gap: "8px", mb: "24px" })}>
        {Object.entries(durations).map(([key, token]) => (
          <li key={key} className={css({ display: "flex", gap: "16px", textStyle: "numeric.sm" })}>
            <span className={css({ width: "80px" })}>{key}</span>
            <code className={css({ fontFamily: "mono", color: "text.muted" })}>{token.value}</code>
          </li>
        ))}
      </ul>

      <h2 className={css({ textStyle: "heading.sm", mb: "12px" })}>Easings</h2>
      <ul className={css({ display: "grid", gap: "8px" })}>
        {Object.entries(easings).map(([key, token]) => (
          <li key={key} className={css({ display: "flex", gap: "16px", textStyle: "body.sm" })}>
            <span className={css({ width: "80px" })}>{key}</span>
            <code className={css({ fontFamily: "mono", color: "text.muted" })}>{token.value}</code>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Motion;
