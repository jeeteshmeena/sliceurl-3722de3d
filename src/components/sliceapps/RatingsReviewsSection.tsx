import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Star, Edit2, Trash2, ChevronRight } from "lucide-react";
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
  display_name?: string | null;
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
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [browserFingerprint] = useState(getBrowserFingerprint);
  const [hoverRating, setHoverRating] = useState(0);

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
    if (reviewRating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("submit-review", {
        body: {
          appId,
          rating: reviewRating,
          reviewText: reviewText.trim() || null,
          browserFingerprint,
          displayName: !userId && displayName.trim() ? displayName.trim() : undefined,
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
        setReviewRating(0);
        setDisplayName("");
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
    if (reviewRating === 0) {
      toast.error("Please select a star rating");
      return;
    }
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
        body: { reviewId: myReview.id, browserFingerprint },
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
      setReviewRating(0);
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
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
    });
    return dist.reverse();
  }, [reviews]);

  const maxRatingCount = Math.max(...ratingDist, 1);

  const getUsername = (review: Review): string => {
    if (review.user_id && userProfiles[review.user_id]) return userProfiles[review.user_id];
    if (review.display_name) return review.display_name;
    return review.username || generateRandomUsername(review.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeRating = hoverRating || reviewRating;

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <h2 className="text-[22px] font-bold text-foreground">Ratings & Reviews</h2>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Rating Summary */}
      <div className="flex gap-4 mb-6">
        <div className="flex flex-col items-center justify-center min-w-[90px]">
          <div className="text-[64px] font-bold text-foreground leading-none tracking-tight">
            {ratingAvg?.toFixed(1) || "0.0"}
          </div>
          <div className="text-[13px] text-muted-foreground mt-1">out of 5</div>
        </div>
        <div className="flex-1 space-y-[6px] flex flex-col justify-center py-2">
          {[5, 4, 3, 2, 1].map((star, index) => (
            <div key={star} className="flex items-center gap-2">
              <div className="flex gap-[1px] min-w-[60px]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-[10px] w-[10px] ${s <= star ? "fill-muted-foreground/60 text-muted-foreground/60" : "fill-muted-foreground/20 text-muted-foreground/20"}`}
                    strokeWidth={0}
                  />
                ))}
              </div>
              <div className="flex-1 h-[8px] rounded-full overflow-hidden bg-muted/50">
                <div
                  className="h-full rounded-full bg-muted-foreground/50"
                  style={{ width: `${(ratingDist[index] / maxRatingCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div className="text-right mt-1">
            <span className="text-[13px] text-muted-foreground">
              {ratingCount || 0} {(ratingCount || 0) === 1 ? "Rating" : "Ratings"}
            </span>
          </div>
        </div>
      </div>

      {/* Review Cards */}
      {reviews.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4 mb-6 scrollbar-hide">
          <div className="flex gap-3 pb-2">
            {reviews.map(review => (
              <div
                key={review.id}
                className="min-w-[280px] max-w-[280px] p-4 rounded-2xl bg-muted/30 flex-shrink-0"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[15px] font-semibold text-foreground leading-tight truncate">
                      {review.review_text
                        ? review.review_text.slice(0, 40) + (review.review_text.length > 40 ? "…" : "")
                        : "Rating"}
                    </p>
                    <div className="flex gap-0.5 mt-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${star <= review.rating ? "fill-[#FF9500] text-[#FF9500]" : "fill-muted-foreground/20 text-muted-foreground/20"}`}
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[12px] text-muted-foreground block">
                      {formatDate(review.created_at)}
                    </span>
                    <p className="text-[12px] text-muted-foreground">{getUsername(review)}</p>
                  </div>
                </div>
                {review.review_text && (
                  <p className="text-[14px] text-foreground leading-relaxed line-clamp-4">
                    {review.review_text}
                  </p>
                )}
                {myReview?.id === review.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
                    <Button variant="ghost" size="sm" onClick={startEditing} className="h-8 px-3 text-[#007AFF] text-[13px]">
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit
                    </Button>
                    {userId && (
                      <Button variant="ghost" size="sm" onClick={handleDeleteReview} disabled={isSubmitting} className="h-8 px-3 text-muted-foreground text-[13px] hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write a Review Card */}
      <div className="rounded-2xl bg-muted/20 border border-border/30 p-5">
        <h3 className="text-[17px] font-semibold text-foreground mb-1">
          {myReview && !isEditing ? "Your Review" : isEditing ? "Edit Your Review" : "Write a Review"}
        </h3>

        {myReview && !isEditing ? (
          <div className="mt-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= myReview.rating ? "fill-[#FF9500] text-[#FF9500]" : "fill-muted-foreground/20 text-muted-foreground/20"}`}
                    strokeWidth={0}
                  />
                ))}
              </div>
              <span className="text-[13px] text-muted-foreground">{formatDate(myReview.created_at)}</span>
            </div>
            {myReview.review_text && (
              <p className="text-[15px] text-foreground leading-relaxed">{myReview.review_text}</p>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {/* Tap to Rate label */}
            <div>
              <p className="text-[13px] text-muted-foreground mb-2">Tap a star to rate</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 transition-transform active:scale-90"
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        star <= activeRating
                          ? "fill-[#FF9500] text-[#FF9500]"
                          : "fill-muted-foreground/15 text-muted-foreground/15"
                      }`}
                      strokeWidth={0}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Display Name - only for guests */}
            {!userId && !isEditing && (
              <div>
                <label className="text-[13px] font-medium text-foreground mb-1.5 block">Display Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="text-[15px] bg-background border border-border/50 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-[#007AFF]"
                  maxLength={30}
                />
              </div>
            )}

            {/* Review Text */}
            <div>
              <label className="text-[13px] font-medium text-foreground mb-1.5 block">Review (optional)</label>
              <Textarea
                value={reviewText}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setReviewText(e.target.value);
                }}
                placeholder="Describe your experience (optional)"
                rows={3}
                className="resize-none text-[15px] bg-background border border-border/50 rounded-xl focus-visible:ring-1 focus-visible:ring-[#007AFF]"
              />
              <p className="text-[11px] text-muted-foreground text-right mt-1">{reviewText.length}/500</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleUpdateReview}
                    disabled={isSubmitting || reviewRating === 0}
                    className="h-11 px-6 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-full text-[15px] font-medium"
                  >
                    {isSubmitting ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    onClick={cancelEditing}
                    variant="ghost"
                    className="h-11 px-6 text-[#007AFF] rounded-full text-[15px] font-medium"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || reviewRating === 0 || (!userId && !displayName.trim())}
                  className="h-11 px-6 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-full text-[15px] font-medium disabled:opacity-40"
                >
                  {isSubmitting ? "Submitting…" : "Submit Review"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RatingsReviewsSection;
