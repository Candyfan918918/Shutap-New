import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SeoPage } from "@/components/seo/SeoPage";
import { getPublicStory } from "@/lib/story.functions";
import {
  buildStoryJsonLd,
  isStoryIndexable,
  storyDescription,
  storyQueryTitle,
  storyUrl,
  type PillarSlug,
  type StoryRow,
} from "@/lib/seo/story";
import { breadcrumbScript, storyTrail } from "@/lib/seo/breadcrumbs";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

type StoryLite = Pick<StoryRow, "id" | "slug" | "pillar" | "title" | "clean_text" | "initial_scan">;
type LoaderData = {
  row: StoryRow;
  relates: number;
  siblings: StoryLite[];
  resonance: { count: number; display_count: number | null; stories: StoryLite[]; fallback: boolean };
};

export const Route = createFileRoute("/story/$pillar/$slug")({
  loader: async ({ params }) => {
    const pillar = params.pillar as PillarSlug;
    if (!["relationships", "marriage", "family", "career"].includes(pillar)) {
      throw notFound();
    }
    const hit = await getPublicStory({ data: { pillar, slug: params.slug } });
    if (!hit) throw notFound();
    return hit as LoaderData;
  },
  head: ({ params, loaderData }) => {
    const pillar = params.pillar as PillarSlug;
    const url = storyUrl(pillar, params.slug);
    if (!loaderData) {
      return {
        meta: [
          { title: "Post not found — Shutap" },
          { name: "robots", content: "noindex, follow" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const { row, relates } = loaderData;
    const title = storyQueryTitle(row);
    const description = storyDescription(row.clean_text);
    // Spill and Scan stories are retired: the page still renders for old
    // links, but only joke posts are offered to search engines.
    const indexable = row.kind === "joke" && isStoryIndexable({
      is_public: row.is_public,
      is_seed: row.is_seed,
      crisis_flag: row.crisis_flag,
      deleted_at: row.deleted_at,
    });
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (!indexable) meta.push({ name: "robots", content: "noindex, follow" });

    const scripts = indexable
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify(
              buildStoryJsonLd({
                url,
                headline: title,
                text: row.clean_text,
                datePublished: row.created_at,
                dateModified: row.updated_at,
                relates,
                band: row.scan_band,
                score: row.initial_scan,
              }),
            ),
          },
        ]
      : [];

    const allScripts = indexable
      ? [...scripts, breadcrumbScript(storyTrail(pillar, params.slug, title))]
      : scripts;
    return { meta, links: [{ rel: "canonical", href: url }], scripts: allScripts };
  },
  component: StoryPage,
  notFoundComponent: () => (
    <SeoPage>
      <h1 className="text-2xl font-semibold">This post isn't public.</h1>
      <p className="mt-3 text-muted-foreground">
        It may have been removed or kept private.
      </p>
      <a href="/rooms" className="mt-4 inline-block underline">
        See jokes in rooms →
      </a>
    </SeoPage>
  ),
  errorComponent: ({ reset }) => (
    <SeoPage>
      <h1 className="text-2xl font-semibold">Something broke loading this page.</h1>
      <button onClick={reset} className="mt-3 underline">Try again</button>
    </SeoPage>
  ),
});

const REASONING_LABELS: Record<string, string> = {
  frequency: "how common",
  severity: "how serious",
  reversibility: "can it be undone",
  power_imbalance: "power dynamic",
  norm_violation: "norm break",
  stakes: "what's at stake",
};

function StoryPage() {
  const { row, relates, siblings, resonance } = Route.useLoaderData() as LoaderData;
  const reasoning = (row.scan_reasoning ?? null) as Record<string, { note?: string; weight?: number }> | null;
  const resonanceLine =
    resonance.display_count && resonance.display_count >= 5
      ? `${resonance.display_count}+ similar situations`
      : resonance.stories.length > 0
        ? resonance.fallback
          ? `More about ${row.pillar}`
          : `${resonance.stories.length} similar situations`
        : "Nothing similar yet";

  return (
    <SeoPage>
      <article className="space-y-8">
        <header className="space-y-2">
          <Breadcrumbs trail={storyTrail(row.pillar, row.slug ?? "", storyQueryTitle(row))} />
          <p className="text-sm uppercase tracking-wider text-muted-foreground">
            {row.pillar} · a real situation
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {storyQueryTitle(row)}
          </h1>
          <p className="text-xs text-muted-foreground">
            Posted {new Date(row.created_at).toLocaleDateString()}
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-lg leading-relaxed whitespace-pre-wrap">{row.clean_text}</p>
        </section>

        {typeof row.initial_scan === "number" && (
          <section className="space-y-2 border-l-2 border-border pl-4">
            <h2 className="text-xl font-semibold">Score</h2>
            <p className="text-3xl font-semibold">{row.initial_scan}</p>
            {row.scan_band && (
              <p className="text-sm text-muted-foreground">Band: {row.scan_band}</p>
            )}
          </section>
        )}

        {reasoning && typeof reasoning === "object" && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">What went into the score</h2>
            <ul className="space-y-2">
              {Object.entries(reasoning).map(([k, v]) => {
                const label = REASONING_LABELS[k] ?? k;
                const note = v && typeof v === "object" ? v.note : undefined;
                if (!note) return null;
                return (
                  <li key={k} className="text-sm">
                    <span className="font-medium">{label}:</span>{" "}
                    <span className="text-muted-foreground">{note}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="space-y-3 rounded-md border border-border p-5">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">{resonanceLine}</p>
          {resonance.stories.length > 0 && (
            <ul className="space-y-3">
              {resonance.stories.map((s) => s.slug ? (
                <li key={s.id}>
                  <Link
                    to="/story/$pillar/$slug"
                    params={{ pillar: s.pillar, slug: s.slug }}
                    className="block hover:underline"
                  >
                    <div className="text-base font-medium">{storyQueryTitle(s)}</div>
                    {s.clean_text && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {s.clean_text.split(/\n|\. /)[0]?.slice(0, 160)}
                      </div>
                    )}
                  </Link>
                </li>
              ) : null)}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-border p-5">
          <p className="text-sm text-muted-foreground">Got one like this?</p>
          <Link to="/" className="mt-2 inline-block text-lg font-medium underline">
            Turn yours into a joke →
          </Link>
        </section>

        {siblings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">More about {row.pillar}</h2>
            <ul className="space-y-2">
              {siblings.map((s) =>
                s.slug ? (
                  <li key={s.id}>
                    <Link
                      to="/story/$pillar/$slug"
                      params={{ pillar: s.pillar, slug: s.slug }}
                      className="underline"
                    >
                      {storyQueryTitle(s)}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        )}
      </article>
    </SeoPage>
  );
}
