import FLPButtonGroup from '~/components/core/buttons/FLPButtonGroup';
import FLPLinkButton from '~/components/core/buttons/FLPLinkButton';
import FLPBox from '~/components/core/structure/FLPBox';

const NavMenu = () => {
  return (
    <FLPBox>
      <FLPButtonGroup gap={4}>
        <FLPLinkButton to="/">Home</FLPLinkButton>
        <FLPLinkButton to="/about">About</FLPLinkButton>
        <FLPLinkButton to="/contact">Contact</FLPLinkButton>
      </FLPButtonGroup>
    </FLPBox>
  );
};

export default NavMenu;
