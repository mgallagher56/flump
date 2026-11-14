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
    <div className={barGroup()}>
      <span className={barTitle()}>
        <Icon icon={Info} size="sm" />
        Sample data: illustrative figures, not yours.
      </span>
      <Tabs
        aria-label="Sample household"
        className={personaTabs()}
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
