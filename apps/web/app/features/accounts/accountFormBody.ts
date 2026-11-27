import { type AccountFormFields, accountFieldsFromValues } from "@flump/finance-engine";

/**
 * Reads the optional account fields from an add or edit form: the engine's one reading
 * (`accountFieldsFromValues`), given the form's values as text.
 */
export const accountFieldsFromForm = (formData: FormData): AccountFormFields =>
  accountFieldsFromValues((key) => {
    const value = formData.get(key);
    return value === null ? null : String(value);
  });
