import { View } from "react-native";
import { Button } from "../../components/Button";
import { ExportDataSection } from "../../components/ExportDataSection";
import { Text } from "../../components/Text";
import { WEB_DELETE } from "../../copy/accountData";
import { useExportData } from "../../features/account-data/useAccountData";

export interface AccountDataActionsProps {
  /** Restored offline: both actions are disabled (the screen says why, once). */
  offline?: boolean;
  /** Opens "Delete your account". */
  onOpenDelete(): void;
}

/**
 * "Download your data" and "Delete your account" (E12 S9): on the Data page, and on the Not
 * invited and Terms screens, since data rights do not depend on the beta or on agreeing to new
 * terms (the backend allows both routes there).
 */
export function AccountDataActions({ offline = false, onOpenDelete }: AccountDataActionsProps) {
  const exportData = useExportData();
  const disabled = offline || !exportData.available;
  return (
    <>
      <ExportDataSection
        state={exportData.state}
        disabled={disabled}
        onDownload={exportData.download}
      />
      <View>
        <Text accessibilityRole="header" textStyle="heading.sm">
          {WEB_DELETE.heading}
        </Text>
        <Text color="secondary">{WEB_DELETE.description}</Text>
      </View>
      <Button
        label={WEB_DELETE.trigger}
        variant="dangerSubtle"
        disabled={disabled}
        testID="delete-account-open"
        onPress={onOpenDelete}
      />
    </>
  );
}
