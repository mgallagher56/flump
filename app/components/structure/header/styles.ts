import { theme } from '@chakra-ui/react';
import { css } from '@emotion/react';

export const navStyles = css`
  display: flex;
  justify-content: start;
  border-bottom: 2px solid ${theme.colors.blue[500]};
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: ${theme.space[4]} ${theme.space[2]};
`;
