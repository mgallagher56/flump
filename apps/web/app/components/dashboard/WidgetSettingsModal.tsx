import { Dialog } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import FLPButton from "~/components/core/buttons/FLPButton";

export interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const bodyStyle = css({ display: "flex", flexDirection: "column", gap: "4" });

const footerStyle = css({
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: "4",
  borderTop: "1px solid",
  borderColor: "border",
});

export const WidgetSettingsModal: FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
}) => (
  <Dialog
    open={isOpen}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
    title={title}
    description={description}
    closeLabel="Close settings"
    id="widget-settings-dialog"
  >
    <div className={bodyStyle}>{children}</div>
    <div className={footerStyle}>
      <FLPButton size="sm" variant="primary" onClick={onClose}>
        Done
      </FLPButton>
    </div>
  </Dialog>
);
