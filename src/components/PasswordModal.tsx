import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";

interface PasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<boolean>;
  loading?: boolean;
  /** When true, modal cannot be dismissed - only password submission allows exit */
  locked?: boolean;
}

export function PasswordModal({ open, onOpenChange, onSubmit, loading, locked = true }: PasswordModalProps) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  // Block browser back button when modal is locked and open
  useEffect(() => {
    if (!locked || !open) return;

    window.history.pushState({ passwordLock: true }, '');

    const handlePopState = () => {
      if (open && locked) {
        window.history.pushState({ passwordLock: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, locked]);

  // Block beforeunload when locked
  useEffect(() => {
    if (!locked || !open) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [open, locked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(t("enter_password"));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const success = await onSubmit(password);
      
      if (!success) {
        setError(t("wrong_password"));
        setPassword("");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (locked && open && !newOpen) {
      return;
    }
    onOpenChange(newOpen);
  };

  const isButtonDisabled = verifying || loading || !password.trim();

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleOpenChange}
      modal={true}
    >
      <DialogContent 
        className="sm:max-w-[340px] p-5 rounded-2xl shadow-lg border border-border/50 bg-background"
        hideCloseButton={locked}
        onPointerDownOutside={locked ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={locked ? (e) => e.preventDefault() : undefined}
        onInteractOutside={locked ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="space-y-2 pb-2">
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-5 w-5 text-foreground/70" />
            </div>
          </div>
          <DialogTitle className="text-center text-base font-semibold">
            {t("password_required")}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
            Enter the password to access this link
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <motion.div 
            className="space-y-1.5"
            animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <Label htmlFor="link-password" className="text-xs font-medium">
              {t("password")}
            </Label>
            <div className="relative">
              <Input
                id="link-password"
                type={showPassword ? "text" : "password"}
                placeholder={t("enter_password")}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className={`h-9 pr-9 text-sm ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                autoFocus
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive flex items-center gap-1 pt-0.5"
              >
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error}
              </motion.p>
            )}
          </motion.div>

          <Button 
            type="submit" 
            className="w-full h-9 text-sm font-medium" 
            disabled={isButtonDisabled}
          >
            {verifying || loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t("verifying")}</>
            ) : (
              t("unlock_link")
            )}
          </Button>
        </form>

        {/* Branding footer */}
        <div className="pt-3 pb-1">
          <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1">
            <Lock className="h-2.5 w-2.5" />
            Protected by SliceURL
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
