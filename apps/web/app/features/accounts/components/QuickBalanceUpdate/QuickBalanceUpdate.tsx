import { Button, CurrencyInput, controlProps, FormField, InlineAlert } from "@repo/ui";
import {
  type FC,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { FetcherOutcomeStatus } from "~/features/feedback/hooks/useFetcherOutcome";
import { quickActions, quickForm, quickRoot } from "./QuickBalanceUpdate.styles";

export interface QuickBalanceUpdateProps {
  /** The account's name, read after the field's label ("New balance, Holiday fund"). */
  accountName: string;
  /** A debt: the field asks for the amount owed, a positive figure. */
  isLiability: boolean;
  /** The figure shown on the page: the balance, or the amount owed as a positive figure. */
  current: number | null;
  /** The joint-account note the edit form shows under the same field, when there is one. */
  hint?: string | null;
  /** Saves the figure typed, as shown (the caller stores a debt as minus the amount owed). */
  onSave: (value: number) => void;
  /** The save's progress: the row closes when it succeeds and stays open with `error` if not. */
  status: FetcherOutcomeStatus;
  error?: string | null;
  /** Called as the row opens, so the caller can clear an error from an earlier attempt. */
  onOpen?: () => void;
}

export const QUICK_BALANCE_COPY = {
  openBalance: "Update balance",
  openOwed: "Update amount owed",
  fieldBalance: "New balance",
  fieldOwed: "Amount owed now",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  owedBelowZero: "Enter an amount owed of £0 or more.",
} as const;

/**
 * Updates one account's balance where it is shown (E38 S2), so a new figure needs no trip through
 * the Edit dialog. A quiet button opens a field in place with the focus in it and the saved figure
 * selected, so typing replaces it; Enter or Save saves,
 * Escape or Cancel closes without saving, and either way focus goes back to the button. A failed
 * save keeps the row open with the error and the typed figure, so it can be tried again.
 */
export const QuickBalanceUpdate: FC<QuickBalanceUpdateProps> = ({
  accountName,
  isLiability,
  current,
  hint,
  onSave,
  status,
  error,
  onOpen,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | null>(current);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  // Set when the row closes, so focus goes back to the button that opened it (UX A3).
  const returnFocus = useRef(false);
  const submitted = useRef(false);
  const pending = status === "pending";

  const close = () => {
    returnFocus.current = true;
    submitted.current = false;
    setOpen(false);
  };

  // A save that went through closes the row.
  useEffect(() => {
    if (!open || !submitted.current || status !== "succeeded") return;
    returnFocus.current = true;
    submitted.current = false;
    setOpen(false);
  }, [open, status]);

  // In the same frame the row opens or closes, so focus never sits on the page in between.
  useLayoutEffect(() => {
    if (open) {
      // The saved figure is selected, so typing a new one replaces it.
      const field = document.getElementById("quick-balance-value");
      if (field instanceof HTMLInputElement) {
        field.focus();
        field.select();
      }
    } else if (returnFocus.current) {
      returnFocus.current = false;
      openerRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return (
      <div className={quickRoot()}>
        <Button
          data-testid="quick-balance-open"
          id="quick-balance-open"
          onClick={() => {
            setValue(current);
            setFieldError(null);
            onOpen?.();
            setOpen(true);
          }}
          ref={openerRef}
          size="sm"
          type="button"
          variant="outline"
        >
          {isLiability ? QUICK_BALANCE_COPY.openOwed : QUICK_BALANCE_COPY.openBalance}
        </Button>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value === null || pending) return;
    // A debt's amount owed is never below zero: a minus figure is not saved as more owed.
    if (isLiability && value < 0) {
      setFieldError(QUICK_BALANCE_COPY.owedBelowZero);
      return;
    }
    submitted.current = true;
    onSave(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape" || pending) return;
    // Escape closes this row only, not a dialog or sheet the page might sit in.
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const label = isLiability ? QUICK_BALANCE_COPY.fieldOwed : QUICK_BALANCE_COPY.fieldBalance;

  return (
    <div className={quickRoot()}>
      <form
        aria-label={`${label}, ${accountName}`}
        className={quickForm()}
        data-testid="quick-balance-form"
        noValidate
        onSubmit={submit}
      >
        <FormField
          error={fieldError ?? undefined}
          hint={hint ?? undefined}
          id="quick-balance-value"
          label={label}
        >
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              data-testid="quick-balance-value"
              // Escape is a shortcut for the Cancel button beside the field, not the only way out.
              onKeyDown={onKeyDown}
              min={isLiability ? 0 : undefined}
              onValueChange={(next) => {
                setValue(next);
                setFieldError(null);
              }}
              value={value}
            />
          )}
        </FormField>
        <div className={quickActions()}>
          <Button
            data-testid="quick-balance-save"
            disabled={value === null}
            id="quick-balance-save"
            pending={pending}
            size="sm"
            type="submit"
          >
            {pending ? QUICK_BALANCE_COPY.saving : QUICK_BALANCE_COPY.save}
          </Button>
          <Button
            data-testid="quick-balance-cancel"
            disabled={pending}
            id="quick-balance-cancel"
            onClick={close}
            size="sm"
            type="button"
            variant="ghost"
          >
            {QUICK_BALANCE_COPY.cancel}
          </Button>
        </div>
      </form>
      {status === "failed" && error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
    </div>
  );
};

export default QuickBalanceUpdate;
