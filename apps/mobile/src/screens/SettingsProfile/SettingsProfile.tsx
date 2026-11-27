import { CHECK_IN_DAYS } from "@flump/finance-engine/check-in";
import {
  type NetWorthChoicesAvailable,
  netWorthBasisFromProfile,
  netWorthChoicesAvailable,
} from "@flump/finance-engine/net-worth";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Linking, type ScrollViewInstance, View } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { ErrorState } from "../../components/ErrorState";
import { FormField } from "../../components/FormField";
import { OptionList } from "../../components/OptionList";
import { Screen } from "../../components/Screen";
import { Skeleton } from "../../components/Skeleton";
import { Switch } from "../../components/Switch";
import { Text } from "../../components/Text";
import { TextField } from "../../components/TextField";
import { Toast } from "../../components/Toast";
import { CHECK_IN } from "../../copy/checkIn";
import { OPEN_FLUMP_WEBSITE } from "../../copy/navigation";
import { checkInDayLabel, PROFILE, SAVE } from "../../copy/settings";
import { useAccounts } from "../../data/checkIn";
import { classifyApiError } from "../../data/problems";
import { type AppProfile, useProfile } from "../../data/profile";
import { useDelayedLoading } from "../../data/useDelayedLoading";
import { type ProfileSaves, useProfileSaves } from "../../features/settings/useProfileSaves";
import { isPageEnabled, withSelfAssessment } from "../../navigation/pageSwitches";
import type { WebLink } from "../../navigation/shell";
import { NotSetUp } from "../NotSetUp";
import { Offline } from "../Offline";
import { TermsRequired } from "../TermsRequired";

const EDGES = ["right", "bottom", "left"] as const;

export interface SettingsProfileProps {
  /** Restored without reaching Flump: the page says so and sends nothing. */
  offline: boolean;
  onRetry(): void;
  onSignOut(): void;
  /** The website, for the terms screen. */
  marketingOrigin: string;
  /** Web's onboarding, for a person who has not finished setting up. */
  setUp: WebLink;
  /** Web's settings, where the rest of the profile is changed. */
  website: WebLink;
  /** Opens at the net worth choices (Home's "Change what counts"). */
  focus?: "netWorth";
}

const DAY_OPTIONS = CHECK_IN_DAYS.map((day) => ({
  value: String(day),
  label: checkInDayLabel(day),
}));

/**
 * Settings, Profile (E12 S9, plan 9.10): what web's Profile tab lets a person change that the app
 * honours today, each change saved at once. The net worth switches write the profile query, so
 * Home's figure follows with no second request. The rest of web's tab is one link to the website.
 */
export function SettingsProfile({
  offline,
  onRetry,
  onSignOut,
  marketingOrigin,
  setUp,
  website,
  focus,
}: SettingsProfileProps) {
  const profile = useProfile({ enabled: !offline });
  const accounts = useAccounts({ enabled: !offline });
  const loading = !offline && profile.data === undefined && !profile.isError;
  // Nothing for 200 ms, then a placeholder for at least 400 ms, as Home (S5).
  const skeleton = useDelayedLoading(loading);

  if (offline) return <Offline onRetry={onRetry} onSignOut={onSignOut} />;
  if (profile.isError && profile.data === undefined) {
    const problem = classifyApiError(profile.error);
    const retry = () => void profile.refetch();
    if (problem === "termsNotAccepted") {
      return (
        <TermsRequired
          marketingOrigin={marketingOrigin}
          onRetry={retry}
          onSignOut={onSignOut}
          edges={EDGES}
        />
      );
    }
    return (
      <Screen edges={EDGES}>
        <ErrorState
          heading={CHECK_IN.loadErrorHeading}
          body={problem === "outOfStep" ? CHECK_IN.loadErrorOutOfStepBody : CHECK_IN.loadErrorBody}
          retryLabel={CHECK_IN.tryAgain}
          testID="settings-profile-error"
          retryTestID="settings-profile-retry"
          onRetry={retry}
        />
      </Screen>
    );
  }
  if (loading || skeleton || profile.data === undefined) {
    return (
      <Screen edges={EDGES}>
        {skeleton ? <Skeleton label={PROFILE.loading} testID="settings-profile-loading" /> : null}
      </Screen>
    );
  }
  if (profile.data === null || profile.data.onboardingCompleted === false) {
    return <NotSetUp setUp={setUp} edges={EDGES} />;
  }
  // Unknown is not "no": with the accounts unread, both choices are offered (web's rule).
  const choices = accounts.data ? netWorthChoicesAvailable(accounts.data) : null;
  return <ProfileForm profile={profile.data} choices={choices} website={website} focus={focus} />;
}

