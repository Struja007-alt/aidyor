/**
 * @fileoverview Presentational building blocks for the private admin
 * marketing dashboard. No data fetching happens here — every component
 * renders an explicit "no data source connected" placeholder state.
 */
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

/** Marker used everywhere a real metric would go once data is wired up. */
export const NO_DATA = "—";

export const PlaceholderNote = ({ children }: { children?: ReactNode }) => (
  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
    <Database className="w-3 h-3 shrink-0" />
    {children ?? "No data source connected"}
  </p>
);

interface KpiCardProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent?: boolean;
}

export const KpiCard = ({ label, icon: Icon, hint, accent }: KpiCardProps) => (
  <div
    className={cn(
      "glass-card p-4 flex flex-col gap-2",
      accent && "border-primary/40",
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Icon className={cn("w-4 h-4", accent ? "text-primary" : "text-muted-foreground")} />
    </div>
    <p className="font-display text-2xl font-bold text-foreground leading-none">
      {NO_DATA}
    </p>
    <p className="text-[11px] text-muted-foreground/70">{hint ?? "Awaiting data source"}</p>
  </div>
);

export const SectionCard = ({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) => (
  <Card className="glass-card border-border/50">
    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
      <div className="space-y-1">
        <CardTitle className="font-display text-base">{title}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

/** Empty table body shown until an analytics source is connected. */
export const EmptyRows = ({
  labels,
  columns,
}: {
  labels: string[];
  columns: number;
}) => (
  <>
    {labels.map((label) => (
      <tr key={label} className="border-b border-border/30 last:border-0">
        <td className="py-2.5 pr-4 text-foreground whitespace-nowrap">{label}</td>
        {Array.from({ length: columns - 1 }).map((_, i) => (
          <td key={i} className="py-2.5 pr-4 text-muted-foreground/60 tabular-nums">
            {NO_DATA}
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const DataTable = ({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) => (
  <div className="overflow-x-auto -mx-2 px-2">
    <table className="w-full text-xs min-w-[560px]">
      <thead>
        <tr className="border-b border-border/50 text-left">
          {headers.map((h) => (
            <th
              key={h}
              className="py-2 pr-4 font-medium uppercase tracking-wide text-[10px] text-muted-foreground whitespace-nowrap"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

/** Placeholder chart frame — intentionally renders no invented series. */
export const EmptyChart = ({ title }: { title: string }) => (
  <div className="glass-card p-4 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-foreground">{title}</span>
      <Badge variant="outline" className="text-[10px]">No data</Badge>
    </div>
    <div className="relative h-32 rounded-lg border border-dashed border-border/60 bg-secondary/20 overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative h-full flex items-center justify-center">
        <PlaceholderNote>Connect analytics to plot this trend</PlaceholderNote>
      </div>
    </div>
  </div>
);
