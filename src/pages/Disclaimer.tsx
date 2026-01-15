import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const Disclaimer = () => {
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
          <AlertTriangle className="w-8 h-8 text-warning" />
          <h1 className="text-3xl md:text-4xl font-bold">Disclaimer</h1>
        </div>
        
        <p className="text-muted-foreground mb-8">Last updated: January 15, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <p>
            Please read this disclaimer carefully before using AIDyor ("the App"). By accessing or using 
            the App, you acknowledge that you have read, understood, and agree to be bound by this disclaimer.
          </p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">1. No Financial Advice</h2>
            <p>
              AIDyor is a cryptocurrency analysis tool that provides automated risk assessments, token scanning, 
              and informational data about blockchain assets. The information provided by AIDyor is for
              <strong> informational and educational purposes only</strong>.
            </p>
            <p className="mt-2 font-medium">
              Nothing in this App constitutes financial, investment, legal, or tax advice. We do not recommend 
              buying, selling, or holding any cryptocurrency or digital asset.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">2. Do Your Own Research (DYOR)</h2>
            <p>
              The name "AIDyor" reflects our core philosophy: <strong>AI-assisted Do Your Own Research</strong>. 
              While we provide automated analysis tools to help you evaluate tokens and projects, you are solely 
              responsible for conducting your own due diligence before making any investment decisions.
            </p>
            <p className="mt-2">
              Our risk scores, warnings, and analysis are generated using algorithms and third-party data sources. 
              They should be used as one of many tools in your research process, not as the sole basis for any decision.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">3. No Guarantees of Accuracy</h2>
            <p>
              While we strive to provide accurate and up-to-date information, we make no representations or 
              warranties of any kind, express or implied, about the completeness, accuracy, reliability, or 
              suitability of the information provided.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Data is sourced from third-party APIs and blockchain networks</li>
              <li>Information may be delayed, incomplete, or contain errors</li>
              <li>Risk assessments are algorithmic and may not capture all risks</li>
              <li>Market conditions can change rapidly and unpredictably</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">4. High-Risk Nature of Cryptocurrency</h2>
            <p>
              Cryptocurrency and digital asset investments carry significant risks, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Extreme price volatility</li>
              <li>Potential total loss of investment</li>
              <li>Scams, rug pulls, and fraudulent projects</li>
              <li>Regulatory uncertainty and legal risks</li>
              <li>Technical vulnerabilities and smart contract risks</li>
              <li>Liquidity risks and market manipulation</li>
            </ul>
            <p className="mt-2 font-medium">
              You should only invest what you can afford to lose entirely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, AIDyor and its developers, affiliates, and 
              partners shall not be liable for any direct, indirect, incidental, special, consequential, or 
              punitive damages arising from:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Your use of or reliance on information provided by the App</li>
              <li>Any investment decisions you make based on our analysis</li>
              <li>Errors, omissions, or inaccuracies in the data</li>
              <li>Loss of funds, profits, or data</li>
              <li>Unauthorized access to or alteration of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">6. No Endorsement</h2>
            <p>
              The inclusion of any token, project, or game in our analysis does not constitute an endorsement 
              or recommendation. We scan and analyze projects regardless of their legitimacy, and a low risk 
              score does not guarantee that a project is safe or profitable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">7. Third-Party Data</h2>
            <p>
              AIDyor relies on data from third-party sources including blockchain explorers, DEX aggregators, 
              and security APIs. We do not control and are not responsible for the accuracy or availability 
              of this third-party data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">8. Consult Professionals</h2>
            <p>
              Before making any financial decisions, we strongly recommend consulting with qualified 
              financial advisors, tax professionals, and legal counsel who understand your specific 
              situation and local regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">9. Changes to This Disclaimer</h2>
            <p>
              We reserve the right to modify this disclaimer at any time. Changes will be effective 
              immediately upon posting. Continued use of the App constitutes acceptance of the updated disclaimer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">10. Contact Us</h2>
            <p>
              If you have any questions about this disclaimer, please contact us through the app.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/transparency" className="text-primary hover:text-primary/80 transition-colors">
              Transparency
            </Link>
            <Link to="/privacy-policy" className="text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="text-primary hover:text-primary/80 transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} AIDyor. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
