import { useState, useEffect, useCallback } from "react";
import { Link2, Upload, Package, Grid3X3 } from "lucide-react";

interface ProductCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  bgGradient: string;
}

const products: ProductCard[] = [
  {
    id: "sliceurl",
    name: "SliceURL",
    tagline: "Smart Link Shortener",
    description: "Create beautiful, trackable short links in seconds. Get detailed analytics and custom QR codes.",
    icon: <Link2 className="h-8 w-8" />,
    accentColor: "text-primary",
    bgGradient: "from-primary/10 to-primary/5",
  },
  {
    id: "slicebox",
    name: "SliceBox",
    tagline: "Secure File Sharing",
    description: "Share files up to 2GB with password protection and automatic expiry. No account required.",
    icon: <Upload className="h-8 w-8" />,
    accentColor: "text-[#FF3B30]",
    bgGradient: "from-[#FF3B30]/10 to-[#FF3B30]/5",
  },
  {
    id: "littleslice",
    name: "LittleSlice",
    tagline: "Quick File Drops",
    description: "Instant file sharing for small files up to 50MB. Perfect for quick transfers.",
    icon: <Package className="h-8 w-8" />,
    accentColor: "text-[#FF4D6D]",
    bgGradient: "from-[#FF4D6D]/10 to-[#FF4D6D]/5",
  },
  {
    id: "sliceapps",
    name: "SliceAPPs",
    tagline: "APK Distribution",
    description: "Create beautiful landing pages for your Android apps. Track downloads and collect reviews.",
    icon: <Grid3X3 className="h-8 w-8" />,
    accentColor: "text-[#22c55e]",
    bgGradient: "from-[#22c55e]/10 to-[#22c55e]/5",
  },
];

export function ShowcaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextSlide = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % products.length);
      setIsAnimating(false);
    }, 300);
  }, []);

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(nextSlide, 4500);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const currentProduct = products[activeIndex];

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-8 lg:p-12 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-background to-muted/20" />
      
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-32 right-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      
      {/* Main content card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Product card with animation */}
        <div
          className={`
            relative bg-card border border-border rounded-2xl p-8 shadow-lg
            transform transition-all duration-300 ease-out
            ${isAnimating ? "opacity-0 translate-y-5" : "opacity-100 translate-y-0"}
          `}
        >
          {/* Icon container */}
          <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${currentProduct.bgGradient} mb-6`}>
            <span className={currentProduct.accentColor}>
              {currentProduct.icon}
            </span>
          </div>

          {/* Product name */}
          <h3 className="text-2xl font-bold text-foreground mb-1">
            {currentProduct.name}
          </h3>
          
          {/* Tagline */}
          <p className={`text-sm font-medium ${currentProduct.accentColor} mb-4`}>
            {currentProduct.tagline}
          </p>

          {/* Description */}
          <p className="text-muted-foreground text-base leading-relaxed">
            {currentProduct.description}
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {currentProduct.id === "sliceurl" && (
              <>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">Analytics</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">QR Codes</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">UTM Builder</span>
              </>
            )}
            {currentProduct.id === "slicebox" && (
              <>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">2GB Max</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">Password Protected</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">Auto Expiry</span>
              </>
            )}
            {currentProduct.id === "littleslice" && (
              <>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">50MB Max</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">No Account</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">Instant</span>
              </>
            )}
            {currentProduct.id === "sliceapps" && (
              <>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">APK Hosting</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">Reviews</span>
                <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground">Downloads</span>
              </>
            )}
          </div>
        </div>

        {/* Carousel indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {products.map((product, index) => (
            <button
              key={product.id}
              onClick={() => {
                if (index !== activeIndex) {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setActiveIndex(index);
                    setIsAnimating(false);
                  }, 300);
                }
              }}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index === activeIndex 
                  ? "w-8 bg-foreground" 
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }
              `}
              aria-label={`Go to ${product.name}`}
            />
          ))}
        </div>

        {/* Product name labels */}
        <div className="flex justify-center gap-6 mt-4">
          {products.map((product, index) => (
            <span
              key={product.id}
              className={`
                text-xs font-medium transition-all duration-300 cursor-pointer
                ${index === activeIndex 
                  ? "text-foreground" 
                  : "text-muted-foreground/50 hover:text-muted-foreground"
                }
              `}
              onClick={() => {
                if (index !== activeIndex) {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setActiveIndex(index);
                    setIsAnimating(false);
                  }, 300);
                }
              }}
            >
              {product.name}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-muted-foreground">
          Trusted by <span className="font-semibold text-foreground">10,000+</span> users worldwide
        </p>
      </div>
    </div>
  );
}
