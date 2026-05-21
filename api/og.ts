/// <reference lib="dom" />

import { ImageResponse } from "@vercel/og";
import * as React from "react";

export const config = {
  runtime: "edge",
};

const pactCopy = {
  workout: {
    title: "Start a workout pact",
    proof: "Fresh workout proof before the deadline.",
  },
  content: {
    title: "Start a content pact",
    proof: "Public post link before the day closes.",
  },
} as const;

function getPactType(value: string | null) {
  return value === "workout" || value === "content" ? value : null;
}

export default function handler(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const pactType = getPactType(url.searchParams.get("type"));
  const isApp = host.startsWith("app.") || url.searchParams.get("surface") === "app";
  const title = pactType
    ? pactCopy[pactType].title
    : isApp
    ? "Create your Pact Raven record"
    : "Make a pact you cannot casually break";
  const proof = pactType
    ? pactCopy[pactType].proof
    : "Buy one slot. Lock a deposit. Submit proof.";
  const footer = isApp ? "app.pactraven.com" : "pactraven.com";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#050505",
          color: "#FFD800",
          fontFamily: "Arial Black, Impact, sans-serif",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 28,
            letterSpacing: 0,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              background: "#FFD800",
              color: "#050505",
              padding: "14px 18px",
            },
          },
          "PACT RAVEN",
        ),
        React.createElement("div", null, "RS 249 SLOT"),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 960,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              color: "#F8F3D4",
              fontFamily: "Arial, sans-serif",
              fontSize: 34,
              fontWeight: 900,
            },
          },
          proof,
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 92,
              lineHeight: 0.92,
              textTransform: "uppercase",
            },
          },
          title,
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#F8F3D4",
            fontFamily: "Arial, sans-serif",
            fontSize: 28,
            fontWeight: 900,
          },
        },
        React.createElement("div", null, "Successful days create refund credit."),
        React.createElement("div", null, footer),
      ),
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
