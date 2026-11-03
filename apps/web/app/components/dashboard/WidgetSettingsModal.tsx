import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaTimes } from "react-icons/fa";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

export interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const overlayStyle = css({
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.65)",
  backdropFilter: "blur(4px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
});

const contentStyle = css({
  backgroundColor: "surface",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
  width: "100%",
  maxWidth: "480px",
  maxHeight: "85vh",
  overflowY: "auto",
  padding: "24px",
  position: "relative",
  outline: "none",
});

export const WidgetSettingsModal: FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayStyle}>
          <Dialog.Content className={contentStyle}>
            <div
              className={css({
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "16px",
              })}
            >
              <div>
                <Dialog.Title asChild>
                  <FLPHeading as="h3" size="md">
                    {title}
                  </FLPHeading>
                </Dialog.Title>
                {description && (
                  <Dialog.Description asChild>
                    <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                      {description}
                    </FLPText>
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="Close settings"
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    color: "text.muted",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "sm",
                    _hover: { color: "text.primary" },
                  })}
                  type="button"
                >
                  <FaTimes size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className={css({ display: "flex", flexDirection: "column", gap: "16px" })}>
              {children}
            </div>

            <div
              className={css({
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid",
                borderColor: "border",
              })}
            >
              <Dialog.Close asChild>
                <FLPButton size="sm" variant="primary">
                  Done
                </FLPButton>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
