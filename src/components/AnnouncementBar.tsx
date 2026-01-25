import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  message: string;
  created_at: string;
}

export function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchLatestAnnouncement();
  }, []);

  const fetchLatestAnnouncement = async () => {
    const dismissedId = localStorage.getItem('dismissed_announcement');
    
    const { data, error } = await supabase
      .from('announcements')
      .select('id, message, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching announcement:', error);
      return;
    }

    if (data && data.id !== dismissedId) {
      setAnnouncement(data);
    }
  };

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem('dismissed_announcement', announcement.id);
    }
    setDismissed(true);
  };

  if (!announcement || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3"
      >
        <Megaphone className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm flex-1">{announcement.message}</p>
        <Button variant="ghost" size="icon-sm" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
