import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { StarRating, RatingDistribution } from "./StarRating";
import { AppReview } from "./types";
import { formatDistanceToNow } from "date-fns";

interface ReviewSectionProps {
  appId: string;
  ratingAvg: number;
  ratingCount: number;
  reviews: AppReview[];
  onReviewAdded: () => void;
}

export function ReviewSection({ appId, ratingAvg, ratingCount, reviews, onReviewAdded }: ReviewSectionProps) {
  const { user } = useAuth();
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Calculate distribution from reviews
  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating - 1]++;
    }
  });

  const handleSubmitRating = async () => {
    if (userRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("app_reviews").insert({
        app_id: appId,
        user_id: user?.id || null,
        rating: userRating,
        review_text: reviewText.trim() || null,
      });

      if (error) throw error;

      toast.success("Thanks for your review!");
      setUserRating(0);
      setReviewText("");
      setShowReviewForm(false);
      onReviewAdded();
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold text-[#F5F5F0]">Ratings & Reviews</h3>
      
      {/* Rating Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <div className="text-center sm:text-left">
          <div className="text-5xl font-bold text-[#F5F5F0] mb-2">
            {ratingAvg.toFixed(1)}
          </div>
          <StarRating rating={ratingAvg} size="md" />
          <p className="text-sm text-[#6B6B6B] mt-2">
            {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
          </p>
        </div>
        <RatingDistribution distribution={distribution} totalCount={ratingCount} />
      </div>

      {/* Rate This App */}
      <div className="p-5 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <p className="text-[#F5F5F0] font-medium mb-3">Rate this app</p>
        <div className="flex items-center gap-4">
          <StarRating
            rating={userRating}
            size="lg"
            interactive
            onChange={(r) => {
              setUserRating(r);
              setShowReviewForm(true);
            }}
          />
          <span className="text-sm text-[#6B6B6B]">Tap to rate</span>
        </div>
        
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              {user ? (
                <div className="space-y-3">
                  <Textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write a review (optional)..."
                    className="bg-[#2A2A2A] border-[#3A3A3A] text-[#F5F5F0] placeholder:text-[#6B6B6B]"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReviewForm(false)}
                      className="border-[#3A3A3A] text-[#A0A0A0]"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmitRating}
                      className="bg-[#7C3AED] hover:bg-[#6D28D9]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitRating}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit Rating"
                    )}
                  </Button>
                  <p className="text-xs text-[#6B6B6B] self-center">
                    Sign in to write a review
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[#F5F5F0] font-medium">Recent Reviews</h4>
          {reviews.slice(0, 10).map((review) => (
            <div
              key={review.id}
              className="p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-[#6B6B6B]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-[#6B6B6B]">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-[#A0A0A0]">{review.review_text}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
