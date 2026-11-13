import { Button, Icon } from "@repo/ui";
import { ArrowRight, Lock } from "lucide-react";
import {
  barGroup,
  barHint,
  barRoot,
  barTitle,
  legendHidden,
  personaSet,
} from "./SandboxBar.styles";

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

/** Sandbox header: read-only cue, sample persona switcher and the save-and-sign-up action. */
export const SandboxBar = <Key extends string>({
  personas,
  active,
  onSelect,
  onSave,
}: SandboxBarProps<Key>) => (
  <div className={barRoot()}>
    <div className={barGroup()}>
      <span className={barTitle()}>
        <Icon icon={Lock} size="sm" />
        Demo sandbox (read-only)
      </span>
      <fieldset className={personaSet()}>
        <legend className={legendHidden()}>Sample persona</legend>
        {personas.map((persona) => (
          <Button
            aria-pressed={active === persona.key}
            key={persona.key}
            onClick={() => onSelect(persona.key)}
            size="sm"
            type="button"
            variant={active === persona.key ? "primary" : "outline"}
          >
            {persona.label}
          </Button>
        ))}
      </fieldset>
    </div>

    <div className={barGroup()}>
      <span className={barHint()}>Ready to use your own bank feeds and HMRC data?</span>
      <Button
        aria-label="Save my numbers and create account"
        onClick={onSave}
        size="sm"
        type="button"
        variant="primary"
      >
        Save my numbers <Icon icon={ArrowRight} size="sm" />
      </Button>
    </div>
  </div>
);

export default SandboxBar;
