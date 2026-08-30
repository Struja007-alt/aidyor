import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Code, Key, Zap, BarChart3, Copy, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * API Documentation page with interactive code examples
 */
const ApiDocs = () => {
  useEffect(() => {
    document.title = "API Documentation | AIDYOR";
  }, []);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const baseUrl = "https://lerromdxykuydrpttfif.supabase.co/functions/v1/api-token-scan";

  const codeSnippets = {
    scan: {
      curl: `curl -X POST "${baseUrl}/scan" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"address": "0x6982508145454Ce325dDbE47a25d4ec3d2311933", "network": "eth"}'`,
      javascript: `const response = await fetch("${baseUrl}/scan", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    network: "eth"
  })
});

const result = await response.json();
console.log(result.data.riskScore);`,
      python: `import requests

response = requests.post(
    "${baseUrl}/scan",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "YOUR_API_KEY"
    },
    json={
        "address": "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
        "network": "eth"
    }
)

result = response.json()
print(result["data"]["riskScore"])`
    },
    usage: {
      curl: `curl -X GET "${baseUrl}/usage" \\
  -H "x-api-key: YOUR_API_KEY"`,
      javascript: `const response = await fetch("${baseUrl}/usage", {
  headers: {
    "x-api-key": "YOUR_API_KEY"
  }
});

const usage = await response.json();
console.log(\`Used: \${usage.current_period.scans_used} / \${usage.plan.monthly_limit}\`);`,
      python: `import requests

response = requests.get(
    "${baseUrl}/usage",
    headers={"x-api-key": "YOUR_API_KEY"}
)

usage = response.json()
print(f"Used: {usage['current_period']['scans_used']} / {usage['plan']['monthly_limit']}")`
    },
    plans: {
      curl: `curl -X GET "${baseUrl}/plans"`,
      javascript: `const response = await fetch("${baseUrl}/plans");
const { plans } = await response.json();

plans.forEach(plan => {
  console.log(\`\${plan.name}: \${plan.price} - \${plan.monthly_scan_limit} scans/month\`);
});`,
      python: `import requests

response = requests.get("${baseUrl}/plans")
plans = response.json()["plans"]

for plan in plans:
    print(f"{plan['name']}: {plan['price']} - {plan['monthly_scan_limit']} scans/month")`
    }
  };

  const CodeBlock = ({ code, language, id }: { code: string; language: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-foreground">{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedSnippet === id ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scanner
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Code className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">API Documentation</h1>
              <p className="text-muted-foreground">Integrate AIDYOR token scanning into your applications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">REST API</Badge>
            <Badge variant="outline">JSON</Badge>
            <Badge variant="secondary">v1.0.0</Badge>
          </div>
        </div>

        {/* Quick Start */}
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Start
            </CardTitle>
            <CardDescription>Get started with the AIDYOR API in minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="font-semibold mb-1">1. Get API Key</div>
                <p className="text-sm text-muted-foreground">Contact us to receive your API credentials</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="font-semibold mb-1">2. Choose a Plan</div>
                <p className="text-sm text-muted-foreground">Select Starter, Growth, or Enterprise</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="font-semibold mb-1">3. Start Scanning</div>
                <p className="text-sm text-muted-foreground">Make API calls to analyze tokens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              All API requests (except <code className="bg-muted px-1 rounded">/plans</code>) require authentication 
              using your API key in the <code className="bg-muted px-1 rounded">x-api-key</code> header.
            </p>
            <div className="bg-muted/50 border rounded-lg p-4">
              <code className="text-sm">x-api-key: aidyor_sk_your_api_key_here</code>
            </div>
            <p className="text-sm text-muted-foreground">
              ⚠️ Keep your API key secure. Never expose it in client-side code or public repositories.
            </p>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pricing Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="font-semibold text-lg">Starter</div>
                <div className="text-2xl font-bold text-primary">$49<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <Separator className="my-3" />
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>✓ 1,000 API calls/month</li>
                  <li>✓ $0.01/scan overage</li>
                  <li>✓ All endpoints</li>
                  <li>✓ Email support</li>
                </ul>
              </div>
              <div className="p-4 border-2 border-primary rounded-lg relative">
                <Badge className="absolute -top-2 right-2">Popular</Badge>
                <div className="font-semibold text-lg">Growth</div>
                <div className="text-2xl font-bold text-primary">$99<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <Separator className="my-3" />
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>✓ 5,000 API calls/month</li>
                  <li>✓ $0.01/scan overage</li>
                  <li>✓ All endpoints</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-semibold text-lg">Enterprise</div>
                <div className="text-2xl font-bold text-primary">$199<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <Separator className="my-3" />
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>✓ 25,000 API calls/month</li>
                  <li>✓ $0.01/scan overage</li>
                  <li>✓ All endpoints</li>
                  <li>✓ Dedicated support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Endpoints</h2>

          {/* POST /scan */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">POST</Badge>
                <code className="text-lg font-mono">/scan</code>
              </div>
              <CardDescription>Scan a token address for security risks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
                <div className="bg-muted/50 border rounded-lg p-4 text-sm">
                  <pre>{`{
  "address": "string (required) - Token contract address",
  "network": "string (optional) - eth, bsc, polygon, arbitrum, base, optimism, avalanche, solana"
}`}</pre>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <div className="bg-muted/50 border rounded-lg p-4 text-sm overflow-x-auto">
                  <pre>{`{
  "success": true,
  "data": {
    "riskScore": 72,
    "riskLevel": "MEDIUM",
    "tokenInfo": { "name": "Pepe", "symbol": "PEPE" },
    "securityFlags": { "isHoneypot": false, "buyTax": 0, "sellTax": 0 },
    "marketData": { "price": 0.00001234, "liquidity": 50000000 }
  },
  "usage": {
    "scans_this_period": 42,
    "plan_limit": 1000,
    "remaining": 958,
    "is_overage": false
  }
}`}</pre>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Code Examples</h4>
                <Tabs defaultValue="curl">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <CodeBlock code={codeSnippets.scan.curl} language="bash" id="scan-curl" />
                  </TabsContent>
                  <TabsContent value="javascript">
                    <CodeBlock code={codeSnippets.scan.javascript} language="javascript" id="scan-js" />
                  </TabsContent>
                  <TabsContent value="python">
                    <CodeBlock code={codeSnippets.scan.python} language="python" id="scan-py" />
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* GET /usage */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500">GET</Badge>
                <code className="text-lg font-mono">/usage</code>
              </div>
              <CardDescription>Get current billing period usage statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Response</h4>
                <div className="bg-muted/50 border rounded-lg p-4 text-sm overflow-x-auto">
                  <pre>{`{
  "plan": {
    "tier": "starter",
    "name": "Starter",
    "monthly_limit": 1000,
    "overage_rate": "$0.01/scan"
  },
  "current_period": {
    "start": "2024-01-01",
    "scans_used": 42,
    "overage_scans": 0,
    "remaining": 958,
    "estimated_overage_charge": "$0.00"
  }
}`}</pre>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Code Examples</h4>
                <Tabs defaultValue="curl">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <CodeBlock code={codeSnippets.usage.curl} language="bash" id="usage-curl" />
                  </TabsContent>
                  <TabsContent value="javascript">
                    <CodeBlock code={codeSnippets.usage.javascript} language="javascript" id="usage-js" />
                  </TabsContent>
                  <TabsContent value="python">
                    <CodeBlock code={codeSnippets.usage.python} language="python" id="usage-py" />
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* GET /plans */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-500">GET</Badge>
                <code className="text-lg font-mono">/plans</code>
                <Badge variant="outline">Public</Badge>
              </div>
              <CardDescription>List available API plans (no authentication required)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Code Examples</h4>
                <Tabs defaultValue="curl">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <CodeBlock code={codeSnippets.plans.curl} language="bash" id="plans-curl" />
                  </TabsContent>
                  <TabsContent value="javascript">
                    <CodeBlock code={codeSnippets.plans.javascript} language="javascript" id="plans-js" />
                  </TabsContent>
                  <TabsContent value="python">
                    <CodeBlock code={codeSnippets.plans.python} language="python" id="plans-py" />
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Handling */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Error Handling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Status Code</th>
                    <th className="text-left py-2 px-4">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>200</code></td>
                    <td className="py-2 px-4 text-muted-foreground">Success</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>400</code></td>
                    <td className="py-2 px-4 text-muted-foreground">Bad Request - Missing or invalid parameters</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>401</code></td>
                    <td className="py-2 px-4 text-muted-foreground">Unauthorized - Invalid or missing API key</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>404</code></td>
                    <td className="py-2 px-4 text-muted-foreground">Not Found - Unknown endpoint</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4"><code>500</code></td>
                    <td className="py-2 px-4 text-muted-foreground">Internal Server Error</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limits */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Rate Limits & Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              API calls are tracked per billing period (monthly). When you exceed your plan's limit, 
              additional scans are charged at $0.01 per scan (overage). There are no hard rate limits - 
              you can make as many calls as needed, and overage is billed at the end of the period.
            </p>
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm">
                💡 <strong>Tip:</strong> Use the <code>/usage</code> endpoint to monitor your consumption 
                and avoid unexpected overage charges.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Supported Networks */}
        <Card className="mt-6 mb-8">
          <CardHeader>
            <CardTitle>Supported Networks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["eth", "bsc", "polygon", "arbitrum", "base", "optimism", "avalanche", "solana", "fantom"].map((network) => (
                <Badge key={network} variant="secondary" className="text-sm">
                  {network.toUpperCase()}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              If no network is specified, the API will attempt to auto-detect the chain based on the address format.
            </p>
          </CardContent>
        </Card>

        {/* Footer Navigation */}
        <Separator className="my-8" />
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link to="/faq" className="hover:text-foreground flex items-center gap-1">
            FAQ <ExternalLink className="h-3 w-3" />
          </Link>
          <Link to="/terms-of-service" className="hover:text-foreground flex items-center gap-1">
            Terms of Service <ExternalLink className="h-3 w-3" />
          </Link>
          <Link to="/privacy-policy" className="hover:text-foreground flex items-center gap-1">
            Privacy Policy <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
