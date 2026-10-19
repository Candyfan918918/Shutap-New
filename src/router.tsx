import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { setRouterRef } from "./lib/router-ref";


export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page as soon as a link is hovered or touched, and keep
    // that early load for 30s so the click itself is instant.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  // Only expose on the client — the server creates a router per request and
  // must never share instances across requests.
  if (typeof window !== "undefined") {
    setRouterRef(router as unknown as Parameters<typeof setRouterRef>[0]);
  }

  return router;
};
