 import { useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { Link2, HardDrive, Cloud, X } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { CreateLinkDialog } from "@/components/CreateLinkDialog";
import { useLinks } from "@/hooks/useLinks";
 
 interface CreateMenuProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function CreateMenu({ open, onOpenChange }: CreateMenuProps) {
   const navigate = useNavigate();
   const [showCreateLink, setShowCreateLink] = useState(false);
  const { createLink } = useLinks();
 
   const handleNewLink = () => {
     onOpenChange(false);
     setShowCreateLink(true);
   };
 
   const handleSliceBox = () => {
     onOpenChange(false);
     navigate("/slicebox");
   };
 
   const handleLittleSlice = () => {
     onOpenChange(false);
     navigate("/littleslice");
   };
 
   if (!open) {
     return (
       <>
        <CreateLinkDialog open={showCreateLink} onOpenChange={setShowCreateLink} onCreateLink={createLink} />
       </>
     );
   }
 
   return (
     <>
       {/* Backdrop */}
       <div 
         className="fixed inset-0 z-[400] bg-foreground/30"
         style={{ top: '64px' }}
         onClick={() => onOpenChange(false)}
       />
       
       {/* Bottom Sheet */}
       <div 
         className="fixed bottom-0 left-0 right-0 z-[500] animate-slide-up"
         style={{ 
           animation: 'slide-up 180ms ease-out forwards'
         }}
       >
         <div className="bg-background border-t border-border rounded-t-2xl shadow-lg p-4 pb-8 max-w-lg mx-auto">
           {/* Header */}
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-base font-semibold text-foreground">Create</h3>
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => onOpenChange(false)}
               className="h-8 px-3 text-muted-foreground hover:text-foreground"
             >
               Close
             </Button>
           </div>
           
           {/* Options */}
           <div className="space-y-2">
             <button
               onClick={handleNewLink}
               className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
             >
               <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                 <Link2 className="h-5 w-5 text-foreground" />
               </div>
               <div>
                 <p className="text-sm font-medium text-foreground">New Link</p>
                 <p className="text-xs text-muted-foreground">Shorten a URL</p>
               </div>
             </button>
             
             <button
               onClick={handleSliceBox}
               className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
             >
               <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                 <HardDrive className="h-5 w-5 text-foreground" />
               </div>
               <div>
                 <p className="text-sm font-medium text-foreground">SliceBox</p>
                 <p className="text-xs text-muted-foreground">Share files up to 200MB</p>
               </div>
             </button>
             
             <button
               onClick={handleLittleSlice}
               className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
             >
               <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center border border-border">
                 <Cloud className="h-5 w-5 text-foreground" />
               </div>
               <div>
                 <p className="text-sm font-medium text-foreground">LittleSlice</p>
                 <p className="text-xs text-muted-foreground">Temporary files up to 2GB</p>
               </div>
             </button>
           </div>
         </div>
       </div>
       
      <CreateLinkDialog open={showCreateLink} onOpenChange={setShowCreateLink} onCreateLink={createLink} />
       
       <style>{`
         @keyframes slide-up {
           from {
             transform: translateY(100%);
             opacity: 0;
           }
           to {
             transform: translateY(0);
             opacity: 1;
           }
         }
         .animate-slide-up {
           animation: slide-up 180ms ease-out forwards;
         }
       `}</style>
     </>
   );
 }