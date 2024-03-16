import { Link } from '@remix-run/react';

import logo from '/images/flump_logo.png';

const HomeLogo = () => {
  return (
    <div className="home-logo">
      <Link to="/">
        <img src={logo} alt="flump logo" height={50} width={50} />
      </Link>
    </div>
  );
};

export default HomeLogo;
