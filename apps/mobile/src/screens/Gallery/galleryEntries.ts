import { type ComponentType, createElement, Fragment, type ReactElement, useState } from "react";
import { AccountGroup } from "../../components/AccountGroup";
import { accountGroupStates } from "../../components/AccountGroup/AccountGroup.states";
import { AccountRow } from "../../components/AccountRow";
import { accountRowStates } from "../../components/AccountRow/AccountRow.states";
import { AppHeader } from "../../components/AppHeader";
import { appHeaderStates } from "../../components/AppHeader/AppHeader.states";
import { AppLockSetting } from "../../components/AppLockSetting";
import { appLockSettingStates } from "../../components/AppLockSetting/AppLockSetting.states";
import { BreathingRoom } from "../../components/BreathingRoom";
import { breathingRoomStates } from "../../components/BreathingRoom/BreathingRoom.states";
import { BudgetCategoryList } from "../../components/BudgetCategoryList";
import { budgetCategoryListStates } from "../../components/BudgetCategoryList/BudgetCategoryList.states";
import { BudgetEditor } from "../../components/BudgetEditor";
import { budgetEditorStates } from "../../components/BudgetEditor/BudgetEditor.states";
import { BudgetEntryForm } from "../../components/BudgetEntryForm";
import { budgetEntryFormStates } from "../../components/BudgetEntryForm/BudgetEntryForm.states";
import { Button } from "../../components/Button";
import { buttonStates } from "../../components/Button/Button.states";
import { Card } from "../../components/Card";
import { cardStates } from "../../components/Card/Card.states";
import { ChartFigure } from "../../components/ChartFigure";
import { chartFigureStates } from "../../components/ChartFigure/ChartFigure.states";
import { CollapsibleDrawer } from "../../components/CollapsibleDrawer";
import { collapsibleDrawerStates } from "../../components/CollapsibleDrawer/CollapsibleDrawer.states";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import type { ConfirmDialogProps } from "../../components/ConfirmDialog/ConfirmDialog";
import { confirmDialogStates } from "../../components/ConfirmDialog/ConfirmDialog.states";
import { CurrencyInput } from "../../components/CurrencyInput";
import { currencyInputStates } from "../../components/CurrencyInput/CurrencyInput.states";
import { DataList } from "../../components/DataList";
import { dataListStates } from "../../components/DataList/DataList.states";
import { DateField } from "../../components/DateField";
import { dateFieldStates } from "../../components/DateField/DateField.states";
import { DebtHelpLink } from "../../components/DebtHelpLink";
import { debtHelpLinkStates } from "../../components/DebtHelpLink/DebtHelpLink.states";
import { EmptyState } from "../../components/EmptyState";
import { emptyStateStates } from "../../components/EmptyState/EmptyState.states";
import { ErrorState } from "../../components/ErrorState";
import { errorStateStates } from "../../components/ErrorState/ErrorState.states";
import { ExportDataSection } from "../../components/ExportDataSection";
import { exportDataSectionStates } from "../../components/ExportDataSection/ExportDataSection.states";
import { FlumpLogo } from "../../components/FlumpLogo";
import { flumpLogoStates } from "../../components/FlumpLogo/FlumpLogo.states";
import { FormField } from "../../components/FormField";
import { formFieldStates } from "../../components/FormField/FormField.states";
import { HeroFigure } from "../../components/HeroFigure";
import { heroFigureStates } from "../../components/HeroFigure/HeroFigure.states";
import { Icon } from "../../components/Icon";
import { iconStates } from "../../components/Icon/Icon.states";
import { InfoTip } from "../../components/InfoTip";
import { infoTipStates } from "../../components/InfoTip/InfoTip.states";
import { InlineAlert } from "../../components/InlineAlert";
import { inlineAlertStates } from "../../components/InlineAlert/InlineAlert.states";
import { KpiStrip } from "../../components/KpiStrip";
import { kpiStripStates } from "../../components/KpiStrip/KpiStrip.states";
import { ListRow } from "../../components/ListRow";
import { listRowStates } from "../../components/ListRow/ListRow.states";
import { Money } from "../../components/Money";
import { moneyStates } from "../../components/Money/Money.states";
import { NetWorthBasisLine } from "../../components/NetWorthBasisLine";
import { netWorthBasisLineStates } from "../../components/NetWorthBasisLine/NetWorthBasisLine.states";
import { NetWorthTrendBars } from "../../components/NetWorthTrendBars";
import { netWorthTrendBarsStates } from "../../components/NetWorthTrendBars/NetWorthTrendBars.states";
import { OptionList } from "../../components/OptionList";
import type { OptionListProps } from "../../components/OptionList/OptionList";
import { optionListStates } from "../../components/OptionList/OptionList.states";
import { PercentInput } from "../../components/PercentInput";
import { percentInputStates } from "../../components/PercentInput/PercentInput.states";
import { PhraseConfirm } from "../../components/PhraseConfirm";
import { phraseConfirmStates } from "../../components/PhraseConfirm/PhraseConfirm.states";
import { Pressable } from "../../components/Pressable";
import { pressableStates } from "../../components/Pressable/Pressable.states";
import { ProjectionNotice } from "../../components/ProjectionNotice";
import { projectionNoticeStates } from "../../components/ProjectionNotice/ProjectionNotice.states";
import { QuickBalanceUpdate } from "../../components/QuickBalanceUpdate";
import { quickBalanceUpdateStates } from "../../components/QuickBalanceUpdate/QuickBalanceUpdate.states";
import { SavedFiguresFrame } from "../../components/SavedFiguresFrame";
import { savedFiguresFrameStates } from "../../components/SavedFiguresFrame/SavedFiguresFrame.states";
import { ScenarioZone } from "../../components/ScenarioZone";
import { scenarioZoneStates } from "../../components/ScenarioZone/ScenarioZone.states";
import { Screen } from "../../components/Screen";
import { screenStates } from "../../components/Screen/Screen.states";
import { SelectField } from "../../components/SelectField";
import type { SelectFieldProps } from "../../components/SelectField/SelectField";
import { selectFieldStates } from "../../components/SelectField/SelectField.states";
import { Skeleton } from "../../components/Skeleton";
import { skeletonStates } from "../../components/Skeleton/Skeleton.states";
import { StatusBadge } from "../../components/StatusBadge";
import { statusBadgeStates } from "../../components/StatusBadge/StatusBadge.states";
import { Switch } from "../../components/Switch";
import { switchStates } from "../../components/Switch/Switch.states";
import { TabBar } from "../../components/TabBar";
import { tabBarStates } from "../../components/TabBar/TabBar.states";
import { TaxRatesStatusBanner } from "../../components/TaxRatesStatusBanner";
import { taxRatesStatusBannerStates } from "../../components/TaxRatesStatusBanner/TaxRatesStatusBanner.states";
import { Text } from "../../components/Text";
import { textStates } from "../../components/Text/Text.states";
import { TextField } from "../../components/TextField";
import { textFieldStates } from "../../components/TextField/TextField.states";
import { ThemeCycleButton } from "../../components/ThemeCycleButton";
import { themeCycleButtonStates } from "../../components/ThemeCycleButton/ThemeCycleButton.states";
import { Toast } from "../../components/Toast";
import { toastStates } from "../../components/Toast/Toast.states";
import { WholeNumberInput } from "../../components/WholeNumberInput";
import { wholeNumberInputStates } from "../../components/WholeNumberInput/WholeNumberInput.states";

