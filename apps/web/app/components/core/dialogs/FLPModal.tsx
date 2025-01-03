import { type FC, type ReactElement, useCallback } from 'react';

import type { ModalProps } from '@chakra-ui/react';
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';

interface FLPModalProps extends ModalProps {
  triggerBtn: ReactElement;
  confirmButton?: {
    text: string;
    colorScheme?: string;
    variant?: string;
    id?: string;
  };
  disabled?: boolean;
  title: string;
  onConfirm: () => Promise<void>;
}

const FLPModal: FC<FLPModalProps> = ({
  triggerBtn,
  confirmButton,
  disabled,
  title,
  isOpen,
  onClose,
  onConfirm,
  ...props
}) => {
  const { t } = useTranslation();

  const handleOnConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onClose, onConfirm]);

  return (
    <>
      {triggerBtn}
      <Modal isCentered isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{props.children}</ModalBody>
          <ModalFooter>
            <FLPButtonGroup>
              <FLPButton variant="outline" onClick={onClose}>
                {t('close')}
              </FLPButton>
              {onConfirm && (
                <FLPButton
                  colorScheme={confirmButton?.colorScheme}
                  disabled={disabled}
                  form={confirmButton?.id}
                  type="submit"
                  variant={confirmButton?.variant}
                  onClick={handleOnConfirm}
                >
                  {confirmButton.text}
                </FLPButton>
              )}
            </FLPButtonGroup>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FLPModal;
