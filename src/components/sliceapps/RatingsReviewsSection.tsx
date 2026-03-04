import { useState, useEffect, useMemo } from "react";
import { Star, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_id: string | null;
  ip_address?: string | null;
  browser_fingerprint?: string | null;
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

const getBrowserFingerprint = (): string => {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join("|");
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const generateRandomUsername = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  const num = Math.abs(hash % 100000);
  return `user${num}`;
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
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [browserFingerprint] = useState(getBrowserFingerprint);

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

  useEffect(() => {
    if (userId) {
      const userReview = reviews.find(r => r.user_id === userId);
      if (userReview) {
        setMyReview(userReview);
        return;
      }
    }
    setMyReview(null);
  }, [reviews, userId]);

  const handleSubmitReview = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("submit-review", {
        body: {
          appId,
          rating: reviewRating,
          reviewText: reviewText.trim() || null,
          browserFingerprint,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      
      if (!data.success) {
        toast.error(data.error || "Failed to submit review");
        return;
      }

      if (data.action === "existing") {
        setMyReview(data.review);
        setReviewRating(data.review.rating);
        setReviewText(data.review.review_text || "");
        setIsEditing(true);
        toast.info("You have already reviewed this app. Edit your review instead.");
      } else {
        toast.success("Review submitted!");
        setReviewText("");
        setReviewRating(5);
        setMyReview(data.review);
        onReviewSubmit();
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReview = async () => {
    if (!myReview || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("update-review", {
        body: {
          reviewId: myReview.id,
          rating: reviewRating,
          reviewText: reviewText.trim() || null,
          browserFingerprint,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      
      if (!data.success) {
        toast.error(data.error || "Failed to update review");
        return;
      }

      toast.success("Review updated!");
      setIsEditing(false);
      setMyReview(data.review);
      onReviewSubmit();
    } catch (err) {
      console.error("Failed to update review:", err);
      toast.error("Failed to update review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview || !userId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("delete-review", {
        body: {
          reviewId: myReview.id,
          browserFingerprint,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      
      if (!data.success) {
        toast.error(data.error || "Failed to delete review");
        return;
      }

      toast.success("Review deleted!");
      setMyReview(null);
      setReviewText("");
      setReviewRating(5);
      setIsEditing(false);
      onReviewSubmit();
    } catch (err) {
      console.error("Failed to delete review:", err);
      toast.error("Failed to delete review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewText(myReview.review_text || "");
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewText(myReview.review_text || "");
    }
  };

  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        dist[r.rating - 1]++;
      }
    });
    return dist.reverse();
  }, [reviews]);

  const maxRatingCount = Math.max(...ratingDist, 1);

  const getUsername = (review: Review): string => {
    if (review.user_id && userProfiles[review.user_id]) {
      return userProfiles[review.user_id];
    }
    return generateRandomUsername(review.id);
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-5">
        Ratings & Reviews
      </h2>

      {/* Rating Summary - App Store style: large number left, bars right */}
      <div className="flex gap-6 mb-6">
        {/* Large average rating */}
        <div className="text-center min-w-[80px] flex flex-col items-center justify-center">
          <div className="text-[56px] font-bold text-foreground leading-none tracking-tight">
            {ratingAvg?.toFixed(1) || "0.0"}
          </div>
          <div className="flex gap-0.5 justify-center mt-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`h-3.5 w-3.5 ${star <= Math.round(ratingAvg || 0) ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                strokeWidth={0}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {ratingCount || 0} Ratings
          </p>
        </div>

        {/* Star distribution bars */}
        <div className="flex-1 space-y-1.5 flex flex-col justify-center">
          {[5, 4, 3, 2, 1].map((star, index) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-3 text-right text-muted-foreground font-medium">{star}</span>
              <div className="flex-1 h-[6px] rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/70 transition-all duration-300"
                  style={{ width: `${(ratingDist[index] / maxRatingCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Write/Edit a review */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-3 text-foreground">
          {myReview && !isEditing ? "Your review" : isEditing ? "Edit your review" : "Rate this app"}
        </h3>
        
        {myReview && !isEditing ? (
          <div className="py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= myReview.rating ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                    strokeWidth={0}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                  className="h-8 px-2 text-muted-foreground"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                {userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteReview}
                    disabled={isSubmitting}
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {myReview.review_text && (
              <p className="text-sm text-muted-foreground">
                {myReview.review_text}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-7 w-7 ${star <= reviewRating ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                    strokeWidth={0}
                  />
                </button>
              ))}
            </div>
            
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe your experience (optional)"
              rows={3}
              className="resize-none mb-3"
            />
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleUpdateReview}
                    disabled={isSubmitting}
                    className="h-10 px-5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    onClick={cancelEditing}
                    variant="ghost"
                    className="h-10 px-5 text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className="h-10 px-5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reviews list */}
      {reviews.length > 0 && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {reviews.filter(r => r.id !== myReview?.id).map(review => (
            <div key={review.id} className="py-3">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground text-xs font-medium">
                  {getUsername(review).charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Username and date */}
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {getUsername(review)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${star <= review.rating ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                  
                  {/* Review text */}
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {review.review_text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RatingsReviewsSection;
