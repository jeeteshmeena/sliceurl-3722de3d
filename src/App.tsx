import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/hooks/useProfile";
import { LanguageProvider } from "@/lib/i18n";
import { PopupManagerProvider } from "@/hooks/usePopupManager";
import { LanguageSuggestion } from "@/components/LanguageSuggestion";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Auth from "@/pages/Auth";
import Preview from "@/pages/Preview";
import { AuthGuard } from "@/components/AuthGuard";

// Lazy load dashboard and analytics pages for performance
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const SharedAnalytics = lazy(() => import("@/pages/SharedAnalytics"));
const Settings = lazy(() => import("@/pages/Settings"));
const QRCustomizer = lazy(() => import("@/pages/QRCustomizer"));
const UtmBuilder = lazy(() => import("@/pages/UtmBuilder"));
const BulkStats = lazy(() => import("@/pages/BulkStats"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const About = lazy(() => import("@/pages/About"));
const CreepyURL = lazy(() => import("@/pages/CreepyURL"));
const SliceBox = lazy(() => import("@/pages/SliceBox"));
const LittleSlice = lazy(() => import("@/pages/LittleSlice"));
const ShortFileView = lazy(() => import("@/pages/ShortFileView"));
const LegacySliceBoxRedirect = lazy(() => import("@/pages/LegacySliceBoxRedirect"));
const CreateAppListing = lazy(() => import("@/pages/CreateAppListing"));
const AppPage = lazy(() => import("@/pages/AppPage"));
const SliceAppsHome = lazy(() => import("@/pages/SliceAppsHome"));

const Feedback = lazy(() => import("@/pages/Feedback"));
const FeedbackAdmin = lazy(() => import("@/pages/FeedbackAdmin"));
const AdminInbox = lazy(() => import("@/pages/AdminInbox"));
import { AdminGuard } from "@/components/AdminGuard";

const queryClient = new QueryClient();

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="sliceurl-theme">
      <AuthProvider>
        <ProfileProvider>
          <LanguageProvider>
            <PopupManagerProvider>
              <TooltipProvider>
                <Toaster />
                <LanguageSuggestion />
                <PWAInstallPrompt />
                <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Auth mode="login" />} />
                  <Route path="/register" element={<Auth mode="signup" />} />
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="/s/:shortCode" element={<Preview />} />
                  
                  {/* Protected routes with lazy loading */}
                  <Route path="/dashboard" element={
                    <AuthGuard>
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    </AuthGuard>
                  } />
                  <Route path="/analytics/:id" element={
                    <AuthGuard>
                      <Suspense fallback={<PageLoader />}>
                        <Analytics />
                      </Suspense>
                    </AuthGuard>
                  } />
                  <Route path="/settings" element={
                    <AuthGuard>
                      <Suspense fallback={<PageLoader />}>
                        <Settings />
                      </Suspense>
                    </AuthGuard>
                  } />
                  <Route path="/qr/:id/customize" element={
                    <AuthGuard>
                      <Suspense fallback={<PageLoader />}>
                        <QRCustomizer />
                      </Suspense>
                    </AuthGuard>
                  } />
                  <Route path="/utm-builder" element={
                    <Suspense fallback={<PageLoader />}>
                      <UtmBuilder />
                    </Suspense>
                  } />
                  <Route path="/bulk-stats" element={
                    <AuthGuard>
                      <Suspense fallback={<PageLoader />}>
                        <BulkStats />
                      </Suspense>
                    </AuthGuard>
                  } />
                  <Route path="/developers" element={<Navigate to="/" replace />} />
                  <Route path="/developer" element={<Navigate to="/" replace />} />
                  <Route path="/developer-api" element={<Navigate to="/" replace />} />
                  
                  {/* Legal & Info Pages */}
                  <Route path="/privacy" element={
                    <Suspense fallback={<PageLoader />}>
                      <Privacy />
                    </Suspense>
                  } />
                  <Route path="/terms" element={
                    <Suspense fallback={<PageLoader />}>
                      <Terms />
                    </Suspense>
                  } />
                  <Route path="/about" element={
                    <Suspense fallback={<PageLoader />}>
                      <About />
                    </Suspense>
                  } />
                  <Route path="/creepyurl" element={
                    <Suspense fallback={<PageLoader />}>
                      <CreepyURL />
                    </Suspense>
                  } />
                  
                  {/* Shared Analytics (public) */}
                  <Route path="/shared/:token" element={
                    <Suspense fallback={<PageLoader />}>
                      <SharedAnalytics />
                    </Suspense>
                  } />
                  
                  {/* SliceBox & LittleSlice Upload Pages */}
                  <Route path="/slicebox" element={
                    <Suspense fallback={<PageLoader />}>
                      <SliceBox />
                    </Suspense>
                  } />
                  <Route path="/littleslice" element={
                    <Suspense fallback={<PageLoader />}>
                      <LittleSlice />
                    </Suspense>
                  } />
                  
                  {/* Short File View Routes - New Format */}
                  <Route path="/sb/:shortCode" element={
                    <Suspense fallback={<PageLoader />}>
                      <ShortFileView expectedServiceType="sb" />
                    </Suspense>
                  } />
                  <Route path="/ls/:shortCode" element={
                    <Suspense fallback={<PageLoader />}>
                      <ShortFileView expectedServiceType="ls" />
                    </Suspense>
                  } />
                  
                  {/* Legacy SliceBox URL Redirect */}
                  <Route path="/slicebox/:fileId" element={
                    <Suspense fallback={<PageLoader />}>
                      <LegacySliceBoxRedirect />
                    </Suspense>
                  } />
                  
                  {/* SliceAPPs Routes */}
                  <Route path="/app/create" element={
                    <AuthGuard>
                      <Suspense fallback={<PageLoader />}>
                        <CreateAppListing />
                      </Suspense>
                    </AuthGuard>
                  } />
                  <Route path="/app/:id" element={
                    <Suspense fallback={<PageLoader />}>
                      <AppPage />
                    </Suspense>
                  } />
                  {/* Feedback Routes */}
                  <Route path="/feedback" element={
                    <AuthGuard>
                      <Suspense fallback={<PageLoader />}>
                        <Feedback />
                      </Suspense>
                    </AuthGuard>
                  } />
                  <Route path="/feedback/admin" element={
                    <AdminGuard>
                      <Suspense fallback={<PageLoader />}>
                        <FeedbackAdmin />
                      </Suspense>
                    </AdminGuard>
                  } />
                  
                  {/* Admin Inbox Route */}
                  <Route path="/admin/inbox" element={
                    <AdminGuard>
                      <Suspense fallback={<PageLoader />}>
                        <AdminInbox />
                      </Suspense>
                    </AdminGuard>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </PopupManagerProvider>
          </LanguageProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
