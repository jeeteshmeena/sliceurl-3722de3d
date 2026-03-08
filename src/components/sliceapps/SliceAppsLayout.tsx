import { useState, ReactNode } from "react";
import {
  Menu,
  Search,
  Star,
  Gamepad2,
  LayoutGrid,
  Sparkles,
  Camera,
  Heart,
  Briefcase,
  Clapperboard,
  Zap,
  Mountain,
  Grid3x3,
  Circle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SliceAppsLayoutProps {
  children: ReactNode;
}

const mainNav = [
  { label: "Today", icon: Star },
  { label: "Games", icon: Gamepad2 },
  { label: "Apps", icon: LayoutGrid },
  { label: "Arcade", icon: Sparkles },
];

const categories = [
  { label: "Photo & Video", icon: Camera },
  { label: "Health & Fitness", icon: Heart },
  { label: "Productivity", icon: Briefcase },
  { label: "Entertainment", icon: Clapperboard },
  { label: "Action", icon: Zap },
  { label: "Adventure", icon: Mountain },
  { label: "Puzzle", icon: Grid3x3 },
  { label: "Indie", icon: Circle },
];

function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 mb-5">
        <div className="flex items-center gap-2.5 px-3 h-[34px] rounded-lg bg-muted/70">
          <Search className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="text-[13px] text-muted-foreground">Search</span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="px-2 space-y-0.5">
        {mainNav.map((item) => (
          <button
            key={item.label}
            onClick={onItemClick}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium text-foreground/80 hover:bg-muted/60 transition-colors"
          >
            <item.icon className="h-[18px] w-[18px] text-accent" strokeWidth={1.6} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Categories */}
      <div className="mt-6 px-4 mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Categories
        </p>
      </div>
      <nav className="px-2 space-y-0.5 pb-6">
        {categories.map((item) => (
          <button
            key={item.label}
            onClick={onItemClick}
            className="w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] text-foreground/70 hover:bg-muted/50 transition-colors"
          >
            <item.icon className="h-[16px] w-[16px] text-muted-foreground" strokeWidth={1.6} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export function SliceAppsLayout({ children }: SliceAppsLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop: sidebar + content */}
      <div className="hidden lg:flex">
        <aside className="w-[220px] flex-shrink-0 border-r border-border/40 h-screen sticky top-0 pt-4 overflow-y-auto bg-sidebar">
          <div className="px-4 mb-4 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-accent" strokeWidth={1.8} />
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
              SliceAPPs
            </h2>
          </div>
          <SidebarNav />
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile/Tablet: header + content */}
      <div className="lg:hidden">
        {/* Mobile header */}
        <header className="sticky top-0 z-50 h-12 flex items-center justify-between px-4 bg-background/95 backdrop-blur-md border-b border-border/30">
          <button
            onClick={() => setMenuOpen(true)}
            className="h-10 w-10 flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-[22px] w-[22px]" strokeWidth={1.7} />
          </button>

          <span className="text-[15px] font-semibold text-foreground tracking-tight">
            SliceAPPs
          </span>

          <button
            className="h-10 w-10 flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
            aria-label="Search"
          >
            <Search className="h-[20px] w-[20px]" strokeWidth={1.7} />
          </button>
        </header>

        <main>{children}</main>

        {/* Mobile slide-in menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            side="left"
            className="w-[280px] bg-background/98 backdrop-blur-xl border-border/30 p-0 pt-5"
          >
            <SheetHeader className="px-4 pb-3">
              <SheetTitle className="text-left text-[17px] font-semibold text-foreground flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-accent" strokeWidth={1.8} />
                SliceAPPs
              </SheetTitle>
            </SheetHeader>
            <SidebarNav onItemClick={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default SliceAppsLayout;
