import { Package } from "lucide-react";

interface SliceAppsLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

/**
 * SliceAPPs Logo - Dedicated monochrome logo for SliceAPPs
 * Flat, modern, minimal design
 */
export function SliceAppsLogo({ 
  size = "md", 
  showText = true,
  className = "" 
}: SliceAppsLogoProps) {
  const sizes = {
    sm: { icon: "w-7 h-7", container: "w-8 h-8", text: "text-base" },
    md: { icon: "w-8 h-8", container: "w-10 h-10", text: "text-lg" },
    lg: { icon: "w-10 h-10", container: "w-12 h-12", text: "text-xl" },
  };

  const { icon, container, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon - Monochrome app package icon */}
      <div 
        className={`${container} rounded-xl flex items-center justify-center`}
        style={{ backgroundColor: "#1a1a1a" }}
      >
        <Package className={icon} style={{ color: "#ffffff" }} strokeWidth={1.5} />
      </div>
      
      {showText && (
        <span 
          className={`font-semibold tracking-tight ${text}`}
          style={{ color: "#ffffff" }}
        >
          SliceAPPs
        </span>
      )}
    </div>
  );
}

export default SliceAppsLogo;
