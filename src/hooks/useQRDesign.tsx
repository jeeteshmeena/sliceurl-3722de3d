import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface QRDesign {
  id?: string;
  link_id: string;
  fg_color: string;
  bg_color: string;
  gradient_enabled: boolean;
  gradient_type: "linear" | "radial";
  gradient_start: string;
  gradient_end: string;
  shape: "square" | "rounded" | "dots" | "mosaic";
  corner_radius: number;
  padding: number;
  logo_url: string | null;
  logo_size: number;
  frame_type: string | null;
  frame_text: string | null;
}

export const defaultQRDesign: Omit<QRDesign, "link_id"> = {
  fg_color: "#000000",
  bg_color: "#ffffff",
  gradient_enabled: false,
  gradient_type: "linear",
  gradient_start: "#000000",
  gradient_end: "#333333",
  shape: "square",
  corner_radius: 0,
  padding: 20,
  logo_url: null,
  logo_size: 20,
  frame_type: null,
  frame_text: null,
};

export function useQRDesign(linkId: string | undefined) {
  const { user } = useAuth();
  const [design, setDesign] = useState<QRDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!linkId || !user) {
      setLoading(false);
      return;
    }

    const fetchDesign = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("qr_designs")
          .select("*")
          .eq("link_id", linkId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setDesign({
            id: data.id,
            link_id: data.link_id,
            fg_color: data.fg_color,
            bg_color: data.bg_color,
            gradient_enabled: data.gradient_enabled,
            gradient_type: data.gradient_type as "linear" | "radial",
            gradient_start: data.gradient_start || "#000000",
            gradient_end: data.gradient_end || "#333333",
            shape: data.shape as "square" | "rounded" | "dots" | "mosaic",
            corner_radius: data.corner_radius,
            padding: data.padding,
            logo_url: data.logo_url,
            logo_size: data.logo_size,
            frame_type: data.frame_type,
            frame_text: data.frame_text,
          });
        } else {
          setDesign({ ...defaultQRDesign, link_id: linkId });
        }
      } catch (error) {
        console.error("Error fetching QR design:", error);
        setDesign({ ...defaultQRDesign, link_id: linkId });
      } finally {
        setLoading(false);
      }
    };

    fetchDesign();
  }, [linkId, user]);

  const updateDesign = (updates: Partial<QRDesign>) => {
    if (!design) return;
    setDesign({ ...design, ...updates });
  };

  const resetDesign = () => {
    if (!linkId) return;
    setDesign({ ...defaultQRDesign, link_id: linkId, id: design?.id });
  };

  const saveDesign = async () => {
    if (!design || !user || !linkId) return false;

    setSaving(true);
    try {
      const designData = {
        link_id: linkId,
        user_id: user.id,
        fg_color: design.fg_color,
        bg_color: design.bg_color,
        gradient_enabled: design.gradient_enabled,
        gradient_type: design.gradient_type,
        gradient_start: design.gradient_start,
        gradient_end: design.gradient_end,
        shape: design.shape,
        corner_radius: design.corner_radius,
        padding: design.padding,
        logo_url: design.logo_url,
        logo_size: design.logo_size,
        frame_type: design.frame_type,
        frame_text: design.frame_text,
      };

      if (design.id) {
        const { error } = await supabase
          .from("qr_designs")
          .update(designData)
          .eq("id", design.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("qr_designs")
          .insert(designData)
          .select()
          .single();

        if (error) throw error;
        setDesign({ ...design, id: data.id });
      }

      toast.success("QR design saved!");
      return true;
    } catch (error) {
      console.error("Error saving QR design:", error);
      toast.error("Failed to save design");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    design,
    loading,
    saving,
    updateDesign,
    resetDesign,
    saveDesign,
  };
}
