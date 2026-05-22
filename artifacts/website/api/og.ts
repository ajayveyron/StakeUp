import { ImageResponse } from "@vercel/og";
import * as React from "react";

export const config = {
  runtime: "edge",
};

const pactCopy = {
  workout: {
    title: "Start a workout pact",
    proof: "Camera. Location. Daily pose.",
  },
  content: {
    title: "Start a content pact",
    proof: "Public post link before deadline.",
  },
} as const;

function getPactType(value: string | null) {
  return value === "workout" || value === "content" ? value : null;
}

export default function handler(request: Request) {
  const url = new URL(request.url);
  const pactType = getPactType(url.searchParams.get("type"));
  const title = pactType
    ? pactCopy[pactType].title
    : "Lock money. Show proof.";
  const proof = pactType
    ? pactCopy[pactType].proof
    : "Missed days go to charity.";

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
          background: "#F7F8FA",
          color: "#1B1D24",
          fontFamily: "Inter, Arial, sans-serif",
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
          },
        },
        React.createElement(
          "div",
          {
            style: {
              border: "1px solid rgba(27,29,36,0.1)",
              borderRadius: 8,
              background: "#FFFFFF",
              color: "#1B1D24",
              padding: "14px 18px",
            },
          },
          "PACT RAVEN",
        ),
        React.createElement(
          "div",
          { style: { color: "#737985" } },
          "RS 249 SLOT",
        ),
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
              color: "#515763",
              fontFamily: "Arial, sans-serif",
              fontSize: 34,
              fontWeight: 700,
            },
          },
          proof,
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 0.98,
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
            color: "#515763",
            fontFamily: "Arial, sans-serif",
            fontSize: 28,
            fontWeight: 700,
          },
        },
        React.createElement("div", null, "Lock money. Show proof daily."),
        React.createElement("div", null, "pactraven.com"),
      ),
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
