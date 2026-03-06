"use client";

import { useEffect } from "react";

/**
 * Dev-only component that unregisters any stale service workers and clears
 * Cache Storage on localhost.  This prevents hard-refresh from rendering an
 * older cached UI.  Guarded by a sessionStorage flag so the one-time reload
 * only fires once per tab session (no infinite loops).
 */
export default function DevCacheBuster() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;

    const isLocalhost =
      location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!isLocalhost) return;

    console.log("[DevCacheBuster] ran", {
      env: process.env.NODE_ENV,
      host: location.host,
    });

    let needsReload = false;

    // Unregister all service workers
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
          needsReload = true;
          console.log("[DevCacheBuster] unregistered service worker:", reg.scope);
        }
      });
    }

    // Clear all Cache Storage entries
    if ("caches" in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
          needsReload = true;
          console.log("[DevCacheBuster] deleted cache:", name);
        }
      });
    }

    // One-time reload if we cleared something, guarded to prevent loops
    const FLAG = "devCacheBusted";
    if (!sessionStorage.getItem(FLAG)) {
      sessionStorage.setItem(FLAG, "1");
      // Give the async cleanup a moment to complete, then reload once
      setTimeout(() => {
        if (needsReload) {
          console.log("[DevCacheBuster] reloading after cache cleanup");
          location.reload();
        }
      }, 300);
    }
  }, []);

  return null;
}
