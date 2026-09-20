import { useEffect } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "Privacy Policy | AIDYOR";
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
          <Lock className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-muted-foreground mb-8">Last updated: September 20, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            AIDyor ("we", "our", or "us") respects your privacy and is committed to protecting it.
            This Privacy Policy explains how AIDyor ("the App"), including the AIDYOR API used by
            our business ("B2B") customers, collects, uses, and safeguards information.
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>

            <h3 className="text-lg font-medium mt-4 mb-2">a. Account Information</h3>
            <p>
              If you create an AIDyor account, we collect your email address and a securely hashed
              password (or passkey credential, if you use passkey sign-in). We use this to authenticate
              you and manage your account, including subscription status.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">b. Business / API Customer Information</h3>
            <p>If you sign up for API access, we additionally collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Company or project name, and a business contact email</li>
              <li>Your chosen plan tier and API usage volume (number of calls, timestamps of use)</li>
              <li>
                Billing information processed through Stripe, our payment processor. We do not
                receive or store your full card number; we retain only a Stripe customer ID,
                subscription ID, and billing history metadata (such as amounts and dates)
              </li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">c. Scan Data</h3>
            <p>
              When you scan a token address, we process the wallet/contract address and network you
              submit in order to return a risk analysis. We do not treat blockchain addresses as
              personal information, as they are public, pseudonymous identifiers on public
              blockchains.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">d. Messaging Platforms</h3>
            <p>
              If you use our Telegram bot, we receive your Telegram user ID and chat ID, which are
              required by Telegram's platform for the bot to respond to you. We do not receive your
              phone number or other Telegram profile details beyond what Telegram provides to any bot
              you interact with.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">e. Non-Personal / Technical Information</h3>
            <p>We may automatically collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Device type, browser, and operating system</li>
              <li>App usage data (features used, error/crash logs)</li>
              <li>IP address, primarily for security, rate-limiting, and abuse prevention</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Information</h2>
            <p>The information collected is used to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Operate, maintain, and secure the App and API</li>
              <li>Authenticate you and manage your account or API subscription</li>
              <li>Process payments and bill for API usage, including overage charges</li>
              <li>Enforce API rate limits and detect abuse</li>
              <li>Improve features, performance, and fix bugs</li>
              <li>Respond to support requests</li>
            </ul>
            <p className="mt-2 font-medium">We do not sell or rent your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Third-Party Services We Use</h2>
            <p>
              We rely on the following third parties to operate AIDyor. Each processes data under
              its own privacy policy:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Supabase</strong> — our database, authentication, and backend infrastructure
                provider (data hosted in the EU)
              </li>
              <li>
                <strong>Stripe</strong> — our payment processor for subscriptions and billing
              </li>
              <li>
                <strong>Google (Gemini API)</strong> — used for AI-assisted risk analysis and OCR;
                scan inputs may be sent to Google's API to generate a response
              </li>
              <li>
                <strong>Cloudflare</strong> — DNS, hosting infrastructure, and email routing
              </li>
              <li>
                Public blockchain security data providers (such as GoPlus, RugCheck, DexScreener,
                and Unicrypt), used to source token security signals. These do not receive personal
                information from us, only the token address being scanned
              </li>
            </ul>
            <p className="mt-2">
              Some of these providers are located outside the European Economic Area (EEA),
              including in the United States. Where this occurs, we rely on that provider's own
              legal safeguards for international data transfers (such as Standard Contractual
              Clauses or an equivalent framework).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Retention</h2>
            <p>
              We retain account and billing information for as long as your account or subscription
              is active, and for a reasonable period afterward to comply with tax, accounting, and
              legal obligations. API usage records are retained to support billing history and
              dispute resolution. You may request deletion of your account as described in Section 6
              below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Security</h2>
            <p>
              We use commercially reasonable technical measures to protect your information,
              including encrypted storage of credentials and access controls on our infrastructure.
              However, no method of electronic transmission or storage is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access, correct, delete, or
              export the personal data we hold about you, and to object to or restrict certain
              processing. To exercise any of these rights, contact us at the email below. If you are
              located in the European Economic Area, you also have the right to lodge a complaint
              with your local data protection supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Children's Privacy</h2>
            <p>
              AIDyor does not knowingly collect data from children under the age of 13. If you
              believe a child has provided personal information to us, please contact us and we
              will remove it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on
              this page with an updated revision date, and you are advised to review it periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, or wish to exercise
              your data rights, please contact us at api@aidyor.app.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/terms-of-service" className="text-primary hover:text-primary/80 transition-colors">
              Terms of Service
            </Link>
            <Link to="/cookie-policy" className="text-primary hover:text-primary/80 transition-colors">
              Cookie Policy
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

export default PrivacyPolicy;
