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

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

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
    <header className="fixed top-0 left-0 right-0 z-[100] bg-background border-b border-border/40 safe-top max-w-[100vw] overflow-x-hidden" style={{ height: '64px' }}>
      <SliceLine />
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between flex-nowrap">
        {/* Left Section - Brand */}
        <div className="flex items-center gap-3 shrink-0 ml-2 sm:ml-4">
          <Link to="/" className="shrink-0 hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2">
              <img
                src="/favicon.png"
                alt="SliceURL"
                className={`h-8 w-8 rounded-lg object-contain shrink-0 ${
                  resolvedTheme === "dark" ? "invert brightness-110" : ""
                }`}
              />
              <span className="text-xl font-bold tracking-tight">
                <span className="text-foreground">Slice</span>
                <span className="text-muted-foreground">URL</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Right Section - Clean icon layout with consistent spacing */}
        <div className="flex items-center gap-3 shrink-0 mr-2 sm:mr-4 flex-nowrap">
          {/* Theme Toggle - Clean icon, no pill background */}
          <button
            onClick={handleThemeToggle}
            className="h-9 w-9 flex items-center justify-center text-foreground"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>

          {/* Language Selector - Clean icon, no pill background */}
          <Popover open={langOpen} onOpenChange={setLangOpen}>
            <PopoverTrigger asChild>
              <button
                className="h-9 w-9 flex items-center justify-center text-foreground"
                aria-label="Change language"
              >
                <Languages className="h-[18px] w-[18px]" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="w-52 p-2 bg-popover border border-border shadow-lg overflow-hidden"
              style={{ borderRadius: '16px', maxHeight: '320px' }}
            >
              {/* Search Input */}
              <div className="pb-2 mb-1 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder={t("search_language") || "Search..."}
                    className="h-8 pl-8 text-sm bg-background border-border/60 rounded-lg"
                  />
                </div>
              </div>
              
              {/* Language List - scrollable */}
              <div className="overflow-y-auto" style={{ maxHeight: '252px' }}>
                {filteredLanguages.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground text-center">
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        language === lang
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <span>{languageNames[lang]}</span>
                      {language === lang && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {user ? (
            <>
              {/* Admin Notification Bell - Clean icon, no pill background */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin/inbox")}
                  className="h-9 w-9 rounded-full relative hover:bg-muted/50"
                  aria-label="Admin Inbox"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
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
                className="h-9 w-9 flex items-center justify-center text-foreground sm:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
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
