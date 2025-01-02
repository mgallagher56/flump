import { Link } from '@remix-run/react';

import logo from '/images/flump_logo.png';

const HomeLogo = () => {
  return (
    <div className="home-logo">
      <Link to="/">
        <img alt="flump logo" height={50} src={logo} width={50} />
      </Link>
    </div>
  );
};

export default HomeLogo;
