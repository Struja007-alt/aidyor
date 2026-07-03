/**
 * @fileoverview Main App component with optimized React Query configuration
 * CoinGecko prefetch is called at module level for immediate loading
 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { prefetchCoinGeckoTokens } from "@/lib/api/coingecko";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const Transparency = lazy(() => import("./pages/Transparency"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Glossary = lazy(() => import("./pages/Glossary"));
const GlossaryTerm = lazy(() => import("./pages/GlossaryTerm"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Subscription = lazy(() => import("./pages/Subscription"));
const OCRDashboard = lazy(() => import("./pages/OCRDashboard"));

/**
 * Optimized QueryClient configuration for better caching and performance
 * 
 * @description
 * - staleTime: 2 minutes - Data is considered fresh, prevents unnecessary refetches
 * - gcTime: 10 minutes - Cached data retained for faster navigation
 * - refetchOnWindowFocus: false - Prevents refetch on tab switch (crypto data updates via manual scan)
 * - retry: 2 - Limited retries for failed requests (external APIs may rate limit)
 * - retryDelay: Exponential backoff starting at 1s
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnReconnect: true, // Refetch when connection restored
      retry: 2, // Limit retries for rate-limited APIs
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Pre-fetch CoinGecko token list on app load for faster original detection
prefetchCoinGeckoTokens();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/transparency" element={<Transparency />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/glossary/:slug" element={<GlossaryTerm />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/ocr-dashboard" element={<OCRDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
