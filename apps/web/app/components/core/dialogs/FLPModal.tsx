import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPModalProps {
  additionalActionBtns?: ReactElement<ReactElement>;
  triggerBtn: ReactElement<ReactElement>;
  confirmButton?: {
    text: string;
    colorPalette?: string;
    id?: string;
  };
  contentRef?: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  closeOnConfirm?: boolean;
  open: boolean;
  title: string;
  onConfirm: () => void;
  onClose: () => void;
  children: React.ReactNode;
  isMobile?: boolean;
  variant?: "default" | "bottomSheet" | "mobile";
}

const FLPModal: FC<FLPModalProps> = ({
  additionalActionBtns,
  children,
  confirmButton,
  contentRef,
  disabled,
  closeOnConfirm = true,
  open,
  title,
  triggerBtn,
  onClose,
  onConfirm,
  isMobile: propIsMobile,
  variant = "default",
}) => {
  const { t } = useTranslation();
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant =
    propIsMobile ?? (variant === "bottomSheet" || variant === "mobile" ? true : contextIsMobile);

  const handleOnConfirm = useCallback(() => {
    onConfirm();
    if (closeOnConfirm) {
      onClose();
    }
  }, [closeOnConfirm, onClose, onConfirm]);

  const overlayStyle = css({
    position: "fixed",
    inset: 0,
    backgroundColor: "var(--colors-surface-scrim)",
    backdropFilter: "blur(4px)",
    zIndex: 50,
  });

  const isExplicitBottomSheet = variant === "bottomSheet";

  const centeredContentStyle = css({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    borderRadius: { base: "xl", md: "lg" },
    boxShadow: "var(--shadows-floating)",
    padding: { base: "20px 16px", md: "24px" },
    width: { base: "calc(100vw - 20px)", sm: "92vw", md: "90vw" },
    maxWidth: { base: "calc(100vw - 20px)", sm: "520px", md: "520px" },
    maxHeight: { base: "94vh", md: "85vh" },
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
    zIndex: 60,
    outline: "none",
    color: "text.primary",
  });

  const mobileBottomSheetStyle = css({
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "surface",
    borderTop: "1px solid",
    borderColor: "border",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px",
    boxShadow: "var(--shadows-floating)",
    padding: "16px 16px calc(24px + env(safe-area-inset-bottom, 0px))",
    width: "100%",
    maxHeight: "88vh",
    overflowY: "auto",
    overflowX: "hidden",
    boxSizing: "border-box",
    zIndex: 60,
    outline: "none",
    color: "text.primary",
  });

  const dragHandleStyle = css({
    width: "40px",
    height: "4px",
    borderRadius: "full",
    backgroundColor: "border",
    margin: "0 auto 14px auto",
  });

  const headerStyle = css({
    marginBottom: "20px",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  });

  const titleStyle = css({
    fontSize: "xl",
    fontWeight: "bold",
    color: "text.primary",
    margin: 0,
    overflowWrap: "break-word",
  });

  const bodyStyle = css({
    marginBottom: "24px",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  });

  const footerStyle = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "24px",
    gap: "16px",
    flexWrap: "wrap",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  });

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Trigger asChild>{triggerBtn}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayStyle} />
        <Dialog.Content
          ref={contentRef}
          className={isExplicitBottomSheet ? mobileBottomSheetStyle : centeredContentStyle}
          data-variant={
            isExplicitBottomSheet ? "bottomSheet" : isMobileVariant ? "mobile" : "desktop"
          }
        >
          {isExplicitBottomSheet && (
            <div className={dragHandleStyle} data-testid="modal-drag-handle" />
          )}
          <div className={headerStyle}>
            <Dialog.Title className={titleStyle}>{title}</Dialog.Title>
          </div>
          <div className={bodyStyle}>{children}</div>
          <div className={footerStyle}>
            <div>{additionalActionBtns}</div>
            <FLPButtonGroup>
              <FLPButton isMobile={isMobileVariant} variant="outline" onClick={onClose}>
                {t("close")}
              </FLPButton>
              {onConfirm && (
                <FLPButton
                  disabled={disabled}
                  form={confirmButton?.id}
                  isMobile={isMobileVariant}
                  type="submit"
                  onClick={handleOnConfirm}
                >
                  {confirmButton?.text}
                </FLPButton>
              )}
            </FLPButtonGroup>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default FLPModal;
