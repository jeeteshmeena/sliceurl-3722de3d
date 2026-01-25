import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { featurePreviewContent, FeatureKey } from "./FeaturePreviewVisuals";
import { triggerHaptic } from "@/lib/haptics";

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: FeatureKey;
  descKey: string;
  index: number;
  isQR?: boolean;
}

export function FeatureCard({
  icon: Icon,
  titleKey,
  descKey,
}: FeatureCardProps) {
  const { t } = useLanguage();
  const [showSmallPreview, setShowSmallPreview] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0, width: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const previewContent = featurePreviewContent[titleKey];
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Update preview position
  useEffect(() => {
    if ((showSmallPreview || showFullPreview) && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setPreviewPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showSmallPreview, showFullPreview]);
  
  // Handle click outside to close
  useEffect(() => {
    if (!showFullPreview && !showSmallPreview) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showFullPreview, showSmallPreview]);

  // Handle escape key
  useEffect(() => {
    if (!showFullPreview && !showSmallPreview) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showFullPreview, showSmallPreview]);

  const closeAll = useCallback(() => {
    setShowFullPreview(false);
    setShowSmallPreview(false);
  }, []);
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("light");
    
    if (isMobile) {
      // Mobile: first tap = small preview, second tap = full preview
      if (!showSmallPreview && !showFullPreview) {
        setShowSmallPreview(true);
      } else if (showSmallPreview && !showFullPreview) {
        setShowSmallPreview(false);
        setShowFullPreview(true);
        triggerHaptic("medium");
      } else {
        closeAll();
      }
    } else {
      // Desktop: click opens full preview (hover shows small preview)
      if (showSmallPreview && !showFullPreview) {
        setShowSmallPreview(false);
        setShowFullPreview(true);
        triggerHaptic("medium");
      }
    }
  };
  
  const handleMouseEnter = () => {
    if (!isMobile && !showFullPreview) {
      setShowSmallPreview(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (!isMobile && !showFullPreview) {
      setShowSmallPreview(false);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeAll();
  };

  // Small hover/tap preview (tooltip-style)
  const renderSmallPreview = () => {
    if (!showSmallPreview || showFullPreview || !previewContent) return null;
    
    return createPortal(
      <div
        className="fixed pointer-events-auto animate-fade-in"
        style={{
          top: previewPosition.top - 8,
          left: previewPosition.left,
          width: Math.max(previewPosition.width, 220),
          transform: "translateY(-100%)",
          zIndex: 9999,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 bg-card border border-border rounded-xl shadow-lg">
          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={handleCloseClick}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          
          {/* Title */}
          <h4 className="font-semibold text-xs text-foreground mb-2 pr-6">
            {previewContent.title}
          </h4>
          
          {/* Description bullets */}
          <ul className="space-y-1.5 mb-3">
            <li className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-foreground/40 mt-1.5 shrink-0" />
              <span>{previewContent.description}</span>
            </li>
            <li className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-foreground/40 mt-1.5 shrink-0" />
              <span>{previewContent.benefit}</span>
            </li>
            <li className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-foreground/40 mt-1.5 shrink-0" />
              <span>{previewContent.useCase}</span>
            </li>
          </ul>
          
          {/* Tap to expand hint + branding */}
          <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 pt-2 border-t border-border/50">
            <span>{isMobile ? "Tap to expand" : "Click to expand"}</span>
            <span className="font-medium">SliceURL</span>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Full detail popup/modal
  const renderFullPreview = () => {
    if (!showFullPreview || !previewContent) return null;
    
    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm animate-fade-in"
          style={{ zIndex: 9998 }}
          onClick={closeAll}
        />
        
        {/* Centered modal */}
        <div
          className="fixed inset-0 flex items-center justify-center p-4 animate-scale-in"
          style={{ zIndex: 9999 }}
          onClick={closeAll}
        >
          <div
            className="w-full max-w-sm p-5 bg-card border border-border rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseClick}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            
            {/* Feature icon */}
            <div className="h-12 w-12 mb-4 rounded-xl bg-secondary flex items-center justify-center">
              <Icon className="h-6 w-6 text-foreground" />
            </div>
            
            {/* Title */}
            <h3 className="font-semibold text-lg text-foreground mb-2 pr-10">
              {previewContent.title}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {previewContent.description}
            </p>
            
            {/* Visual Mockup */}
            <div className="flex items-center justify-center py-5 bg-secondary/30 rounded-xl mb-4">
              <previewContent.Visual />
            </div>
            
            {/* Capabilities list */}
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 mt-1.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Benefit:</span> {previewContent.benefit}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 mt-1.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Use case:</span> {previewContent.useCase}
                </p>
              </div>
            </div>
            
            {/* SliceURL branding */}
            <div className="text-[10px] text-muted-foreground/50 text-right pt-3 border-t border-border/50">
              SliceURL
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  };
  
  return (
    <>
      <div
        ref={cardRef}
        className={`
          group relative p-4 rounded-xl bg-card border border-border/50 
          cursor-pointer select-none touch-manipulation
          hover:border-border hover:shadow-md
          ${showSmallPreview && !showFullPreview ? "border-border shadow-md" : ""}
          ${showFullPreview ? "ring-2 ring-primary/20" : ""}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCardClick}
      >
        {/* Card Content */}
        <div className={showFullPreview ? "opacity-50" : ""}>
          <div className={`
            h-9 w-9 mb-3 rounded-lg bg-secondary/60 flex items-center justify-center 
            group-hover:bg-secondary
          `}>
            <Icon className="h-4 w-4 text-foreground/60 group-hover:text-foreground" />
          </div>
          <h3 className="font-medium text-xs sm:text-sm mb-1">{t(titleKey)}</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {t(descKey)}
          </p>
        </div>
      </div>
      
      {/* Portaled previews for proper z-index */}
      {renderSmallPreview()}
      {renderFullPreview()}
    </>
  );
}
