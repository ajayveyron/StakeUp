import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        workoutAccountability: resolve(
          __dirname,
          "workout-accountability.html",
        ),
        terms: resolve(__dirname, "terms.html"),
        privacy: resolve(__dirname, "privacy.html"),
        refunds: resolve(__dirname, "refund-cancellation.html"),
        proofRules: resolve(__dirname, "proof-rules.html"),
        support: resolve(__dirname, "support.html"),
        notFound: resolve(__dirname, "404.html"),
      },
    },
  },
  server: {
    port: 5175,
    fs: {
      allow: ["../.."],
    },
  },
});
