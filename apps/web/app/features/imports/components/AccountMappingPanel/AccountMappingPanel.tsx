import { Card, FormField, Select } from "@repo/ui";
import { type FC, useId } from "react";
import { MAPPING_HELP, NEW_ACCOUNT_OPTION } from "../../importCopy";
import {
  type AccountMap,
  type ExistingAccount,
  type PreviewAccount,
  takenAccountIds,
} from "../../importModel";
import { heading, help, list, staged, stagedType } from "./AccountMappingPanel.styles";

const NEW = "__new__";

export interface AccountMappingPanelProps {
  accounts: readonly PreviewAccount[];
  existing: readonly ExistingAccount[];
  map: AccountMap;
  onChange: (ref: string, accountId: string | null) => void;
  disabled?: boolean;
}

/**
 * Step one of the review: each staged account goes to a new account or to one existing account.
 * An existing account already chosen for another row is not offered again.
 */
export const AccountMappingPanel: FC<AccountMappingPanelProps> = ({
  accounts,
  existing,
  map,
  onChange,
  disabled = false,
}) => {
  const headingId = useId();
  return (
    <Card as="section" aria-labelledby={headingId} padding="md">
      <h2 className={heading()} id={headingId}>
        Match accounts
      </h2>
      <p className={help()}>{MAPPING_HELP}</p>
      <ul className={list()}>
        {accounts.map((a) => {
          const taken = takenAccountIds(map, a.ref);
          const options = [
            { value: NEW, label: NEW_ACCOUNT_OPTION },
            ...existing
              .filter((e) => !taken.has(e.id))
              .map((e) => ({ value: e.id, label: `${e.name} (${e.type})` })),
          ];
          return (
            <li className={staged()} key={a.ref}>
              <FormField hint={`${a.type} in the import`} id={`import-map-${a.ref}`} label={a.name}>
                {(field) => (
                  <Select
                    aria-describedby={field.describedBy}
                    data-testid={`import-map-${a.ref}`}
                    disabled={disabled}
                    id={field.id}
                    onChange={(e) =>
                      onChange(a.ref, e.target.value === NEW ? null : e.target.value)
                    }
                    options={options}
                    value={map[a.ref] ?? NEW}
                  />
                )}
              </FormField>
              {a.suggestedAccountId && map[a.ref] === a.suggestedAccountId ? (
                <span className={stagedType()}>Matched by name and type</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default AccountMappingPanel;
