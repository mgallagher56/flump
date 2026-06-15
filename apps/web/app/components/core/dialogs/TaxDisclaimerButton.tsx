/**
 * TaxDisclaimerButton.tsx
 *
 * A small info-icon button that opens a full legal disclaimer modal.
 * Used on all tax calculation surfaces in the application.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FaInfoCircle, FaTimes } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPText from "~/components/core/typography/FLPText";
import { TAX_DISCLAIMER } from "~/utils/taxRules";

interface TaxDisclaimerButtonProps {
  /** If true, also render the short summary text next to the icon. Default: false */
  showShortText?: boolean;
}

const TaxDisclaimerButton: FC<TaxDisclaimerButtonProps> = ({ showShortText = false }) => {
  const [open, setOpen] = useState(false);

  const overlayStyle = css({
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 50,
  });

  const contentStyle = css({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "lg",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
    padding: "28px",
    width: "90vw",
    maxWidth: "640px",
    maxHeight: "85vh",
    overflowY: "auto",
    zIndex: 50,
    outline: "none",
    color: "text.primary",
  });

  const triggerBtnStyle = css({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "text.muted",
    padding: "2px 4px",
    borderRadius: "sm",
    fontSize: "xs",
    transition: "color 0.15s",
    _hover: { color: "warning.500" },
  });

  const closeBtnStyle = css({
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "text.muted",
    padding: "4px",
    borderRadius: "sm",
    _hover: { color: "text.primary" },
  });

  // Parse the full disclaimer into sections for readable rendering
  const sections = TAX_DISCLAIMER.full.split("\n\n");

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={triggerBtnStyle} aria-label="View full tax disclaimer">
          <FaInfoCircle size={13} />
          {showShortText && <span>{TAX_DISCLAIMER.short}</span>}
          {!showShortText && <span>Tax disclaimer</span>}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={overlayStyle} />
        <Dialog.Content className={contentStyle}>
          {/* Close button */}
          <Dialog.Close asChild>
            <button type="button" className={closeBtnStyle} aria-label="Close disclaimer">
              <FaTimes size={14} />
            </button>
          </Dialog.Close>

          {/* Header */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              paddingRight: "24px",
            })}
          >
            <FaInfoCircle className={css({ color: "warning.500", flexShrink: 0 })} size={20} />
            <Dialog.Title
              className={css({
                fontSize: "lg",
                fontWeight: "bold",
                color: "warning.500",
                margin: 0,
              })}
            >
              {sections[0]}
            </Dialog.Title>
          </div>

          {/* Body */}
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            })}
          >
            {sections.slice(1).map((section, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static sections
              <FLPText key={i} fontSize="sm" color="text.muted" style={{ lineHeight: "1.65" }}>
                {section}
              </FLPText>
            ))}
          </div>

          {/* Footer */}
          <div
            className={css({
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid",
              borderColor: "border",
              display: "flex",
              justifyContent: "flex-end",
            })}
          >
            <FLPButton variant="outline" onClick={() => setOpen(false)}>
              Close
            </FLPButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default TaxDisclaimerButton;
