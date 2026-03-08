import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Link2, HardDrive, FileDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * SliceAPPs Header - Apple App Store inspired
 * Hamburger menu left, centered title, clean background
 */
export function SliceAppsHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { label: "SliceURL", icon: Link2, path: "/" },
    { label: "SliceBox", icon: HardDrive, path: "/slicebox" },
    { label: "LittleSlice", icon: FileDown, path: "/littleslice" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background border-border/40">
        <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4 relative">
          {/* Left: Hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-muted/50"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>

          {/* Center: Title */}
          <span
            className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold tracking-tight text-foreground"
            style={{ letterSpacing: "-0.02em" }}
          >
            SliceAPPs
          </span>

          {/* Right: spacer for balance */}
          <div className="w-9" />
        </div>
      </header>

      {/* Slide-in Menu */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[280px] bg-background/95 backdrop-blur-xl border-border/40 p-0">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="text-left text-lg font-semibold text-foreground">SliceAPPs</SheetTitle>
          </SheetHeader>
          <nav className="px-3">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMenuOpen(false);
                  navigate(item.path);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default SliceAppsHeader;
