import { Card, PageSection, Switch, useOptionalToast } from "@repo/ui";
import { MessageSquare } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { sectionCard, statusText } from "~/features/settings/settings.styles";
import { wellbeingSwitch } from "./WellbeingQuestionsSetting.styles";

export const WELLBEING_SETTING_ID = "settings-wellbeing-questions";
export const WELLBEING_SETTING_TITLE = "Questions after a check-in";
export const WELLBEING_SETTING_LABEL = "Ask two optional questions after a check-in";
export const WELLBEING_SETTING_HINT =
  "At most once in each quarter of the year. Switching this off also deletes your earlier answers.";
export const WELLBEING_SETTING_SAVED = "Saved";
export const WELLBEING_SETTING_ERROR =
  "We could not save that change. Nothing has changed. Try again.";

export interface WellbeingQuestionsUpdate {
  wellbeingQuestions: boolean;
}

export interface WellbeingQuestionsSettingProps {
  /** Whether the two optional questions are asked (on by default). */
  enabled: boolean;
  /** Saves the change through the profile update. Rejects when the save fails. */
  onSave: (update: WellbeingQuestionsUpdate) => Promise<unknown>;
}

/**
 * E35 W5: whether to ask the two optional questions after a check-in. Saves as soon as it changes,
 * like the check-in day, and goes back if the save fails. Neither way asks "are you sure": the
 * hint says that switching off deletes the earlier answers (plan section 4, UX O13).
 */
export const WellbeingQuestionsSetting: FC<WellbeingQuestionsSettingProps> = ({
  enabled,
  onSave,
}) => {
  const toast = useOptionalToast()?.toast;
  const [checked, setChecked] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChecked(enabled);
  }, [enabled]);

  const change = async (next: boolean) => {
    if (saving) return;
    setChecked(next);
    setSaving(true);
    setError(null);
    try {
      await onSave({ wellbeingQuestions: next });
      toast?.({ title: WELLBEING_SETTING_SAVED, tone: "positive" });
    } catch {
      setChecked(!next);
      setError(WELLBEING_SETTING_ERROR);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageSection
      headingId="settings-wellbeing-questions-heading"
      icon={MessageSquare}
      id={WELLBEING_SETTING_ID}
      title={WELLBEING_SETTING_TITLE}
      tone="neutral"
    >
      <Card className={sectionCard()}>
        <Switch
          aria-disabled={saving || undefined}
          checked={checked}
          className={wellbeingSwitch()}
          data-testid="wellbeing-questions-toggle"
          hint={WELLBEING_SETTING_HINT}
          id="wellbeing-questions-toggle"
          label={WELLBEING_SETTING_LABEL}
          onChange={(e) => void change(e.target.checked)}
        />
        {error ? (
          <p
            className={statusText({ tone: "danger" })}
            data-testid="wellbeing-questions-error"
            id="wellbeing-questions-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </Card>
    </PageSection>
  );
};

export default WellbeingQuestionsSetting;
