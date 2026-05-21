const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "../../..");
const distIndex = path.resolve(__dirname, "../dist/index.html");
const appUrl = "https://app.pactraven.com";
const description =
  "Create a Pact Raven challenge, lock a deposit, submit proof, and build refund credit through successful days.";
const metadataBlock = `    <!-- Pact Raven web metadata -->
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pact Raven" />
    <meta property="og:title" content="Pact Raven App" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${appUrl}" />
    <meta property="og:image" content="${appUrl}/api/og?surface=app" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Pact Raven App" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${appUrl}/api/og?surface=app" />`;

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

if (!html.includes('<meta property="og:image" content="https://app.pactraven.com/api/og?surface=app" />')) {
  html = html.replace(
    "    <!-- The `react-native-web` recommended style reset:",
    `${metadataBlock}\n    <!-- The \`react-native-web\` recommended style reset:`,
  );
}

fs.writeFileSync(distIndex, html);
console.log("Injected Pact Raven app metadata into dist/index.html");
