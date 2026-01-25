import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Globe,
  Activity,
  LogIn,
  Database,
  Upload,
  Download,
  Link2
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down" | "checking";
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export default function Status() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Website", status: "checking", icon: Globe, description: "Main website and pages" },
    { name: "Authentication", status: "checking", icon: LogIn, description: "Login and signup" },
    { name: "Database", status: "checking", icon: Database, description: "Data storage" },
    { name: "File Upload", status: "checking", icon: Upload, description: "SliceBox uploads" },
    { name: "File Download", status: "checking", icon: Download, description: "SliceBox downloads" },
    { name: "Redirect Engine", status: "checking", icon: Link2, description: "Short link redirects" },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkServices = async () => {
    setIsChecking(true);
    
    // Update all to checking state
    setServices(prev => prev.map(s => ({ ...s, status: "checking" as const })));

    const results: ServiceStatus[] = [];

    // 1. Website - if this page loaded, website is operational
    results.push({ 
      name: "Website", 
      status: "operational", 
      icon: Globe, 
      description: "Main website and pages" 
    });

    // 2. Authentication - check auth endpoint
    let authStatus: "operational" | "degraded" | "down" = "down";
    try {
      const { error } = await supabase.auth.getSession();
      authStatus = error ? "degraded" : "operational";
    } catch {
      authStatus = "down";
    }
    results.push({ 
      name: "Authentication", 
      status: authStatus, 
      icon: LogIn, 
      description: "Login and signup" 
    });

    // 3. Database - query links table
    let dbStatus: "operational" | "degraded" | "down" = "down";
    try {
      const { error } = await supabase.from("links_safe").select("id").limit(1);
      dbStatus = error ? "degraded" : "operational";
    } catch {
      dbStatus = "down";
    }
    results.push({ 
      name: "Database", 
      status: dbStatus, 
      icon: Database, 
      description: "Data storage" 
    });

    // 4. File Upload - check slicebox-upload-url function
    let uploadStatus: "operational" | "degraded" | "down" = "down";
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slicebox-upload-url`, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });
      uploadStatus = response.ok || response.status === 204 ? "operational" : "degraded";
    } catch {
      uploadStatus = "down";
    }
    results.push({ 
      name: "File Upload", 
      status: uploadStatus, 
      icon: Upload, 
      description: "SliceBox uploads" 
    });

    // 5. File Download - check slicebox-download function
    let downloadStatus: "operational" | "degraded" | "down" = "down";
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slicebox-download`, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });
      downloadStatus = response.ok || response.status === 204 ? "operational" : "degraded";
    } catch {
      downloadStatus = "down";
    }
    results.push({ 
      name: "File Download", 
      status: downloadStatus, 
      icon: Download, 
      description: "SliceBox downloads" 
    });

    // 6. Redirect Engine - check redirect function
    let redirectStatus: "operational" | "degraded" | "down" = "down";
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redirect`, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });
      redirectStatus = response.ok || response.status === 204 ? "operational" : "degraded";
    } catch {
      redirectStatus = "down";
    }
    results.push({ 
      name: "Redirect Engine", 
      status: redirectStatus, 
      icon: Link2, 
      description: "Short link redirects" 
    });

    setServices(results);
    setLastChecked(new Date());
    setIsChecking(false);
  };

  useEffect(() => {
    checkServices();
    // Auto-refresh every 60 seconds
    const interval = setInterval(checkServices, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "degraded":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case "down":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "checking":
        return <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusText = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return "Operational";
      case "degraded":
        return "Degraded";
      case "down":
        return "Down";
      case "checking":
        return "Checking...";
    }
  };

  const getStatusColor = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return "bg-success/10 text-success border-success/20";
      case "degraded":
        return "bg-warning/10 text-warning border-warning/20";
      case "down":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "checking":
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const overallStatus = services.some(s => s.status === "down")
    ? "down"
    : services.some(s => s.status === "degraded")
    ? "degraded"
    : services.some(s => s.status === "checking")
    ? "checking"
    : "operational";

  const getOverallMessage = () => {
    switch (overallStatus) {
      case "operational":
        return "All Systems Operational";
      case "degraded":
        return "Some Systems Experiencing Issues";
      case "down":
        return "Some Systems Experiencing Issues";
      case "checking":
        return "Checking Status...";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20 pb-12">
        <div className="container max-w-3xl mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-secondary mb-4">
              <Activity className="h-7 w-7 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-2">System Status</h1>
            <p className="text-muted-foreground">
              Real-time health of SliceURL services
            </p>
          </motion.div>

          {/* Overall Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl border p-6 mb-8 ${getStatusColor(overallStatus)}`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(overallStatus)}
                <span className="text-lg font-semibold">{getOverallMessage()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkServices}
                disabled={isChecking}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </motion.div>

          {/* Services List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Services
            </h2>
            <AnimatePresence mode="popLayout">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                      <span className="hidden sm:inline">{getStatusText(service.status)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Last Checked */}
          {lastChecked && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground mt-8"
            >
              Last checked: {lastChecked.toLocaleTimeString()}
            </motion.p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
