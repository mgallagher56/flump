/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged).
 *
 * Where "Reduce motion" would live: a setting in Settings (the lasting choice), and a quick pause
 * button in the app header beside the theme switch, shown only on pages whose header orbs move
 * (as the marketing header's pause control). Both write the same choice.
 */
import { Card, Switch } from "@repo/ui";
import { Pause, Play } from "lucide-react";
import type { FC } from "react";
import { useProtoReducedMotion } from "../motion";

export const ProtoMotionSetting: FC = () => {
  const { reduced, setReduced } = useProtoReducedMotion();
  return (
    <Card as="section" aria-labelledby="proto-motion-title" className="proto-motion-setting">
      <h2 className="proto-motion-setting__title" id="proto-motion-title">
        Motion
      </h2>
      <Switch
        checked={reduced}
        hint="Stops the slow movement of the decorative orbs in page headers. Your figures never move either way."
        label="Reduce motion"
        onChange={(event) => setReduced(event.currentTarget.checked)}
      />
    </Card>
  );
};

export const ProtoMotionQuickToggle: FC = () => {
  const { reduced, setReduced } = useProtoReducedMotion();
  return (
    <button
      aria-pressed={reduced}
      className="proto-motion-toggle"
      onClick={() => setReduced(!reduced)}
      title={reduced ? "Play motion" : "Pause motion"}
      type="button"
    >
      {reduced ? (
        <Play aria-hidden="true" size={16} strokeWidth={1.75} />
      ) : (
        <Pause aria-hidden="true" size={16} strokeWidth={1.75} />
      )}
      <span className="proto-motion-toggle__label">Pause motion</span>
    </button>
  );
};
