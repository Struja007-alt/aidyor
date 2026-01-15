import { ArrowLeft, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
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
        
        <p className="text-muted-foreground mb-8">Last updated: January 15, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            AIDyor ("we", "our", or "us") respects your privacy and is committed to protecting it. 
            This Privacy Policy explains how our application AIDyor ("the App") collects, uses, 
            and safeguards information when you use it.
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-lg font-medium mt-4 mb-2">a. Personal Information</h3>
            <p>
              AIDyor does not collect personally identifiable information such as name, email address, 
              phone number, or physical address unless explicitly stated or required for a specific feature.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">b. Non-Personal Information</h3>
            <p>We may collect non-personal information automatically, including but not limited to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Device type and model</li>
              <li>Operating system version</li>
              <li>App usage data (features used, crash logs)</li>
            </ul>
            <p className="mt-2">This information is used only to improve app performance and user experience.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Information</h2>
            <p>The information collected is used to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Operate and maintain the App</li>
              <li>Improve features and performance</li>
              <li>Analyze usage trends</li>
              <li>Fix bugs and crashes</li>
            </ul>
            <p className="mt-2 font-medium">We do not sell, trade, or rent user data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. Permissions Used</h2>
            <p>
              AIDyor may request certain permissions (such as internet access or storage) only when 
              required for core app functionality. These permissions are used strictly for their intended purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Third-Party Services</h2>
            <p>
              AIDyor may use third-party services (such as Google Play Services, analytics tools, or ad providers) 
              that may collect information used to identify you.
            </p>
            <p className="mt-2">
              These services operate under their own privacy policies. We recommend reviewing them:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li>
                <a 
                  href="https://policies.google.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Play Services
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Security</h2>
            <p>
              We value your trust and strive to use commercially acceptable means to protect your information. 
              However, no method of electronic transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Children's Privacy</h2>
            <p>
              AIDyor does not knowingly collect data from children under the age of 13. If you believe your 
              child has provided personal information, please contact us and we will remove it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page, 
              and you are advised to review it periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact us through the app.
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
