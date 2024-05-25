import { type FC } from 'react';

import type { InputProps } from '@chakra-ui/react';
import { Input } from '@chakra-ui/react';
import FLPBox from '~/components/core/structure/FLPBox';

import { css } from 'styled-system/css';

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
  variant,
  onChange,
  ...props
}) => {
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

  return (
    <div className={flexDirection === 'row' ? rowStyles : columnStyles}>
      <label htmlFor={label} hidden={isLabelHidden}>
        {label}
      </label>
      <div>
        <FLPBox display="flex" flexDirection="column" gap={props.gap ?? 2}>
          <Input id={label} hidden={false} variant={variant || 'outline'} onChange={onChange} {...props} />
          {error && <span className={errorStyles}>{error}</span>}
        </FLPBox>
      </div>
    </div>
  );
};

export default FLPInput;
