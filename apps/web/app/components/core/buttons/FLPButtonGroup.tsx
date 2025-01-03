import type { FC, PropsWithChildren } from 'react';

import { Group, type GroupProps } from '@chakra-ui/react';

const FLPButtonGroup: FC<PropsWithChildren<GroupProps>> = (props) => {
  return <Group {...props}>{props.children}</Group>;
};

export default FLPButtonGroup;
