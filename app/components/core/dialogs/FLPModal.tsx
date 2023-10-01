import { cloneElement, type FC, type ReactElement, useCallback } from 'react';

import type { ModalProps } from '@chakra-ui/react';
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

import FLPButton from '../buttons/FLPButton';
import FLPButtonGroup from '../buttons/FLPButtonGroup';

interface FLPModalProps extends Omit<ModalProps, 'isOpen' | 'onClose'> {
  triggerBtn: ReactElement;
  confirmButton?: {
    text: string;
    colorScheme?: string;
    variant?: string;
  };
  disabled?: boolean;
  title: string;
  onConfirm: () => Promise<void>;
}

const FLPModal: FC<FLPModalProps> = ({ triggerBtn, confirmButton, disabled, title, onConfirm, ...props }) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleOnConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onClose, onConfirm]);

  const triggerBtnClone = cloneElement(triggerBtn, { onClick: onOpen });

  return (
    <>
      {triggerBtnClone}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
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
