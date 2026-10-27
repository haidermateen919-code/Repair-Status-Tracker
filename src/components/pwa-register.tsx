"use client";

import { useEffect } from "react";

/**
 * Registers the minimal service worker that makes the app installable and
 * provides an offline fallback page. Only runs in production builds; dev
 * caching would hide code changes.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const timer = setTimeout(() => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration must never break the app.
      });
    }, 1_000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
