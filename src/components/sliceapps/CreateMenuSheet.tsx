import { motion, AnimatePresence } from "framer-motion";
import { Link2, Box, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreateMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewLink?: () => void;
}

interface MenuOption {
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  action?: () => void;
}

export function CreateMenuSheet({ open, onOpenChange, onNewLink }: CreateMenuSheetProps) {
  const navigate = useNavigate();

  const menuOptions: MenuOption[] = [
    {
      label: "New Link",
      description: "Create a shortened URL",
      icon: <Link2 className="h-5 w-5" />,
      path: "",
      action: () => {
        onOpenChange(false);
        onNewLink?.();
      }
    },
    {
      label: "SliceBox",
      description: "Share files securely",
      icon: <Box className="h-5 w-5" />,
      path: "/slicebox"
    },
    {
      label: "LittleSlice",
      description: "Quick text sharing",
      icon: <FileText className="h-5 w-5" />,
      path: "/littleslice"
    }
  ];

  const handleOptionClick = (option: MenuOption) => {
    if (option.action) {
      option.action();
    } else {
      onOpenChange(false);
      navigate(option.path);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[400] bg-foreground/60 backdrop-blur-[2px]"
            onClick={() => onOpenChange(false)}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-[500] bg-background rounded-t-[18px] shadow-[0_-10px_30px_rgba(0,0,0,0.12)]"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-base font-semibold">Create</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>

            {/* Options */}
            <div className="px-4 pb-8 space-y-2">
              {menuOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleOptionClick(option)}
                  className="w-full flex items-center gap-4 p-4 rounded-[14px] border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-muted text-foreground">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-foreground">{option.label}</p>
                    <p className="text-[12px] text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
