import { useState, useEffect, useMemo, useCallback } from "react";
import { Star, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
}

interface RatingsReviewsSectionProps {
  appId: string;
  ratingAvg: number | null;
  ratingCount: number | null;
  reviews: Review[];
  userId: string | null;
  onReviewSubmit: () => void;
}

// Generate or retrieve persistent device ID
const getDeviceId = (): string => {
  const storageKey = "sliceapps_device_id";
  let deviceId = localStorage.getItem(storageKey);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  return deviceId;
};

// Get stored display name for this app
const getStoredDisplayName = (appId: string): string | null => {
  const key = `sliceapps_display_name_${appId}`;
  return localStorage.getItem(key);
};

// Store display name for this app
const storeDisplayName = (appId: string, name: string): void => {
  const key = `sliceapps_display_name_${appId}`;
  localStorage.setItem(key, name);
};

// Check if user is in cooldown period after delete
const getDeleteCooldown = (appId: string): number | null => {
  const key = `sliceapps_delete_cooldown_${appId}`;
  const timestamp = localStorage.getItem(key);
  if (!timestamp) return null;
  const cooldownEnd = parseInt(timestamp, 10);
  if (Date.now() > cooldownEnd) {
    localStorage.removeItem(key);
    return null;
  }
  return cooldownEnd;
};

// Set delete cooldown (24 hours)
const setDeleteCooldown = (appId: string): void => {
  const key = `sliceapps_delete_cooldown_${appId}`;
  const cooldownEnd = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(key, cooldownEnd.toString());
};

