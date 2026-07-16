import { registerSW } from "virtual:pwa-register";

// One-time cleanup flag so we don't wipe caches on every single load.
const CLEANUP_FLAG = "aidyor-sw-cleanup-v1";

/**
 * Kill-switch: forcibly unregisters ANY existing service worker and clears
 * ALL caches for this origin, once per browser. This exists because a
 * malicious third-party service worker (ad network script) was briefly
 * live in production. Deleting the file alone does not remove it from
 * browsers that already installed it — this does.
 */
async function cleanupStaleServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  if (localStorage.getItem(CLEANUP_FLAG)) return;

  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best-effort cleanup; ignore failures (e.g. browser restrictions).
  } finally {
    // Mark done even on partial failure so we don't retry-loop forever;
    // bump the suffix (v2, v3...) if you ever need to force a re-run.
    localStorage.setItem(CLEANUP_FLAG, "1");
  }
}

function shouldRegister(): boolean {
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;

  const h = location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return false;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return false;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return false;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return false;
  if (location.search.includes("sw=off")) return false;

  return true;
}

export async function registerPWA() {
  // Always run cleanup first, regardless of environment, so stale/malicious
  // workers get removed even on hostnames where we don't register our own.
  await cleanupStaleServiceWorkers();

  if (!shouldRegister()) {
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.scope && new URL(reg.scope).pathname === "/") {
            await reg.unregister();
          }
        }
      } catch {
        // ignore cleanup errors
      }
    }
    return;
  }

  registerSW({ immediate: true });
}
