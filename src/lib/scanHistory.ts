import { supabase } from "@/integrations/supabase/client";

const KEY = "aidyor_scan_history";
const EVENT = "aidyor:scan-history";
const TTL = 30 * 864e5; // keep anonymous history for 30 days

export type Scan = {
  network: string;
  address: string;
  symbol?: string;
  score?: number;
  at: number;
};

// EVM addresses are case-insensitive, Solana addresses are NOT.
const normAddress = (a: string) => (/^0x/i.test(a) ? a.toLowerCase() : a);

const notify = () => {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {}
};

export function getLocalScans(): Scan[] {
  try {
    const all: Scan[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    return all.filter((s) => Date.now() - s.at < TTL);
  } catch {
    return [];
  }
}

export function saveLocalScan(s: Omit<Scan, "at">) {
  try {
    const address = normAddress(s.address);
    const rest = getLocalScans().filter(
      (x) => !(x.network === s.network && x.address === address)
    );
    localStorage.setItem(
      KEY,
      JSON.stringify([{ ...s, address, at: Date.now() }, ...rest].slice(0, 50))
    );
  } catch {}
  notify();
}

/** Subscribe to history changes (returns an unsubscribe function). */
export function onScanHistoryChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/**
 * Call ONLY after a full scan succeeded (never for watchlist market-only rescans).
 * Signed in -> saved to Supabase. Signed out -> saved in localStorage.
 */
export async function recordScanHistory(s: Omit<Scan, "at">) {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await supabase.from("scan_history").upsert(
        {
          network: s.network,
          address: normAddress(s.address),
          symbol: s.symbol,
          score: s.score,
          scanned_at: new Date().toISOString(),
        },
        { onConflict: "user_id,network,address" }
      );
      notify();
      return;
    }
  } catch {
    // fall through to local save
  }
  saveLocalScan(s);
}

/** Move anonymous scans into the account after sign-in. */
export async function syncScansToAccount(client: any) {
  const scans = getLocalScans();
  if (!scans.length) return;
  const rows = scans.map((s) => ({
    network: s.network,
    address: normAddress(s.address),
    symbol: s.symbol,
    score: s.score,
    scanned_at: new Date(s.at).toISOString(),
  }));
  const { error } = await client
    .from("scan_history")
    .upsert(rows, { onConflict: "user_id,network,address" });
  if (!error) {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    notify();
  }
}
