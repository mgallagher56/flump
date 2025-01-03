import { flatRoutes } from 'remix-flat-routes';

import { type RouteConfig } from '@react-router/dev/routes';
import { remixRoutesOptionAdapter } from '@react-router/remix-routes-option-adapter';

export default remixRoutesOptionAdapter((defineRoutes) => flatRoutes('routes', defineRoutes)) satisfies RouteConfig;
