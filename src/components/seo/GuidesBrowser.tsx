/* The /guides index: one compact, searchable list instead of a long stack of
 * cards. Every guide is in the server HTML (crawlers see every link); search,
 * category and sort only hide or reorder rows in the browser, and the choice
 * is kept in the URL (?cat=&sort=&q=) so a filtered view can be shared. */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { GUIDES, GUIDE_TOPICS, guidePath, topicPath, type Guide } from "@/lib/seo/guides";

type Sort = "newest" | "az";
/** "all", "tools", "business" or a topic id. */
type Cat = string;

type Row = {
  href: string;
  title: string;
  blurb: string;
  cat: Cat;
  catLabel: string;
  date: string;
  text: string;
};

const INK = "#0b080f";
const MUTED = "#443c42";
const BRAND = "#8e1c4c";
const LINE = "rgba(11,8,15,.10)";

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

// Fixed locale and UTC so server and client render the same string.
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
};

const topicLabel = (id?: string) => GUIDE_TOPICS.find((t) => t.id === id)?.label;

function catOf(g: Guide): { cat: Cat; label: string } {
  if (g.kind === "tool") return { cat: "tools", label: "Tools" };
  if (g.kind === "business") return { cat: "business", label: "For business" };
  const label = topicLabel(g.topic);
  return label ? { cat: g.topic as string, label } : { cat: "more", label: "More guides" };
}

function buildRows(): Row[] {
  const rows: Row[] = [
    {
      href: "/ai-joke-generator",
      title: "AI joke generator",
      blurb: "Turn your own story into a complete bit: hook, setup, tags and button.",
      cat: "tools",
      catLabel: "Tools",
      date: "2026-10-17",
      text: "",
    },
    ...GUIDES.map((g) => {
      const { cat, label } = catOf(g);
      return {
        href: guidePath(g.slug),
        title: g.h1,
        blurb: g.blurb,
        cat,
        catLabel: label,
        date: g.updated ?? g.published,
        text: "",
      };
    }),
  ];
  for (const r of rows) r.text = `${r.title} ${r.blurb} ${r.catLabel}`.toLowerCase();
  return rows;
}

const isSort = (v: string | null): v is Sort => v === "newest" || v === "az";

export function GuidesBrowser() {
  const rows = useMemo(buildRows, []);
  const [cat, setCat] = useState<Cat>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");

  const cats = useMemo(() => {
    const count = new Map<Cat, { label: string; n: number }>();
    for (const r of rows) {
      const c = count.get(r.cat) ?? { label: r.catLabel, n: 0 };
      c.n += 1;
      count.set(r.cat, c);
    }
    // Tools first, then topics in their fixed order, then the rest.
    const order: Cat[] = ["tools", ...GUIDE_TOPICS.map((t) => t.id), "more", "business"];
    return order.filter((id) => count.has(id)).map((id) => ({ id, ...count.get(id)! }));
  }, [rows]);

  // Restore the view from the URL so filtered views can be shared.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("cat");
    if (c && cats.some((x) => x.id === c)) setCat(c);
    const s = p.get("sort");
    if (isSort(s)) setSort(s);
    const q = p.get("q");
    if (q) setQuery(q);
  }, [cats]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (cat !== "all") p.set("cat", cat);
    if (sort !== "newest") p.set("sort", sort);
    if (query.trim()) p.set("q", query.trim());
    const qs = p.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [cat, sort, query]);

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const out = rows.filter((r) => (cat === "all" || r.cat === cat) && words.every((w) => r.text.includes(w)));
    out.sort((a, b) =>
      sort === "az" ? a.title.localeCompare(b.title, "en", { sensitivity: "base" }) : b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
    );
    return out;
  }, [rows, cat, sort, query]);

  const newest = rows.reduce((m, r) => (r.cat !== "tools" && r.date > m ? r.date : m), "");
  const hub = GUIDE_TOPICS.find((t) => t.id === cat);

  const chip = (active: boolean): CSSProperties => ({
    font: "inherit",
    fontSize: 14,
    fontWeight: 600,
    padding: "7px 13px",
    borderRadius: 999,
    border: `1px solid ${active ? BRAND : "rgba(11,8,15,.18)"}`,
    background: active ? BRAND : "#ffffff",
    color: active ? "#ffffff" : INK,
    cursor: "pointer",
    minHeight: 36,
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  });
  const control: CSSProperties = {
    font: "inherit",
    fontSize: 16,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(11,8,15,.18)",
    background: "#ffffff",
    color: INK,
    minHeight: 44,
  };

  return (
    <section aria-label="All guides and tools" style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <label style={{ flex: "1 1 240px", display: "block" }}>
          <span style={visuallyHidden}>Search guides</span>
          <input
            type="search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="Search guides: roast, toast, tags…"
            style={{ ...control, width: "100%", boxSizing: "border-box" }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: MUTED }}>
          Sort
          <select value={sort} onChange={(ev) => setSort(ev.target.value as Sort)} style={{ ...control, fontSize: 15 }}>
            <option value="newest">Newest first</option>
            <option value="az">A–Z</option>
          </select>
        </label>
      </div>

      <div
        role="group"
        aria-label="Filter by category"
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
          overflowX: "auto",
          paddingBottom: 6,
          scrollbarWidth: "thin",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")} style={chip(cat === "all")}>
          All · {rows.length}
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => setCat(cat === c.id ? "all" : c.id)}
            style={chip(cat === c.id)}
          >
            {c.label} · {c.n}
          </button>
        ))}
      </div>

      <p aria-live="polite" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, fontSize: 14, color: MUTED, margin: "0 0 8px" }}>
        <span>{shown.length === rows.length ? `${rows.length} guides and tools` : `${shown.length} of ${rows.length}`}</span>
        {hub ? (
          <Link to={topicPath(hub.id)} style={{ color: BRAND, fontWeight: 600 }}>
            Open the {hub.label.toLowerCase()} page →
          </Link>
        ) : null}
      </p>

      {shown.length === 0 ? (
        <p style={{ fontSize: 16, color: MUTED, margin: "8px 0 0" }}>
          Nothing matches.{" "}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCat("all");
            }}
            style={{ font: "inherit", color: BRAND, background: "none", border: 0, padding: 0, textDecoration: "underline", cursor: "pointer" }}
          >
            Clear filters
          </button>
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: `1px solid ${LINE}` }}>
          {shown.map((r) => (
            <li key={r.href} style={{ borderBottom: `1px solid ${LINE}` }}>
              <Link to={r.href} style={{ display: "block", textDecoration: "none", color: INK, padding: "12px 2px" }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: 16.5, lineHeight: 1.35 }}>{r.title}</span>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: BRAND, marginTop: 3 }}>
                  {r.catLabel}
                  {r.cat !== "tools" ? <span style={{ color: MUTED, fontWeight: 500 }}> · {fmtDate(r.date)}</span> : null}
                  {r.date === newest ? <span> · New</span> : null}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 14.5,
                    color: MUTED,
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
