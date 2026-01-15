import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service for AIDyor</h1>
        <p className="text-muted-foreground mb-8">Last updated: [Insert date]</p>

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
              AIDyor is a mobile application designed to provide its features and services "as is" and "as available." 
              We reserve the right to modify, suspend, or discontinue any part of the App at any time without notice.
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
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Email:</strong> [your email address]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
