// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    // Keep every client chunk well under ~750KB: Vite's bundled import scanner
    // crashes ("Parse error @:1:1") on larger chunks in fresh installs.
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              manualChunks(id: string) {
                if (!id.includes("node_modules")) return undefined;
                const m = id.split("node_modules/").pop()!.split("/");
                const pkg = m[0].startsWith("@") ? `${m[0]}/${m[1]}` : m[0];
                if (pkg === "react" || pkg === "react-dom" || pkg === "scheduler") return "vendor-react";
                if (pkg.startsWith("@supabase")) return "vendor-supabase";
                if (pkg.startsWith("@tanstack")) return "vendor-tanstack";
                return "vendor";
              },
            },
          },
        },
      },
    },
  },
});

