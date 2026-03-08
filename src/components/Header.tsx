import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Moon, Sun, Languages, Menu, X, User, Link2, Settings, LogOut, Search, Check, MessageSquareHeart, Bell
} from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLanguage, Language, languageNames } from "@/lib/i18n";
import { ProfileModal } from "@/components/ProfileModal";
import { SliceLine } from "@/components/SliceLine";
import { getDefaultAvatar } from "@/lib/animeAvatars";

const allLanguages: Language[] = [
  "en", "hinglish", "hi", "ta", "te", "or",
  "fr", "de", "es", "pt", "it", "ru",
  "ar", "ja", "ko", "zh", "id", "tr"
];

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { isAdmin } = useAdminRole();

  // Fetch unread count for admin
  useEffect(() => {
    if (!isAdmin) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from("feedback_requests")
          .select("*", { count: "exact", head: true })
          .eq("is_read", false);

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_requests" },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const themeOptions = [
    { value: "light", label: "Light", swatch: "hsl(0,0%,100%)" },
    { value: "dark", label: "Dark", swatch: "hsl(240,6%,10%)" },
    { value: "maggie", label: "Maggie", swatch: "hsl(330,80%,75%)" },
    { value: "racing", label: "Racing", swatch: "hsl(55,100%,50%)" },
    { value: "meridian", label: "Meridian", swatch: "hsl(30,80%,55%)" },
    { value: "designgud", label: "Designgud", swatch: "hsl(52,100%,70%)" },
    { value: "supahero", label: "Supahero", swatch: "hsl(0,0%,96%)" },
    { value: "opencall", label: "OpenCall", swatch: "hsl(130,30%,80%)" },
    { value: "shuttle", label: "Shuttle", swatch: "linear-gradient(135deg, hsl(25,95%,55%), hsl(20,10%,7%))" },
  ];

  const themeLabelMap: Record<string, string> = { light: "Light", dark: "Dark", maggie: "Maggie", racing: "Racing", meridian: "Meridian", designgud: "Designgud", supahero: "Supahero", opencall: "OpenCall", shuttle: "Shuttle" };
  const themeLabel = themeLabelMap[resolvedTheme] || "Light";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const filteredLanguages = allLanguages.filter((lang) =>
    languageNames[lang].toLowerCase().includes(langSearch.toLowerCase())
  );

  const displayName = profile?.display_name || user?.user_metadata?.full_name;
  // Always use anime avatar - never show initials or abstract shapes
  const avatarUrl = profile?.avatar_url || getDefaultAvatar();

  const isOnDashboard = location.pathname === "/dashboard";

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-xl border-b border-border/20 safe-top max-w-[100vw]" style={{ height: '64px' }}>
      <SliceLine />
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between flex-nowrap px-4 sm:px-5">
        {/* Left Section - Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/" className="shrink-0 hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.png"
                alt="SliceURL"
                className={`h-8 w-8 rounded-lg object-contain shrink-0 ${
                  (resolvedTheme === "dark" || resolvedTheme === "racing") ? "invert brightness-110" : ""
                }`}
              />
              <span className="text-xl font-bold tracking-tight">
                <span className="text-foreground">Slice</span>
                <span className="text-muted-foreground">URL</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Right Section - Apple-style icon controls */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          {/* Theme Picker Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="h-[42px] w-[42px] flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] active:scale-[0.96] transition-all duration-150"
                aria-label={`Theme: ${themeLabel}. Click to change.`}
                title={`Theme: ${themeLabel}`}
              >
                {resolvedTheme === "opencall" ? (
                  <span className="text-base">📞</span>
                ) : resolvedTheme === "supahero" ? (
                  <span className="text-base">🦸</span>
                ) : resolvedTheme === "designgud" ? (
                  <span className="text-base">⚡</span>
                ) : resolvedTheme === "meridian" ? (
                  <span className="text-base">🧭</span>
                ) : resolvedTheme === "racing" ? (
                  <span className="text-base">🏁</span>
                ) : resolvedTheme === "maggie" ? (
                  <span className="text-base">🩷</span>
                ) : resolvedTheme === "dark" ? (
                  <Sun className="h-5 w-5" strokeWidth={1.7} />
                ) : (
                  <Moon className="h-5 w-5" strokeWidth={1.7} />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={12}
              className="w-52 p-1.5 border-0 z-[200] bg-popover/95 backdrop-blur-xl rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 8px 40px -8px rgba(0,0,0,0.16), 0 2px 12px -4px rgba(0,0,0,0.08)',
                animation: 'scale-in 120ms ease-out',
              }}
            >
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-xl transition-colors cursor-pointer ${
                    resolvedTheme === opt.value
                      ? "bg-foreground/[0.06] text-foreground font-medium"
                      : "hover:bg-foreground/[0.04] text-foreground/80"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full shrink-0 border border-foreground/10"
                    style={{ background: opt.swatch }}
                  />
                  <span className="flex-1 text-left">{opt.label}</span>
                  {resolvedTheme === opt.value && (
                    <Check className="h-3.5 w-3.5 text-foreground/50 shrink-0" />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Language Selector - Apple-style floating panel */}
          <Popover open={langOpen} onOpenChange={(open) => { setLangOpen(open); if (!open) setLangSearch(""); }}>
            <PopoverTrigger asChild>
              <button
                className="h-[42px] w-[42px] flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] active:scale-[0.96] transition-all duration-150"
                aria-label="Change language"
              >
                <Languages className="h-5 w-5" strokeWidth={1.7} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={12}
              className="w-56 p-0 border-0 z-[200] bg-popover/95 backdrop-blur-xl rounded-2xl overflow-hidden"
              style={{
                boxShadow: '0 8px 40px -8px rgba(0,0,0,0.16), 0 2px 12px -4px rgba(0,0,0,0.08)',
                animation: 'scale-in 120ms ease-out',
              }}
            >
              {/* Search */}
              <div className="p-2.5 pb-1.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                  <Input
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search language"
                    className="h-9 pl-9 text-sm bg-muted/50 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-foreground/10"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="mx-3 h-px bg-border/40" />
              
              {/* Language List */}
              <ScrollArea className="h-[220px]">
                <div className="p-1.5">
                  {filteredLanguages.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                      No languages found
                    </p>
                  ) : (
                    filteredLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang);
                          setLangOpen(false);
                          setLangSearch("");
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-[13px] rounded-xl transition-colors cursor-pointer ${
                          language === lang
                            ? "bg-foreground/[0.06] text-foreground font-medium"
                            : "hover:bg-foreground/[0.04] text-foreground/80"
                        }`}
                      >
                        <span>{languageNames[lang]}</span>
                        {language === lang && (
                          <Check className="h-3.5 w-3.5 text-foreground/50" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {user ? (
            <>
              {/* Admin Notification Bell - Clean icon, no pill background */}
              {isAdmin && (
                <button
                  onClick={() => navigate("/admin/inbox")}
                  className="h-[42px] w-[42px] flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] active:scale-[0.96] transition-all duration-150 relative"
                  aria-label="Admin Inbox"
                >
                  <Bell className="h-5 w-5" strokeWidth={1.7} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              )}
              
              {/* Separator - only visible on desktop */}
              <span className="w-px h-5 bg-border/60 hidden sm:block" />
              
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 p-0 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={avatarUrl} 
                        alt={displayName || "User"} 
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted">
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-[200px] bg-popover border border-border shadow-md rounded-[14px] p-2 z-[300]">
                  <DropdownMenuItem
                    onClick={() => setProfileOpen(true)}
                    className="cursor-pointer h-11 rounded-lg"
                  >
                    <User className="h-4 w-4 mr-2.5" />
                    {t("profile")}
                  </DropdownMenuItem>
                  {!isOnDashboard && (
                    <DropdownMenuItem
                      onClick={() => navigate("/dashboard")}
                      className="cursor-pointer h-11 rounded-lg"
                    >
                      <Link2 className="h-4 w-4 mr-2.5" />
                      {t("dashboard")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => navigate("/settings")}
                    className="cursor-pointer h-11 rounded-lg"
                  >
                    <Settings className="h-4 w-4 mr-2.5" />
                    {t("settings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/feedback")}
                    className="cursor-pointer h-11 rounded-lg"
                  >
                    <MessageSquareHeart className="h-4 w-4 mr-2.5" />
                    {t("feedback") || "Feedback"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer h-11 rounded-lg text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2.5" />
                    {t("sign_out")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Desktop Auth Buttons */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="h-9 px-3 text-sm font-medium"
                >
                  {t("sign_in")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/register")}
                  className="h-9 px-4 text-sm font-medium"
                >
                  {t("get_started")}
                </Button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="h-[42px] w-[42px] flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] active:scale-[0.96] transition-all duration-150 sm:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" strokeWidth={1.7} />
                ) : (
                  <Menu className="h-5 w-5" strokeWidth={1.7} />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu Panel - Solid background, no blur */}
      {!user && mobileMenuOpen && (
        <div 
          className="fixed left-0 right-0 z-[999] sm:hidden"
          style={{ top: '64px' }}
        >
          {/* Solid backdrop - closes menu on tap */}
          <div 
            className="fixed inset-0 bg-foreground/30"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
            style={{ top: '64px' }}
          />
          
          {/* Menu container with solid background */}
          <div className="relative mx-4 mt-3">
            <div 
              className="bg-background border border-border rounded-2xl p-4 shadow-lg flex flex-col gap-3"
            >
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/login");
                  setMobileMenuOpen(false);
                }}
                className="w-full h-12 text-base font-medium justify-center rounded-xl"
              >
                {t("sign_in")}
              </Button>
              <Button
                onClick={() => {
                  navigate("/register");
                  setMobileMenuOpen(false);
                }}
                className="w-full h-12 text-base font-medium justify-center rounded-xl"
              >
                {t("get_started")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  );
}
