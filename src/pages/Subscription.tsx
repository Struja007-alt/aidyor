import { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Crown, Zap, Anchor, RefreshCw, ExternalLink, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Subscription() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    status, 
    loading, 
    checkSubscription, 
    startCheckout, 
    openCustomerPortal,
    isPro,
    isWhalePro 
  } = useStripeSubscription();

  // Handle success/canceled redirects
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated! Welcome to Pro.');
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was canceled.');
    }
  }, [searchParams, checkSubscription]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/subscription');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scanner
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Subscription Plans</h1>
              <p className="text-muted-foreground mt-1">
                Choose the plan that fits your trading needs
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => checkSubscription()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </div>

        {/* Current Status */}
        {status && (status.has_pro || status.has_whale_pro) && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Your Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {status.has_pro && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Badge variant="default">Pro</Badge>
                    <span className="text-muted-foreground">
                      Renews {formatDate(status.pro_subscription_end)}
                    </span>
                  </span>
                </div>
              )}
              {status.has_whale_pro && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">Whale Pro</Badge>
                    <span className="text-muted-foreground">
                      Renews {formatDate(status.whale_pro_subscription_end)}
                    </span>
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={openCustomerPortal}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Free Tier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Free
              </CardTitle>
              <CardDescription>Get started with basic scanning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  10 token scans per day
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Basic security analysis
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  5 whale alerts per hour
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Live security news feed
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className={isPro ? 'border-primary ring-2 ring-primary/20' : 'border-primary'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Pro
                </CardTitle>
                {isPro && <Badge>Active</Badge>}
              </div>
              <CardDescription>Unlimited scanning for serious traders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <strong>Unlimited</strong> token scans
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  AI-powered risk explanations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Priority API access
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Cloud watchlist sync
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Email support
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {isPro ? (
                <Button variant="outline" className="w-full" onClick={openCustomerPortal}>
                  Manage Plan
                </Button>
              ) : (
                <Button className="w-full" onClick={() => startCheckout('pro')}>
                  Subscribe to Pro
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Whale Pro Add-on */}
          <Card className={isWhalePro ? 'border-secondary ring-2 ring-secondary/20' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Anchor className="h-5 w-5 text-blue-500" />
                  Whale Pro
                </CardTitle>
                {isWhalePro && <Badge variant="secondary">Active</Badge>}
              </div>
              <CardDescription>Add-on for Pro subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">$49<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <strong>Unlimited</strong> whale alerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Real-time push notifications
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Whale wallet tracking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Historical whale data
                </li>
                <li className="flex items-center gap-2 text-muted-foreground text-xs">
                  Requires active Pro subscription
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              {isWhalePro ? (
                <Button variant="outline" className="w-full" onClick={openCustomerPortal}>
                  Manage Plan
                </Button>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full" 
                  onClick={() => startCheckout('whale_pro')}
                  disabled={!isPro}
                >
                  {isPro ? 'Add Whale Pro' : 'Pro Required'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <Separator className="my-8" />

        {/* Alternative: Telegram */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Prefer to pay via Telegram? Use our bot for the same subscription options.
          </p>
          <Button variant="outline" asChild>
            <a href="https://t.me/aidyor_bot" target="_blank" rel="noopener noreferrer">
              <Send className="h-4 w-4 mr-2" />
              Subscribe via Telegram
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
