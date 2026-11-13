import { Button, Card, controlProps, FormField, Icon, TextInput } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Briefcase, Camera, Home, PiggyBank, Trash2 } from "lucide-react";
import { type ChangeEvent, type FC, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import UserAvatar from "~/components/navigation/UserAvatar";
import {
  fieldGrid,
  nativeSelect,
  saveBar,
  sectionCard,
  sectionHeading,
  sectionLead,
  statusText,
  tabStack,
} from "~/features/settings/settings.styles";
import {
  type TaxRegion,
  type UserProfile,
  type UserProfileUpdate,
  useUserProfile,
} from "~/hooks/useUserProfile";
import { processImageFile } from "~/utils/avatar";
import {
  avatarActions,
  avatarHelp,
  avatarRow,
  avatarText,
  avatarTitle,
  checkHelp,
  checkRow,
  checkText,
  checkTitle,
  linkRow,
} from "./ProfileTab.styles";

const MULTIPLE_PLANS = "MULTIPLE";
const formatPlan = (plan: string) =>
  plan === "POSTGRAD" ? "Postgraduate loan" : plan.replace("PLAN_", "Plan ");

/** The fields this tab edits and saves. Everything else on the profile is owned by its own page. */
interface ProfileFormState {
  firstName: string | null;
  lastName: string | null;
  taxRegion: TaxRegion | null;
  studentLoanPlans: string[] | null;
}

export interface ProfileTabProps {
  /** The current profile (the loader copy until the shared atom is seeded). */
  profile: UserProfile;
  /** The signed-in auth user, used for name and avatar fallbacks. */
  user?: { firstName?: string; lastName?: string; user_metadata?: Record<string, string> } | null;
  /** Reports whether the form has edits that are not saved, so the page can guard leaving. */
  onDirtyChange?: (dirty: boolean) => void;
}

const sameForm = (a: ProfileFormState, b: ProfileFormState) =>
  a.firstName === b.firstName &&
  a.lastName === b.lastName &&
  a.taxRegion === b.taxRegion &&
  JSON.stringify(a.studentLoanPlans) === JSON.stringify(b.studentLoanPlans);

export const ProfileTab: FC<ProfileTabProps> = ({ profile, user, onDirtyChange }) => {
  const { updateProfile } = useUserProfile();

  let navigate: (to: string) => void;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside Router in unit tests
    navigate = useNavigate();
  } catch {
    navigate = (to: string) => {
      if (typeof window !== "undefined") window.location.href = to;
    };
  }

  const initial: ProfileFormState = {
    firstName: profile.firstName ?? user?.firstName ?? user?.user_metadata?.first_name ?? null,
    lastName: profile.lastName ?? user?.lastName ?? user?.user_metadata?.last_name ?? null,
    taxRegion: profile.taxRegion ?? null,
    studentLoanPlans: profile.studentLoanPlans ?? null,
  };
  const [form, setForm] = useState<ProfileFormState>(initial);
  const [savedForm, setSavedForm] = useState<ProfileFormState>(initial);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const dirty = !sameForm(form, savedForm);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const update: UserProfileUpdate = {
        firstName: form.firstName,
        lastName: form.lastName,
        country: "GB",
        currency: "GBP",
        taxRegion: form.taxRegion,
        studentLoanPlans: form.studentLoanPlans,
      };
      await updateProfile(update);
      setSavedForm(form);
      setSaved(true);
    } catch {
      setError("We could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm(savedForm);
    setSaved(false);
    setError(null);
  };

  // Avatar changes save straight away, like before.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setImageUploadError(null);
    try {
      const dataUrl = await processImageFile(file, 512);
      setAvatarUrl(dataUrl);
      await updateProfile({ avatarUrl: dataUrl });
    } catch (err) {
      setImageUploadError(
        err instanceof Error && err.message
          ? err.message
          : "We could not process that image. Try another one.",
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    setUploadingImage(true);
    setImageUploadError(null);
    try {
      setAvatarUrl(null);
      await updateProfile({ avatarUrl: null });
    } catch {
      setImageUploadError("We could not remove your profile picture. Try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Self Assessment is an opt-in module (E16 D3-B): a page, nav entry and dashboard widget.
  // It saves as soon as it is switched, not with the form below.
  const selfAssessmentOn = (profile.enabledPages ?? []).includes("tax");
  const [moduleSaving, setModuleSaving] = useState(false);
  const handleToggleSelfAssessment = async (on: boolean) => {
    const withTax = (list: string[] | undefined) => {
      const base = (list ?? []).filter((k) => k !== "tax");
      return on ? [...base, "tax"] : base;
    };
    setModuleSaving(true);
    try {
      await updateProfile({
        enabledPages: withTax(profile.enabledPages),
        dashboardWidgets: withTax(profile.dashboardWidgets),
        dashboardWidgetOrder: withTax(profile.dashboardWidgetOrder),
      });
    } finally {
      setModuleSaving(false);
    }
  };

  const avatarProfile = {
    ...profile,
    firstName: form.firstName,
    lastName: form.lastName,
    avatarUrl,
  };

  return (
    <div className={tabStack()} id="settings-profile-tab" data-testid="settings-profile-tab">
      <Card as="section" aria-labelledby="your-details-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="your-details-heading">
          Your details
        </h2>

        <div className={avatarRow()}>
          <UserAvatar bordered profile={avatarProfile} size={72} user={user} />
          <div className={avatarText()}>
            <p className={avatarTitle()}>Profile picture</p>
            <p className={avatarHelp()}>
              {avatarUrl
                ? "Your picture is used across Flump. Changes to it save straight away."
                : "Your initials are used until you add a picture. It saves straight away."}
            </p>
            <div className={avatarActions()}>
              <input
                ref={fileInputRef}
                hidden
                accept="image/png,image/jpeg,image/webp,image/gif"
                aria-label="Upload profile picture"
                data-testid="profile-picture-input"
                id="profile-picture-input"
                type="file"
                onChange={handleImageUpload}
              />
              <Button
                data-testid="upload-picture-button"
                disabled={uploadingImage}
                id="upload-picture-button"
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon icon={Camera} size="sm" />
                {uploadingImage ? "Processing" : avatarUrl ? "Change picture" : "Upload picture"}
              </Button>
              {avatarUrl ? (
                <Button
                  data-testid="remove-picture-button"
                  disabled={uploadingImage}
                  id="remove-picture-button"
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={handleRemoveImage}
                >
                  <Icon icon={Trash2} size="sm" />
                  Remove
                </Button>
              ) : null}
            </div>
            {imageUploadError ? (
              <p
                className={statusText({ tone: "danger" })}
                data-testid="profile-upload-error"
                id="profile-upload-error"
                role="alert"
              >
                {imageUploadError}
              </p>
            ) : null}
          </div>
        </div>

        <div className={fieldGrid()}>
          <FormField id="first-name-input" label="First name">
            {(field) => (
              <TextInput
                {...controlProps(field)}
                data-testid="first-name-input"
                placeholder="First name"
                value={form.firstName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value || null }))}
              />
            )}
          </FormField>
          <FormField id="last-name-input" label="Last name">
            {(field) => (
              <TextInput
                {...controlProps(field)}
                data-testid="last-name-input"
                placeholder="Last name"
                value={form.lastName ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value || null }))}
              />
            )}
          </FormField>
        </div>
      </Card>

      <Card as="section" aria-labelledby="tax-basis-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="tax-basis-heading">
          How we work out your tax
        </h2>
        <p className={sectionLead()}>
          Your region and student loan change your take-home pay. Salary and tax code are edited on
          the tax page, pension rates on the pension page and property on the mortgage page.
        </p>
        {/* E23 D06/D-4-C: region and student loan for users who onboarded before they were asked */}
        <div className={fieldGrid()}>
          <FormField
            hint="Scotland has its own income tax rates, so this changes your take-home pay."
            id="tax-region-select"
            label="Where do you pay tax?"
          >
            {(field) => (
              <select
                aria-describedby={field.describedBy}
                className={nativeSelect()}
                data-testid="tax-region-select"
                id={field.id}
                value={form.taxRegion ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    taxRegion: (e.target.value || null) as TaxRegion | null,
                  }))
                }
              >
                <option value="">
                  Not set (England, Wales and Northern Ireland rates assumed)
                </option>
                <option value="ENGLAND">England</option>
                <option value="WALES">Wales</option>
                <option value="SCOTLAND">Scotland</option>
                <option value="NORTHERN_IRELAND">Northern Ireland</option>
              </select>
            )}
          </FormField>
          <FormField id="student-loan-select" label="Student loan plan">
            {(field) => (
              <select
                aria-describedby={field.describedBy}
                className={nativeSelect()}
                data-testid="student-loan-select"
                id={field.id}
                value={
                  form.studentLoanPlans == null
                    ? ""
                    : form.studentLoanPlans.length > 1
                      ? MULTIPLE_PLANS
                      : (form.studentLoanPlans[0] ?? "NONE")
                }
                onChange={(e) => {
                  const v = e.target.value;
                  // Several stored plans are kept as they are unless the user picks one.
                  if (v === MULTIPLE_PLANS) return;
                  setForm((p) => ({
                    ...p,
                    studentLoanPlans: v === "" ? null : v === "NONE" ? [] : [v],
                  }));
                }}
              >
                <option value="">Not set (no loan assumed)</option>
                {(form.studentLoanPlans?.length ?? 0) > 1 && (
                  <option value={MULTIPLE_PLANS}>
                    {form.studentLoanPlans?.map(formatPlan).join(" and ")}
                  </option>
                )}
                <option value="NONE">None</option>
                <option value="PLAN_1">Plan 1</option>
                <option value="PLAN_2">Plan 2</option>
                <option value="PLAN_4">Plan 4 (Scotland)</option>
                <option value="PLAN_5">Plan 5</option>
                <option value="POSTGRAD">Postgraduate loan</option>
              </select>
            )}
          </FormField>
        </div>
        <div className={linkRow()}>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => navigate("/app/self-assessment")}
          >
            <Icon icon={Briefcase} size="sm" />
            Go to tax and take-home
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => navigate("/app/pension")}
          >
            <Icon icon={PiggyBank} size="sm" />
            Go to pension
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => navigate("/app/mortgage")}
          >
            <Icon icon={Home} size="sm" />
            Go to mortgage
          </Button>
        </div>

        <div className={saveBar()}>
          {error ? (
            <p
              className={statusText({ tone: "danger" })}
              data-testid="profile-save-error"
              id="profile-save-error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {saved && !dirty ? (
            <p
              className={statusText({ tone: "positive" })}
              data-testid="profile-saved"
              id="profile-saved"
              role="status"
            >
              Saved
            </p>
          ) : null}
          {dirty ? (
            <Button size="md" type="button" variant="ghost" onClick={handleDiscard}>
              Discard changes
            </Button>
          ) : null}
          <Button
            disabled={!dirty}
            id="save-profile"
            data-testid="save-profile"
            pending={saving}
            type="button"
            variant="primary"
            onClick={handleSave}
          >
            Save changes
          </Button>
        </div>
      </Card>

      <Card as="section" aria-labelledby="modules-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="modules-heading">
          Optional modules
        </h2>
        <label className={cx(checkRow())} htmlFor="self-assessment-module-toggle">
          <input
            checked={selfAssessmentOn}
            data-testid="self-assessment-module-toggle"
            disabled={moduleSaving}
            id="self-assessment-module-toggle"
            type="checkbox"
            onChange={(e) => handleToggleSelfAssessment(e.target.checked)}
          />
          <span className={checkText()}>
            <span className={checkTitle()}>Self Assessment module</span>
            <span className={checkHelp()}>
              Income and expense records by tax year, for self-employed or rental income. Adds tax
              to your menu and dashboard. This saves straight away.
            </span>
          </span>
        </label>
      </Card>
    </div>
  );
};
