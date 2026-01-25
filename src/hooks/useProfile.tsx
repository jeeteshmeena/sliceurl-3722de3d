import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarForNewUser } from "@/lib/animeAvatars";

export type SecurityMode = 'disable' | 'warn' | 'strict';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  theme: string | null;
  auto_redirect_enabled: boolean | null;
  email_alerts_enabled: boolean | null;
  security_mode: SecurityMode | null;
  scheduled_deletion_at: string | null;
  link_preview_enabled: boolean | null;
  language: string | null;
  auto_dashboard_refresh: boolean | null;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Try to find existing profile by user ID
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          ...data,
          security_mode: (data.security_mode as SecurityMode) || 'warn',
        });
      } else {
        // Create new profile for this user with auto-assigned anime avatar
        const displayName = user.user_metadata?.full_name || user.user_metadata?.name || null;
        const autoAvatar = getAvatarForNewUser(displayName);
        
        const newProfile = {
          user_id: user.id,
          display_name: displayName,
          avatar_url: autoAvatar, // Auto-assign anime avatar based on detected gender
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          console.error("Error creating profile:", createError);
        } else if (createdProfile) {
          setProfile({
            ...createdProfile,
            security_mode: (createdProfile.security_mode as SecurityMode) || 'warn',
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Update local state immediately
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
