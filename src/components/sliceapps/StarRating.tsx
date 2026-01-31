import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function StarRating({ rating, size = "md", interactive = false, onChange }: StarRatingProps) {
  const sizes = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (starIndex: number) => {
    if (interactive && onChange) {
      onChange(starIndex + 1);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < Math.floor(rating);
        const halfFilled = i === Math.floor(rating) && rating % 1 >= 0.5;
        
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            disabled={!interactive}
            className={cn(
              "transition-transform",
              interactive && "cursor-pointer hover:scale-110"
            )}
          >
            <Star
              className={cn(
                sizes[size],
                filled || halfFilled
                  ? "fill-[#FFD700] text-[#FFD700]"
                  : "fill-transparent text-[#4A4A4A]"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

interface RatingDistributionProps {
  distribution: number[]; // [1star, 2star, 3star, 4star, 5star]
  totalCount: number;
}

export function RatingDistribution({ distribution, totalCount }: RatingDistributionProps) {
  const maxCount = Math.max(...distribution, 1);
  
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star - 1] || 0;
        const percentage = totalCount > 0 ? (count / maxCount) * 100 : 0;
        
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="text-[#A0A0A0] w-2">{star}</span>
            <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
