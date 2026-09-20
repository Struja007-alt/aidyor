import { useEffect } from "react";
import { ArrowLeft, Cookie } from "lucide-react";
import { Link } from "react-router-dom";

const CookiePolicy = () => {
  useEffect(() => {
    document.title = "Cookie Policy | AIDYOR";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Cookie className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Cookie Policy</h1>
        </div>

        <p className="text-muted-foreground mb-8">Last updated: September 20, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            This Cookie Policy explains how AIDyor ("we", "our", or "us") uses cookies and similar
            technologies, such as browser local storage, on aidyor.app and our related services.
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. What Are Cookies and Similar Technologies?</h2>
            <p>
              Cookies are small text files stored on your device by a website. Similar technologies
              include browser local storage, which websites use to remember information (such as a
              login session) between visits without sending that information back to a server on
              every request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. What We Actually Use</h2>
            <p>AIDyor's own use of cookies and similar technologies is intentionally minimal:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Essential session storage</strong> — if you create an account, we use your
                browser's local storage to keep you signed in. This is strictly necessary for the
                App to function and cannot be disabled without logging you out.
              </li>
              <li>
                <strong>Vercel Analytics</strong> — we use Vercel's built-in analytics to understand
                overall traffic to aidyor.app. This is a cookieless analytics service; it does not
                set tracking cookies or build a profile of individual visitors.
              </li>
            </ul>
            <p className="mt-2 font-medium">
              We do not use advertising cookies, and we do not use third-party tracking or ad
              networks on aidyor.app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Payment Processing (Stripe)</h2>
            <p>
              When you subscribe to AIDyor Pro or an API plan, you are redirected to a secure
              checkout page hosted by our payment processor, Stripe, at a stripe.com domain. Stripe
              sets its own cookies on its own domain for fraud prevention and payment processing.
              These cookies are set and controlled by Stripe, not by AIDyor. You can review Stripe's
              practices in{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe's Privacy Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Your Choices</h2>
            <p>
              Because AIDyor does not use advertising or non-essential tracking cookies, there is
              nothing to opt out of on our side. You can still control cookies generally through
              your browser settings; note that clearing your browser's local storage will log you
              out of AIDyor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Changes to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy if the technologies we use change. Any changes will
              be posted on this page with an updated "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Cookie Policy, please contact us at api@aidyor.app.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/privacy-policy" className="text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-primary hover:text-primary/80 transition-colors">
              Terms of Service
            </Link>
            <Link to="/disclaimer" className="text-primary hover:text-primary/80 transition-colors">
              Disclaimer
            </Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} AIDyor. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
