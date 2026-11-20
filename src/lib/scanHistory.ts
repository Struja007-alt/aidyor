const KEY = "aidyor_scan_history";
const TTL = 30 * 864e5;

export type Scan = { network: string; address: string; symbol?: string; score?: number; at: number };

export function getLocalScans(): Scan[] {
  try {
    const all: Scan[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    return all.filter(s => Date.now() - s.at < TTL);
  } catch { return []; }
}

export function saveLocalScan(s: Omit<Scan, "at">) {
  try {
    const rest = getLocalScans().filter(
      x => !(x.network === s.network && x.address === s.address));
    localStorage.setItem(KEY, JSON.stringify([{ ...s, at: Date.now() }, ...rest].slice(0, 50)));
  } catch {}
}

export async function syncScansToAccount(supabase: any) {
  const scans = getLocalScans();
  if (!scans.length) return;
  const rows = scans.map(s => ({
    network: s.network, address: s.address, symbol: s.symbol,
    score: s.score, scanned_at: new Date(s.at).toISOString(),
  }));
  const { error } = await supabase.from("scan_history")
    .upsert(rows, { onConflict: "user_id,network,address" });
  if (!error) localStorage.removeItem(KEY);
}