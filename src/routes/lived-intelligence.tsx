import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const TITLE =
  "Lived Intelligence — the human counterpart to AI | Shutap";
const DESCRIPTION =
  "Lived Intelligence is the practical knowledge earned by living through real situations — the human counterpart to AI. Shutap is built to capture it.";
const DEFINITION =
  "The practical knowledge that comes from living through real situations and seeing how they turn out — the human counterpart to artificial intelligence.";
const URL = `${SITE_URL}/lived-intelligence`;

export const Route = createFileRoute("/lived-intelligence")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      ...ogImageMeta(),
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "What is Lived Intelligence?",
          description: DESCRIPTION,
          about: "Lived Intelligence",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: "Lived Intelligence",
          description: DEFINITION,
        }),
      },
      breadcrumbScript([{ name: "Lived Intelligence", path: "/lived-intelligence" }]),
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
          what is lived intelligence?
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
          Lived Intelligence is the practical knowledge that comes from living
          through real situations and seeing how they turn out — the human
          counterpart to artificial intelligence. Where AI is trained on text,
          lived intelligence is earned through experience: the real-world
          record of what people actually did in hard moments, and what happened
          next.
        </p>

        <Section title="What it is">
          Every day, people make hard calls in their relationships, marriages,
          families, and work — and then live with the results. That
          accumulated, first-hand knowledge of situation, decision, and outcome
          is lived intelligence. It isn't advice or theory. It's what actually
          happened — and on Shutap, it's the material a set is written from.
        </Section>

        <Section title="How it differs from artificial intelligence">
          Artificial intelligence predicts from patterns in existing text.
          Lived intelligence is the ground truth underneath it: the real
          decisions and real outcomes that text only describes second-hand. AI
          can tell you what people generally say to do. Lived intelligence
          shows you what people like you actually did — and how it turned out.
        </Section>

        <Section title="Why it compounds">
          One situation is an anecdote. Hundreds of them, kept under one
          pseudonym, become something a single post never is: a record of what
          keeps happening to you — the same person, the same week of the month,
          the same move. Most apps throw this away the second you close the
          tab. Shutap keeps it, which is why the jokes get sharper the longer
          you use it.
        </Section>

        <Section title="How Shutap captures it">
          On Shutap, you type what actually happened — pseudonymously, with
          identifying details stripped before storage — and shutap writes it
          into a set of joke cards. Your lived intelligence is the material.
          Over time, the sets stack up into the Mirror: a record of what keeps
          coming back, read to you in your own numbers.
        </Section>

        <p style={{ marginTop: 56, fontSize: 15 }}>
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
            SHUTAP. Say it funnier.
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
