import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

// Legacy URL. The old concept is retired; this is now a short page that
// points to the joke generator and rooms. Kept noindex so it doesn't
// compete with the main pages.
const TITLE = "Shutap — AI joke generator";
const DESCRIPTION =
  "Shutap is an AI joke generator. Paste what happened and get three jokes: the take, the clapback and the roast.";
const URL = `${SITE_URL}/lived-intelligence`;

export const Route = createFileRoute("/lived-intelligence")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
      { property: "og:url", content: URL },
      ...ogImageMeta(),
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      breadcrumbScript([{ name: "Say it funnier", path: "/lived-intelligence" }]),
    ],
  }),
  component: LivedIntelligencePage,
});

function LivedIntelligencePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#100c14",
        fontFamily: "'Sora', system-ui, sans-serif",
        padding: "clamp(48px, 8vw, 96px) clamp(20px, 5vw, 40px)",
      }}
    >
      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          lineHeight: 1.65,
        }}
      >
        <h1
          style={{
            fontFamily: "'Sora', system-ui, sans-serif",
            fontSize: "clamp(32px, 6vw, 52px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 28px",
            color: "#100c14",
          }}
        >
          Say it funnier.
        </h1>

        <p
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: "clamp(19px, 2.4vw, 23px)",
            lineHeight: 1.55,
            color: "#100c14",
            background: "#ffffff",
            border: "1px solid rgba(18,18,18,.10)",
            borderRadius: 18,
            padding: "24px 26px",
            margin: "0 0 48px",
            boxShadow: "0 12px 30px -24px rgba(20,16,22,.3)",
          }}
        >
          Shutap is an AI joke generator for creators, comedians and anyone
          with a story. Paste what happened and Shutap writes three jokes: the
          take, the clapback and the roast.
        </p>

        <Section title="What you can do with them">
          Download them for TikTok, Reels or the stage, or post the best one to
          a room. Rooms are public topic feeds where people like, comment, save
          and follow.
        </Section>

        <Section title="The rules">
          Jokes go at the situation, never at a real person someone could
          identify. Names and places are removed before anything is saved.
          Pseudonymous. 18+. Not therapy or advice.
        </Section>

        <p style={{ marginTop: 40, fontSize: 15 }}>
          <a
            href="/"
            style={{
              color: "#3a3438",
              textDecoration: "none",
              fontWeight: 600,
              borderBottom: "1px solid rgba(60,55,60,.35)",
              paddingBottom: 2,
            }}
          >
            Write jokes about it →
          </a>
        </p>
        <p style={{ marginTop: 20, fontSize: 15 }}>
          <a
            href="/rooms"
            style={{
              color: "#3a3438",
              textDecoration: "none",
              borderBottom: "1px solid rgba(60,55,60,.35)",
              paddingBottom: 2,
            }}
          >
            See rooms →
          </a>
        </p>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontFamily: "'Sora', system-ui, sans-serif",
          fontSize: "clamp(20px, 2.6vw, 24px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: "0 0 12px",
          color: "#100c14",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 17,
          margin: 0,
          color: "#100c14",
        }}
      >
        {children}
      </p>
    </section>
  );
}
