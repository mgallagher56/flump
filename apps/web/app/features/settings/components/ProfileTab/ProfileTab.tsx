import { netWorthBasisFromProfile } from "@flump/finance-engine";
import {
  Button,
  ButtonLink,
  Card,
  controlProps,
  FormField,
  Icon,
  Select,
  Switch,
  TextInput,
  useOptionalToast,
} from "@repo/ui";
import { Camera, Trash2 } from "lucide-react";
import { type ChangeEvent, type FC, type MouseEvent, useRef, useState } from "react";
import { useNavigate } from "react-router";
import UserAvatar from "~/components/navigation/UserAvatar";
import { NetWorthChoices } from "~/features/settings/components/NetWorthChoices";
import {
  fieldGrid,
  sectionCard,
  sectionHeading,
  sectionLead,
  statusText,
  tabGrid,
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
  linkRow,
} from "./ProfileTab.styles";

const MULTIPLE_PLANS = "MULTIPLE";

const TAX_REGION_OPTIONS = [
  { value: "", label: "Not set (England, Wales and Northern Ireland rates assumed)" },
  { value: "ENGLAND", label: "England" },
  { value: "WALES", label: "Wales" },
  { value: "SCOTLAND", label: "Scotland" },
  { value: "NORTHERN_IRELAND", label: "Northern Ireland" },
] as const;

const STUDENT_LOAN_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "PLAN_1", label: "Plan 1" },
  { value: "PLAN_2", label: "Plan 2" },
  { value: "PLAN_4", label: "Plan 4 (Scotland)" },
  { value: "PLAN_5", label: "Plan 5" },
  { value: "POSTGRAD", label: "Postgraduate loan" },
] as const;

/** Where the rest of the profile is edited: text links, not buttons (E16 PR 9). */
const ELSEWHERE_LINKS = [
  { href: "/app/self-assessment", label: "Tax and take-home pay", id: "settings-link-tax" },
  { href: "/app/pension", label: "Your pension", id: "settings-link-pension" },
  { href: "/app/mortgage", label: "Your mortgage", id: "settings-link-mortgage" },
] as const;
const formatPlan = (plan: string) =>
  plan === "POSTGRAD" ? "Postgraduate loan" : plan.replace("PLAN_", "Plan ");

/** The fields the details and tax cards edit. Everything else on the profile has its own page. */
interface ProfileFormState {
  firstName: string | null;
  lastName: string | null;
  taxRegion: TaxRegion | null;
  studentLoanPlans: string[] | null;
}

type SaveArea = "details" | "tax" | "modules";

export const PROFILE_SAVED_MESSAGE = "Saved";
export const PROFILE_SAVE_FAILED = "We could not save that change. Nothing has changed. Try again.";

export interface ProfileTabProps {
  /** The current profile (the loader copy until the shared atom is seeded). */
  profile: UserProfile;
  /** The signed-in auth user, used for name and avatar fallbacks. */
  user?: { firstName?: string; lastName?: string; user_metadata?: Record<string, string> } | null;
}

/**
 * Profile tab (R2-9): one save model. Every change saves straight away, as the net worth choices
 * already did: a name when the field is left, a list or switch when it changes, a picture when it
 * is chosen. Each save shows the saved value in place and a short "Saved" toast; a failed save puts
 * the saved value back and says so on the card, so the toast is never the only record.
 */
