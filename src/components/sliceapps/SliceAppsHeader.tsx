import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Link2, HardDrive, FileDown, Search, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
  { label: "SliceURL", icon: Link2, path: "/" },
  { label: "SliceBox", icon: HardDrive, path: "/slicebox" },
  { label: "LittleSlice", icon: FileDown, path: "/littleslice" },
];

export function SliceAppsHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Header — always sticky, App Store style */}
      <header
        className="lg:hidden"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 999,
          background: '#f5f5f7',
          height: 56,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="dark:hidden" style={{ position: 'absolute', inset: 0, background: '#f5f5f7' }} />
        <div className="hidden dark:block" style={{ position: 'absolute', inset: 0, background: '#1c1c1e' }} />
        <div
          className="relative flex items-center justify-between"
          style={{ height: 56, paddingLeft: 16, paddingRight: 16 }}
        >
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex flex-col items-start justify-center gap-[5px] pl-1"
            aria-label="Open menu"
          >
            <span className="w-5 h-[2.5px] bg-[#007AFF] rounded-full" />
            <span className="w-3.5 h-[2.5px] bg-[#007AFF] rounded-full" />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <span className="text-[17px] font-semibold text-foreground tracking-tight">SliceAPPs</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Mobile Slide Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[1000] bg-black/[0.35] lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-[1001] w-[80vw] max-w-[340px] bg-background lg:hidden"
            >
              <div className="h-14 flex items-center justify-between px-5 border-b border-border/30">
                <button onClick={() => setMenuOpen(false)} className="w-10 h-10 flex items-center justify-center" aria-label="Close menu">
                  <X className="w-6 h-6 text-[#007AFF]" strokeWidth={2} />
                </button>
                <span className="text-[17px] font-semibold text-foreground tracking-tight">SliceAPPs</span>
                <div className="w-10" />
              </div>
              <nav className="pt-2">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setMenuOpen(false); navigate(item.path); }}
                    className="w-full h-[52px] flex items-center gap-[14px] pl-5 text-left"
                  >
                    <item.icon className="h-6 w-6 text-[#007AFF]" strokeWidth={1.5} />
                    <span className="text-[16px] font-medium text-foreground">{item.label}</span>
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/** Desktop Sidebar - rendered inside AppPage layout */
export function SliceAppsSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-[200px] min-w-[200px] border-r border-border/30 bg-background h-screen sticky top-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-[15px] font-semibold text-foreground tracking-tight">SliceAPPs</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 mb-3">
        <div className="flex items-center gap-2 h-[30px] px-2.5 rounded-md bg-muted/60">
          <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" strokeWidth={2} />
          <span className="text-[13px] text-muted-foreground">Search</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 space-y-0.5">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-3 px-2.5 py-[7px] rounded-md text-left hover:bg-muted/50 transition-colors"
          >
            <item.icon className="h-[18px] w-[18px] text-[#007AFF]" strokeWidth={1.8} />
            <span className="text-[13px] text-foreground">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default SliceAppsHeader;
