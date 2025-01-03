import { type FC } from 'react';

import { SelectRoot, type SelectRootProps } from '@chakra-ui/react';
import { SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValueText } from '~/components/ui/select';

import { css } from 'styled-system/css';

interface FLPSelectProps extends SelectRootProps {
  label: string;
  isLabelHidden?: boolean;
  portalRef?: React.RefObject<HTMLDivElement>;
}

const FLPSelect: FC<FLPSelectProps> = ({
  collection,
  flexDirection,
  gap,
  isLabelHidden,
  label,
  portalRef,
  value,
  onValueChange
}) => {
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
      <SelectRoot collection={collection} size="sm" value={value} width="320px" onValueChange={onValueChange}>
        <SelectLabel hidden={isLabelHidden} htmlFor={label}>
          {label}
        </SelectLabel>
        <SelectTrigger>
          <SelectValueText />
        </SelectTrigger>
        <SelectContent portalRef={portalRef}>
          {collection.items.map(({ id, name }) => (
            <SelectItem key={id} item={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </div>
  );
};

export default FLPSelect;
