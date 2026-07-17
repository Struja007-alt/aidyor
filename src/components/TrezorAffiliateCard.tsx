import { Shield, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const TREZOR_AFFILIATE_URL =
  "https://affil.trezor.io/aff_c?offer_id=352&aff_id=846443";

interface TrezorAffiliateCardProps {
  mergedScore: number;
}

export function TrezorAffiliateCard({ mergedScore }: TrezorAffiliateCardProps) {
  const tier =
    mergedScore >= 70 ? "low" : mergedScore >= 50 ? "medium" : "high";

  const copy = {
    low: {
      heading: "Even safe tokens deserve a safe wallet",
      body: "This one looks clean, but approvals and hot wallets are still the #1 way funds get drained. A hardware wallet keeps your keys offline, permanently.",
    },
    medium: {
      heading: "Reduce your exposure",
      body: "Mixed signals like this are exactly when a hardware wallet matters most — it keeps signing offline so a bad approval can't silently drain your funds.",
    },
    high: {
      heading: "This is a good time to check your wallet setup",
      body: "High-risk tokens are often how wallets get drained via malicious approvals. A hardware wallet like Trezor keeps your private keys offline no matter what you interact with.",
    },
  }[tier];

  const handleClick = () => {
    window.open(TREZOR_AFFILIATE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border mt-4",
        tier === "low" && "bg-safe/5 border-safe/20",
        tier === "medium" && "bg-warning/5 border-warning/20",
        tier === "high" && "bg-danger/5 border-danger/20"
      )}
    >
      <div className="flex items-start gap-3">
        <Shield
          className={cn(
            "w-5 h-5 shrink-0 mt-0.5",
            tier === "low" && "text-safe",
            tier === "medium" && "text-warning",
            tier === "high" && "text-danger"
          )}
        />
        <div className="flex-1">
          <h3 className="text-sm font-medium">{copy.heading}</h3>
          <p className="text-xs text-muted-foreground mt-1">{copy.body}</p>
          <button
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-primary hover:opacity-80"
          >
            Check Trezor hardware wallets
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <p className="text-[10px] text-muted-foreground/70 mt-2">
            Affiliate link — AIDYOR may earn a commission if you buy through this link, at no extra cost to you.
          </p>
        </div>
      </div>
    </div>
  );
}