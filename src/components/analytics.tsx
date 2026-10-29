"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics (decisions.md D37): page views and visitors, no cookies.
 * Review and comparison ids are replaced before anything is sent, so pages group
 * together and no id leaves the browser.
 */
export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => ({
        ...event,
        url: event.url.replace(/\/(review|compare)\/(?!sample\b)[\w-]+/, "/$1/[id]"),
      })}
    />
  );
}