function ProfileForm({
  profile,
  choices,
  website,
  focus,
}: {
  profile: AppProfile;
  choices: NetWorthChoicesAvailable | null;
  website: WebLink;
  focus?: "netWorth";
}) {
  const saves = useProfileSaves();
  const scroll = useRef<ScrollViewInstance>(null);
  const scrolled = useRef(false);
  return (
    <Screen edges={EDGES} scrollRef={scroll} testID="settings-profile">
      {saves.toast ? (
        <Toast key={saves.toast.count} message={saves.toast.message} testID="settings-saved" />
      ) : null}
      <Details profile={profile} saves={saves} />
      <NetWorthChoices
        profile={profile}
        choices={choices}
        saves={saves}
        onLayoutY={(y) => {
          if (focus !== "netWorth" || scrolled.current) return;
          scrolled.current = true;
          scroll.current?.scrollTo({ y, animated: false });
        }}
      />
      <CheckInDay profile={profile} saves={saves} />
      <Sections profile={profile} saves={saves} />
      <View>
        <Text textStyle="body.sm" color="secondary">
          {PROFILE.moreOnWebsite}
        </Text>
        <Button
          label={website.exact ? PROFILE.openOnWebsite : OPEN_FLUMP_WEBSITE}
          variant="link"
          size="sm"
          accessibilityRole="link"
          testID="settings-profile-website"
          onPress={() => void Linking.openURL(website.url)}
        />
      </View>
    </Screen>
  );
}

