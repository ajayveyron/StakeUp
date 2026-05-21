import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const title = "Pact Raven App";
const description =
  "Create a Pact Raven challenge, lock a deposit, submit proof, and build refund credit through successful days.";
const appUrl = "https://app.pactraven.com";
const ogImageUrl = `${appUrl}/api/og?surface=app`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Pact Raven" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={appUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImageUrl} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
