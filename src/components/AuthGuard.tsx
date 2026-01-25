import { ReactNode, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;
    
    // Prevent multiple redirects
    if (hasRedirectedRef.current) return;

    const pathname = location.pathname;

    // If auth is required but user is not logged in
    if (requireAuth && !user) {
      hasRedirectedRef.current = true;
      navigate("/login", { replace: true });
      return;
    }

    // If user is logged in and on auth/login page, redirect to dashboard
    if (user && (pathname === "/auth" || pathname === "/login")) {
      hasRedirectedRef.current = true;
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [user, loading, location.pathname, requireAuth, navigate]);

  // Reset redirect flag when location changes
  useEffect(() => {
    hasRedirectedRef.current = false;
  }, [location.pathname]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth required but no user, show nothing (redirect is happening)
  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}