// Random name generator
const generateRandomName = (): string => {
  const adjectives = ["Swift", "Blue", "Green", "Quiet", "Bright", "Lucky", "Wild", "Calm", "Bold", "Cool"];
  const nouns = ["Fox", "Lion", "Eagle", "Wolf", "Bear", "Hawk", "Tiger", "Panda", "Owl", "Lynx"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
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
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deviceId] = useState(getDeviceId);
  const [inCooldown, setInCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState("");

  // Check cooldown on mount
  useEffect(() => {
    const cooldownEnd = getDeleteCooldown(appId);
    if (cooldownEnd) {
      setInCooldown(true);
      const updateCooldown = () => {
        const remaining = cooldownEnd - Date.now();
        if (remaining <= 0) {
          setInCooldown(false);
          setCooldownRemaining("");
          return;
        }
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setCooldownRemaining(`${hours}h ${minutes}m`);
      };
      updateCooldown();
      const interval = setInterval(updateCooldown, 60000);
      return () => clearInterval(interval);
    }
  }, [appId]);

  // Load stored display name
  useEffect(() => {
    const storedName = getStoredDisplayName(appId);
    if (storedName) {
      setDisplayName(storedName);
    }
  }, [appId]);

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

  // Find my review based on userId or deviceId
  useEffect(() => {
    const userReview = userId 
      ? reviews.find(r => r.user_id === userId)
      : reviews.find(r => r.browser_fingerprint === deviceId);
    
    if (userReview) {
      setMyReview(userReview);
      setReviewRating(userReview.rating);
      setReviewText(userReview.review_text || "");
      if (userReview.display_name) setDisplayName(userReview.display_name);
    } else {
      setMyReview(null);
    }
  }, [reviews, userId, deviceId]);

  const handleUseMyName = useCallback(async () => {
    if (userId) {
      const profile = userProfiles[userId];
      if (profile) {
        setDisplayName(profile);
        storeDisplayName(appId, profile);
      }
    }
  }, [userId, userProfiles, appId]);

  const handleGenerateRandomName = useCallback(() => {
    const name = generateRandomName();
    setDisplayName(name);
    storeDisplayName(appId, name);
  }, [appId]);

  const handleSubmitReview = async () => {
    if (isSubmitting) return;
    if (inCooldown) {
      toast.error(`Please wait ${cooldownRemaining} before submitting a new review`);
      return;
    }
    
    let finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
      finalDisplayName = `User${Math.floor(Math.random() * 10000)}`;
      setDisplayName(finalDisplayName);
      storeDisplayName(appId, finalDisplayName);
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("submit-review", {
        body: {
          appId,
          rating: reviewRating,
          reviewText: reviewText.trim() || null,
          deviceId,
          displayName: finalDisplayName,
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
        if (data.review.display_name) setDisplayName(data.review.display_name);
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
    
    let finalDisplayName = displayName.trim();
    if (!finalDisplayName) {
      finalDisplayName = `User${Math.floor(Math.random() * 10000)}`;
      setDisplayName(finalDisplayName);
      storeDisplayName(appId, finalDisplayName);
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("update-review", {
        body: {
          reviewId: myReview.id,
          rating: reviewRating,
          reviewText: reviewText.trim() || null,
          deviceId,
          displayName: finalDisplayName,
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
    if (!myReview || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("delete-review", {
        body: {
          reviewId: myReview.id,
          deviceId,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      
      if (!data.success) {
        toast.error(data.error || "Failed to delete review");
        return;
      }

      toast.success("Review deleted!");
      setDeleteCooldown(appId);
      setInCooldown(true);
      setCooldownRemaining("24h 0m");
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
      if (myReview.display_name) setDisplayName(myReview.display_name);
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
    if (review.display_name) {
      return review.display_name;
    }
    if (review.user_id && userProfiles[review.user_id]) {
      return userProfiles[review.user_id];
    }
    return `User${review.id.substring(0, 4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <h2 className="text-base font-semibold text-foreground">
        Ratings and reviews
      </h2>

      {/* SECTION 1: Rating Summary - Google Play Style */}
      <div className="bg-card rounded-[14px] p-5 border border-border/50">
        <div className="flex gap-6">
          {/* Large average rating */}
          <div className="text-center min-w-[80px]">
            <div className="text-[48px] font-light text-foreground leading-none">
              {ratingAvg?.toFixed(1) || "0.0"}
            </div>
            <div className="flex gap-0.5 justify-center mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`h-3.5 w-3.5 ${star <= Math.round(ratingAvg || 0) ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ratingCount || 0} reviews
            </p>
          </div>

          {/* Star distribution bars */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star, index) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs w-3 text-muted-foreground">{star}</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-muted/50">
                  <div
                    className="h-full rounded-full bg-foreground transition-all duration-300"
                    style={{ width: `${(ratingDist[index] / maxRatingCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: Your Review Block */}
      <div className="bg-card rounded-[14px] p-5 border border-border/50">
        <h3 className="text-sm font-medium text-foreground mb-4">
          {myReview && !isEditing ? "Your review" : isEditing ? "Edit your review" : "Your review"}
        </h3>

        {inCooldown && !myReview ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              You can submit a new review in {cooldownRemaining}
            </p>
          </div>
        ) : myReview && !isEditing ? (
          /* Show existing review */
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= myReview.rating ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteReview}
                  disabled={isSubmitting}
                  className="h-8 px-3 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {myReview.review_text && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {myReview.review_text}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70 mt-2">
              Posted as {myReview.display_name || displayName || "Anonymous"}
            </p>
          </div>
        ) : (
          /* Review form */
          <div className="space-y-4">
            {/* Star selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tap to rate</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-0.5 transition-transform active:scale-90"
                  >
                    <Star
                      className={`h-8 w-8 ${star <= reviewRating ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            {/* Review text */}
            <div>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review (optional)"
                rows={3}
                className="resize-none bg-background border-border/50 rounded-[10px]"
              />
            </div>

            {/* SECTION 3: Name System */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Display name (optional)
              </label>
              <Input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  storeDisplayName(appId, e.target.value);
                }}
                placeholder="Enter your name"
                className="h-10 bg-background border-border/50 rounded-[10px]"
              />
              <div className="flex gap-2 mt-2">
                {userId && userProfiles[userId] && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyName}
                    className="h-8 text-xs rounded-[8px]"
                  >
                    Use my name
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateRandomName}
                  className="h-8 text-xs rounded-[8px]"
                >
                  Generate random name
                </Button>
              </div>
            </div>
            
            {/* Submit buttons */}
            <div className="flex gap-2 pt-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleUpdateReview}
                    disabled={isSubmitting}
                    className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[10px]"
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
                  className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[10px]"
                >
                  {isSubmitting ? "Submitting..." : "Submit review"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: Reviews List */}
      {reviews.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            All reviews
          </h3>
          <div className="space-y-3">
            {reviews.filter(r => r.id !== myReview?.id).map(review => (
              <div key={review.id} className="bg-card rounded-[14px] p-4 border border-border/50">
                <div className="flex items-start gap-3">
                  {/* Circle avatar with first letter */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground text-sm font-medium">
                    {getUsername(review).charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Display name and date */}
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
                          className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-current text-foreground" : "text-muted-foreground/30"}`}
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
        </div>
      )}
    </div>
  );
}

export default RatingsReviewsSection;