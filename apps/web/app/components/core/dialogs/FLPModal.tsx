import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import { type FC, type ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPButtonGroup from "~/components/core/buttons/FLPButtonGroup";

interface FLPModalProps {
  additionalActionBtns?: ReactElement<ReactElement>;
  triggerBtn: ReactElement<ReactElement>;
  confirmButton?: {
    text: string;
    colorPalette?: string;
    id?: string;
  };
  contentRef?: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
  open: boolean;
  title: string;
  onConfirm: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

const FLPModal: FC<FLPModalProps> = ({
  additionalActionBtns,
  children,
  confirmButton,
  contentRef,
  disabled,
  open,
  title,
  triggerBtn,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  const handleOnConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onClose, onConfirm]);

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
    padding: "24px",
    width: "90vw",
    maxWidth: "480px",
    zIndex: 50,
    outline: "none",
    color: "text.primary",
  });

  const headerStyle = css({
    marginBottom: "20px",
  });

  const titleStyle = css({
    fontSize: "xl",
    fontWeight: "bold",
    color: "text.primary",
    margin: 0,
  });

  const bodyStyle = css({
    marginBottom: "24px",
  });

  const footerStyle = css({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "24px",
    gap: "16px",
  });

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Trigger asChild>{triggerBtn}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayStyle} />
        <Dialog.Content ref={contentRef} className={contentStyle}>
          <div className={headerStyle}>
            <Dialog.Title className={titleStyle}>{title}</Dialog.Title>
          </div>
          <div className={bodyStyle}>{children}</div>
          <div className={footerStyle}>
            <div>{additionalActionBtns}</div>
            <FLPButtonGroup>
              <FLPButton variant="outline" onClick={onClose}>
                {t("close")}
              </FLPButton>
              {onConfirm && (
                <FLPButton
                  disabled={disabled}
                  form={confirmButton?.id}
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
