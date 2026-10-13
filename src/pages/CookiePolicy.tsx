import { useEffect } from "react";
import { ArrowLeft, Cookie } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "aidyor_cookie_consent";

const CookiePolicy = () => {
  useEffect(() => {
    document.title = "Cookie Policy | AIDYOR";
  }, []);

  const resetChoice = () => {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch {
      // storage unavailable
    }
    window.location.href = "/";
  };

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

        <p className="text-muted-foreground mb-8">Last updated: October 14, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            This Cookie Policy explains how AIDYOR ("we", "our", or "us") uses cookies and
            similar technologies when you visit aidyor.app.
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device. Similar technologies include
              local storage and tracking scripts. They are used to remember preferences,
              keep you signed in, and understand how a website is used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Strictly Necessary Storage</h2>
            <p>
              These are required for the site to work and do not need consent. They are not used
              for advertising or tracking:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Storing your cookie choice (accepted or rejected) in your browser</li>
              <li>Keeping you signed in if you create an account</li>
              <li>Processing payments securely if you subscribe (Stripe)</li>
              <li>Basic hosting and security functions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Optional Cookies (Only With Your Consent)</h2>
            <p>
              The services below are loaded <strong>only after you click "Accept"</strong> on our
              cookie banner. If you reject, they are not loaded.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <strong>Google Analytics</strong> (Google LLC): measures how visitors use the
                site, such as pages viewed and approximate location, so we can improve it.
              </li>
              <li>
                <strong>Alphie</strong> (Alphie, meetalphie.com): a visitor-insight tool that may
                process your IP address and browsing activity to identify the organization
                visiting the site, and to enable live chat and follow-up if you contact us.
              </li>
            </ul>
            <p className="mt-2">
              These providers may process data on servers outside the European Economic Area.
              Please review their own privacy policies for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Legal Basis</h2>
            <p>
              We rely on your consent for optional cookies and similar technologies. Strictly
              necessary storage is based on our legitimate interest in operating a secure,
              working service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Your Choices</h2>
            <p>You can change or withdraw your consent at any time:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the button below to see the cookie banner again</li>
              <li>Delete cookies and site data in your browser settings</li>
              <li>Use Google's opt-out tools for Google Analytics</li>
            </ul>
            <div className="mt-4">
              <Button variant="outline" onClick={resetChoice}>
                Change cookie choice
              </Button>
            </div>
            <p className="mt-4">
              Rejecting optional cookies does not limit your use of the scanner. Withdrawing
              consent does not affect processing that happened before withdrawal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p>
              Under GDPR you have rights of access, correction, deletion, and objection regarding
              your personal data. You may also lodge a complaint with your local data protection
              authority; in Croatia this is the Personal Data Protection Agency (AZOP).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Changes to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Changes will be posted on this
              page with an updated "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Contact Us</h2>
            <p>
              Questions about this policy? Email us at{" "}
              <a
                href="mailto:aidyor.app@gmail.com"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                aidyor.app@gmail.com
              </a>
              .
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
          <p className="mt-4">© {new Date().getFullYear()} AIDYOR. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;