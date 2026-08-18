/**
 * @fileoverview PRIVATE admin marketing dashboard (/admin/marketing).
 * Access requires an authenticated session AND the backend-verified `admin`
 * role (public.has_role). Not indexed: noindex meta + robots.txt disallow.
 * All metrics render placeholder states — no analytics source is connected yet.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
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
  EmptyChart,
  EmptyRows,
  KpiCard,
  NO_DATA,
  PlaceholderNote,
  SectionCard,
} from "@/components/admin/AdminMarketingUI";

type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "custom", label: "Custom" },
];

const KPIS = [
  { label: "Visitors", icon: Users },
  { label: "Sessions", icon: Activity },
  { label: "Token Scans", icon: ScanLine },
  { label: "Scan Rate", icon: Percent, hint: "Scans / visitors" },
  { label: "Trezor Clicks", icon: MousePointerClick },
  { label: "Affiliate Revenue", icon: Wallet },
  { label: "Pro Revenue", icon: CreditCard },
  { label: "Sponsorship Revenue", icon: Handshake },
  { label: "Total Revenue", icon: Coins, accent: true },
  { label: "Revenue / 1K Visitors", icon: Gauge, accent: true, hint: "RPM" },
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

const MONETIZATION = [
  "Affiliate click-through rate",
  "Affiliate conversion rate",
  "Pro checkout starts",
  "Pro conversion rate",
  "Average revenue per user",
  "Sponsorship impressions",
  "Churn rate",
];

/** Partner outreach pipeline — manually tracked, no metrics invented. */
const PARTNERS = [
  { name: "Trezor", type: "Affiliate", fee: "Rev-share (TBD)" },
  { name: "CertiK", type: "Sponsorship", fee: "TBD" },
  { name: "CoinGecko", type: "Affiliate / Data", fee: "TBD" },
];

const AdminMarketing = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading, unavailable } = useAdminRole();
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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
              Metrics stay empty until an analytics source is connected.
            </p>
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
            </span>
          )}
        </section>

        {/* KPI cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
              Key metrics · {rangeLabel}
            </h2>
            <PlaceholderNote />
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
            <EmptyChart title="Token scans" />
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

        {/* Monetization */}
        <SectionCard
          title="Monetization"
          description="Affiliate, Pro subscription and sponsorship performance."
          action={<Coins className="w-4 h-4 text-muted-foreground" />}
        >
          <DataTable headers={["Metric", "Value", "Prev. period", "Change"]}>
            <EmptyRows labels={MONETIZATION} columns={4} />
          </DataTable>
          <div className="pt-3">
            <PlaceholderNote />
          </div>
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

        {/* Partner pipeline */}
        <SectionCard
          title="Partner pipeline"
          description="Manually tracked outreach status — not analytics data."
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
            {PARTNERS.map((p) => (
              <tr key={p.name} className="border-b border-border/30 last:border-0">
                <td className="py-2.5 pr-4 text-foreground whitespace-nowrap">{p.name}</td>
                <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{p.type}</td>
                <td className="py-2.5 pr-4">
                  <Badge variant="outline" className="text-[10px]">Not contacted</Badge>
                </td>
                <td className="py-2.5 pr-4 text-muted-foreground/60">{p.fee}</td>
                <td className="py-2.5 pr-4 text-muted-foreground/60">{NO_DATA}</td>
                <td className="py-2.5 pr-4 text-muted-foreground/60">{NO_DATA}</td>
              </tr>
            ))}
          </DataTable>
          <div className="pt-3">
            <PlaceholderNote>
              Placeholder pipeline — update statuses once outreach begins
            </PlaceholderNote>
          </div>
        </SectionCard>

        <p className="text-[11px] text-muted-foreground/60 text-center pb-4">
          Internal use only. No analytics integrations are wired into this view;
          all figures are placeholders.
        </p>
      </main>
    </div>
  );
};

export default AdminMarketing;
