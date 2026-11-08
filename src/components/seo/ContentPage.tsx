import type { ReactNode } from "react";
import { LaunchBadges } from "@/components/site/LaunchBadges";
import { Link } from "@tanstack/react-router";
import '@/pages/realtors/realtors.css'
import { Words } from '@/components/motion'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { TryItBox } from '@/components/seo/TryItBox'
import type { Crumb } from '@/lib/seo/breadcrumbs'
import type { BitControls } from '@/lib/bits/shared'
import type { GuideSample } from '@/lib/seo/guides'
import { BitSurface } from '@/pages/home/bit/BitSurface'
import { RealtorEmbed } from '@/components/seo/RealtorEmbed'
import { isRealtorContent } from '@/lib/realtors/is-realtor'
import { WriterBar } from '@/components/seo/WriterBar'
import { WhoDoesWhat } from '@/components/site/WhoDoesWhat'
import type { WriterCopy } from '@/lib/seo/writer-copy'

type Section = { heading: string; body: string };
type Other = { href: string; label: string };
type LinkGroup = { heading: string; items: { href: string; label: string; blurb: string }[] };

export function ContentPage({
  breadcrumbs,
  h1,
  capsule,
  sections,
  others,
  nosnippetCapsule,
  cta,
  linkGroups,
  children,
  tryIt,
  preset,
  sample,
  writer,
  whoDoesWhat,
  hero,
}: {
  breadcrumbs?: Crumb[];
  h1: string;
  capsule: string;
  sections: Section[];
  others?: Other[];
  nosnippetCapsule?: boolean;
  cta?: { label: string; href: string };
  linkGroups?: LinkGroup[];
  /** Custom content rendered after sections, before link groups. */
  children?: ReactNode;
  /** Page id for the inline writer at the foot of the page; omit for no writer. */
  tryIt?: string;
  /** Tool pages: the writer button opens with these controls set. */
  preset?: Partial<BitControls>;
  /** Tool pages: one real bit from the product, shown under the button. */
  sample?: GuideSample;
  /** what the inline writer says on this page (heading, sub, placeholder) */
  writer?: WriterCopy;
  /** the "you type · Shutap does · Shutap never" block, above the sections */
  whoDoesWhat?: boolean;
  /** a product page head, laid out like /toasts and /realtors: a centered
   *  kicker, h1 (second part in italic) and lead, then the writer with no
   *  heading of its own. Replaces the breadcrumb, h1 and capsule box. */
  hero?: { kicker: string; h1: [string, string]; lead: string };
}) {
  // a page about listings, open houses, agents or loan officers gets the
  // realtor box; its CTAs point at the kit too
  const realtor = !!tryIt && isRealtorContent(tryIt, h1, capsule)
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "transparent",
        color: "#0b080f",
        fontFamily: "'Sora', system-ui, sans-serif",
        padding: hero ? "24px clamp(16px, 5vw, 40px) clamp(48px, 8vw, 96px)" : "clamp(48px, 8vw, 96px) clamp(20px, 5vw, 40px)",
      }}
    >
      <article
        style={{ maxWidth: 720, margin: "0 auto", lineHeight: hero ? 1.55 : 1.65 }}
      >
        {hero ? (
          <div className="rl" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", margin: "0 0 22px" }}>
            <p className="rl-kicker" style={{ margin: 0 }}>{hero.kicker}</p>
            <h1 className="rl-h1">{hero.h1[0]}<em>{hero.h1[1]}</em></h1>
            <p className="rl-lead">{hero.lead}</p>
          </div>
        ) : (
          <>
          {breadcrumbs ? <Breadcrumbs trail={breadcrumbs} /> : null}

          <Words
            as="h1"
            key={h1}
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontSize: "clamp(32px, 6vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: "0 0 28px",
              color: "#8e1c4c",
            }}
          >
            {h1}
          </Words>

          <p
            {...(nosnippetCapsule ? { "data-nosnippet": true } : {})}
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: "clamp(19px, 2.4vw, 23px)",
              lineHeight: 1.55,
              color: "#0b080f",
              background: "#ffffff",
              border: "1px solid rgba(11,8,15,.10)",
              borderRadius: 18,
              padding: "24px 26px",
              margin: tryIt ? "0 0 20px" : "0 0 48px",
              boxShadow: "0 12px 30px -24px rgba(20,16,22,.3)",
            }}
          >
            {capsule}
          </p>
          </>
        )}

        {tryIt && realtor && <RealtorEmbed page={tryIt} />}
        {tryIt && !realtor && (
          <div style={{ margin: hero ? "0 0 32px" : "0 0 44px" }}>
            <BitSurface embed={{ page: tryIt, preset, bare: !!hero, ...(writer ?? { heading: "Try it on what you want to say.", sub: "A post, a speech, a toast, a sketch, a presentation. Get the bit and the video. Right here, free.", placeholder: "what happened, the way you'd tell your funniest friend…" }) }} />
          </div>
        )}

        {sample && <SampleBit sample={sample} />}

        {whoDoesWhat && <WhoDoesWhat />}

        {sections.map((s) => (
          <section key={s.heading} style={{ marginBottom: hero ? 22 : 36 }}>
            <h2
              style={{
                fontFamily: "'Sora', system-ui, sans-serif",
                fontSize: "clamp(20px, 2.6vw, 24px)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: hero ? "0 0 6px" : "0 0 12px",
                color: "#0b080f",
              }}
            >
              {s.heading}
            </h2>
            <p style={{ fontSize: hero ? 16 : 17, margin: 0, color: "#0b080f" }}>
              {s.body}
            </p>
          </section>
        ))}

        {children}

        {linkGroups?.map((g) => (
          <section key={g.heading} style={{ marginBottom: 36 }}>
            <h2
              style={{
                fontFamily: "'Sora', system-ui, sans-serif",
                fontSize: "clamp(20px, 2.6vw, 24px)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: "0 0 14px",
                color: "#0b080f",
              }}
            >
              {g.heading}
            </h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    to={it.href}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "#0b080f",
                      background: "#ffffff",
                      border: "1px solid rgba(11,8,15,.10)",
                      borderRadius: 14,
                      padding: "16px 18px",
                    }}
                  >
                    <span style={{ display: "block", fontWeight: 600, fontSize: 17 }}>{it.label}</span>
                    <span style={{ display: "block", fontSize: 15, color: "#443c42", marginTop: 4 }}>{it.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {cta && (
          <p style={{ margin: hero ? "4px 0 24px" : "8px 0 36px" }}>
            <Link
              to={cta.href.startsWith("#") ? "." : cta.href}
              hash={cta.href.startsWith("#") ? cta.href.slice(1) : undefined}
              onClick={(e) => {
                // An in-page CTA (the writer on this page): scroll to it and
                // put the cursor in the first line.
                if (!cta.href.startsWith("#")) return;
                e.preventDefault();
                const el = document.getElementById(cta.href.slice(1));
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
                const box = el?.closest(".bt-col")?.querySelector<HTMLElement>('[contenteditable="true"], textarea');
                window.setTimeout(() => box?.focus({ preventScroll: true }), 450);
              }}
              style={{
                display: "inline-block",
                background: "#8e1c4c",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 17,
                padding: "14px 24px",
                borderRadius: 999,
              }}
            >
              {cta.label} →
            </Link>
          </p>
        )}

        {others && others.length > 0 && (
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              padding: "20px 0",
              borderTop: "1px solid rgba(11,8,15,.10)",
              borderBottom: "1px solid rgba(11,8,15,.10)",
              margin: hero ? "24px 0" : "40px 0",
              fontSize: 15,
            }}
          >
            <span style={{ color: "#656565" }}>more:</span>
            {others.map((o) => (
              <Link
                key={o.href}
                to={o.href}
                style={{
                  color: "#0b080f",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(11,8,15,.25)",
                  paddingBottom: 1,
                }}
              >
                {o.label.toLowerCase()}
              </Link>
            ))}
          </nav>
        )}

        {tryIt && !hero && <TryItBox page={tryIt} preset={preset} anchor heading={realtor ? "Paste your listing above" : (writer?.heading ?? "Write yours above")} realtor={realtor} />}
        {tryIt && <WriterBar page={tryIt} label={realtor ? "Paste a listing. Get the video script and posts." : (writer?.heading ?? "Try it on what you want to say.")} realtor={realtor} />}

        <p style={{ marginTop: hero ? 24 : 40, fontSize: 15 }}>
          <Link
            to="/"
            style={{
              color: "#17131a",
              textDecoration: "none",
              fontWeight: 600,
              borderBottom: "1px solid rgba(23,19,26,.35)",
              paddingBottom: 2,
            }}
          >
            SHUTAP. Say it funnier.
          </Link>
        </p>
        <LaunchBadges />
      </article>
    </main>
  );
}

/* One bit the product really wrote, under the writer button (never inside
 * the box: the box always opens empty). */
function SampleBit({ sample }: { sample: GuideSample }) {
  const label = { fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: '#8e1c4c', margin: '0 0 4px' }
  const line = { fontSize: 17, margin: '0 0 14px', color: '#0b080f' }
  return (
    <section aria-label="A sample bit" style={{ margin: '0 0 44px', padding: '22px 24px', borderRadius: 18, background: '#ffffff', border: '1px solid rgba(11,8,15,.10)' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#17131a' }}>A sample bit</h2>
      <p style={{ margin: '0 0 18px', fontSize: 15, color: '#443c42' }}>
        Written by Shutap on {sample.made} from this story: “{sample.story}”
      </p>
      <p style={label}>hook</p>
      <p style={line}>{sample.hook}</p>
      <p style={label}>setup</p>
      <p style={line}>{sample.setup}</p>
      <p style={label}>tags</p>
      <ul style={{ ...line, paddingLeft: 20 }}>
        {sample.tags.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <p style={label}>button</p>
      <p style={{ ...line, margin: 0 }}>{sample.button}</p>
    </section>
  )
}
