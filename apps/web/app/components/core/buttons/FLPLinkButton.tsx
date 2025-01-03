import { type FC, type PropsWithChildren } from 'react';

import { Link, type LinkProps } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router';

interface FLPLinkButtonProps extends LinkProps {
  to: string;
  text: string;
}

const FLPLinkButton: FC<PropsWithChildren<FLPLinkButtonProps>> = ({ colorPalette = 'blue', text, to }) => {
  return (
    <Link asChild colorPalette={colorPalette}>
      <RouterLink to={to}>{text}</RouterLink>
    </Link>
  );
};

export default FLPLinkButton;
