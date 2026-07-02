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
        
        <p className="text-muted-foreground mb-8">Last updated: January 15, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            This Cookie Policy explains how AIDyor ("we", "our", or "us") uses cookies and similar 
            technologies when you use our application or related services.
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device that help improve user experience by 
              remembering preferences and providing usage analytics. Similar technologies may include 
              local storage, SDKs, or tracking pixels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Does AIDyor Use Cookies?</h2>
            <p>
              AIDyor does not directly use traditional browser cookies within the application.
            </p>
            <p className="mt-2">
              However, third-party services integrated into the app (such as analytics or advertising providers) 
              may use cookies or similar technologies to collect non-personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. How Cookies and Similar Technologies Are Used</h2>
            <p>When applicable, cookies or similar technologies may be used to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Analyze app usage and performance</li>
              <li>Improve functionality and user experience</li>
              <li>Provide aggregated analytics</li>
              <li>Serve relevant advertisements (if ads are enabled)</li>
            </ul>
            <p className="mt-2 font-medium">
              No personally identifiable information is collected through these technologies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Third-Party Services</h2>
            <p>
              AIDyor may use third-party services that collect information using cookies or similar 
              technologies under their own privacy policies.
            </p>
            <p className="mt-2">Common examples include:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Google Play Services</li>
              <li>Google Analytics for Firebase</li>
              <li>Ad services (such as AdMob, if enabled)</li>
            </ul>
            <p className="mt-2">
              You are encouraged to review their respective privacy and cookie policies for more details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Your Choices</h2>
            <p>You can manage or disable cookies through:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your device settings</li>
              <li>Google Ads settings (for personalized ads)</li>
              <li>App permission controls</li>
            </ul>
            <p className="mt-2">
              Disabling cookies or tracking technologies may affect certain features or functionality of the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Changes to This Cookie Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. Any changes will be posted on this page 
              with an updated "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Contact Us</h2>
            <p>
              If you have any questions about this Cookie Policy, please contact us through the app.
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
