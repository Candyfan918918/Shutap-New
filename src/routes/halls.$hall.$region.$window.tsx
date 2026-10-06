// Legacy URLs. The old leaderboard feature is retired; these pages render a
// short noindex page pointing to rooms and the joke generator. Loader and
// gating logic are unchanged so indexed URLs keep resolving.
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { SeoPage } from "@/components/seo/SeoPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  HALLS,
  MIN_HALL_ENTRIES,
  getHallView,
  isValidHall,
  isValidRegion,
  isValidWindow,
  type HallSlug,
  type Region,
  type Window as HallWindow,
  type HallView,
} from "@/lib/seo/halls";

export const Route = createFileRoute("/halls/$hall/$region/$window")({
  loader: ({ params }) => {
    if (
      !isValidHall(params.hall) ||
      !isValidRegion(params.region) ||
      !isValidWindow(params.window)
    ) {
      throw notFound();
    }
    const hall = params.hall as HallSlug;
    const region = params.region as Region;
    const window = params.window as HallWindow;
    const view = getHallView(hall, region, window);
    return { hall, region, window, view };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/halls/${params.hall}/${params.region}/${params.window}`;
    const indexable =
      !!loaderData?.view && loaderData.view.entries.length >= MIN_HALL_ENTRIES;
    const meta = loaderData
      ? loaderData.hall
      : (params.hall as string);
    const hallMeta = isValidHall(params.hall) ? HALLS[params.hall as HallSlug] : null;
    const title = hallMeta
      ? `${hallMeta.title} jokes — Shutap rooms`
      : "Jokes in rooms — Shutap";
    const description = hallMeta?.blurb ?? "The jokes people post on Shutap live in rooms.";

    const metaTags: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      ...ogImageMeta(),
    ];
    if (!indexable) metaTags.push({ name: "robots", content: "noindex, follow" });
    void meta;

    const scripts =
      indexable && loaderData?.view
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: title,
                numberOfItems: loaderData.view.entries.length,
                itemListElement: loaderData.view.entries
                  .slice(0, 25)
                  .map((e, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    name: e.title,
                    url: e.href,
                  })),
              }),
            },
          ]
        : [];

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: url }],
      scripts: indexable
        ? [
            ...scripts,
            breadcrumbScript([
              { name: "Rooms", path: "/halls" },
              {
                name: title,
                path: `/halls/${params.hall}/${params.region}/${params.window}`,
              },
            ]),
          ]
        : scripts,
    };
  },
  component: HallPage,
  notFoundComponent: () => (
    <SeoPage>
      <h1 style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 30, margin: '0 0 12px', color: '#0b080f' }}>This page doesn't exist.</h1>
      <p style={{ fontFamily: "'Newsreader',serif", color: '#443c42' }}>
        The jokes people post live in{" "}
        <a
          href="/rooms"
          style={{ color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)', textDecoration: 'none' }}
        >
          rooms
        </a>
        .
      </p>
    </SeoPage>
  ),
  errorComponent: ({ reset }) => (
    <SeoPage>
      <h1 style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 30, margin: '0 0 12px', color: '#0b080f' }}>Something broke loading this page.</h1>
      <button
        onClick={reset}
        style={{ marginTop: 8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#2b2630', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15 }}
      >Try again →</button>
    </SeoPage>
  ),
});

const HALL_DISPLAY: Record<HallSlug, string> = {
  'most-related':   'Most liked',
  'longest-thread': 'Most talked about',
  'best-outcomes':  'Most saved',
}

function HallPage() {
  const { hall, region, window, view } = Route.useLoaderData() as {
    hall: HallSlug;
    region: Region;
    window: HallWindow;
    view: HallView | undefined;
  };
  const meta = HALLS[hall];
  const display = HALL_DISPLAY[hall] ?? meta.title;

  return (
    <SeoPage>
      <article style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Breadcrumbs
            trail={[
              { name: 'Rooms', path: '/halls' },
              { name: display, path: `/halls/${hall}/${region}/${window}` },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2b2630' }} />
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#2b2630' }}>
              rooms
            </span>
          </div>
          <h1 style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 'clamp(26px,5vw,36px)', margin: 0, color: '#0b080f', letterSpacing: '-.01em', lineHeight: 1.15 }}>
            The best jokes now live in rooms.
          </h1>
          <p style={{ fontFamily: "'Newsreader',serif", fontSize: 16, lineHeight: 1.55, color: '#443c42', margin: 0, maxWidth: '46ch' }}>
            Rooms are public topic feeds: office, work, family, school, live and social. Like, comment, save and follow.
          </p>
        </header>

        {!view || view.entries.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/rooms" style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 16, color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)', textDecoration: 'none', alignSelf: 'flex-start' }}>
              See rooms →
            </a>
            <Link to="/" style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 16, color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)', textDecoration: 'none', alignSelf: 'flex-start' }}>
              Turn yours into a joke →
            </Link>
          </div>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {view.entries.map((e, i) => (
              <li
                key={e.id}
                className="hall-row"
                style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 16,
                  background: i === 0 ? '#ffffff' : '#fff',
                  border: '.5px solid rgba(11,8,15,.08)',
                  transition: 'transform .18s, border-color .18s',
                  animation: `hall-fadeup .5s ease ${i * 60}ms both`,
                }}
              >
                <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 14, color: i === 0 ? '#17131a' : '#6f666c', fontVariantNumeric: 'tabular-nums', minWidth: 26 }}>#{i + 1}</span>
                <a
                  href={e.href}
                  style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15.5, color: '#0b080f', textDecoration: 'none', lineHeight: 1.35 }}
                >
                  {e.title}
                </a>
                <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 11, color: '#6f666c', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{e.metric}</span>
              </li>
            ))}
          </ol>
        )}
      </article>
    </SeoPage>
  );
}
