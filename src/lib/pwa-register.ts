import { registerSW } from "virtual:pwa-register";

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