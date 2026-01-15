import { ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
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
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Terms of Service</h1>
        </div>
        
        <p className="text-muted-foreground mb-8">Last updated: January 15, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            By downloading, accessing, or using AIDyor ("the App"), you agree to comply with and be bound 
            by these Terms of Service ("Terms"). If you do not agree with these Terms, please do not use the App.
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By using AIDyor, you confirm that you have read, understood, and agreed to these Terms. 
              These Terms apply to all users of the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p>
              AIDyor is an application designed to provide cryptocurrency analysis and risk assessment tools 
              "as is" and "as available." We reserve the right to modify, suspend, or discontinue any part 
              of the App at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use AIDyor only for lawful purposes</li>
              <li>Not misuse, modify, reverse engineer, or attempt to disrupt the App</li>
              <li>Not use the App for harmful, abusive, illegal, or unauthorized activities</li>
            </ul>
            <p className="mt-2 font-medium">You are solely responsible for your use of the App.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. Intellectual Property</h2>
            <p>
              All content, features, logos, and functionality of AIDyor are the exclusive property of the app owner 
              and are protected by applicable copyright and intellectual property laws.
            </p>
            <p className="mt-2">
              You may not copy, distribute, or exploit any part of the App without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. User-Generated Content (If Applicable)</h2>
            <p>If AIDyor allows you to input, upload, or generate content:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>You retain ownership of your content</li>
              <li>You grant AIDyor a limited license to use the content solely to provide app functionality</li>
              <li>You are responsible for ensuring your content does not violate laws or third-party rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. Disclaimer of Warranties</h2>
            <p>
              AIDyor is provided "as is" and "as available" without warranties of any kind, either express or implied.
            </p>
            <p className="mt-2">We do not guarantee that:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>The App will always function without errors</li>
              <li>The App will meet your expectations</li>
              <li>Any information provided is fully accurate or reliable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, AIDyor and its developers shall not be liable for any 
              direct, indirect, incidental, or consequential damages arising from:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use or inability to use the App</li>
              <li>Data loss</li>
              <li>App interruptions or errors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate access to AIDyor at any time if you violate 
              these Terms or misuse the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Any changes will be effective immediately upon posting. 
              Continued use of AIDyor after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and interpreted in accordance with applicable laws, 
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us through the app.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/privacy-policy" className="text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
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

export default TermsOfService;
