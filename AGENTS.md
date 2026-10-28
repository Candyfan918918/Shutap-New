<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- LOVABLE:BEGIN (agent notes) -->
- `node_modules/vite/dist/node/chunks/node.js` carries a patch: the bundled es-module-lexer@1.7.0 wasm cannot lex sources > ~750KB ("Parse error @:1:1" in vite:build-import-analysis on large SSR chunks), so the region is replaced with an import of `es-module-lexer@2.3.2` (same parse shape). If Vite is ever reinstalled or updated, re-apply this patch or the build breaks once the SSR bundle grows past the limit.
<!-- LOVABLE:END (agent notes) -->

- Client build splits vendor code into chunks (vite.config.ts manualChunks) so no chunk exceeds ~750KB — Vite's bundled import scanner crashes on larger chunks in fresh installs.

- Enrich daily trend DTOs with fail-soft Wikipedia readings in a server-only helper; never substitute numeric demo data into production.
- Homepage typography uses shared home.css scale tokens; shared header typography is scoped with a homepage marker to preserve other pages.
- Focused product search pages reuse ContentPage and link to the existing writer; this preserves one generation flow rather than duplicating its controls or access rules.
- The shared Words wrapper renders H1 titles statically so hydration and scrolling never hide or replay page headings.

- Content routes own search and social descriptions; use pageMeta for utility pages and keep root metadata free of homepage-specific descriptions, URLs and images to prevent inheritance across unrelated pages.
- The root layout's GlobalHeader is the only site header; page shells (SeoPage, DocLayout) must not render their own top bar, and the header holds a neutral placeholder until sign-in status is known so the sign-in pill never flashes.
- Links preload on intent (router defaultPreload) and the homepage loader has a staleTime, so Write opens without waiting on fresh server reads each click.
- Guide routes split only their page component; boundary options stay eager and missing-resource errors target the matching guide route so 404 handling does not depend on a separate boundary chunk.
