import { Route as rootRouteImport } from "./routes/__root";
import { Route as SiteRouteImport } from "./routes/_site";
import { Route as SiteIndexRouteImport } from "./routes/_site/index";
import { Route as SiteSettingsRouteImport } from "./routes/_site/settings";
import { Route as SiteSourceRouteImport } from "./routes/_site/source";
import { Route as SiteSubmitRouteImport } from "./routes/_site/submit";
import { Route as SiteTopicsRouteImport } from "./routes/_site/topics";
import { Route as SitePPostIdRouteImport } from "./routes/_site/p.$postId";
import { Route as SiteTSlugRouteImport } from "./routes/_site/t.$slug";

const SiteRoute = SiteRouteImport.update({ id: "/_site", getParentRoute: () => rootRouteImport });

const SiteIndexRoute = SiteIndexRouteImport.update({ id: "/", path: "/", getParentRoute: () => SiteRoute });
const SiteSettingsRoute = SiteSettingsRouteImport.update({ id: "/settings", path: "/settings", getParentRoute: () => SiteRoute });
const SiteSourceRoute = SiteSourceRouteImport.update({ id: "/source", path: "/source", getParentRoute: () => SiteRoute });
const SiteSubmitRoute = SiteSubmitRouteImport.update({ id: "/submit", path: "/submit", getParentRoute: () => SiteRoute });
const SiteTopicsRoute = SiteTopicsRouteImport.update({ id: "/topics", path: "/topics", getParentRoute: () => SiteRoute });
const SitePPostIdRoute = SitePPostIdRouteImport.update({ id: "/p/$postId", path: "/p/$postId", getParentRoute: () => SiteRoute });
const SiteTSlugRoute = SiteTSlugRouteImport.update({ id: "/t/$slug", path: "/t/$slug", getParentRoute: () => SiteRoute });

const SiteRouteWithChildren = SiteRoute._addFileChildren({
  SiteIndexRoute,
  SiteSettingsRoute,
  SiteSourceRoute,
  SiteSubmitRoute,
  SiteTopicsRoute,
  SitePPostIdRoute,
  SiteTSlugRoute,
});

export const routeTree = rootRouteImport._addFileChildren({ SiteRoute: SiteRouteWithChildren });
