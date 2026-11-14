import { Button, controlProps, Dialog, FormField, TextInput } from "@repo/ui";
import { type FC, type FormEvent, useState } from "react";
import {
  modalActions,
  modalForm,
  suggestionChip,
  suggestionLabel,
  suggestionList,
} from "./AddCategoryModal.styles";

export interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onAddCategory: (categoryName: string) => Promise<void> | void;
  existingCategories?: string[];
}

const SUGGESTIONS = [
  "Holidays",
  "Children",
  "Transport",
  "Pets",
  "Subscriptions",
  "Health & Fitness",
  "Education",
  "Entertainment",
];

export const AddCategoryModal: FC<AddCategoryModalProps> = ({
  open,
  onClose,
  onAddCategory,
  existingCategories = [],
}) => {
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const normalizedExisting = existingCategories.map((c) => c.toLowerCase());

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) {
      setError("Enter a category name");
      return;
    }
    if (normalizedExisting.includes(trimmed.toLowerCase())) {
      setError("This category already exists");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAddCategory(trimmed);
      setCategoryName("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We could not add that category. Nothing has changed. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      id="add-category-modal"
      open={open}
      title="Add budget category"
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <form className={modalForm()} onSubmit={handleSubmit}>
        <FormField
          error={error ?? undefined}
          id="new-category-name-input"
          label="Category name"
          required
        >
          {(field) => (
            <TextInput
              {...controlProps(field)}
              placeholder="For example, Holidays or Pets"
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (error) setError(null);
              }}
            />
          )}
        </FormField>

        <div>
          <p className={suggestionLabel()}>Suggested categories</p>
          <div className={suggestionList()}>
            {SUGGESTIONS.map((suggestion) => {
              const isExisting = normalizedExisting.includes(suggestion.toLowerCase());
              return (
                <button
                  key={suggestion}
                  aria-pressed={categoryName.toLowerCase() === suggestion.toLowerCase()}
                  className={suggestionChip({
                    selected: categoryName.toLowerCase() === suggestion.toLowerCase(),
                  })}
                  disabled={isExisting}
                  type="button"
                  onClick={() => {
                    setCategoryName(suggestion);
                    setError(null);
                  }}
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        </div>

        <div className={modalActions()}>
          <Button
            data-testid="cancel-new-category-btn"
            id="cancel-new-category-btn"
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            data-testid="save-new-category-btn"
            disabled={saving || !categoryName.trim()}
            id="save-new-category-btn"
            type="submit"
          >
            {saving ? "Adding" : "Add category"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
