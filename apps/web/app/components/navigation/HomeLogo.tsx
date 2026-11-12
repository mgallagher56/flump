import { Link } from "react-router";

import logo from "~/assets/flump_logo.svg";

interface HomeLogoProps {
  /**
   * Set when the surrounding navigation already offers a "Home" link, so the logo does not add a
   * second, adjacent link to the same destination. The link is then removed from the tab order
   * and the accessibility tree.
   */
  decorative?: boolean;
}

const HomeLogo = ({ decorative = false }: HomeLogoProps) => {
  return (
    <div className="home-logo">
      {decorative ? (
        <Link aria-hidden="true" tabIndex={-1} to="/">
          <img alt="" height={50} src={logo} width={50} />
        </Link>
      ) : (
        <Link aria-label="Flump home" to="/">
          <img alt="" height={50} src={logo} width={50} />
        </Link>
      )}
    </div>
  );
};

export default HomeLogo;
