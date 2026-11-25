import { type FC, useSyncExternalStore } from "react";
import { cx } from "../../../styled-system/css";
import {
  isOptionalStorageOff,
  setOptionalStorageOff,
  subscribeOptionalStorage,
} from "../../hooks/optionalStorage";
import { Switch } from "../../primitives/Switch/Switch";
import { storagePreference, storagePreferenceStatus } from "./StoragePreference.styles";

export const STORAGE_PREFERENCE_LABEL = "Remember scroll position and animations already shown";
export const STORAGE_PREFERENCE_HINT =
  "Kept in this browser tab only, and removed when you close the tab.";
export const STORAGE_PREFERENCE_ON = "On. This site can keep these notes in this tab.";
export const STORAGE_PREFERENCE_OFF =
  "Off. This site keeps none of these notes, and the ones it had are removed.";

export interface StoragePreferenceProps {
  /** Element id of the switch. Pass a different one for a second copy on the same page. */
  id?: string;
  className?: string;
}

/**
 * The switch that lets a person object to optional browser storage (see `optionalStorage.ts`). On
 * by default; off removes the optional keys at once and stops new ones. The choice is per site and
 * per browser, and takes effect without a reload.
 */
export const StoragePreference: FC<StoragePreferenceProps> = ({
  id = "storage-preference",
  className,
}) => {
  const off = useSyncExternalStore(subscribeOptionalStorage, isOptionalStorageOff, () => false);

  return (
    <div className={cx(storagePreference(), className)} data-testid={id}>
      <Switch
        checked={!off}
        hint={STORAGE_PREFERENCE_HINT}
        id={id}
        label={STORAGE_PREFERENCE_LABEL}
        onChange={(event) => setOptionalStorageOff(!event.target.checked)}
      />
      <p aria-live="polite" className={storagePreferenceStatus()}>
        {off ? STORAGE_PREFERENCE_OFF : STORAGE_PREFERENCE_ON}
      </p>
    </div>
  );
};
