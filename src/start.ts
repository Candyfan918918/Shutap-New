import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { attachJokeSession } from "@/lib/jokes/anon-attacher";


const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (new URL(request.url).pathname.startsWith('/lovable/')) return next();
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    // Server-function calls must surface errors through TanStack's own
    // serialized RPC protocol so `useServerFn` can reject with the real
    // message (e.g. "sign_in_required"). Only wrap page navigations in the
    // HTML error page.
    const url = request?.url ? new URL(request.url) : null;
    if (url && url.pathname.startsWith("/_serverFn/")) {
      throw error;
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachJokeSession],
  requestMiddleware: [errorMiddleware],
}));
