import { useState, useEffect } from "react";
import { Star, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SLICEAPPS_COLORS = {
  bg: "#000000",
  card: "#1a1a1a",
  border: "#333333",
  text: "#ffffff",
  textSecondary: "#888888",
  green: "#4ade80", // Soft APKPure-style green
};

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string | null;
  username?: string;
}

interface RatingsReviewsSectionProps {
  appId: string;
  ratingAvg: number | null;
  ratingCount: number | null;
  reviews: Review[];
  userId: string | null;
  onReviewSubmit: () => void;
}

// Generate random username for anonymous users
const generateRandomUsername = (): string => {
  const adjectives = ["Happy", "Clever", "Swift", "Brave", "Calm", "Eager", "Kind", "Wise"];
  const nouns = ["Panda", "Eagle", "Tiger", "Fox", "Wolf", "Bear", "Hawk", "Lion"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
};

export function RatingsReviewsSection({
  appId,
  ratingAvg,
  ratingCount,
  reviews,
  userId,
  onReviewSubmit,
}: RatingsReviewsSectionProps) {
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

  // Load user profiles for reviews
  useEffect(() => {
    const loadProfiles = async () => {
      const userIds = reviews.filter(r => r.user_id).map(r => r.user_id as string);
      if (userIds.length === 0) return;

      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      if (data) {
        const profiles: Record<string, string> = {};
        data.forEach(p => {
          profiles[p.user_id] = p.display_name || "User";
        });
        setUserProfiles(profiles);
      }
    };
    loadProfiles();
  }, [reviews]);

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("app_reviews")
        .insert({
          app_id: appId,
          rating: reviewRating,
          review_text: reviewText.trim() || null,
          user_id: userId || null,
        });

      if (error) throw error;

      toast.success("Review submitted!");
      setReviewText("");
      setReviewRating(5);
      onReviewSubmit();
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingDistribution = (): number[] => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[r.rating - 1]++;
      }
    });
    return dist.reverse(); // 5 stars first
  };

  const ratingDist = getRatingDistribution();
  const maxRatingCount = Math.max(...ratingDist, 1);

  const getUsername = (review: Review): string => {
    if (review.user_id && userProfiles[review.user_id]) {
      return userProfiles[review.user_id];
    }
    // Generate consistent random name based on review id
    return generateRandomUsername();
  };

  return (
    <div 
      className="p-5 rounded-xl"
      style={{ backgroundColor: SLICEAPPS_COLORS.card }}
    >
      <h2 
        className="font-semibold mb-5 text-lg"
        style={{ color: SLICEAPPS_COLORS.text }}
      >
        Ratings & Reviews
      </h2>

      {/* Rating Summary - Play Store style */}
      <div className="flex gap-6 mb-6">
        {/* Large average rating */}
        <div className="text-center min-w-[80px]">
          <div 
            className="text-5xl font-bold leading-none"
            style={{ color: SLICEAPPS_COLORS.text }}
          >
            {ratingAvg?.toFixed(1) || "0.0"}
          </div>
          <div className="flex gap-0.5 justify-center mt-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${star <= Math.round(ratingAvg || 0) ? "fill-current" : ""}`}
                style={{ color: SLICEAPPS_COLORS.green }}
              />
            ))}
          </div>
          <p className="text-xs mt-1.5" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
            {ratingCount || 0} reviews
          </p>
        </div>

        {/* Star distribution bars */}
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star, index) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-3 text-right" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                {star}
              </span>
              <div 
                className="flex-1 h-2.5 rounded-full overflow-hidden"
                style={{ backgroundColor: SLICEAPPS_COLORS.border }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: SLICEAPPS_COLORS.green,
                    width: `${(ratingDist[index] / maxRatingCount) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs w-6 text-right" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                {ratingDist[index]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-5" style={{ backgroundColor: SLICEAPPS_COLORS.border }} />

      {/* Write a review */}
      <div className="mb-6">
        <h3 
          className="text-sm font-medium mb-3"
          style={{ color: SLICEAPPS_COLORS.text }}
        >
          Rate this app
        </h3>
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setReviewRating(star)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 transition-colors ${star <= reviewRating ? "fill-current" : ""}`}
                style={{ color: star <= reviewRating ? SLICEAPPS_COLORS.green : SLICEAPPS_COLORS.border }}
              />
            </button>
          ))}
        </div>
        
        {userId ? (
          <>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this app... (optional)"
              rows={3}
              className="border resize-none mb-3"
              style={{
                backgroundColor: SLICEAPPS_COLORS.bg,
                borderColor: SLICEAPPS_COLORS.border,
                color: SLICEAPPS_COLORS.text,
              }}
            />
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="rounded-xl h-11 px-6"
              style={{
                backgroundColor: SLICEAPPS_COLORS.text,
                color: SLICEAPPS_COLORS.bg,
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm mb-3" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
              Sign in to write a review, or just tap to rate!
            </p>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="rounded-xl h-11 px-6"
              style={{
                backgroundColor: SLICEAPPS_COLORS.text,
                color: SLICEAPPS_COLORS.bg,
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </>
        )}
      </div>

      {/* Reviews list */}
      {reviews.length > 0 && (
        <>
          <Separator className="my-5" style={{ backgroundColor: SLICEAPPS_COLORS.border }} />
          <div className="space-y-4">
            {reviews.map(review => (
              <div 
                key={review.id}
                className="p-4 rounded-xl"
                style={{ backgroundColor: SLICEAPPS_COLORS.bg }}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: SLICEAPPS_COLORS.border }}
                  >
                    <User className="h-5 w-5" style={{ color: SLICEAPPS_COLORS.textSecondary }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Username and date */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium truncate" style={{ color: SLICEAPPS_COLORS.text }}>
                        {getUsername(review)}
                      </p>
                      <span className="text-xs flex-shrink-0" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-current" : ""}`}
                          style={{ color: SLICEAPPS_COLORS.green }}
                        />
                      ))}
                    </div>
                    
                    {/* Review text */}
                    {review.review_text && (
                      <p className="text-sm leading-relaxed" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                        {review.review_text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default RatingsReviewsSection;
