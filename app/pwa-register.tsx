"use client";
import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[Veriq PWA] Service Worker registered:", registration.scope);
          })
          .catch((err) => {
            console.error("[Veriq PWA] Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
