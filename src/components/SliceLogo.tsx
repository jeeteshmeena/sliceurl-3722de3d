import sliceurlLogo from "@/assets/sliceurl-logo-new.png";

interface SliceLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

/**
 * SliceLogo - Unified logo component
 * Uses the official SliceURL scissors mascot logo
 */
export function SliceLogo({ 
  size = "md", 
  showText = true, 
  className = ""
}: SliceLogoProps) {
  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* SliceURL Official Logo */}
      <img 
        src={sliceurlLogo}
        alt="SliceURL" 
        className={`${iconSizes[size]} shrink-0 object-contain rounded-lg`}
      />
      
      {showText && (
        <span className={`font-semibold tracking-tight ${textSizes[size]}`}>
          <span className="text-foreground">Slice</span>
          <span className="text-muted-foreground">URL</span>
        </span>
      )}
    </div>
  );
}
