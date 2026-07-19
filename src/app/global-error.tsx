"use client";

import { messages } from "@/lib/i18n";

/**
 * Last-resort boundary: replaces the root layout when it crashes, so it must
 * ship its own <html>/<body> and cannot rely on globals.css being present —
 * styling is inline, using the theme's raw token values.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = messages.errorPage;
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F7F7F5",
          color: "#1A1A1A",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24, maxWidth: 480 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
            {t.title}
          </h1>
          <p style={{ color: "#6B7280", marginTop: 8 }}>{t.body}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "12px 28px",
              borderRadius: 999,
              border: 0,
              background: "#16294E",
              color: "#fff",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
