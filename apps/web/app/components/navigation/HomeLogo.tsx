import { FlumpLogo } from "@repo/ui";
import { Link } from "react-router";

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
          <FlumpLogo size="md" />
        </Link>
      ) : (
        <Link aria-label="Flump home" to="/">
          <FlumpLogo size="md" />
        </Link>
      )}
    </div>
  );
};

export default HomeLogo;