/** A titled card with its group's error line. */
function Group({
  title,
  description,
  error,
  testID,
  onLayoutY,
  children,
}: {
  title: string;
  description?: string;
  error?: string;
  testID: string;
  onLayoutY?: (y: number) => void;
  children: ReactNode;
}) {
  return (
    <Card testID={testID} onLayout={(e) => onLayoutY?.(e.nativeEvent.layout.y)}>
      <Text accessibilityRole="header" textStyle="heading.sm">
        {title}
      </Text>
      {description ? (
        <Text textStyle="body.sm" color="secondary">
          {description}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text
          textStyle="body.sm"
          color="danger"
          accessibilityLiveRegion="polite"
          testID={`${testID}-error`}
        >
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

/** A name: typed freely, saved when the field is left and only when it changed (web's rule). */
function NameField({
  field,
  label,
  autoComplete,
  profile,
  saves,
}: {
  field: "firstName" | "lastName";
  label: string;
  autoComplete: "given-name" | "family-name";
  profile: AppProfile;
  saves: ProfileSaves;
}) {
  const saved = profile[field] ?? null;
  const [text, setText] = useState(saved ?? "");
  const editing = useRef(false);
  // A save, a failure or a fresh read shows the saved name again, unless it is being typed.
  useEffect(() => {
    if (!editing.current) setText(saved ?? "");
  }, [saved]);
  // Submitting with the keyboard also leaves the field: one edit saves once, on whichever is first.
  const leave = async () => {
    if (!editing.current) return;
    editing.current = false;
    const value = text.trim() || null;
    if (value === saved) {
      setText(saved ?? "");
      return;
    }
    const ok = await saves.save("details", { [field]: value });
    if (!ok) setText(saved ?? "");
  };
  return (
    <FormField label={label}>
      <TextField
        value={text}
        onChangeText={(next) => {
          editing.current = true;
          setText(next);
        }}
        onBlur={() => void leave()}
        onSubmitEditing={() => void leave()}
        autoComplete={autoComplete}
        accessibilityLabel={label}
        testID={`settings-${field}`}
      />
    </FormField>
  );
}

function Details({ profile, saves }: { profile: AppProfile; saves: ProfileSaves }) {
  return (
    <Group title={PROFILE.detailsTitle} error={saves.errors.details} testID="settings-details">
      <NameField
        field="firstName"
        label={PROFILE.firstName}
        autoComplete="given-name"
        profile={profile}
        saves={saves}
      />
      <NameField
        field="lastName"
        label={PROFILE.lastName}
        autoComplete="family-name"
        profile={profile}
        saves={saves}
      />
    </Group>
  );
}

/**
 * Web's two net worth choices, shown only for the accounts they change (both when unknown). Hiding
 * a switch never changes the saved choice.
 */
function NetWorthChoices({
  profile,
  choices,
  saves,
  onLayoutY,
}: {
  profile: AppProfile;
  choices: NetWorthChoicesAvailable | null;
  saves: ProfileSaves;
  onLayoutY(y: number): void;
}) {
  const basis = useMemo(() => netWorthBasisFromProfile(profile), [profile]);
  const showProperty = choices?.property ?? true;
  const showStudentLoan = choices?.studentLoan ?? true;
  if (!showProperty && !showStudentLoan) return null;
  const busy = saves.busy.has("netWorth");
  const property = saves.pending.netWorthCountsProperty ?? basis.countProperty;
  const studentLoan = saves.pending.netWorthCountsStudentLoan ?? basis.countStudentLoan;
  return (
    <Group
      title={PROFILE.netWorthTitle}
      description={PROFILE.netWorthHelper}
      error={saves.errors.netWorth}
      testID="settings-net-worth"
      onLayoutY={onLayoutY}
    >
      {showProperty ? (
        <Switch
          label={PROFILE.countProperty}
          value={property}
          busy={busy}
          testID="settings-counts-property"
          onValueChange={(on) => void saves.save("netWorth", { netWorthCountsProperty: on })}
        />
      ) : null}
      {showStudentLoan ? (
        <Switch
          label={PROFILE.countStudentLoan}
          value={studentLoan}
          busy={busy}
          testID="settings-counts-student-loan"
          onValueChange={(on) => void saves.save("netWorth", { netWorthCountsStudentLoan: on })}
        />
      ) : null}
    </Group>
  );
}

function CheckInDay({ profile, saves }: { profile: AppProfile; saves: ProfileSaves }) {
  // No day chosen reads as the 1st, as web's.
  const day = saves.pending.checkInDay ?? profile.checkInDay ?? 1;
  return (
    <Group title={PROFILE.checkInTitle} error={saves.errors.checkIn} testID="settings-check-in">
      <OptionList
        label={PROFILE.checkInDay}
        hint={PROFILE.checkInDayHint}
        options={DAY_OPTIONS}
        value={String(day)}
        busy={saves.busy.has("checkIn")}
        testID="settings-check-in-day"
        onChange={(value) => void saves.save("checkIn", { checkInDay: Number(value) })}
      />
    </Group>
  );
}

/** Web's "Sections you use": the Self Assessment switch, which also decides More's Pay group. */
function Sections({ profile, saves }: { profile: AppProfile; saves: ProfileSaves }) {
  const pages = saves.pending.enabledPages ?? profile.enabledPages;
  const on = isPageEnabled(pages, "tax");
  const toggle = (next: boolean) => {
    const widgets = profile.dashboardWidgets;
    void saves.save(
      "sections",
      {
        enabledPages: withSelfAssessment(profile.enabledPages, next),
        // Written only when the profile carries the list, so an older backend's is not invented.
        ...(Array.isArray(widgets) ? { dashboardWidgets: withSelfAssessment(widgets, next) } : {}),
      },
      SAVE.selfAssessmentFailed,
    );
  };
  return (
    <Group
      title={PROFILE.sectionsTitle}
      description={PROFILE.sectionsDescription}
      error={saves.errors.sections}
      testID="settings-sections"
    >
      <Switch
        label={PROFILE.selfAssessment}
        hint={PROFILE.selfAssessmentHint}
        value={on}
        busy={saves.busy.has("sections")}
        testID="settings-self-assessment"
        onValueChange={toggle}
      />
    </Group>
  );
}
