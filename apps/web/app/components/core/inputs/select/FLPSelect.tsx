import { type FC } from 'react';

import type { SelectProps } from '@chakra-ui/react';
import { Select } from '@chakra-ui/react';

import { css } from 'styled-system/css';

interface FLPSelectProps extends SelectProps {
  label: string;
  isLabelHidden?: boolean;
}

const FLPSelect: FC<FLPSelectProps> = ({
  flexDirection,
  icon,
  isLabelHidden,
  label,
  placeholder,
  variant,
  defaultValue,
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

  return (
    <div className={flexDirection === 'row' ? rowStyles : columnStyles}>
      <label htmlFor={label} hidden={isLabelHidden}>
        {label}
      </label>
      <Select id={label} {...props} />
    </div>
  );
};

export default FLPSelect;
