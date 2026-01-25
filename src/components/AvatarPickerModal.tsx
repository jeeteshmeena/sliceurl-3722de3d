import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { maleAvatars, femaleAvatars, neutralAvatars } from "@/lib/animeAvatars";

interface AvatarPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar: string | null;
  onAvatarSelect: (avatarUrl: string) => void;
}

export function AvatarPickerModal({ 
  open, 
  onOpenChange, 
  currentAvatar, 
  onAvatarSelect 
}: AvatarPickerModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("male");
  
  const handleSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
  };
  
  const handleConfirm = () => {
    if (selectedAvatar) {
      onAvatarSelect(selectedAvatar);
      onOpenChange(false);
      setSelectedAvatar(null);
    }
  };
  
  const handleCancel = () => {
    onOpenChange(false);
    setSelectedAvatar(null);
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Invalid file", 
        description: "Please upload an image file (JPG or PNG)", 
        variant: "destructive" 
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Please upload an image smaller than 5MB", 
        variant: "destructive" 
      });
      return;
    }
    
    // Create a canvas to crop to square
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 256;
        canvas.height = 256;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Calculate crop position (center)
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        
        // Draw cropped and resized image
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
        
        const croppedDataUrl = canvas.toDataURL('image/png');
        onAvatarSelect(croppedDataUrl);
        onOpenChange(false);
        
        toast({ 
          title: "Avatar uploaded", 
          description: "Your custom avatar has been set" 
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };
  
  const renderAvatarGrid = (avatars: string[]) => (
    <div className="grid grid-cols-5 gap-3 max-h-[280px] overflow-y-auto p-1">
      {avatars.map((avatar, index) => {
        const isSelected = selectedAvatar === avatar;
        const isCurrent = currentAvatar === avatar;
        
        return (
          <motion.button
            key={`${avatar}-${index}`}
            onClick={() => handleSelect(avatar)}
            className="relative group focus:outline-none"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <Avatar className={`h-14 w-14 transition-all duration-200 ${
              isSelected 
                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                : isCurrent
                  ? 'ring-2 ring-muted-foreground/50 ring-offset-2 ring-offset-background'
                  : 'hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-2 hover:ring-offset-background'
            }`}>
              <AvatarImage 
                src={avatar} 
                alt={`Avatar ${index + 1}`}
                className="object-cover"
              />
            </Avatar>
            
            {/* Selection indicator */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="h-3 w-3 text-primary-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Current indicator */}
            {isCurrent && !isSelected && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                current
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Change Avatar
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 pt-4 space-y-4">
          {/* Tabs for Male/Female/Neutral */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="male">Male</TabsTrigger>
              <TabsTrigger value="female">Female</TabsTrigger>
              <TabsTrigger value="neutral">Neutral</TabsTrigger>
            </TabsList>
            
            <TabsContent value="male" className="mt-0">
              {renderAvatarGrid(maleAvatars)}
            </TabsContent>
            
            <TabsContent value="female" className="mt-0">
              {renderAvatarGrid(femaleAvatars)}
            </TabsContent>
            
            <TabsContent value="neutral" className="mt-0">
              {renderAvatarGrid(neutralAvatars)}
            </TabsContent>
          </Tabs>
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          
          {/* Upload Custom */}
          <Button 
            variant="outline" 
            className="w-full h-12 gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload Custom Avatar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileUpload}
          />
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleConfirm}
              disabled={!selectedAvatar}
            >
              <Check className="h-4 w-4 mr-2" />
              Select
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
