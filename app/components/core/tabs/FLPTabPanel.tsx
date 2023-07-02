import type { FC, HTMLAttributes } from 'react';

const FLPTabPanel: FC<HTMLAttributes<HTMLElement>> = (props) => {
  return <div {...props}>{props.children}</div>;
};

export default FLPTabPanel;
