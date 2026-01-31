import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { AppListingForm } from "./AppListingForm";

interface CreateAppListingButtonProps {
  fileId: string;
  fileName: string;
  fileSize: number;
  colorScheme?: "slicebox" | "littleslice";
}

export function CreateAppListingButton({ fileId, fileName, fileSize, colorScheme = "slicebox" }: CreateAppListingButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Only show for APK files
  const isApk = fileName.toLowerCase().endsWith(".apk");
  if (!isApk) return null;

  const handleClick = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      setShowForm(true);
    }
  };

  const handleSuccess = (listingId: string) => {
    navigate(`/app/${listingId}`);
  };

  const buttonColors = colorScheme === "slicebox" 
    ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
    : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleClick}
          className={`${buttonColors} gap-2 w-full`}
          variant="default"
        >
          <Package className="h-4 w-4" />
          Create App Listing (SliceAPPs)
        </Button>
      </motion.div>

      {/* Login Required Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="bg-[#1A1A1A] border-[#2A2A2A] text-[#F5F5F0]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-[#7C3AED]" />
              Login Required
            </DialogTitle>
            <DialogDescription className="text-[#A0A0A0]">
              You need to be logged in to create an app listing on SliceAPPs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLoginModal(false)}
              className="border-[#3A3A3A] text-[#A0A0A0] hover:bg-[#2A2A2A]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => navigate("/login")}
              className="bg-[#7C3AED] hover:bg-[#6D28D9]"
            >
              Login / Signup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* App Listing Form Modal */}
      <AnimatePresence>
        {showForm && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F0F0F] border-[#2A2A2A] p-0">
              <AppListingForm
                fileId={fileId}
                fileName={fileName}
                fileSize={fileSize}
                onSuccess={handleSuccess}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
