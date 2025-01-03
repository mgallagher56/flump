import { type FC } from 'react';

import type { SelectProps } from '@chakra-ui/react';
import { Select } from '@chakra-ui/react';
import { css } from 'styled-system/css';

interface FLPSelectProps extends SelectProps {
  label: string;
  isLabelHidden?: boolean;
}

const FLPSelect: FC<FLPSelectProps> = ({ flexDirection, isLabelHidden, label, gap, ...props }) => {
  const columnStyles = css({
    display: 'flex',
    flexDirection: 'column',
    gap: gap || 2
  });

  const rowStyles = css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: gap || 4
  });

  return (
    <div className={flexDirection === 'row' ? rowStyles : columnStyles}>
      <label hidden={isLabelHidden} htmlFor={label}>
        {label}
      </label>
      <Select id={label} {...props} />
    </div>
  );
};

export default FLPSelect;
