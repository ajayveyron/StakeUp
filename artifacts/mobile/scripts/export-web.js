const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "../../..");
const distIndex = path.resolve(__dirname, "../dist/index.html");
const appUrl = "https://app.pactraven.com";
const description = "Lock money. Show proof daily. Missed days go to charity.";
const metadataBlock = `    <!-- Pact Raven web metadata -->
    <meta name="description" content="${description}" />
    <meta name="theme-color" content="#191919" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Pact Raven" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pact Raven" />
    <meta property="og:title" content="Pact Raven App" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${appUrl}" />
    <meta property="og:image" content="${appUrl}/api/og?surface=app" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Pact Raven App" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${appUrl}/api/og?surface=app" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />
    <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
    <script>
      if ("serviceWorker" in navigator && location.protocol !== "file:") {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/pwa-sw.js").catch(function () {});
        });
      }
    </script>`;

const result = spawnSync(
  "corepack",
  ["pnpm", "--filter", "@workspace/mobile", "exec", "expo", "export", "--platform", "web"],
  {
    cwd: workspaceRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

let html = fs.readFileSync(distIndex, "utf8");
html = html.replace(
  /\n\s*<!-- Pact Raven web metadata -->[\s\S]*?(?=\n\s*<style id="expo-reset">)/,
  "",
);
html = html.replace(/\s*<link rel="icon" href="\/favicon\.ico" \/>/g, "");

if (!html.includes('<meta property="og:image" content="https://app.pactraven.com/api/og?surface=app" />')) {
  html = html.replace(
    "    <!-- The `react-native-web` recommended style reset:",
    `${metadataBlock}\n    <!-- The \`react-native-web\` recommended style reset:`,
  );
}

fs.writeFileSync(distIndex, html);
console.log("Injected Pact Raven app metadata into dist/index.html");
