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

const ravenPaths = [
  "m80.4 37.6c-1.8-1.2-3.9-2.9-9.4-2.9-1.8 0-10.8 2.6-10.8 2.6l2 2.5c-1 0.2-1.9 0.5-3 0.9l-10.8-16-44.6-23.3 3.3 10 18.7 11.1-22.2-8.2 5 9.7 21 6.5-19.7-2.2 7.4 8.8 18.6 1-15.5 2.7 13.9 14.9 11.5-7.4-11 13.3-23.3 13.6 1.3 7.3 15-10.2-15.6 16.6h11l10.7-12.1v0.1l0.1-0.1-0.1 0.1-6.5 11.8 8.6-1.9 6.3-15.5c9.1-2.7 16.2-5.4 24.1-14.4l3.3-4.1c2.2-2.8 7.8-7.8 10.1-9.1l11.7-1.3c-2.8-2.8-5.5-3.8-7.8-4.2l-3.3-0.6z",
  "m71.8 90 0.3-5.7 0.6-8.8 2.7 17.1 8.7 5.4-4.4-18.9 8.1 16.1 8.6 3.7-16.8-38-7.8-6.8c-6.2 8.4-12 12.4-19.5 15.7l-4.8 2.4 10.2 7.8 7.5-7.4-4.7 9.5 10.7 7.8",
] as const;

function ravenMark(size: number, color: string) {
  return React.createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 100 100",
      xmlns: "http://www.w3.org/2000/svg",
      style: { display: "block" },
    },
    ravenPaths.map((d, index) =>
      React.createElement("path", { key: index, d, fill: color }),
    ),
  );
}

function getPactType(value: string | null) {
  return value === "workout" || value === "content" ? value : null;
}

export default function handler(request: Request) {
  const url = new URL(request.url);
  const pactType = getPactType(url.searchParams.get("type"));
  const title = pactType
    ? pactCopy[pactType].title
    : "Commit to your habit, financially.";
  const proof = pactType
    ? pactCopy[pactType].proof
    : "Missed days fund Akshaya Patra.";

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
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid rgba(27,29,36,0.1)",
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              color: "#1B1D24",
              padding: "14px 18px",
            },
          },
          ravenMark(34, "#1B1D24"),
          "PACT RAVEN",
        ),
        React.createElement(
          "div",
          { style: { color: "#737985" } },
          "FREE PASS",
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
