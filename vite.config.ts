import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative so the same build works at a domain root and under /qwerniop/ on GitHub Pages.
  base: "./",
  plugins: [svelte()],
  // One address: by default "localhost" can bind IPv6 only, and the browser may then reach something else.
  server: { host: "127.0.0.1" },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // A stable name lets size-check find the ai code in the build output.
        chunkFileNames: (chunk) =>
          chunk.moduleIds.some((id) => id.includes("/src/ai/"))
            ? "assets/ai-[name]-[hash].js"
            : "assets/[name]-[hash].js",
      },
    },
  },
});
