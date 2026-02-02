import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { SliceLogo } from "@/components/SliceLogo";
import { AuthSuccess } from "@/components/AuthSuccess";
import { AuthLayout } from "@/components/auth/AuthLayout";

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

// Inline error component for form fields
const FieldError = ({ message }: { message?: string }) => (
  <>
    {message && (
      <div className="flex items-center gap-1.5 mt-1.5 text-destructive animate-fade-in">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{message}</span>
      </div>
    )}
  </>
);

// Form alert banner component
const FormAlertBanner = ({ alert, onDismiss }: { alert: FormAlert | null; onDismiss: () => void }) => (
  <>
    {alert && (
      <div
        className={`mb-4 p-3 rounded-xl border flex items-start gap-2.5 animate-fade-in ${
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
      </div>
    )}
  </>
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

  // Sync mode with prop when it changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      setSuccessMessage("Welcome back!");
      setShowSuccess(true);
    }
  }, [loading, user]);

  // Clear field error when user starts typing
  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (formAlert) {
      setFormAlert(null);
    }
  };

  // Validate form fields
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAlert(null);

    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      if (mode === "forgot-password") {
        const { error } = await resetPassword(email);
        if (error) {
          setFormAlert({
            type: "error",
            message: "Unable to send reset email. Please try again.",
          });
        } else {
          setFormAlert({
            type: "success",
            message: "Password reset email sent! Check your inbox.",
          });
          setTimeout(() => {
            setMode("login");
            setFormAlert(null);
          }, 2000);
        }
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, fullName.trim());
        if (error) {
          if (error.message.includes("already registered") || error.message.includes("already exists")) {
            setFormAlert({
              type: "error",
              message: "Account already exists. Please log in instead.",
              action: {
                label: "Sign in",
                onClick: () => {
                  handleModeSwitch("login");
                  setFormAlert(null);
                },
              },
            });
            setFieldErrors({ email: "This email is already registered" });
          } else if (error.message.includes("invalid") && error.message.includes("email")) {
            setFieldErrors({ email: "Please enter a valid email address" });
          } else {
            setFormAlert({
              type: "error",
              message: "Sign up failed. Please try again.",
            });
          }
        } else {
          setSuccessMessage("Account created successfully. Welcome to SliceURL!");
          setShowSuccess(true);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setFormAlert({
              type: "error",
              message: "Incorrect email or password. Please try again.",
            });
            setFieldErrors({ password: "Invalid credentials" });
          } else if (error.message.includes("Email not confirmed")) {
            setFormAlert({
              type: "info",
              message: "Please verify your email address before signing in.",
            });
          } else {
            setFormAlert({
              type: "error",
              message: "Login failed. Please check your credentials.",
            });
          }
        }
      }
    } catch (error: any) {
      setFormAlert({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
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
        setFormAlert({
          type: "error",
          message: "Google sign-in failed. Please try again.",
        });
      }
    } catch (error: any) {
      setFormAlert({
        type: "error",
        message: "Something went wrong with Google sign-in.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Show success animation before redirect
  if (showSuccess) {
    return <AuthSuccess message={successMessage} redirectTo="/dashboard" redirectDelay={800} />;
  }

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getTitle = () => {
    switch (mode) {
      case "signup": return t("create_account");
      case "forgot-password": return t("reset_password");
      default: return t("welcome_back");
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "signup": return t("signup_desc");
      case "forgot-password": return t("reset_desc");
      default: return t("signin_desc");
    }
  };

  const getInputClassName = (hasError: boolean) => {
    return `pl-12 h-[46px] text-sm border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors rounded-xl ${
      hasError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""
    }`;
  };

  return (
    <AuthLayout>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <SliceLogo size="lg" showText={false} />
        <span className="text-2xl font-semibold tracking-tight">
          <span className="text-foreground">Slice</span>
          <span className="text-muted-foreground">URL</span>
        </span>
      </Link>

      {/* Auth Card */}
      <div className="w-full bg-card border border-border rounded-2xl p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{getTitle()}</h1>
          <p className="text-muted-foreground text-sm mt-1">{getSubtitle()}</p>
        </div>

        {/* Form Alert Banner */}
        <FormAlertBanner alert={formAlert} onDismiss={() => setFormAlert(null)} />

        {/* Google OAuth Button */}
        {mode !== "forgot-password" && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 gap-3 text-foreground font-medium border-border hover:bg-muted/50 rounded-xl"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {t("continue_google")}
            </Button>

            {/* OR Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-dashed border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground font-medium">{t("or")}</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name field (signup only) */}
          {mode === "signup" && (
            <div>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("full_name")}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearFieldError("fullName");
                  }}
                  className={getInputClassName(!!fieldErrors.fullName)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <FieldError message={fieldErrors.fullName} />
            </div>
          )}

          {/* Email field */}
          <div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t("email")}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                }}
                className={getInputClassName(!!fieldErrors.email)}
                disabled={isLoading}
                autoFocus={mode !== "signup"}
              />
            </div>
            <FieldError message={fieldErrors.email} />
          </div>

          {/* Password field */}
          {mode !== "forgot-password" && (
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("password")}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  className={`${getInputClassName(!!fieldErrors.password)} pr-12`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FieldError message={fieldErrors.password} />
            </div>
          )}

          {/* Confirm password (signup only) */}
          {mode === "signup" && (
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("confirm_password")}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  className={getInputClassName(!!fieldErrors.confirmPassword)}
                  disabled={isLoading}
                />
              </div>
              <FieldError message={fieldErrors.confirmPassword} />
            </div>
          )}

          {/* Forgot password link (login only) */}
          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => handleModeSwitch("forgot-password")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {t("forgot_password")}
              </button>
            </div>
          )}

          {/* Submit button */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-xl" 
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === "forgot-password" ? t("sending") : mode === "signup" ? t("creating_account") : t("signing_in")}
              </>
            ) : (
              mode === "forgot-password" ? t("send_reset") : mode === "signup" ? t("create_account") : t("sign_in")
            )}
          </Button>

          {/* Back button (forgot-password only) */}
          {mode === "forgot-password" && (
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl" 
              onClick={() => handleModeSwitch("login")} 
              type="button"
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_signin")}
            </Button>
          )}
        </form>

        {/* Terms & Privacy (signup mode) */}
        {mode === "signup" && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("agree_terms_prefix")}{" "}
            <Link to="/terms" className="text-foreground underline hover:no-underline">
              {t("terms_of_service")}
            </Link>{" "}
            {t("and")}{" "}
            <Link to="/privacy" className="text-foreground underline hover:no-underline">
              {t("privacy_policy")}
            </Link>
          </p>
        )}

        {/* Mode switcher */}
        {mode !== "forgot-password" && (
          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? t("no_account") : t("have_account")}{" "}
              <Link
                to={mode === "login" ? "/register" : "/login"}
                className="text-foreground font-semibold underline hover:no-underline"
              >
                {mode === "login" ? t("sign_up") : t("sign_in")}
              </Link>
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default Auth;
