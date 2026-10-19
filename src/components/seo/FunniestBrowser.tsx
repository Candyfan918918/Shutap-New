import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  FUNNIEST_FIELDS,
  funniestField,
  funniestPath,
  type FunniestEntry,
  type FunniestField,
} from "@/lib/seo/funniest";

type Sort = "newest" | "oldest" | "az";

const SORTS: { id: Sort; label: string }[] = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "az", label: "Category A–Z" },
];

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

const INK = "#0b080f";
const MUTED = "#443c42";
const BRAND = "#8e1c4c";
const LINE = "rgba(11,8,15,.10)";

// Fixed locale and UTC so server and client render the same string.
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

function haystack(e: FunniestEntry): string {
  return [e.category, e.h1, e.blurb, e.pick.name, ...e.runnersUp.map((r) => r.name)]
    .join(" ")
    .toLowerCase();
}

function sortEntries(list: FunniestEntry[], sort: Sort): FunniestEntry[] {
  const out = [...list];
  if (sort === "az") {
    out.sort((a, b) => a.category.localeCompare(b.category, "en", { sensitivity: "base" }));
  } else {
    out.sort(
      (a, b) =>
        (sort === "newest" ? -1 : 1) * a.published.localeCompare(b.published) ||
        a.category.localeCompare(b.category),
    );
  }
  return out;
}

const isSort = (v: string | null): v is Sort => SORTS.some((s) => s.id === v);

export function FunniestBrowser({ entries }: { entries: FunniestEntry[] }) {
  const [field, setField] = useState<FunniestField | "all">("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");

  // Restore state from the URL so filtered views can be shared.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f = p.get("field");
    if (f && FUNNIEST_FIELDS.some((x) => x.id === f)) setField(f as FunniestField);
    const s = p.get("sort");
    if (isSort(s)) setSort(s);
    const q = p.get("q");
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (field !== "all") p.set("field", field);
    if (sort !== "newest") p.set("sort", sort);
    if (query.trim()) p.set("q", query.trim());
    const qs = p.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [field, sort, query]);

  const counts = useMemo(() => {
    const c = new Map<FunniestField, number>();
    for (const e of entries) c.set(funniestField(e), (c.get(funniestField(e)) ?? 0) + 1);
    return c;
  }, [entries]);

  const fields = FUNNIEST_FIELDS.filter((f) => (counts.get(f.id) ?? 0) > 0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = entries.filter(
      (e) => (field === "all" || funniestField(e) === field) && (!q || haystack(e).includes(q)),
    );
    return sortEntries(filtered, sort);
  }, [entries, field, sort, query]);

  const newest = entries.reduce((m, e) => (e.published > m ? e.published : m), "");
  const fieldLabel = (id: FunniestField) => FUNNIEST_FIELDS.find((f) => f.id === id)?.label ?? "";

  const chip = (active: boolean): CSSProperties => ({
    font: "inherit",
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${active ? BRAND : "rgba(11,8,15,.18)"}`,
    background: active ? BRAND : "#ffffff",
    color: active ? "#ffffff" : INK,
    cursor: "pointer",
    minHeight: 36,
  });

  return (
    <section aria-labelledby="funniest-series" style={{ marginBottom: 36 }}>
      <h2
        id="funniest-series"
        style={{
          fontFamily: "'Sora', system-ui, sans-serif",
          fontSize: "clamp(20px, 2.6vw, 24px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: "0 0 14px",
          color: INK,
        }}
      >
        The series
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <label style={{ flex: "1 1 240px", display: "block" }}>
          <span style={visuallyHidden}>Search the series</span>
          <input
            type="search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="Search a category or a name"
            style={{
              width: "100%",
              font: "inherit",
              fontSize: 16,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(11,8,15,.18)",
              background: "#ffffff",
              color: INK,
              minHeight: 44,
            }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: MUTED }}>
          Sort
          <select
            value={sort}
            onChange={(ev) => setSort(ev.target.value as Sort)}
            style={{
              font: "inherit",
              fontSize: 15,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(11,8,15,.18)",
              background: "#ffffff",
              color: INK,
              minHeight: 44,
            }}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="group" aria-label="Filter by field" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <button type="button" aria-pressed={field === "all"} onClick={() => setField("all")} style={chip(field === "all")}>
          All · {entries.length}
        </button>
        {fields.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={field === f.id}
            onClick={() => setField(field === f.id ? "all" : f.id)}
            style={chip(field === f.id)}
          >
            {f.label} · {counts.get(f.id)}
          </button>
        ))}
      </div>

      <p aria-live="polite" style={{ fontSize: 14, color: MUTED, margin: "0 0 12px" }}>
        {shown.length === entries.length
          ? `${entries.length} pages`
          : `${shown.length} of ${entries.length} pages`}
      </p>

      {shown.length === 0 ? (
        <p style={{ fontSize: 16, color: MUTED, margin: "8px 0 0" }}>
          Nothing matches yet.{" "}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setField("all");
            }}
            style={{ font: "inherit", color: BRAND, background: "none", border: 0, padding: 0, textDecoration: "underline", cursor: "pointer" }}
          >
            Clear filters
          </button>
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {shown.map((e) => (
            <li key={e.slug}>
              <Link
                to={funniestPath(e.slug)}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: INK,
                  background: "#ffffff",
                  border: `1px solid ${LINE}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: BRAND,
                  }}
                >
                  <span>{fieldLabel(funniestField(e))}</span>
                  <span style={{ color: MUTED, fontWeight: 500 }}>{fmtDate(e.updated ?? e.published)}</span>
                  {e.published === newest ? <span>New</span> : null}
                </span>
                <span style={{ display: "block", fontWeight: 600, fontSize: 17, marginTop: 6 }}>{e.h1}</span>
                <span style={{ display: "block", fontSize: 15, color: INK, marginTop: 2 }}>
                  Pick: {e.pick.name}
                </span>
                <span style={{ display: "block", fontSize: 15, color: MUTED, marginTop: 4 }}>{e.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
