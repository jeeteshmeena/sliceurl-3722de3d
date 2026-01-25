import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

export function LinkCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
          <div className="flex items-center gap-3 mt-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-secondary/40 border border-border/50 text-center">
          <Skeleton className="h-10 w-10 mx-auto mb-3 rounded-xl" />
          <Skeleton className="h-8 w-20 mx-auto mb-2" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <Skeleton className="h-28 w-28 rounded-full" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export function SettingsSectionSkeleton() {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
      <Skeleton className="h-4 w-32 mb-4" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="min-h-dvh bg-white dark:bg-neutral-950">
      {/* Header skeleton */}
      <div className="h-14 border-b border-neutral-200 dark:border-neutral-800" />
      
      <div className="max-w-xl mx-auto pt-24 pb-16 px-4 space-y-6">
        {/* Back button */}
        <Skeleton className="h-9 w-20" />
        
        {/* Page header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        {/* Profile section */}
        <SettingsSectionSkeleton />
        
        {/* Security section */}
        <SettingsSectionSkeleton />
        
        {/* Preferences section */}
        <SettingsSectionSkeleton />
        
        {/* Danger zone */}
        <div className="rounded-xl border-2 border-red-200 dark:border-red-900/50 p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-4 w-56 mb-4" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}
