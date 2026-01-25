import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Pencil, Save, Loader2, Palette, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { 
  getDefaultAvatar, 
  detectGenderFromName, 
  regenerateAvatar,
  type Gender 
} from "@/lib/animeAvatars";
import { ProfileSkeleton } from "@/components/Skeleton";
import { AvatarPickerModal } from "@/components/AvatarPickerModal";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { toast } = useToast();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalAvatarUrl(null);
      setIsEditingName(false);
      setEditedName("");
    }
  }, [open]);
  
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  const email = user?.email;
  
  // Always use anime avatar - never show initials or abstract shapes
  const savedAvatarUrl = profile?.avatar_url;
  const avatarUrl = localAvatarUrl || savedAvatarUrl || getDefaultAvatar();

  const handleEditName = () => {
    setEditedName(displayName || "");
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleAvatarSelect = (avatar: string) => {
    setLocalAvatarUrl(avatar);
  };
  
  const handleRegenerateAvatar = () => {
    const gender: Gender = detectGenderFromName(displayName);
    const newAvatar = regenerateAvatar(avatarUrl, gender);
    setLocalAvatarUrl(newAvatar);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const updates: Record<string, unknown> = {};
      
      if (isEditingName && editedName !== displayName) {
        updates.display_name = editedName || null;
      }
      
      if (localAvatarUrl) {
        updates.avatar_url = localAvatarUrl;
      }
      
      if (Object.keys(updates).length === 0) {
        toast({ title: "No changes to save" });
        setIsSaving(false);
        return;
      }
      
      const { error } = await updateProfile(updates);
      
      if (error) {
        toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Profile updated successfully" });
        setIsEditingName(false);
        setLocalAvatarUrl(null);
      }
    } catch {
      toast({ title: "Error saving profile", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = isEditingName || localAvatarUrl !== null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 pb-6 pt-4">
            <ProfileSkeleton />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="px-6 pb-6 pt-4 space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <motion.div 
                className="relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
                  <AvatarImage 
                    src={avatarUrl} 
                    alt={displayName || "User"} 
                    className="object-cover"
                  />
                </Avatar>
              </motion.div>
              
              {/* Avatar Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setAvatarPickerOpen(true)}
                >
                  <Palette className="h-4 w-4" />
                  Change Avatar
                </Button>
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleRegenerateAvatar}
                    title="Random avatar"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
              
              {/* Name & Email Preview */}
              <div className="mt-4 text-center">
                <p className="font-semibold text-foreground">{displayName || "Not set"}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            
            {/* Editable Fields */}
            <div className="space-y-3">
              {/* Name Card */}
              <motion.div
                className="bg-secondary/30 rounded-xl p-4 border border-border/50"
                whileHover={{ backgroundColor: "hsl(var(--secondary) / 0.5)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Display Name
                  </div>
                  {!isEditingName && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleEditName}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                
                <AnimatePresence mode="wait">
                  {isEditingName ? (
                    <motion.div
                      key="editing"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter your name"
                        className="bg-background"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleCancelEditName}>
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p
                      key="display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-medium"
                    >
                      {displayName || <span className="text-muted-foreground">Not set</span>}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
              
              {/* Email Card */}
              <motion.div
                className="bg-secondary/30 rounded-xl p-4 border border-border/50"
                whileHover={{ backgroundColor: "hsl(var(--secondary) / 0.5)" }}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </div>
                <p className="font-medium">{email}</p>
                <p className="text-xs text-muted-foreground mt-1">Email can be changed in Settings</p>
              </motion.div>
            </div>
            
            {/* Save Button */}
            <Button
              className="w-full h-11"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        currentAvatar={avatarUrl}
        onAvatarSelect={handleAvatarSelect}
      />
    </>
  );
}
