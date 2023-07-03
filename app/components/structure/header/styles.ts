import { css } from 'styled-system/css';

export const navStyles = css({
  display: 'flex',
  borderBottomWidth: '2px',
  borderBottomColor: 'blue.500',
  borderBottomStyle: 'solid',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  paddingY: '4',
  paddingX: '2'
});

export const menuStyles = css({
  display: 'flex',
  gap: '2',
  alignItems: 'center',
  justifyContent: 'start'
});

export const loginStyles = css({
  display: 'flex',
  gap: '2',
  alignItems: 'center',
  justifyContent: 'end'
});
