import { remixRoutesOptionAdapter } from "@react-router/remix-routes-option-adapter";
import { flatRoutes } from "remix-flat-routes";
import { type RouteConfig, index } from "@react-router/dev/routes";

export default remixRoutesOptionAdapter((defineRoutes) => {
    return flatRoutes("routes", defineRoutes, {
        ignoredRouteFiles: [
            '**/.*'
        ],
    });
}) satisfies RouteConfig;
