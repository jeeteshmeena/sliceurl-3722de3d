import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Link {
  id: string;
  user_id: string | null;
  original_url: string;
  short_code: string;
  custom_slug: string | null;
  title: string | null;
  folder_id: string | null;
  is_favorite: boolean;
  is_pinned: boolean;
  is_password_protected: boolean;
  is_private: boolean;
  expires_at: string | null;
  max_clicks: number | null;
  facebook_pixel: string | null;
  google_pixel: string | null;
  custom_og_title: string | null;
  custom_og_description: string | null;
  custom_og_image: string | null;
  custom_favicon: string | null;
  click_count: number;
  last_clicked_at: string | null;
  created_at: string;
  updated_at: string;
  // UTM fields
  utm_enabled: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  final_utm_url: string | null;
  // Health & metadata
  health_status: string | null;
  is_broken: boolean;
  last_health_check: string | null;
  api_source: boolean;
  api_key_id: string | null;
  order_index: number | null;
  slice_duration_ms: number | null;
  is_creepy: boolean;
  creepy_style: string | null;
  creepy_extension: string | null;
  batch_id: string | null;
  safety_status: string | null;
  last_scanned_at: string | null;
  notify_on_broken: boolean;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLinkData {
  original_url: string;
  custom_slug?: string;
  title?: string;
  folder_id?: string;
  is_password_protected?: boolean;
  password?: string;
  expires_at?: string;
  max_clicks?: number;
  facebook_pixel?: string;
  google_pixel?: string;
  custom_og_title?: string;
  custom_og_description?: string;
  custom_og_image?: string;
  custom_favicon?: string;
  // UTM fields
  utm_enabled?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  final_utm_url?: string;
}

export function useLinks() {
  const [links, setLinks] = useState<Link[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLinks = useCallback(async () => {
    if (!user) {
      setLinks([]);
      setLoading(false);
      return;
    }

    try {
      // Use links_safe view to avoid exposing password_hash to client
      const { data, error } = await supabase
        .from("links_safe")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchFolders = useCallback(async () => {
    if (!user) {
      setFolders([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchLinks();
    fetchFolders();
  }, [fetchLinks, fetchFolders]);

  // Realtime subscription for click_count updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('links-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'links',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setLinks((prev) =>
            prev.map((link) =>
              link.id === payload.new.id
                ? { ...link, click_count: payload.new.click_count, last_clicked_at: payload.new.last_clicked_at }
                : link
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createLink = async (data: CreateLinkData): Promise<Link | null> => {
    // Track slice start time
    const sliceStartTime = performance.now();
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shorten`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_url: data.original_url,
            custom_slug: data.custom_slug || null,
            title: data.title || null,
            password: data.password || null,
            expires_at: data.expires_at || null,
            max_clicks: data.max_clicks || null,
            folder_id: data.folder_id || null,
            facebook_pixel: data.facebook_pixel || null,
            google_pixel: data.google_pixel || null,
            custom_og_title: data.custom_og_title || null,
            custom_og_description: data.custom_og_description || null,
            custom_og_image: data.custom_og_image || null,
            custom_favicon: data.custom_favicon || null,
            user_id: user?.id || null,
            // UTM fields
            utm_enabled: data.utm_enabled || false,
            utm_source: data.utm_source || null,
            utm_medium: data.utm_medium || null,
            utm_campaign: data.utm_campaign || null,
            utm_term: data.utm_term || null,
            utm_content: data.utm_content || null,
            final_utm_url: data.final_utm_url || null,
          }),
        }
      );

      // Calculate slice duration after response received
      const sliceDurationMs = Math.round(performance.now() - sliceStartTime);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create link');
      }

      // Update the link with slice duration (fire and forget)
      if (result.link?.id) {
        supabase
          .from('links')
          .update({ slice_duration_ms: sliceDurationMs })
          .eq('id', result.link.id)
          .then(() => {
            console.log(`Slice duration recorded: ${sliceDurationMs}ms`);
          });
      }

      if (user && result.link) {
        setLinks((prev) => [result.link, ...prev]);
      }

      toast.success("Link created!", { description: "Your short link is ready to use." });

      return result.link;
    } catch (error: any) {
      if (error.message?.includes('slug') || error.message?.includes('taken')) {
        toast.error("Slug already taken", { description: "Please choose a different custom slug." });
      } else {
        toast.error("Error creating link", { description: error.message });
      }
      return null;
    }
  };

  const updateLink = async (id: string, updates: Partial<Link> & { password_hash?: string | null }) => {
    try {
      const { error } = await supabase
        .from("links")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      const { password_hash, ...stateUpdates } = updates;
      setLinks((prev) =>
        prev.map((link) => (link.id === id ? { ...link, ...stateUpdates } : link))
      );

      toast.success("Link updated", { description: "Your changes have been saved." });
    } catch (error: any) {
      toast.error("Error updating link", { description: error.message });
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase.from("links").delete().eq("id", id);

      if (error) throw error;

      setLinks((prev) => prev.filter((link) => link.id !== id));

      toast.success("Link deleted", { description: "The link has been removed." });
    } catch (error: any) {
      toast.error("Error deleting link", { description: error.message });
    }
  };

  const toggleFavorite = async (id: string) => {
    const link = links.find((l) => l.id === id);
    if (link) {
      await updateLink(id, { is_favorite: !link.is_favorite });
    }
  };

  const togglePin = async (id: string) => {
    const link = links.find((l) => l.id === id);
    if (link) {
      await updateLink(id, { is_pinned: !link.is_pinned });
    }
  };

  const createFolder = async (name: string, color: string = "#6366f1") => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("folders")
        .insert({
          user_id: user.id,
          name,
          color,
        })
        .select()
        .single();

      if (error) throw error;

      setFolders((prev) => [...prev, data]);

      toast.success("Folder created", { description: `"${name}" has been created.` });

      return data;
    } catch (error: any) {
      toast.error("Error creating folder", { description: error.message });
      return null;
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      const { error } = await supabase.from("folders").delete().eq("id", id);

      if (error) throw error;

      setFolders((prev) => prev.filter((folder) => folder.id !== id));

      toast.success("Folder deleted", { description: "The folder has been removed." });
    } catch (error: any) {
      toast.error("Error deleting folder", { description: error.message });
    }
  };

  const bulkDeleteLinks = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("links")
        .delete()
        .in("id", ids);

      if (error) throw error;

      setLinks((prev) => prev.filter((link) => !ids.includes(link.id)));

      toast.success("Links deleted", { description: `${ids.length} link${ids.length > 1 ? "s" : ""} removed.` });
    } catch (error: any) {
      toast.error("Error deleting links", { description: error.message });
    }
  };

  const bulkMoveToFolder = async (ids: string[], folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("links")
        .update({ folder_id: folderId })
        .in("id", ids);

      if (error) throw error;

      setLinks((prev) =>
        prev.map((link) =>
          ids.includes(link.id) ? { ...link, folder_id: folderId } : link
        )
      );

      const folderName = folderId
        ? folders.find((f) => f.id === folderId)?.name || "folder"
        : "No Folder";

      toast.success("Links moved", { description: `${ids.length} link${ids.length > 1 ? "s" : ""} moved to ${folderName}.` });
    } catch (error: any) {
      toast.error("Error moving links", { description: error.message });
    }
  };

  const bulkTogglePin = async (ids: string[], pin: boolean) => {
    try {
      const { error } = await supabase
        .from("links")
        .update({ is_pinned: pin })
        .in("id", ids);

      if (error) throw error;

      setLinks((prev) =>
        prev.map((link) =>
          ids.includes(link.id) ? { ...link, is_pinned: pin } : link
        )
      );

      toast.success(pin ? "Links pinned" : "Links unpinned", { 
        description: `${ids.length} link${ids.length > 1 ? "s" : ""} ${pin ? "pinned" : "unpinned"}.` 
      });
    } catch (error: any) {
      toast.error("Error updating links", { description: error.message });
    }
  };

  return {
    links,
    folders,
    loading,
    createLink,
    updateLink,
    deleteLink,
    toggleFavorite,
    togglePin,
    createFolder,
    deleteFolder,
    bulkDeleteLinks,
    bulkMoveToFolder,
    bulkTogglePin,
    refetch: fetchLinks,
  };
}
