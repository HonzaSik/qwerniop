import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
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
