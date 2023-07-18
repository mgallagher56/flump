import { cloneElement, useCallback, useId } from 'react';
import type { FC, ReactElement } from 'react';

import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import * as dialog from '@zag-js/dialog';
import { mergeProps, normalizeProps, useMachine } from '@zag-js/react';
import { useTranslation } from 'react-i18next';

import FLPButton from '../buttons/FLPButton';
import FLPButtonGroup from '../buttons/FLPButtonGroup';
import FLPBox from '../structure/FLPBox';

interface FLPModalProps {
  triggerBtn: ReactElement;
  confirmButton?: {
    text: string;
    colorScheme?: string;
    variant?: string;
  };
  content: ReactElement;
  isDisabled?: boolean;
  title: string;
  onConfirm: (e) => Promise<void>;
}

const FLPModal: FC<FLPModalProps> = ({
  triggerBtn,
  confirmButton,
  content,
  isDisabled,
  title,
  onConfirm,
  ...props
}) => {
  const { t } = useTranslation();
  const [state, send] = useMachine(dialog.machine({ id: useId() }));

  const api = dialog.connect(state, send, normalizeProps);
  const mergedProps = mergeProps({
    ...api,
    ...props,
    backdropProps: {
      ...api.backdropProps,
      onDrag: undefined,
      onDragEnd: undefined,
      onDragStart: undefined,
      onAnimationStart: undefined
    }
  });

  const handleOnConfirm = useCallback(
    (event) => {
      onConfirm(event);
      send('CONFIRM');
      mergedProps.closeTriggerProps.onClick(event);
    },
    [mergedProps.closeTriggerProps, onConfirm, send]
  );

  const triggerButtonClone = cloneElement(triggerBtn, {
    ...api.triggerProps
  });

  return (
    <>
      {triggerButtonClone}
      {mergedProps.isOpen && (
        <Modal isOpen={mergedProps.isOpen} onClose={mergedProps.close} isCentered>
          <ModalOverlay
            {...mergedProps.backdropProps}
            onDrag={undefined}
            onDragEnd={undefined}
            onDragStart={undefined}
            onAnimationStart={undefined}
          />
          <FLPBox {...mergedProps.containerProps}>
            <ModalContent {...mergedProps.contentProps}>
              <ModalHeader {...mergedProps.titleProps}>{title}</ModalHeader>
              <ModalCloseButton {...mergedProps.closeTriggerProps} />
              <ModalBody {...mergedProps.descriptionProps}>{content}</ModalBody>
              <ModalFooter>
                <FLPButtonGroup>
                  <FLPButton variant="outline" {...mergedProps.closeTriggerProps}>
                    {t('close')}
                  </FLPButton>
                  {onConfirm && (
                    <FLPButton
                      colorScheme={confirmButton?.colorScheme}
                      isDisabled={isDisabled}
                      variant={confirmButton?.variant}
                      onClick={handleOnConfirm}
                    >
                      {confirmButton.text}
                    </FLPButton>
                  )}
                </FLPButtonGroup>
              </ModalFooter>
            </ModalContent>
          </FLPBox>
        </Modal>
      )}
    </>
  );
};

export default FLPModal;
