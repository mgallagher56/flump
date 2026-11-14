import { Button, Icon, Tabs } from "@repo/ui";
import { Info } from "lucide-react";
import { barButton, barGroup, barHint, barRoot, barTitle, personaTabs } from "./SandboxBar.styles";

export interface SandboxPersona<Key extends string = string> {
  key: Key;
  label: string;
}

export interface SandboxBarProps<Key extends string = string> {
  personas: readonly SandboxPersona<Key>[];
  active: Key;
  onSelect: (key: Key) => void;
  onSave: () => void;
}

/** The sandbox's one sample-data notice (E16 P4.4): what this is, which household, and sign up. */
export const SandboxBar = <Key extends string>({
  personas,
  active,
  onSelect,
  onSave,
}: SandboxBarProps<Key>) => (
  // biome-ignore lint/a11y/useSemanticElements: a labelled note region, not an aside landmark.
  <div
    aria-label="Sample data"
    className={barRoot()}
    data-notice="sample"
    data-testid="sandbox-bar"
    id="sandbox-bar"
    role="note"
  >
    <span className={barTitle()}>
      <Icon icon={Info} size="sm" />
      Sample data: illustrative figures, not yours.
    </span>
    {/*
      The household tabs are a direct child of the bar with a flex basis of their own: the tab
      scroller uses `contain: inline-size`, so as a content-sized flex item it had no width and the
      tabs disappeared (R2-4 sandbox item 1).
    */}
    <div className={personaTabs()} data-testid="sandbox-persona-tabs" id="sandbox-persona-tabs">
      <Tabs
        aria-label="Sample household"
        items={personas.map((p) => ({ value: p.key, label: p.label }))}
        size="sm"
        value={active}
        onValueChange={(value) => onSelect(value as Key)}
      />
    </div>

    <div className={barGroup()}>
      <span className={barHint()}>Ready to use your own figures?</span>
      <Button
        className={barButton()}
        data-testid="sandbox-bar-sign-up"
        id="sandbox-bar-sign-up"
        onClick={onSave}
        size="sm"
        type="button"
        variant="outline"
      >
        Sign up
      </Button>
    </div>
  </div>
);

export default SandboxBar;
