import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from "@/components/site/DocLayout";
import { SITE_URL } from "@/lib/site";

const URL = `${SITE_URL}/legal`;
const TITLE = "Legal & Policies — Shutap AI Joke Generator"
const DESCRIPTION =
  "Shutap's terms, privacy policy, house rules, AI disclosure, disclaimer, crisis help and contact, in one place."

type Item = { href: string; label: string; sub: string };

const ITEMS: Item[] = [
  {
    href: "/how-it-works",
    label: "How it works",
    sub: "paste what happened, get the bit: teleprompter, scene, screenplay page. what\u2019s free and what Shutap+ adds.",
  },
  {
    href: "/faq",
    label: "FAQ",
    sub: "daily limits, what signing in keeps, what the mirror is, how to delete everything.",
  },
  {
    href: "/terms",
    label: "Terms of Service",
    sub: "what shutap is and isn\u2019t, limits, Shutap+, your posts, house rules, AI output, billing. 18+.",
  },
  {
    href: "/privacy",
    label: "Privacy Policy",
    sub: "details scrubbed before storage, a pseudonym instead of your name, no sale of your data.",
  },
  {
    href: "/guidelines",
    label: "House rules",
    sub: "joke about the situation, never a real person. what gets removed.",
  },
  {
    href: "/safety",
    label: "Crisis help",
    sub: "shutap is not a crisis service. where to get help now.",
  },
  {
    href: "/contact",
    label: "Contact",
    sub: "hello@shutap.com, for everything.",
  },
  {
    href: "/ai-disclosure",
    label: "AI disclosure",
    sub: "what writes your jokes, and that it can be wrong.",
  },
  {
    href: "/disclaimer",
    label: "Medical and legal disclaimer",
    sub: "not therapy, not advice, not a diagnosis.",
  },
];

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
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
          "@type": "WebPage",
          name: TITLE,
          description: DESCRIPTION,
          url: URL,
        }),
      },
    ],
  }),
  component: LegalHub,
});

function LegalHub() {
  return (
    <DocLayout
      active="/legal"
      title="Legal & policies"
      subline="every policy, in one place."
    >
      <p>
        shutap is 18+, pseudonymous, and for entertainment only. it&rsquo;s not a medical or legal
        service. pick the page you need.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "20px 0 4px" }}>
        {ITEMS.map((c) => (
          <a
            key={c.href}
            href={c.href}
            style={{
              textDecoration: "none",
              background: "#fff",
              border: ".5px solid rgba(11,8,15,.1)",
              borderRadius: 14,
              padding: "15px 17px",
              display: "block",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "Sora,sans-serif",
                  fontWeight: 700,
                  fontSize: 14.5,
                  color: "#0b080f",
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: "Sora,sans-serif",
                  fontSize: 13,
                  color: "#17131a",
                  whiteSpace: "nowrap",
                }}
              >
                read →
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: "#443c42",
                marginTop: 4,
              }}
            >
              {c.sub}
            </div>
          </a>
        ))}
      </div>
    </DocLayout>
  );
}
