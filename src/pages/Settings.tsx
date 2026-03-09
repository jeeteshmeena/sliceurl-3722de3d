import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Mail, Lock, KeyRound, Monitor, LogOut, Globe,
  Eye, Shield, RefreshCw, AlertTriangle, Pencil, Loader2, Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlidingToggle } from "@/components/ui/sliding-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SettingsPageSkeleton } from "@/components/Skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, SecurityMode } from "@/hooks/useProfile";
import { useLinkBehavior } from "@/hooks/useLinkBehavior";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
  { code: "ru", name: "Русский" },
  { code: "tr", name: "Türkçe" },
  { code: "id", name: "Bahasa Indonesia" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { 
    linkPreviewEnabled, 
    securityMode: behaviorSecurityMode, 
    updateLinkPreview, 
    updateSecurityMode: updateBehaviorSecurityMode 
  } = useLinkBehavior();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const resolvedTheme = theme === "system" ? "light" : theme;

  // Dialog states
  const [langOpen, setLangOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [forgotPasswordDialogOpen, setForgotPasswordDialogOpen] = useState(false);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);

  // Edit mode states
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  // Form field states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preference states (LOCAL - critical for toggle behavior)
  const [localLinkPreview, setLocalLinkPreview] = useState(false);
  const [localSecurityMode, setLocalSecurityMode] = useState<SecurityMode>("warn");
  const [localAutoRefresh, setLocalAutoRefresh] = useState(true);

  // Identity states
  const [googleIdentity, setGoogleIdentity] = useState<any>(null);
  const [hasPassword, setHasPassword] = useState(false);

  // Derived values
  const scheduledDeletionAt = profile?.scheduled_deletion_at 
    ? new Date(profile.scheduled_deletion_at) 
    : null;
  const isScheduledForDeletion = !!scheduledDeletionAt;
  const currentLangLabel = LANGUAGES.find(l => l.code === language)?.name || "English";

  // Initialize form values from user/profile
  useEffect(() => {
    if (user) {
      const name = profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || "";
      setDisplayName(name);
      setEmail(user.email || "");
      setOriginalEmail(user.email || "");
      
      // Check identities
      supabase.auth.getUserIdentities().then(({ data }) => {
        const google = data?.identities?.find(i => i.provider === 'google');
        setGoogleIdentity(google || null);
        const emailProvider = data?.identities?.find(i => i.provider === 'email');
        setHasPassword(!!emailProvider);
      });
    }
  }, [user, profile]);

  // Sync local toggle states from profile/hook
  useEffect(() => {
    setLocalLinkPreview(linkPreviewEnabled);
  }, [linkPreviewEnabled]);

  useEffect(() => {
    // Map behavior security mode to local state
    setLocalSecurityMode(behaviorSecurityMode === 'strict' ? 'strict' : 'warn');
  }, [behaviorSecurityMode]);

  useEffect(() => {
    if (profile) {
      setLocalAutoRefresh(profile.auto_dashboard_refresh ?? true);
    }
  }, [profile]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSaveName = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({ display_name: displayName || null });
    setIsSaving(false);

    if (error) {
      toast.error("Failed to save name");
    } else {
      toast.success("Name updated");
      setEditingName(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || email.trim() === originalEmail) {
      setEditingEmail(false);
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setIsSaving(false);

    if (error) {
      toast.error(error.message);
      setEmail(originalEmail);
    } else {
      toast.success("Verification email sent to " + email);
      setEditingEmail(false);
      setPendingEmail(email.trim());
    }
  };

  const handleChangePassword = async () => {
    // Validate
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsChangingPassword(true);

    // For users with existing password, verify current password
    if (hasPassword) {
      if (!currentPassword) {
        toast.error("Please enter your current password");
        setIsChangingPassword(false);
        return;
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: originalEmail,
        password: currentPassword,
      });
      
      if (signInError) {
        toast.error("Current password is incorrect");
        setIsChangingPassword(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(hasPassword ? "Password changed" : "Password set");
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      toast.error("No email address found");
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSendingReset(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent to " + user.email);
      setForgotPasswordDialogOpen(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    setIsSigningOutAll(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success("Signed out from all devices");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
    } finally {
      setIsSigningOutAll(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return;
    
    setIsUnlinkingGoogle(true);
    try {
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;
      toast.success("Google account unlinked");
      setGoogleIdentity(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to unlink Google");
    } finally {
      setIsUnlinkingGoogle(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out");
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    const { error } = await updateProfile({ scheduled_deletion_at: deletionDate.toISOString() });

    if (error) {
      toast.error(error.message);
    } else {
      // Fire and forget - send deletion email
      supabase.functions.invoke('send-deletion-email', {
        body: { email: user?.email, deletionDate: deletionDate.toISOString() }
      }).catch(() => {});
      
      toast.success("Account scheduled for deletion in 30 days");
      setDeleteDialogOpen(false);
    }
  };

  const handleCancelDeletion = async () => {
    const { error } = await updateProfile({ scheduled_deletion_at: null });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Deletion cancelled");
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TOGGLE HANDLERS (Optimistic Update Pattern)
  // ═══════════════════════════════════════════════════════════════════════════

  const handleLinkPreviewChange = async (checked: boolean) => {
    setLocalLinkPreview(checked); // 1. Optimistic update
    await updateLinkPreview(checked); // 2. Update behavior hook
    const { error } = await updateProfile({ link_preview_enabled: checked }); // 3. Save to profile
    if (error) {
      toast.error("Failed to update preference");
      setLocalLinkPreview(!checked); // 4. Rollback on error
    }
  };

  const handleSecurityModeChange = async (value: SecurityMode) => {
    setLocalSecurityMode(value);
    const behaviorMode = value === 'strict' ? 'strict' : 'warn';
    await updateBehaviorSecurityMode(behaviorMode);
    const { error } = await updateProfile({ security_mode: value });
    if (error) {
      toast.error("Failed to update security mode");
      setLocalSecurityMode(profile?.security_mode || 'warn');
    }
  };

  const handleAutoRefreshChange = async (checked: boolean) => {
    setLocalAutoRefresh(checked);
    const { error } = await updateProfile({ auto_dashboard_refresh: checked });
    if (error) {
      toast.error("Failed to update preference");
      setLocalAutoRefresh(!checked);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  if ((authLoading || profileLoading) && !profile) {
    return <SettingsPageSkeleton />;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
             {t("back")}
          </Button>

          {/* Page Header */}
          <div>
             <h1 className="text-2xl font-semibold text-foreground">
               {t("settings")}
             </h1>
             <p className="text-sm text-muted-foreground mt-1">
               {t("manage_account_preferences")}
             </p>
          </div>

          {/* Deletion Warning Banner */}
          {scheduledDeletionAt && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                     Account scheduled for deletion
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Your account will be permanently deleted on {scheduledDeletionAt.toLocaleDateString()}. Log in within 30 days to cancel.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDeletion}
                    className="mt-3 h-8 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    {t("cancel_deletion")}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PROFILE INFORMATION SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-secondary rounded-xl border border-border p-5 space-y-5"
          >
             <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
               {t("profile_information")}
             </h2>

            {/* Name Field */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                 {t("name")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("your_name")}
                  disabled={!editingName}
                  className="bg-card border-input text-foreground h-9 text-sm flex-1"
                />
                {editingName ? (
                  <>
                    <Button
                      size="sm"
                       className="h-9 px-3 bg-primary text-primary-foreground"
                      onClick={handleSaveName}
                      disabled={isSaving}
                    >
                      {isSaving ? "..." : t("save")}
                    </Button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground px-2"
                      onClick={() => {
                        setDisplayName(profile?.display_name || user?.user_metadata?.full_name || "");
                        setEditingName(false);
                      }}
                    >
                       {t("cancel")}
                    </button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0"
                    onClick={() => setEditingName(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                 {t("email_address")}
               </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("your_email")}
                  disabled={!editingEmail}
                  className="bg-card border-input text-foreground h-9 text-sm flex-1"
                />
                {editingEmail ? (
                  <>
                    <Button
                      size="sm"
                      className="h-9 px-3 bg-primary text-primary-foreground"
                      onClick={handleSaveEmail}
                      disabled={isSaving}
                    >
                      {isSaving ? "..." : t("send")}
                    </Button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground px-2"
                      onClick={() => {
                        setEmail(originalEmail);
                        setEditingEmail(false);
                      }}
                    >
                       {t("cancel")}
                    </button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0"
                    onClick={() => setEditingEmail(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {pendingEmail && pendingEmail !== originalEmail && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Verification email sent to {pendingEmail}. Check your inbox.
                </p>
              )}
            </div>
          </motion.section>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* SECURITY SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-secondary rounded-xl border border-border p-5 space-y-5"
          >
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Security
            </h2>

            {/* Password Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-secondary-foreground">Password</span>
                  {!hasPassword && googleIdentity && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No password set - using Google login
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
                className="h-8 px-3 text-xs border-border text-secondary-foreground hover:bg-muted"
              >
                {hasPassword ? "Change Password" : "Set Password"}
              </Button>
            </div>

            {/* Forgot Password Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-secondary-foreground">Forgot Password</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setForgotPasswordDialogOpen(true)}
                className="h-8 px-3 text-xs border-border text-secondary-foreground hover:bg-muted"
              >
                Send Reset Email
              </Button>
            </div>

            {/* Sessions Subsection */}
            <div className="pt-3 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Sessions
              </h3>

              {/* Current Device Card */}
              <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    {/Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                    ) : (
                      <Monitor className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {/Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Mobile" : "Desktop"} • Active now
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">Current session</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleSignOutAllDevices}
                disabled={isSigningOutAll}
                className="w-full h-8 text-xs border-border text-secondary-foreground hover:bg-muted"
              >
                {isSigningOutAll ? "Signing out..." : "Sign out from all devices"}
              </Button>
            </div>

            {/* Connected Accounts Subsection */}
            {googleIdentity && (
              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Connected Accounts
                </h3>

                <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-card flex items-center justify-center border border-border">
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Google</p>
                      <p className="text-xs text-muted-foreground">
                        {googleIdentity.identity_data?.email || 'Connected'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlinkGoogle}
                    disabled={isUnlinkingGoogle}
                    className="h-8 px-3 text-xs border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {isUnlinkingGoogle ? "..." : "Unlink"}
                  </Button>
                </div>
              </div>
            )}

            {/* Logout Row */}
          </motion.section>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PREFERENCES SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-secondary rounded-xl border border-border p-5 space-y-5"
          >
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Preferences
            </h2>

            {/* Language Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-secondary-foreground">Language</span>
              </div>
              <Popover open={langOpen} onOpenChange={setLangOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-border text-secondary-foreground hover:bg-muted"
                  >
                    {currentLangLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  align="end" 
                  sideOffset={4}
                  className="w-44 p-1 bg-popover border-border"
                >
                  <ScrollArea className="h-48">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as any);
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          language === lang.code
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Theme Toggle Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-secondary-foreground">Theme</span>
              </div>
              <ThemeToggle />
            </div>

            {/* Link Preview Toggle Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-secondary-foreground">Link Preview</span>
                  <p className="text-xs text-muted-foreground">
                    Show preview before redirecting
                  </p>
                </div>
              </div>
              <SlidingToggle
                checked={localLinkPreview}
                onCheckedChange={handleLinkPreviewChange}
              />
            </div>

            {/* Security Mode Select Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-secondary-foreground">Security Mode</span>
                  <p className="text-xs text-muted-foreground">
                    URL safety checking level
                  </p>
                </div>
              </div>
              <Select 
                value={localSecurityMode} 
                onValueChange={(v) => handleSecurityModeChange(v as SecurityMode)}
              >
                <SelectTrigger className="w-24 h-8 text-xs bg-card border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="disable">Off</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto Dashboard Refresh Toggle Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm text-secondary-foreground">Auto Dashboard Refresh</span>
                  <p className="text-xs text-muted-foreground">
                    Automatically refresh dashboard data
                  </p>
                </div>
              </div>
              <SlidingToggle
                checked={localAutoRefresh}
                onCheckedChange={handleAutoRefreshChange}
              />
            </div>
          </motion.section>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* DANGER ZONE SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border-2 border-destructive/30 p-5 space-y-4"
          >
            <h2 className="text-sm font-medium text-destructive uppercase tracking-wide">
              Danger Zone
            </h2>
            <p className="text-xs text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isScheduledForDeletion}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          </motion.section>
        </div>
      </main>

      <Footer />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PASSWORD DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle>
              {hasPassword ? "Change Password" : "Set Password"}
            </DialogTitle>
            <DialogDescription className="mb-2">
              {hasPassword
                ? "Enter your current password and choose a new one."
                : "Create a password to enable email/password login alongside Google."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {hasPassword && (
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-card"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{hasPassword ? "New Password" : "Password"}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={hasPassword ? "Enter new password" : "Create a password"}
                  className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-card"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="bg-primary text-primary-foreground"
            >
              {isChangingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {hasPassword ? "Change Password" : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FORGOT PASSWORD DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={forgotPasswordDialogOpen} onOpenChange={setForgotPasswordDialogOpen}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              We'll send a password reset link to your email address.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-secondary rounded-lg p-3 flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-secondary-foreground">{user?.email}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendResetEmail} disabled={isSendingReset}>
              {isSendingReset ? "Sending..." : "Send Reset Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DELETE ACCOUNT DIALOG */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This action will start a 30-day recovery period. You can reactivate your account anytime within 30 days by logging back in.
                </p>
                <p>
                  After 30 days, your account and all associated data will be permanently deleted, including:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your user account</li>
                  <li>All shortened links</li>
                  <li>All analytics data</li>
                  <li>All settings and records</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
