import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScreenshotCarouselProps {
  screenshots: string[];
}

export function ScreenshotCarousel({ screenshots }: ScreenshotCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (screenshots.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <>
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-[#F5F5F0]">Screenshots</h3>
        
        <div className="relative group">
          {/* Scroll buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Screenshots scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {screenshots.map((url, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "shrink-0 w-40 h-72 sm:w-48 sm:h-80 rounded-xl overflow-hidden cursor-pointer",
                  "border-2 border-[#2A2A2A] hover:border-[#7C3AED] transition-colors snap-start"
                )}
              >
                <img
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fullscreen Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          
          {/* Navigation */}
          {selectedIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex - 1);
              }}
              className="absolute left-4 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          {selectedIndex < screenshots.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedIndex + 1);
              }}
              className="absolute right-4 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
          
          <img
            src={screenshots[selectedIndex]}
            alt={`Screenshot ${selectedIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Dots indicator */}
          <div className="absolute bottom-6 flex gap-2">
            {screenshots.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedIndex(i);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === selectedIndex ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
