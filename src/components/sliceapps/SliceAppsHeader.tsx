import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Link2, HardDrive, FileDown, Search, Layers, Gamepad2, Rocket, Camera, Heart, Briefcase, Ticket, Puzzle, Compass, Grid3X3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SliceAPPs Header - Apple App Store exact UI
 * - Hamburger menu (blue lines like App Store)
 * - Centered "SliceAPPs" with app store icon style
 * - Full-screen slide menu with categories
 */

const menuItems = [
  { label: "SliceURL", icon: Link2, path: "/" },
  { label: "SliceBox", icon: HardDrive, path: "/slicebox" },
  { label: "LittleSlice", icon: FileDown, path: "/littleslice" },
];

const categoryItems = [
  { label: "Categories", icon: Grid3X3, path: "#" },
  { label: "Photo & Video", icon: Camera, path: "#" },
  { label: "Health & Fitness", icon: Heart, path: "#" },
  { label: "Productivity", icon: Briefcase, path: "#" },
  { label: "Entertainment", icon: Ticket, path: "#" },
  { label: "Action", icon: Rocket, path: "#" },
  { label: "Adventure", icon: Compass, path: "#" },
  { label: "Puzzle", icon: Puzzle, path: "#" },
];

export function SliceAppsHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Header Bar */}
      <header className="sticky top-0 z-50 bg-background border-b border-border/30">
        <div className="h-12 flex items-center justify-between px-4 relative">
          {/* Left: Hamburger Menu Icon (App Store blue lines) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex flex-col items-start justify-center gap-[5px] pl-1"
            aria-label="Open menu"
          >
            <span className="w-5 h-[2.5px] bg-[#007AFF] rounded-full" />
            <span className="w-3.5 h-[2.5px] bg-[#007AFF] rounded-full" />
          </button>

          {/* Center: App Store style title with icon */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5 text-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-[17px] font-semibold text-foreground tracking-tight">
              SliceAPPs
            </span>
          </div>

          {/* Right: spacer */}
          <div className="w-10" />
        </div>
      </header>

      {/* Full-screen Slide Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/30"
              onClick={() => setMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-[101] w-[280px] bg-background"
            >
              {/* Menu Header */}
              <div className="h-12 flex items-center justify-between px-4 border-b border-border/30">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 text-[#007AFF]" strokeWidth={2} />
                </button>
                
                <div className="flex items-center gap-2">
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-5 h-5 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-[17px] font-semibold text-foreground tracking-tight">
                    SliceAPPs
                  </span>
                </div>

                <div className="w-10" />
              </div>

              {/* Menu Content */}
              <div className="py-4 overflow-y-auto h-[calc(100%-48px)]">
                {/* Main Navigation */}
                <nav className="px-4 space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(item.path);
                      }}
                      className="w-full flex items-center gap-4 py-3 text-left"
                    >
                      <item.icon className="h-6 w-6 text-[#007AFF]" strokeWidth={1.5} fill="currentColor" />
                      <span className="text-[17px] font-medium text-foreground">{item.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Categories Section */}
                <div className="mt-6 px-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Categories
                  </p>
                  <nav className="space-y-1">
                    {categoryItems.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => setMenuOpen(false)}
                        className="w-full flex items-center gap-4 py-3 text-left"
                      >
                        <item.icon className="h-6 w-6 text-[#007AFF]" strokeWidth={1.5} fill="currentColor" />
                        <span className="text-[17px] font-medium text-foreground">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default SliceAppsHeader;
