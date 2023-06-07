import React from 'react';


const FLPTabPanel: React.FC<React.HTMLAttributes<HTMLElement>> = (props) => {
  return <div {...props}>{props.children}</div>;
};

export default FLPTabPanel;
