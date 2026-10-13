import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent, loadTrackers } from "@/lib/consent";

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (consent === "accepted") loadTrackers();
    else if (consent === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    setConsent("accepted");
    loadTrackers();
    setVisible(false);
  };

  const reject = () => {
    setConsent("rejected");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-[60] p-4"
    >
      <div className="container mx-auto max-w-3xl glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 border border-border/60 bg-background/95 backdrop-blur-xl rounded-xl">
        <p className="text-sm text-muted-foreground flex-1">
          We use analytics and visitor-insight cookies to improve AIDYOR. They
          only load if you accept. See our{" "}
          <Link to="/cookie-policy" className="text-primary underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={reject}>
            Reject
          </Button>
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};