export const ProfileTab: FC<ProfileTabProps> = ({ profile, user }) => {
  const { updateProfile } = useUserProfile();
  const toast = useOptionalToast()?.toast;

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
  const savedForm = useRef<ProfileFormState>(initial);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [errors, setErrors] = useState<Partial<Record<SaveArea, string>>>({});

  const setError = (area: SaveArea, message: string | null) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[area] = message;
      else delete next[area];
      return next;
    });

  /**
   * Saves one change. The saved copy moves first, so a second save that starts before this one
   * ends (Enter then leaving the field, or two fields at once) builds on it and is not repeated.
   * On failure only this change's fields go back, and the card says why.
   */
  const saveFields = async (area: SaveArea, patch: Partial<ProfileFormState>) => {
    const keys = Object.keys(patch) as (keyof ProfileFormState)[];
    const previous: Partial<ProfileFormState> = {};
    for (const key of keys) (previous as Record<string, unknown>)[key] = savedForm.current[key];
    savedForm.current = { ...savedForm.current, ...patch };
    setForm((p) => ({ ...p, ...patch }));
    setError(area, null);
    try {
      await updateProfile({ ...patch, country: "GB", currency: "GBP" } as UserProfileUpdate);
      toast?.({ title: PROFILE_SAVED_MESSAGE, tone: "positive" });
    } catch {
      savedForm.current = { ...savedForm.current, ...previous };
      setForm((p) => ({ ...p, ...previous }));
      setError(area, PROFILE_SAVE_FAILED);
    }
  };

  /** A name saves when the field is left, and only if it changed. */
  const saveName = (key: "firstName" | "lastName") => {
    const value = form[key]?.trim() || null;
    if (value === savedForm.current[key]) return;
    void saveFields("details", { [key]: value });
  };

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError("details", null);
    let dataUrl: string;
    try {
      // The file checks run in the browser, so their messages are ours, never a server's.
      dataUrl = await processImageFile(file, 512);
    } catch (err) {
      setError(
        "details",
        err instanceof Error && err.message
          ? err.message
          : "We could not process that image. Try another one.",
      );
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const previous = avatarUrl;
    try {
      setAvatarUrl(dataUrl);
      await updateProfile({ avatarUrl: dataUrl });
      toast?.({ title: PROFILE_SAVED_MESSAGE, tone: "positive" });
    } catch {
      // Show the picture that is still saved, not the one that failed.
      setAvatarUrl(previous);
      setError("details", "We could not save your picture. Try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    setUploadingImage(true);
    setError("details", null);
    const previous = avatarUrl;
    try {
      setAvatarUrl(null);
      await updateProfile({ avatarUrl: null });
      toast?.({ title: "Picture deleted", tone: "positive" });
    } catch {
      // The picture is still saved, so keep showing it.
      setAvatarUrl(previous);
      setError(
        "details",
        "We could not delete your profile picture. It is still in use. Try again.",
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Self Assessment is an opt-in module (E16 D3-B): a page, nav entry and dashboard widget.
  const selfAssessmentOn = (profile.enabledPages ?? []).includes("tax");
  const [moduleSaving, setModuleSaving] = useState(false);
  const handleToggleSelfAssessment = async (on: boolean) => {
    const withTax = (list: string[] | undefined) => {
      const base = (list ?? []).filter((k) => k !== "tax");
      return on ? [...base, "tax"] : base;
    };
    setModuleSaving(true);
    setError("modules", null);
    try {
      await updateProfile({
        enabledPages: withTax(profile.enabledPages),
        dashboardWidgets: withTax(profile.dashboardWidgets),
        dashboardWidgetOrder: withTax(profile.dashboardWidgetOrder),
      });
      toast?.({ title: PROFILE_SAVED_MESSAGE, tone: "positive" });
    } catch {
      setError(
        "modules",
        "We could not change the Self Assessment section. Nothing has changed. Try again.",
      );
    } finally {
      setModuleSaving(false);
    }
  };

  const errorLine = (area: SaveArea) =>
    errors[area] ? (
      <p
        className={statusText({ tone: "danger" })}
        data-testid={`profile-${area}-error`}
        id={`profile-${area}-error`}
        role="alert"
      >
        {errors[area]}
      </p>
    ) : null;

  const basis = netWorthBasisFromProfile(profile);
  const ownsHome = profile.housingStatus === "mortgage" || profile.housingStatus === "own_outright";

  const avatarProfile = {
    ...profile,
    firstName: form.firstName,
    lastName: form.lastName,
    avatarUrl,
  };

  return (
    <div className={tabGrid()} id="settings-profile-tab" data-testid="settings-profile-tab">
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
                ? "Your picture is shown across Flump."
                : "Your initials are shown until you add a picture."}
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
                  Delete picture
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={fieldGrid()}>
          <FormField id="first-name-input" label="First name">
            {(field) => (
              <TextInput
                {...controlProps(field)}
                data-testid="first-name-input"
                autoComplete="given-name"
                value={form.firstName ?? ""}
                onBlur={() => saveName("firstName")}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value || null }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName("firstName");
                }}
              />
            )}
          </FormField>
          <FormField id="last-name-input" label="Last name">
            {(field) => (
              <TextInput
                {...controlProps(field)}
                data-testid="last-name-input"
                autoComplete="family-name"
                value={form.lastName ?? ""}
                onBlur={() => saveName("lastName")}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value || null }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName("lastName");
                }}
              />
            )}
          </FormField>
        </div>
        {errorLine("details")}
      </Card>

      <Card as="section" aria-labelledby="tax-basis-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="tax-basis-heading">
          How we work out your tax
        </h2>
        <p className={sectionLead()}>
          Where you pay tax and your student loan plan change your take-home pay. Your salary and
          pension each have their own page.
        </p>
        {/* E23 D06/D-4-C: region and student loan for users who onboarded before they were asked */}
        <div className={fieldGrid()}>
          <FormField id="tax-region-select" label="Where do you pay tax?">
            {(field) => (
              <Select
                {...controlProps(field)}
                data-testid="tax-region-select"
                options={TAX_REGION_OPTIONS}
                value={form.taxRegion ?? ""}
                onChange={(e) =>
                  void saveFields("tax", {
                    taxRegion: (e.target.value || null) as TaxRegion | null,
                  })
                }
              />
            )}
          </FormField>
          <FormField id="student-loan-select" label="Student loan plan">
            {(field) => (
              <Select
                {...controlProps(field)}
                data-testid="student-loan-select"
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
                  void saveFields("tax", {
                    studentLoanPlans: v === "" ? null : v === "NONE" ? [] : [v],
                  });
                }}
              >
                <option value="">Not set (no loan assumed)</option>
                {(form.studentLoanPlans?.length ?? 0) > 1 && (
                  <option value={MULTIPLE_PLANS}>
                    {form.studentLoanPlans?.map(formatPlan).join(" and ")}
                  </option>
                )}
                {STUDENT_LOAN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
        <div className={linkRow()}>
          {ELSEWHERE_LINKS.filter(
            // The mortgage page is for a home someone owns; a renter is not sent there.
            (link) => link.href !== "/app/mortgage" || ownsHome,
          ).map((link) => (
            <ButtonLink
              data-testid={link.id}
              href={link.href}
              id={link.id}
              key={link.href}
              size="sm"
              variant="link"
              onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                navigate(link.href);
              }}
            >
              {link.label}
            </ButtonLink>
          ))}
        </div>
        {errorLine("tax")}
      </Card>

      <NetWorthChoices
        countProperty={basis.countProperty}
        countStudentLoan={basis.countStudentLoan}
        onSave={(update) => updateProfile(update)}
      />

      <Card as="section" aria-labelledby="modules-heading" className={sectionCard()}>
        <h2 className={sectionHeading()} id="modules-heading">
          Sections you use
        </h2>
        <Switch
          checked={selfAssessmentOn}
          data-testid="self-assessment-module-toggle"
          disabled={moduleSaving}
          hint="Income and cost records by tax year, for self-employed or rental income. Adds a tax page to your menu and dashboard."
          id="self-assessment-module-toggle"
          label="Self Assessment"
          onChange={(e) => handleToggleSelfAssessment(e.target.checked)}
        />
        {errorLine("modules")}
      </Card>
    </div>
  );
};
