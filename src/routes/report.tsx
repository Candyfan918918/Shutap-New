import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SeoPage } from "@/components/seo/SeoPage";

// Defamation / privacy / takedown route.
// Public surface (URL is sharable) but noindex: takedown intake should not
// itself appear in search results. Submissions are intentionally simple —
// they email hello@shutap.com; no DB writes here.
export const Route = createFileRoute("/report")({
  head: () => {
    const url = "/report";
    const title = "Report a post — Shutap";
    const description =
      "Report a Shutap post or comment for privacy, defamation or safety. Real names and identifying details are removed fast.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ReportPage,
});

const REASONS = [
  "contains my real name or identifying details",
  "names someone else who didn't consent",
  "defamatory or factually false claim about an identifiable person",
  "minor or vulnerable person depicted",
  "doxxing or contact info",
  "harassment, hate or targeting",
  "copyright",
  "other privacy or safety concern",
] as const;

function ReportPage() {
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [url, setUrl] = useState("");
  const [details, setDetails] = useState("");

  return (
    <SeoPage>
      <article className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            report a post
          </h1>
          <p className="text-muted-foreground">
            use the report button on any post or comment, or this form. when
            three different people report a post, it's hidden until we review
            it. you don't have to be the person mentioned to report.
          </p>
        </header>

        {submitted ? (
          <div className="rounded-lg border border-border p-5">
            <p className="font-medium">thanks. we've got it.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              a person reviews every report. content that breaks the house rules
              is removed.
            </p>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              // Hand off to hello@ via mailto — no DB writes from a public unauth surface.
              const body = encodeURIComponent(
                `Reason: ${reason}\nURL: ${url}\n\nDetails:\n${details}`,
              );
              window.location.href = `mailto:hello@shutap.com?subject=${encodeURIComponent(
                "[shutap] report: " + reason,
              )}&body=${body}`;
              setSubmitted(true);
            }}
          >
            <label className="block space-y-1">
              <span className="text-sm font-medium">reason</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">link to the post or comment</span>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">details</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={6}
                placeholder="what's the issue? if it's about you, say so and we'll move it up."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              submit report
            </button>

            <p className="text-xs text-muted-foreground">
              or email{" "}
              <a href="mailto:hello@shutap.com" className="underline">
                hello@shutap.com
              </a>{" "}
              directly.
            </p>
          </form>
        )}
      </article>
    </SeoPage>
  );
}