interface GalleryState {
  readonly name: string;
  readonly render: () => ReactElement;
}

export interface GalleryEntry {
  readonly component: string;
  readonly states: readonly GalleryState[];
}

function entry<P extends object>(
  component: string,
  Component: ComponentType<P>,
  states: Record<string, P>,
): GalleryEntry {
  return {
    component,
    states: Object.entries(states).map(([name, props]) => ({
      name,
      render: () => createElement(Component, props),
    })),
  };
}

/**
 * The dialog is the platform's alert, so the gallery shows a button that opens it rather than
 * opening one alert per panel on arrival.
 */
function ConfirmDialogPreview(props: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  return createElement(
    Fragment,
    null,
    createElement(Button, {
      label: `Open: ${props.confirmLabel}`,
      variant: "secondary",
      onPress: () => setOpen(true),
    }),
    createElement(ConfirmDialog, {
      ...props,
      visible: open,
      onConfirm: () => setOpen(false),
      onCancel: () => setOpen(false),
    }),
  );
}

/** Every component in `src/components`, with every named state from its `X.states.ts`. */
export const GALLERY: readonly GalleryEntry[] = [
  entry("Text", Text, textStates),
  entry("Pressable", Pressable, pressableStates),
  entry("Button", Button, buttonStates),
  entry("Card", Card, cardStates),
  entry("Screen", Screen, screenStates),
  entry("FlumpLogo", FlumpLogo, flumpLogoStates),
  entry("InlineAlert", InlineAlert, inlineAlertStates),
  entry("SavedFiguresFrame", SavedFiguresFrame, savedFiguresFrameStates),
  entry("ErrorState", ErrorState, errorStateStates),
  entry("ConfirmDialog", ConfirmDialogPreview, confirmDialogStates),
  entry("Money", Money, moneyStates),
  entry("StatusBadge", StatusBadge, statusBadgeStates),
  entry("Skeleton", Skeleton, skeletonStates),
  entry("HeroFigure", HeroFigure, heroFigureStates),
  entry("NetWorthTrendBars", NetWorthTrendBars, netWorthTrendBarsStates),
  entry("NetWorthBasisLine", NetWorthBasisLine, netWorthBasisLineStates),
  entry("KpiStrip", KpiStrip, kpiStripStates),
  entry("TaxRatesStatusBanner", TaxRatesStatusBanner, taxRatesStatusBannerStates),
  entry("CurrencyInput", CurrencyInput, currencyInputStates),
  entry("FormField", FormField, formFieldStates),
  entry("Toast", Toast, toastStates),
  entry("Icon", Icon, iconStates),
  entry("InfoTip", InfoTip, infoTipStates),
  entry("TabBar", TabBar, tabBarStates),
  entry("AppHeader", AppHeader, appHeaderStates),
  entry("ListRow", ListRow, listRowStates),
  entry("EmptyState", EmptyState, emptyStateStates),
  entry("AccountRow", AccountRow, accountRowStates),
  entry("AccountGroup", AccountGroup, accountGroupStates),
  entry("DataList", DataList, dataListStates),
  entry("ChartFigure", ChartFigure, chartFigureStates),
  entry("CollapsibleDrawer", CollapsibleDrawer, collapsibleDrawerStates),
  entry("Switch", Switch, switchStates),
  entry("OptionList", OptionList as ComponentType<OptionListProps<string>>, optionListStates),
  entry("TextField", TextField, textFieldStates),
  entry("ThemeCycleButton", ThemeCycleButton, themeCycleButtonStates),
  entry("ExportDataSection", ExportDataSection, exportDataSectionStates),
  entry("PhraseConfirm", PhraseConfirm, phraseConfirmStates),
  entry("AppLockSetting", AppLockSetting, appLockSettingStates),
  entry("PercentInput", PercentInput, percentInputStates),
  entry("WholeNumberInput", WholeNumberInput, wholeNumberInputStates),
  entry("DateField", DateField, dateFieldStates),
  entry("SelectField", SelectField as ComponentType<SelectFieldProps<string>>, selectFieldStates),
  entry("QuickBalanceUpdate", QuickBalanceUpdate, quickBalanceUpdateStates),
  entry("ProjectionNotice", ProjectionNotice, projectionNoticeStates),
  entry("ScenarioZone", ScenarioZone, scenarioZoneStates),
  entry("DebtHelpLink", DebtHelpLink, debtHelpLinkStates),
  entry("BudgetCategoryList", BudgetCategoryList, budgetCategoryListStates),
  entry("BreathingRoom", BreathingRoom, breathingRoomStates),
  entry("BudgetEntryForm", BudgetEntryForm, budgetEntryFormStates),
  entry("BudgetEditor", BudgetEditor, budgetEditorStates),
];
