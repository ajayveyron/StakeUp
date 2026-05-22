export const config = {
  runtime: "edge",
};

export default function handler() {
  return new Response(
    "Not Acceptable\n\nSupported types: text/html, text/markdown\n",
    {
      status: 406,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Vary: "Accept",
      },
    },
  );
}
