import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Link2, HardDrive, Package, ChevronRight } from "lucide-react";

const products = [
  {
    label: "SliceURL",
    description: "Create and manage smart short links.",
    icon: Link2,
    path: "/",
  },
  {
    label: "SliceBox",
    description: "Secure file sharing with expiring links.",
    icon: HardDrive,
    path: "/slicebox",
  },
  {
    label: "LittleSlice",
    description: "Host and share APK files easily.",
    icon: Package,
    path: "/littleslice",
  },
];

const footerLinks = [
  { label: "About Slice", path: "/about" },
  { label: "Documentation", path: "/developers" },
  { label: "Contact", path: "/feedback" },
];

export function SliceAppsHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const closeMenu = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setClosing(false);
    }, 240);
  }, []);

  const handleNavigate = (path: string) => {
    closeMenu();
    setTimeout(() => navigate(path), 260);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background border-border/40">
        <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4 relative">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-150 hover:bg-foreground/[0.06] active:scale-[0.96]"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-foreground" strokeWidth={1.7} />
          </button>

          <span
            onClick={() => navigate("/apps")}
            className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold tracking-tight text-foreground cursor-pointer"
            style={{ letterSpacing: "-0.02em" }}
          >
            SliceAPPs
          </span>

          <div className="w-[42px]" />
        </div>
      </header>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/35"
          style={{
            animation: closing
              ? "sliceapps-backdrop-out 240ms cubic-bezier(0.32, 0.72, 0, 1) forwards"
              : "sliceapps-backdrop-in 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
          }}
          onClick={closeMenu}
        />
      )}

      {/* Drawer Panel */}
      {menuOpen && (
        <div
          className="fixed inset-y-0 left-0 z-[70] w-[82vw] max-w-[360px] md:max-w-[420px] bg-background flex flex-col"
          style={{
            borderRadius: "0 20px 20px 0",
            animation: closing
              ? "sliceapps-drawer-out 240ms cubic-bezier(0.32, 0.72, 0, 1) forwards"
              : "sliceapps-drawer-in 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <span className="text-[17px] font-bold tracking-tight text-foreground">
              SliceAPPs
            </span>
            <button
              onClick={closeMenu}
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all duration-150 hover:bg-foreground/[0.06] active:scale-[0.96]"
              aria-label="Close menu"
            >
              <X className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.8} />
            </button>
          </div>

          <div className="mx-5 h-px bg-border/50" />

          {/* Product List */}
          <nav className="flex-1 overflow-y-auto px-3 pt-3">
            {products.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-[14px] rounded-2xl transition-colors duration-[120ms] ease-out hover:bg-foreground/[0.04] active:bg-foreground/[0.07] group"
              >
                <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                  <item.icon className="h-[22px] w-[22px] text-muted-foreground" strokeWidth={1.7} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[15px] font-semibold text-foreground leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[13px] text-muted-foreground leading-snug mt-0.5">
                    {item.description}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors" strokeWidth={1.8} />
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="mt-auto">
            <div className="mx-5 h-px bg-border/50" />
            <div className="px-5 py-4 flex flex-wrap gap-x-5 gap-y-1.5">
              {footerLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavigate(link.path)}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes sliceapps-drawer-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes sliceapps-drawer-out {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        @keyframes sliceapps-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sliceapps-backdrop-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </>
  );
}

export default SliceAppsHeader;
