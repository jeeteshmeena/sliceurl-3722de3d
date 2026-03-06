import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Loader2, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { AuthSuccess } from "@/components/AuthSuccess";

type AuthMode = "login" | "signup" | "forgot-password";

interface AuthProps {
  mode?: "login" | "signup";
}

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface FormAlert {
  type: "error" | "success" | "info";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Inline error component
const FieldError = ({ message }: { message?: string }) => (
  <AnimatePresence mode="wait">
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -4, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -4, height: 0 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-1.5 mt-1.5 text-destructive"
      >
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

// Form alert banner
const FormAlertBanner = ({ alert }: { alert: FormAlert | null }) => (
  <AnimatePresence mode="wait">
    {alert && (
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.2 }}
        className={`mb-5 p-3 rounded-xl border flex items-start gap-2.5 ${
          alert.type === "error"
            ? "bg-destructive/5 border-destructive/20 text-destructive"
            : alert.type === "success"
            ? "bg-green-500/5 border-green-500/20 text-green-600 dark:text-green-400"
            : "bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400"
        }`}
      >
        {alert.type === "error" ? (
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 text-sm">
          <span>{alert.message}</span>
          {alert.action && (
            <button
              type="button"
              onClick={alert.action.onClick}
              className="ml-1 font-semibold underline hover:no-underline"
            >
              {alert.action.label}
            </button>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Auth = ({ mode: initialMode = "login" }: AuthProps) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formAlert, setFormAlert] = useState<FormAlert | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  const { user, loading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!loading && user) {
      setSuccessMessage("Welcome back!");
      setShowSuccess(true);
    }
  }, [loading, user]);

  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (formAlert) setFormAlert(null);
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    if (!email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (mode === "signup") {
      if (!fullName.trim()) {
        errors.fullName = "Full name is required";
        isValid = false;
      } else if (fullName.trim().length < 2) {
        errors.fullName = "Name must be at least 2 characters";
        isValid = false;
      }
      if (!password) {
        errors.password = "Password is required";
        isValid = false;
      } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters";
        isValid = false;
      }
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
        isValid = false;
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
        isValid = false;
      }
    }

    if (mode === "login") {
      if (!password) {
        errors.password = "Password is required";
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  // Check if primary button should be active
  const isFormValid = useMemo(() => {
    if (mode === "login") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length > 0;
    }
    if (mode === "signup") {
      return fullName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6 && confirmPassword === password;
    }
    if (mode === "forgot-password") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    return false;
  }, [mode, email, password, fullName, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAlert(null);
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (mode === "forgot-password") {
        const { error } = await resetPassword(email);
        if (error) {
          setFormAlert({ type: "error", message: "Unable to send reset email. Please try again." });
        } else {
          setFormAlert({ type: "success", message: "Password reset email sent! Check your inbox." });
          setTimeout(() => { setMode("login"); setFormAlert(null); }, 2000);
        }
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, fullName.trim());
        if (error) {
          if (error.message.includes("already registered") || error.message.includes("already exists")) {
            setFormAlert({
              type: "error",
              message: "Account already exists. Please log in instead.",
              action: { label: "Sign in", onClick: () => { handleModeSwitch("login"); setFormAlert(null); } },
            });
            setFieldErrors({ email: "This email is already registered" });
          } else if (error.message.includes("invalid") && error.message.includes("email")) {
            setFieldErrors({ email: "Please enter a valid email address" });
          } else {
            setFormAlert({ type: "error", message: "Sign up failed. Please try again." });
          }
        } else {
          setSuccessMessage("Account created successfully. Welcome to SliceURL!");
          setShowSuccess(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setFormAlert({ type: "error", message: "Incorrect email or password. Please try again." });
            setFieldErrors({ password: "Invalid credentials" });
          } else if (error.message.includes("Email not confirmed")) {
            setFormAlert({ type: "info", message: "Please verify your email address before signing in." });
          } else {
            setFormAlert({ type: "error", message: "Login failed. Please check your credentials." });
          }
        }
      }
    } catch (error: any) {
      setFormAlert({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setFormAlert(null);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setFormAlert(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setFormAlert({ type: "error", message: "Google sign-in failed. Please try again." });
      }
    } catch (error: any) {
      setFormAlert({ type: "error", message: "Something went wrong with Google sign-in." });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (showSuccess) {
    return <AuthSuccess message={successMessage} redirectTo="/dashboard" redirectDelay={800} />;
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputBaseClass = "h-12 text-base rounded-xl border bg-muted/50 border-border px-4 transition-all duration-150 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 placeholder:text-muted-foreground/50";

  const getInputClassName = (hasError: boolean) =>
    `${inputBaseClass} ${hasError ? "border-destructive focus:border-destructive focus:ring-destructive/15" : ""}`;

  return (
    <div className="min-h-dvh bg-background flex flex-col overflow-y-auto">
      {/* Back arrow */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-foreground hover:text-foreground/70 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 sm:px-8 pt-6 pb-8 max-w-md mx-auto w-full">
        {/* Title + Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {mode === "signup" ? "Sign up" : mode === "forgot-password" ? "Reset password" : "Sign in"}
          </h1>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            {mode === "signup"
              ? "Create an account to start shortening links"
              : mode === "forgot-password"
              ? "Enter your email to receive a reset link"
              : "Access your account and manage your links"}
          </p>
        </motion.div>

        {/* Form Alert */}
        <FormAlertBanner alert={formAlert} />

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          {/* Full Name (signup) */}
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); clearFieldError("fullName"); }}
                className={getInputClassName(!!fieldErrors.fullName)}
                disabled={isLoading}
                autoFocus
              />
              <FieldError message={fieldErrors.fullName} />
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
              className={getInputClassName(!!fieldErrors.email)}
              disabled={isLoading}
              autoFocus={mode !== "signup"}
            />
            <FieldError message={fieldErrors.email} />
          </div>

          {/* Password */}
          {mode !== "forgot-password" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("forgot-password")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                  className={`${getInputClassName(!!fieldErrors.password)} pr-12`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-opacity duration-[120ms]"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              <FieldError message={fieldErrors.password} />
            </div>
          )}

          {/* Confirm password (signup) */}
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                  className={`${getInputClassName(!!fieldErrors.confirmPassword)} pr-12`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-opacity duration-[120ms]"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              <FieldError message={fieldErrors.confirmPassword} />
            </div>
          )}

          {/* Primary Button */}
          <Button
            type="submit"
            className={`w-full h-12 text-base font-medium rounded-full transition-colors ${
              isFormValid && !isLoading
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
            disabled={isLoading || isGoogleLoading || !isFormValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === "forgot-password" ? "Sending..." : mode === "signup" ? "Creating account..." : "Signing in..."}
              </>
            ) : (
              mode === "forgot-password" ? "Send reset link" : mode === "signup" ? "Sign up" : "Sign in"
            )}
          </Button>

          {/* Back for forgot password */}
          {mode === "forgot-password" && (
            <Button
              variant="ghost"
              className="w-full h-12"
              onClick={() => handleModeSwitch("login")}
              type="button"
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </Button>
          )}

          {/* Account switch text - directly below button */}
          {mode !== "forgot-password" && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <Link
                to={mode === "login" ? "/register" : "/login"}
                className="text-foreground font-semibold hover:underline"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </Link>
            </p>
          )}

          {/* Social Login */}
          {mode !== "forgot-password" && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-dashed border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-4 text-muted-foreground font-medium">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-3 text-foreground font-medium border-border rounded-xl hover:bg-muted/50"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </Button>
            </>
          )}
        </form>

        {/* Terms text at bottom */}
        {mode !== "forgot-password" && (
          <p className="text-center text-[11px] text-muted-foreground/70 mt-auto pt-6">
            By {mode === "login" ? "logging in" : "signing up"}, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
