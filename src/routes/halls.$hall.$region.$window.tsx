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
      ? `${hallMeta.title} · ${params.region} · ${params.window} — shutap halls`
      : "halls — shutap";
    const description = hallMeta?.blurb ?? "Shutap halls — curated collections of rooms.";

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
              { name: "Halls", path: "/halls" },
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
      <h1 style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 30, margin: '0 0 12px', color: '#0b080f' }}>no hall at that path.</h1>
      <p style={{ fontFamily: "'Newsreader',serif", color: '#443c42' }}>
        try{" "}
        <Link
          to="/halls/$hall/$region/$window"
          params={{ hall: "most-related", region: "global", window: "30d" }}
          style={{ color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)', textDecoration: 'none' }}
        >
          most relatable · global · 30d
        </Link>
        .
      </p>
    </SeoPage>
  ),
  errorComponent: ({ reset }) => (
    <SeoPage>
      <h1 style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 30, margin: '0 0 12px', color: '#0b080f' }}>couldn't load this hall.</h1>
      <button
        onClick={reset}
        style={{ marginTop: 8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#2b2630', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15 }}
      >try again →</button>
    </SeoPage>
  ),
});

const HALL_DISPLAY: Record<HallSlug, string> = {
  'most-related':   'most relatable',
  'longest-thread': 'bravest',
  'best-outcomes':  'most loving',
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
              { name: 'halls', path: '/halls' },
              { name: `${display} · ${region} · ${window}`, path: `/halls/${hall}/${region}/${window}` },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2b2630' }} />
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#2b2630' }}>
              hall · {region} · {window}
            </span>
          </div>
          <h1 style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 'clamp(26px,5vw,36px)', margin: 0, color: '#0b080f', letterSpacing: '-.01em', lineHeight: 1.15 }}>
            {display}.
          </h1>
          <p style={{ fontFamily: "'Newsreader',serif", fontSize: 16, lineHeight: 1.55, color: '#443c42', margin: 0, maxWidth: '46ch' }}>
            {meta.blurb}
          </p>
        </header>

        {!view || view.entries.length === 0 ? (
          <p style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15.5, color: '#6f666c', margin: 0 }}>
            we haven't gathered enough signal here yet. halls publish once at least{" "}
            {MIN_HALL_ENTRIES} rooms qualify for a (region, window) cell.
          </p>
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
