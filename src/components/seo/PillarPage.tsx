import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import type { Crumb } from "@/lib/seo/breadcrumbs";

type Faq = { q: string; a: string };
type Other = { href: string; label: string };

export function PillarPage({
  breadcrumbs,
  h1,
  capsule,
  what,
  invite,
  faq,
  others,
}: {
  breadcrumbs?: Crumb[];
  h1: string;
  capsule: string;
  what: string;
  invite: string;
  faq: Faq[];
  others: Other[];
}) {
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
        {breadcrumbs ? <Breadcrumbs trail={breadcrumbs} /> : null}

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
          {h1}
        </h1>

        <p
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: "clamp(19px, 2.4vw, 23px)",
            lineHeight: 1.55,
            color: "#100c14",
            background: "#ffffff",
            border: "1px solid rgba(26,12,20,.10)",
            borderRadius: 18,
            padding: "24px 26px",
            margin: "0 0 40px",
            boxShadow: "0 12px 30px -24px rgba(80,10,45,.3)",
          }}
        >
          {capsule}
        </p>

        <Section title="what this is for">{what}</Section>

        <p
          style={{
            fontFamily: "'Newsreader', Georgia, serif",
            fontStyle: "italic",
            fontSize: 18,
            color: "#6e5f67",
            margin: "0 0 48px",
          }}
        >
          {invite}
        </p>

        <section style={{ marginBottom: 48 }}>
          {faq.map((f) => (
            <div key={f.q} style={{ marginBottom: 28 }}>
              <h2
                style={{
                  fontFamily: "'Sora', system-ui, sans-serif",
                  fontSize: "clamp(18px, 2.4vw, 22px)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: "0 0 10px",
                  color: "#100c14",
                }}
              >
                {f.q}
              </h2>
              <p style={{ fontSize: 17, margin: 0, color: "#100c14" }}>{f.a}</p>
            </div>
          ))}
        </section>

        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
            padding: "20px 0",
            borderTop: "1px solid rgba(26,12,20,.10)",
            borderBottom: "1px solid rgba(26,12,20,.10)",
            marginBottom: 40,
            fontSize: 15,
          }}
        >
          <span style={{ color: "#6e5f67" }}>other rooms:</span>
          {others.map((o) => (
            <a
              key={o.href}
              href={o.href}
              style={{
                color: "#100c14",
                textDecoration: "none",
                borderBottom: "1px solid rgba(26,12,20,.25)",
                paddingBottom: 1,
              }}
            >
              {o.label}
            </a>
          ))}
        </nav>

        <p style={{ marginTop: 40, fontSize: 15 }}>
          <a
            href="/"
            style={{
              color: "#cf3b7c",
              textDecoration: "none",
              fontWeight: 600,
              borderBottom: "1px solid rgba(207,59,124,.35)",
              paddingBottom: 2,
            }}
          >
            SHUTAP. Joke about it.
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
      <p style={{ fontSize: 17, margin: 0, color: "#100c14" }}>{children}</p>
    </section>
  );
}
