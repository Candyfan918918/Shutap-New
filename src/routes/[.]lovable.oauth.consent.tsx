import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConsentDetails = {
  client?: { name?: string; client_uri?: string; logo_uri?: string };
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
};

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session || (data.session.user as { is_anonymous?: boolean })?.is_anonymous) {
      const returnTo = location.pathname + location.searchStr;
      try {
        sessionStorage.setItem("shutap_returnTo", returnTo);
      } catch {
        /* noop */
      }
      throw redirect({ to: "/welcome" });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const details = data as ConsentDetails | null;
    const immediate = details?.redirect_url ?? details?.redirect_to;
    if (immediate && !details?.client) throw redirect({ href: immediate });
    return details;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as ConsentDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const res = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (res.error) {
      setBusy(false);
      setError(res.error.message);
      return;
    }
    const target =
      (res.data as { redirect_url?: string; redirect_to?: string } | null)?.redirect_url ??
      (res.data as { redirect_url?: string; redirect_to?: string } | null)?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "48px auto",
        padding: 24,
        fontFamily: "Inter, system-ui, sans-serif",
        color: "hsl(var(--foreground))",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Connect {name} to your Shutap account
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 24 }}>
        {name} wants to act as you on Shutap: read your stories and jokes, and make new ones.
        You can revoke this any time from your account.
      </p>
      {error && (
        <p role="alert" style={{ color: "hsl(var(--destructive))", marginBottom: 16 }}>
          {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          disabled={busy}
          onClick={() => decide(true)}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 8,
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            border: "none",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 8,
            background: "transparent",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Deny
        </button>
      </div>
    </main>
  );
}
