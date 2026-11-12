import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

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

const overlayStyle = css({
  position: "fixed",
  inset: 0,
  backgroundColor: "color-mix(in srgb, var(--colors-surface-contrast) 50%, transparent)",
  backdropFilter: "blur(2px)",
  zIndex: 100,
});

const contentStyle = css({
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { base: "calc(100vw - 20px)", sm: "90%", md: "90%" },
  maxWidth: { base: "calc(100vw - 20px)", sm: "460px", md: "460px" },
  maxHeight: { base: "94vh", md: "85vh" },
  overflowY: "auto",
  backgroundColor: "surface",
  borderRadius: { base: "xl", md: "lg" },
  border: "1px solid",
  borderColor: "border",
  padding: { base: "20px 16px", md: "24px" },
  zIndex: 101,
  boxShadow:
    "0 20px 25px -5px color-mix(in srgb, var(--colors-surface-contrast) 20%, transparent), 0 10px 10px -5px color-mix(in srgb, var(--colors-surface-contrast) 10%, transparent)",
});

const inputStyle = css({
  width: "100%",
  padding: "10px 14px",
  fontSize: "sm",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "background",
  color: "text.primary",
  outline: "none",
  marginTop: "8px",
  transition: "all 0.2s",
  _focus: {
    borderColor: "primary",
    boxShadow: "0 0 0 1px token(colors.primary)",
  },
});

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = categoryName.trim();
    if (!trimmed) {
      setError("Please enter a category name");
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
    } catch (err: any) {
      setError(err?.message || "Failed to add category");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setCategoryName(suggestion);
    setError(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayStyle} />
        <Dialog.Content className={contentStyle} id="add-category-modal">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <Dialog.Title asChild>
              <FLPHeading as="h2" size="md">
                Add Budget Category
              </FLPHeading>
            </Dialog.Title>
            <button
              id="close-add-category-dialog"
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--colors-chart-baseline)",
                fontSize: "16px",
              }}
            >
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="new-category-name-input"
                style={{ fontSize: "13px", fontWeight: 600, color: "var(--colors-text-primary)" }}
              >
                Category Name
              </label>
              <input
                id="new-category-name-input"
                data-testid="new-category-name-input"
                className={inputStyle}
                placeholder="e.g. Holidays, Subscriptions, Pets..."
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (error) setError(null);
                }}
              />
              {error && (
                <FLPText color="status.danger.text" fontSize="xs" style={{ marginTop: "6px" }}>
                  {error}
                </FLPText>
              )}
            </div>

            {/* Suggestions */}
            <div style={{ marginBottom: "20px" }}>
              <FLPText color="text.muted" fontSize="xs" style={{ marginBottom: "8px" }}>
                Suggested categories:
              </FLPText>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {SUGGESTIONS.map((sug) => {
                  const isExisting = normalizedExisting.includes(sug.toLowerCase());
                  return (
                    <button
                      key={sug}
                      type="button"
                      disabled={isExisting}
                      onClick={() => handleSelectSuggestion(sug)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        borderRadius: "14px",
                        border: "1px solid",
                        borderColor: isExisting
                          ? "var(--colors-border-strong)"
                          : "var(--colors-primary)",
                        backgroundColor:
                          categoryName.toLowerCase() === sug.toLowerCase()
                            ? "color-mix(in srgb, var(--colors-primary) 20%, transparent)"
                            : "transparent",
                        color: isExisting
                          ? "var(--colors-text-muted)"
                          : "var(--colors-text-primary)",
                        cursor: isExisting ? "not-allowed" : "pointer",
                        opacity: isExisting ? 0.5 : 1,
                      }}
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <FLPButton
                id="cancel-new-category-btn"
                data-testid="cancel-new-category-btn"
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </FLPButton>
              <FLPButton
                id="save-new-category-btn"
                data-testid="save-new-category-btn"
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving || !categoryName.trim()}
              >
                <FaPlus style={{ marginRight: "6px" }} />
                {saving ? "Adding..." : "Add Category"}
              </FLPButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AddCategoryModal;
