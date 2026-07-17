import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import LinkPartner from "./pages/LinkPartner";
import DateLogPage from "./pages/DateLogPage";
import Pricing from "./pages/Pricing";
import CheckoutReturn from "./pages/CheckoutReturn";
import Terms from "./pages/Terms";
import ResetPassword from "./pages/ResetPassword";
import Unsubscribe from "./pages/Unsubscribe";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/date-log" element={<DateLogPage />} />
            <Route path="/link/:code" element={<LinkPartner />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
