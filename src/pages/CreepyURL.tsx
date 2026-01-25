import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, Copy, Check, Eye, Shield, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function CreepyURL() {
  const [url, setUrl] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Add https:// if missing
    let validatedUrl = url.trim();
    if (!/^https?:\/\//i.test(validatedUrl)) {
      validatedUrl = `https://${validatedUrl}`;
    }

    // Validate URL format
    try {
      new URL(validatedUrl);
    } catch {
      toast.error("Invalid URL format");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creepy-shorten`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: validatedUrl }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate link");
      }

      const result = await response.json();
      setGeneratedLink(result.short_url);
      toast.success("Simulation link generated!");
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Failed to generate link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handlePreview = () => {
    if (generatedLink) {
      window.open(generatedLink, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(239 68 68 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(239 68 68 / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      
      {/* Scanline Effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(transparent 50%, rgba(0,0,0,0.15) 50%)",
          backgroundSize: "100% 4px",
        }}
      />

      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <ShieldAlert className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Security Simulation Tool
          </h1>
          <p className="text-gray-400 max-w-md mx-auto">
            Generate realistic-looking test links for security awareness training
          </p>
        </motion.div>

        {/* Main Tool Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-950 border border-red-900/40 rounded-xl p-6 sm:p-8"
        >
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target URL
          </label>
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="bg-black border-gray-800 text-white font-mono h-12 mb-4 placeholder:text-gray-600"
          />
          
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Generate Simulation Link
              </>
            )}
          </Button>

          {/* Generated Link Output */}
          {generatedLink && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 pt-6 border-t border-gray-800"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs uppercase tracking-wide text-green-400 font-medium">
                  Security Simulation Link
                </span>
              </div>
              
              <div className="bg-black border border-green-900/50 rounded-lg p-4 mb-4">
                <code className="text-green-400 font-mono text-sm break-all">
                  {generatedLink}
                </code>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="flex-1 border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  onClick={handlePreview}
                  className="flex-1 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Important Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">What is this tool?</h3>
              <p className="text-sm text-gray-400">
                This tool creates realistic-looking phishing simulation links for security awareness training. 
                All generated links display a warning interstitial before redirecting to the target URL.
              </p>
            </div>
            
            <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Is this safe to use?</h3>
              <p className="text-sm text-gray-400">
                Yes. All simulation links include a security warning page that educates users about phishing 
                before allowing them to proceed. No malicious code is involved.
              </p>
            </div>
            
            <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Terms of use</h3>
              <p className="text-sm text-gray-400">
                This tool is intended for authorized security testing only. Use only with explicit permission 
                from your organization. Unauthorized use for phishing or fraud is strictly prohibited.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-900 text-center">
          <Link 
            to="/" 
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            Powered by <span className="text-gray-500">SliceURL</span>
          </Link>
        </div>
      </div>
    </div>
  );
}