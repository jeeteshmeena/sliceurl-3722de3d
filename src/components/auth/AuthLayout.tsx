import { ReactNode } from "react";
import { ShowcaseCarousel } from "./ShowcaseCarousel";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * AuthLayout - Two-column layout for auth pages
 * - Mobile: Single centered column with auth form
 * - Desktop: Left column for auth, right column for product showcase
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#f7f7f7] dark:bg-background">
      {/* Two-column grid for desktop */}
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left column - Auth form */}
        <div className="flex flex-col items-center justify-center px-4 py-8 lg:px-8 lg:py-12 bg-background">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>

        {/* Right column - Product showcase (hidden on mobile) */}
        <div className="hidden lg:flex bg-muted/30 border-l border-border">
          <ShowcaseCarousel />
        </div>
      </div>
    </div>
  );
}
