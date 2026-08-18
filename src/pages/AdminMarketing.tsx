/**
 * @fileoverview PRIVATE admin marketing dashboard (/admin/marketing).
 * Access requires an authenticated session AND the backend-verified `admin`
 * role (public.has_role). Not indexed: noindex meta + robots.txt disallow.
 *
 * Real data comes from the `marketing-dashboard` edge function (Supabase),
 * which aggregates: product usage tables, the `partnerships` table
 * (affiliate/sponsorship tracking), and the `seo_snapshots` table (manual/
 * Claude-assisted GSC pulls, since GSC data lives in Supermetrics, not here).
 *
 * Metrics with no connected source (site analytics — visitors, sessions,
 * channel breakdown, UTM campaigns) still render the placeholder state
 * rather than an invented number.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client"; // adjust path if your client lives elsewhere
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity,
  BarChart3,
  Coins,
  CreditCard,
  Eye,
  Gauge,
  Handshake,
  Lock,
  MousePointerClick,
  Percent,
  ScanLine,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  DataTable,
  DataRows,
  EmptyChart,
  TrendChart,
  EmptyRows,
  KpiCard,
  NO_DATA,
  PlaceholderNote,
  SectionCard,
} from "@/components/admin/AdminMarketingUI";

type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
  { key: "custom", label: "Custom", days: 30 },
];

const CHANNELS = ["Reddit", "X", "Pinterest", "Medium", "Google", "Direct", "Referrals"];

const ENGAGEMENT = [
  "Avg. session duration",
  "Pages / session",
  "Bounce rate",
  "Scans per session",
  "Screenshot scans",
  "Watchlist adds",
  "Returning visitors",
];

// ---- Types matching the marketing-dashboard edge function response ----
interface DayPoint { date: string; count: number; }
interface Partnership {
  id: string;
  partner: string;
  type: string;
  status: string;
  placement: string | null;
  clicks: number;
  conversions: number;
  revenueUsd: number;
  conversionRate: number;
  payoutTerms: string | null;
  notes: string | null;
}
interface SeoSnapshot {
  snapshot_date: string;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  avg_position: number | null;
  indexed_pages: number | null;
  total_sitemap_pages: number | null;
}
interface DashboardResponse {
  periodDays: number;
  product: {
    totalScans: number;
    totalOcrScans: number;
    activeProSubs: number;
    activeWhaleSubs: number;
    apiCalls: number;
    scansByDay: DayPoint[];
  };
  partnerships: {
    items: Partnership[];
    totalClicks: number;
    totalConversions: number;
    totalRevenueUsd: number;
  };
  seo: {
    latest: SeoSnapshot | null;
    trend: SeoSnapshot[];
    note: string | null;
  };
}

/** Outreach pipeline — manually tracked, not performance data. */
const PIPELINE = [
  { name: "Trezor", type: "Affiliate", status: "Live", fee: "Rev-share (TBD)" },
  { name: "CertiK", type: "Sponsorship", status: "Not contacted", fee: "TBD" },
  { name: "CoinGecko", type: "Affiliate / Data", status: "Not contacted", fee: "TBD" },
];

