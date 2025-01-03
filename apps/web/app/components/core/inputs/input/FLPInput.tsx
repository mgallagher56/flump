import { type FC } from 'react';

import { Input, type InputProps } from '@chakra-ui/react';
import FLPBox from '~/components/core/structure/FLPBox';

import { css } from 'styled-system/css';

interface FLPInputProps extends InputProps {
  error?: string;
  label: string;
  isLabelHidden?: boolean;
}

const FLPInput: FC<FLPInputProps> = ({ error, flexDirection, isLabelHidden, label, variant, onChange, ...props }) => {
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
      <label hidden={isLabelHidden} htmlFor={label}>
        {label}
      </label>
      <div>
        <FLPBox display="flex" flexDirection="column" gap={props.gap ?? 2}>
          <Input hidden={false} id={label} variant={variant || 'outline'} onChange={onChange} {...props} />
          {error && <span className={errorStyles}>{error}</span>}
        </FLPBox>
      </div>
    </div>
  );
};

export default FLPInput;
