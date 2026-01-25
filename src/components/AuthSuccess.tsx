import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuthSuccessProps {
  message?: string;
  redirectTo?: string;
  redirectDelay?: number;
}

export function AuthSuccess({ 
  message = "Welcome back!", 
  redirectTo = "/dashboard",
  redirectDelay = 800 
}: AuthSuccessProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(redirectTo, { replace: true });
    }, redirectDelay);

    return () => clearTimeout(timer);
  }, [navigate, redirectTo, redirectDelay]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      {/* Success Checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 20 
        }}
        className="relative"
      >
        {/* Outer ring pulse */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.2, 1],
            opacity: [0, 0.3, 0]
          }}
          transition={{ 
            duration: 0.8,
            times: [0, 0.5, 1],
            repeat: 1,
            repeatDelay: 0.2
          }}
          className="absolute inset-0 rounded-full bg-foreground/10"
          style={{ 
            width: 80, 
            height: 80,
            margin: -8
          }}
        />
        
        {/* Inner circle with checkmark */}
        <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Check 
              className="h-8 w-8 text-foreground" 
              strokeWidth={3} 
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="mt-6 text-lg font-medium text-foreground"
      >
        {message}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-2 text-sm text-muted-foreground"
      >
        Redirecting...
      </motion.p>
    </motion.div>
  );
}

// Minimal spinner for auth loading states
export function AuthLoading({ message = "Signing you in..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 border-2 border-muted-foreground/20 border-t-foreground rounded-full"
      />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
