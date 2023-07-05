import { useCallback, useId } from 'react';
import type { ChangeEvent, FC } from 'react';

import type { InputProps } from '@chakra-ui/react';
import { Input } from '@chakra-ui/react';
import * as editable from '@zag-js/editable';
import { mergeProps, normalizeProps, useMachine } from '@zag-js/react';

import { css } from 'styled-system/css';

import FLPBox from '../structure/FLPBox';

interface FLPInputProps extends InputProps {
  error?: string;
  label: string;
  isLabelHidden?: boolean;
}

const FLPInput: FC<FLPInputProps> = ({
  colorScheme,
  error,
  flexDirection,
  isLabelHidden,
  label,
  value,
  variant,
  onChange,
  ...props
}) => {
  const [state, send] = useMachine(editable.machine({ id: useId() }));
  const handleOnChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      send({ type: 'CHANGE', value: e.target.value });
      onChange && onChange(e);
    },
    [send, onChange]
  );

  const api = editable.connect(state, send, normalizeProps);

  const columnStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: props.gap || 2
  });

  const rowStyles = css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: props.gap || 4
  });

  const errorStyles = css({
    color: 'red.500',
    fontWeight: 'bold'
  });

  const rootProps = mergeProps({ ...api.rootProps }, { className: flexDirection === 'row' ? rowStyles : columnStyles });
  const inputProps = mergeProps(
    { ...api.inputProps },
    {
      ...props,
      hidden: false,
      variant: variant || 'outline',
      value: value,
      onChange: handleOnChange
    }
  );
  const labelProps = mergeProps({ ...api.labelProps }, { hidden: isLabelHidden });

  return (
    <div {...rootProps}>
      <label {...labelProps}>{label}</label>
      <div {...api.areaProps}>
        <FLPBox display="flex" flexDirection="column" gap={props.gap ?? 2}>
          <Input {...inputProps} defaultValue={undefined} />
          {error && <span className={errorStyles}>{error}</span>}
        </FLPBox>
      </div>
    </div>
  );
};

export default FLPInput;
