import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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

interface TouchedFields {
  fullName?: boolean;
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}

interface FormAlert {
  type: "error" | "success" | "info";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const SUBTITLES_LOGIN = [
  "Access your account and manage your links",
  "Track clicks and analytics in one place",
  "Manage apps, files, and URLs from one dashboard",
  "Simplify sharing with powerful link tools",
];

const SUBTITLES_SIGNUP = [
  "Create an account to start shortening links",
  "Manage and organize your links effortlessly",
  "Create secure and fast short links",
  "Simplify sharing with powerful link tools",
];

const RotatingSubtitle = ({ texts }: { texts: string[] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [texts.length]);

  return (
    <div className="mt-2 h-6 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-muted-foreground text-base absolute inset-x-0"
        >
          {texts[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

const FieldError = ({ message }: { message?: string }) => (
  <AnimatePresence mode="wait">
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -4, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -4, height: 0 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-1.5 mt-1.5 text-destructive/80"
      >
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const FormAlertBanner = ({ alert }: { alert: FormAlert | null }) => (
  <AnimatePresence mode="wait">
    {alert && (
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.2 }}
        className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 ${
          alert.type === "error"
            ? "bg-destructive/5 border-destructive/15 text-destructive/90 dark:bg-destructive/10 dark:border-destructive/20 dark:text-destructive/80"
            : alert.type === "success"
            ? "bg-success/5 border-success/15 text-success dark:bg-success/10 dark:border-success/20"
            : "bg-accent/5 border-accent/15 text-accent dark:bg-accent/10 dark:border-accent/20"
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
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [formAlert, setFormAlert] = useState<FormAlert | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { user, loading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
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

  const markTouched = (field: keyof TouchedFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const getInputClass = (field: keyof FieldErrors) => {
    const base = "h-12 text-base bg-background rounded-lg border transition-all duration-200 ease-out px-3 placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0";
    if (fieldErrors[field]) {
      return `${base} border-destructive/60 focus-visible:ring-destructive/30`;
    }
    if (touched[field]) {
      let valid = false;
      if (field === "email") valid = isEmailValid(email);
      else if (field === "fullName") valid = fullName.trim().length >= 2;
      else if (field === "password") valid = mode === "login" ? password.length > 0 : password.length >= 6;
      else if (field === "confirmPassword") valid = confirmPassword.length > 0 && confirmPassword === password;
      if (valid) return `${base} border-foreground/30 focus-visible:ring-foreground/20`;
    }
    return `${base} border-border focus-visible:ring-foreground/20`;
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    if (!email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!isEmailValid(email)) {
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

  const isFormValid = useMemo(() => {
    if (mode === "login") {
      return isEmailValid(email) && password.length > 0;
    }
    if (mode === "signup") {
      return fullName.trim().length >= 2 && isEmailValid(email) && password.length >= 6 && confirmPassword === password;
    }
    if (mode === "forgot-password") {
      return isEmailValid(email);
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
    } catch {
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
    setTouched({});
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
    } catch {
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSignup = mode === "signup";

  return (
    <div className={`bg-background flex flex-col ${isSignup ? "min-h-[100dvh]" : "h-[100dvh] overflow-hidden"}`}>
      {/* Back arrow — inside content flow, not absolute */}
      <div className="px-6 sm:px-8 pt-5">
        <div className="w-full max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 w-10 -ml-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className={`flex-1 flex flex-col ${isSignup ? "" : "justify-center"} px-6 sm:px-8 ${isSignup ? "pt-4 pb-8" : "pb-6"}`}>
        <div className="w-full max-w-sm mx-auto">
          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {mode === "signup" ? "Sign up" : mode === "forgot-password" ? "Reset password" : "Sign in"}
            </h1>
            {mode === "forgot-password" ? (
              <p className="mt-2 text-muted-foreground text-base">
                Enter your email and we'll send you a reset link
              </p>
            ) : (
              <RotatingSubtitle texts={mode === "signup" ? SUBTITLES_SIGNUP : SUBTITLES_LOGIN} />
            )}
          </div>

          {/* Form Alert */}
          <FormAlertBanner alert={formAlert} />

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Full Name (signup) */}
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Full name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); clearFieldError("fullName"); }}
                  onBlur={() => markTouched("fullName")}
                  className={getInputClass("fullName") + " w-full"}
                  disabled={isLoading}
                  autoFocus
                />
                <FieldError message={fieldErrors.fullName} />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                onBlur={() => markTouched("email")}
                className={getInputClass("email") + " w-full"}
                disabled={isLoading}
                autoFocus={mode !== "signup"}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            {/* Password */}
            {mode !== "forgot-password" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch("forgot-password")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative h-12">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                    onBlur={() => markTouched("password")}
                    className={getInputClass("password") + " pr-10 absolute inset-0 w-full"}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-opacity duration-[120ms] z-10"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError message={fieldErrors.password} />
              </div>
            )}

            {/* Confirm Password (signup) */}
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm password</label>
                <div className="relative h-12">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                    onBlur={() => markTouched("confirmPassword")}
                    className={getInputClass("confirmPassword") + " pr-10 absolute inset-0 w-full"}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-opacity duration-[120ms] z-10"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError message={fieldErrors.confirmPassword} />
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className={`w-full h-12 text-base font-medium rounded-full transition-all duration-200 ${
                isFormValid && !isLoading && !isGoogleLoading
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-foreground/40 text-background/70 cursor-not-allowed"
              }`}
              disabled={isLoading || isGoogleLoading || !isFormValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === "forgot-password" ? "Sending..." : mode === "signup" ? "Creating account..." : "Signing in..."}
                </>
              ) : (
                mode === "forgot-password" ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"
              )}
            </Button>

            {/* Back to sign in (forgot-password) */}
            {mode === "forgot-password" && (
              <Button
                variant="ghost"
                className="w-full h-12 rounded-full"
                onClick={() => handleModeSwitch("login")}
                type="button"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Button>
            )}
          </form>

          {/* Account Switcher */}
          {mode !== "forgot-password" && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <Link
                to={mode === "login" ? "/register" : "/login"}
                className="text-foreground font-semibold underline hover:no-underline"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </Link>
            </p>
          )}

          {/* Divider */}
          {mode !== "forgot-password" && (
            <div className="mt-6 mb-6 relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-muted-foreground tracking-wider text-xs uppercase">or</span>
              </div>
            </div>
          )}

          {/* Google Sign-In */}
          {mode !== "forgot-password" && (
            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-3 text-foreground font-medium border-border/60 hover:bg-muted/30 rounded-full transition-all duration-200 active:scale-[0.98] dark:bg-muted/20 dark:hover:bg-muted/40 dark:border-border/40"
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
            </div>
          )}

          {/* Consent Text */}
          {mode !== "forgot-password" && (
            <p className="mt-6 text-xs text-muted-foreground/70 text-center leading-relaxed pb-2">
              By {mode === "login" ? "signing in" : "signing up"}, you agree to our{" "}
              <Link to="/terms" className="text-muted-foreground underline hover:no-underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-muted-foreground underline hover:no-underline">
                Privacy Policy
              </Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
