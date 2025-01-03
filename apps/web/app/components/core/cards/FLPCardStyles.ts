import { css } from 'styled-system/css';

export const FLPCardStyles = css({
  position: 'relative',
  transition: 'all 0.3s ease-in-out',
  border: '1px solid token(colors.gray.500)!',
  '&:hover': {
    boxShadow: '2px 5px 8px 0px token(colors.gray.500) !important',
    transform: 'translate3d(-2px, -5px, -5px)'
  }
});
