import { type FC, type ReactElement, useCallback } from 'react';

import { type DialogRootProps } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle
} from '~/components/ui/dialog';

interface FLPModalProps extends DialogRootProps {
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
  onConfirm: () => Promise<void>;
  onClose: () => void;
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
  onConfirm
}) => {
  const { t } = useTranslation();

  const handleOnConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onClose, onConfirm]);

  return (
    <DialogRoot
      closeOnEscape
      unmountOnExit
      motionPreset="slide-in-bottom"
      open={open}
      placement="center"
      onOpenChange={onClose}
    >
      <DialogBackdrop />
      {triggerBtn}
      <DialogContent ref={contentRef}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        <DialogFooter justifyContent="space-between">
          {additionalActionBtns}
          <FLPButtonGroup>
            <FLPButton variant="outline" onClick={onClose}>
              {t('close')}
            </FLPButton>
            {onConfirm && (
              <FLPButton
                colorPalette={confirmButton?.colorPalette}
                disabled={disabled}
                form={confirmButton?.id}
                type="submit"
                onClick={handleOnConfirm}
              >
                {confirmButton.text}
              </FLPButton>
            )}
          </FLPButtonGroup>
          <DialogCloseTrigger />
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default FLPModal;