const AdminMarketing = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading, unavailable } = useAdminRole();

  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    document.title = "Marketing Dashboard | AIDYOR Admin";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  const rangeDays = RANGES.find((r) => r.key === range)?.days ?? 30;

  const fetchDashboard = useCallback(async (days: number) => {
    setDataLoading(true);
    setDataError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setDataError("Session expired — sign in again to load live metrics.");
        return;
      }
      const res = await fetch(
        `https://lerromdxykuydrpttfif.supabase.co/functions/v1/marketing-dashboard?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (e) {
      setDataError(e instanceof Error ? e.message : "Failed to load live metrics");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) fetchDashboard(rangeDays);
  }, [user, isAdmin, rangeDays, fetchDashboard]);

  const rangeLabel = useMemo(() => {
    if (range !== "custom") return RANGES.find((r) => r.key === range)?.label ?? "";
    if (customFrom && customTo) return `${customFrom} → ${customTo}`;
    return "Custom range";
  }, [range, customFrom, customTo]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">
          Verifying access…
        </p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-lg font-bold text-foreground">
              Restricted area
            </h1>
            <p className="text-sm text-muted-foreground">
              {!user
                ? "Sign in with an administrator account to continue."
                : unavailable
                ? "Admin permissions could not be verified right now. Try again later."
                : "This account does not have administrator access."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {!user && (
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/">Back to AIDYOR</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Real KPI values, derived only from what the edge function actually returned ----
  const affiliateRevenue = data?.partnerships.items
    .filter((p) => p.type === "affiliate")
    .reduce((s, p) => s + p.revenueUsd, 0);
  const sponsorshipRevenue = data?.partnerships.items
    .filter((p) => p.type === "sponsorship")
    .reduce((s, p) => s + p.revenueUsd, 0);
  const trezorClicks = data?.partnerships.items.find((p) => p.partner === "Trezor")?.clicks;
  const totalTrackedRevenue = data ? affiliateRevenue! + sponsorshipRevenue! : undefined;

  const KPIS: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    hint?: string;
    accent?: boolean;
    value?: string | number;
  }[] = [
    { label: "Visitors", icon: Users },
    { label: "Sessions", icon: Activity },
    { label: "Token Scans", icon: ScanLine, value: data?.product.totalScans },
    { label: "OCR Scans", icon: ScanLine, value: data?.product.totalOcrScans },
    { label: "Trezor Clicks", icon: MousePointerClick, value: trezorClicks },
    { label: "Affiliate Revenue", icon: Wallet, value: affiliateRevenue !== undefined ? `$${affiliateRevenue.toFixed(2)}` : undefined },
    { label: "Active Pro Subs", icon: CreditCard, value: data?.product.activeProSubs, hint: "Count, not $ — no price tracked yet" },
    { label: "Sponsorship Revenue", icon: Handshake, value: sponsorshipRevenue !== undefined ? `$${sponsorshipRevenue.toFixed(2)}` : undefined },
    { label: "Tracked Revenue", icon: Coins, accent: true, value: totalTrackedRevenue !== undefined ? `$${totalTrackedRevenue.toFixed(2)}` : undefined, hint: "Affiliate + sponsorship only" },
    { label: "Revenue / 1K Visitors", icon: Gauge, accent: true, hint: "RPM — needs visitor data" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                <ShieldCheck className="w-3 h-3 mr-1" /> Private
              </Badge>
              <Badge variant="outline" className="text-[10px]">Admin only</Badge>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Marketing Dashboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Acquisition, engagement, monetization and partner pipeline overview.
              Product, partnership and SEO metrics are live; site analytics stay empty until a source is connected.
            </p>
            {dataError && (
              <p className="text-xs text-destructive">{dataError}</p>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">← Back to site</Link>
          </Button>
        </header>

        {/* Date range controls */}
        <section className="glass-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  range === r.key
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === "custom" ? (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 text-xs w-auto"
                aria-label="Range start date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 text-xs w-auto"
                aria-label="Range end date"
              />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Showing: <span className="text-foreground">{rangeLabel}</span>
              {dataLoading && " · loading…"}
            </span>
          )}
        </section>

        {/* KPI cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
              Key metrics · {rangeLabel}
            </h2>
            <PlaceholderNote>Visitors/sessions await an analytics source</PlaceholderNote>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {KPIS.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>
        </section>

        {/* Trends */}
        <section className="space-y-3">
          <h2 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
            Trends
          </h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <EmptyChart title="Visitors" />
            <TrendChart
              title="Token scans"
              points={(data?.product.scansByDay ?? []).map((d) => ({ label: d.date.slice(5), value: d.count }))}
            />
            <EmptyChart title="Revenue" />
          </div>
        </section>

        {/* Acquisition + engagement */}
        <section className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Acquisition by channel"
            description="Traffic sources tracked for AIDYOR growth experiments."
            action={<BarChart3 className="w-4 h-4 text-muted-foreground" />}
          >
            <DataTable headers={["Channel", "Visitors", "Sessions", "Scans", "Revenue"]}>
              <EmptyRows labels={CHANNELS} columns={5} />
            </DataTable>
            <div className="pt-3">
              <PlaceholderNote />
            </div>
          </SectionCard>

          <SectionCard
            title="Engagement"
            description="How visitors interact with the scanner."
            action={<Eye className="w-4 h-4 text-muted-foreground" />}
          >
            <DataTable headers={["Metric", "Value", "Prev. period"]}>
              <EmptyRows labels={ENGAGEMENT} columns={3} />
            </DataTable>
            <div className="pt-3">
              <PlaceholderNote />
            </div>
          </SectionCard>
        </section>

        {/* Partnership performance — real data */}
        <SectionCard
          title="Partnership performance"
          description="Live clicks, conversions and revenue for active partners."
          action={<Handshake className="w-4 h-4 text-muted-foreground" />}
        >
          <DataTable headers={["Partner", "Type", "Status", "Placement", "Clicks", "Conv.", "Rate", "Revenue"]}>
            {data && data.partnerships.items.length > 0 ? (
              <DataRows
                rows={data.partnerships.items.map((p) => [
                  p.partner,
                  p.type,
                  <Badge key="status" variant="outline" className="text-[10px] capitalize">{p.status}</Badge>,
                  p.placement ?? NO_DATA,
                  p.clicks,
                  p.conversions,
                  `${p.conversionRate}%`,
                  `$${p.revenueUsd.toFixed(2)}`,
                ])}
              />
            ) : (
              <tr>
                <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  {dataLoading ? "Loading…" : "No partnerships logged yet"}
                </td>
              </tr>
            )}
          </DataTable>
          <div className="pt-3">
            <PlaceholderNote>
              Clicks/conversions update manually in Supabase (Table Editor → partnerships) — Trezor has no reporting API wired in
            </PlaceholderNote>
          </div>
        </SectionCard>

        {/* Monetization */}
        <SectionCard
          title="Monetization"
          description="Affiliate, Pro subscription and sponsorship performance."
          action={<Coins className="w-4 h-4 text-muted-foreground" />}
        >
          <DataTable headers={["Metric", "Value", "Prev. period", "Change"]}>
            <EmptyRows labels={ENGAGEMENT.length ? [
              "Affiliate click-through rate",
              "Affiliate conversion rate",
              "Pro checkout starts",
              "Pro conversion rate",
              "Average revenue per user",
              "Sponsorship impressions",
              "Churn rate",
            ] : []} columns={4} />
          </DataTable>
          <div className="pt-3">
            <PlaceholderNote>Needs checkout funnel + churn tracking to populate</PlaceholderNote>
          </div>
        </SectionCard>

        {/* SEO — real data from GSC snapshots */}
        <SectionCard
          title="SEO"
          description="Latest Google Search Console snapshot, pulled via Supermetrics."
          action={<Percent className="w-4 h-4 text-muted-foreground" />}
        >
          {data?.seo.note ? (
            <PlaceholderNote>{data.seo.note}</PlaceholderNote>
          ) : (
            <DataTable headers={["Date", "Clicks", "Impressions", "Avg. position", "Indexed pages"]}>
              {data && (
                <DataRows
                  rows={[[
                    data.seo.latest?.snapshot_date ?? NO_DATA,
                    data.seo.latest?.clicks ?? NO_DATA,
                    data.seo.latest?.impressions ?? NO_DATA,
                    data.seo.latest?.avg_position ?? NO_DATA,
                    data.seo.latest
                      ? `${data.seo.latest.indexed_pages ?? NO_DATA} / ${data.seo.latest.total_sitemap_pages ?? NO_DATA}`
                      : NO_DATA,
                  ]]}
                />
              )}
            </DataTable>
          )}
        </SectionCard>

        {/* Campaign performance */}
        <SectionCard
          title="Campaign performance"
          description="Per-campaign attribution from UTM-tagged links."
          action={<Activity className="w-4 h-4 text-muted-foreground" />}
        >
          <DataTable
            headers={[
              "Source",
              "Campaign",
              "Visitors",
              "Scans",
              "Conversions",
              "Revenue",
              "ROI",
            ]}
          >
            <tr>
              <td colSpan={7} className="py-10 text-center">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No campaigns tracked yet
                  </p>
                  <PlaceholderNote>
                    Campaign rows appear once UTM attribution is connected
                  </PlaceholderNote>
                </div>
              </td>
            </tr>
          </DataTable>
        </SectionCard>

        {/* Partner outreach pipeline */}
        <SectionCard
          title="Partner pipeline"
          description="Manually tracked outreach status — not performance data."
          action={<Handshake className="w-4 h-4 text-muted-foreground" />}
        >
          <DataTable
            headers={[
              "Partner",
              "Type",
              "Status",
              "Proposed fee",
              "Contacted",
              "Response",
            ]}
          >
            {PIPELINE.map((p) => (
              <tr key={p.name} className="border-b border-border/30 last:border-0">
                <td className="py-2.5 pr-4 text-foreground whitespace-nowrap">{p.name}</td>
                <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{p.type}</td>
                <td className="py-2.5 pr-4">
                  <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground/60">{p.fee}</td>
                <td className="py-2.5 pr-4 text-muted-foreground/60">{NO_DATA}</td>
                <td className="py-2.5 pr-4 text-muted-foreground/60">{NO_DATA}</td>
              </tr>
            ))}
          </DataTable>
          <div className="pt-3">
            <PlaceholderNote>
              Update statuses as outreach progresses — Trezor is already live, shown for reference
            </PlaceholderNote>
          </div>
        </SectionCard>

        <p className="text-[11px] text-muted-foreground/60 text-center pb-4">
          Internal use only. Product, partnership and SEO figures are live from Supabase.
          Site analytics (visitors, sessions, channels, campaigns) remain unwired placeholders.
        </p>
      </main>
    </div>
  );
};

export default AdminMarketing;
