import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Lightbulb, 
  Bug, 
  MessageSquare, 
  HelpCircle, 
  Sparkles,
  Upload,
  X,
  Loader2,
  Link2,
  Box,
  Scissors,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Hourglass,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PlusCircle,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FeedbackRequest {
  id: string;
  product: string;
  request_type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  screenshot_url: string | null;
  created_at: string;
}

const products = [
  { value: "sliceurl", label: "SliceURL", icon: Link2, description: "URL shortener" },
  { value: "slicebox", label: "SliceBox", icon: Box, description: "File sharing" },
  { value: "littleslice", label: "LittleSlice", icon: Scissors, description: "Text snippets" },
  { value: "other", label: "Other / General", icon: MoreHorizontal, description: "General feedback" },
];

const requestTypes = [
  { value: "feature", label: "Feature Request", icon: Lightbulb, description: "Suggest a new feature" },
  { value: "bug", label: "Bug / UI Issue", icon: Bug, description: "Report a problem" },
  { value: "feedback", label: "General Feedback", icon: MessageSquare, description: "Share your thoughts" },
  { value: "support", label: "Support / Help", icon: HelpCircle, description: "Get assistance" },
  { value: "improvement", label: "Improvement Idea", icon: Sparkles, description: "Enhance existing features" },
];

const priorities = [
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Medium", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { value: "high", label: "High", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { value: "critical", label: "Critical", color: "bg-destructive/10 text-destructive" },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  received: { label: "Received", color: "bg-muted text-muted-foreground", icon: Clock },
  reviewing: { label: "Reviewing", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: Eye },
  in_progress: { label: "In Progress", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", icon: Hourglass },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const productIcons: Record<string, React.ElementType> = {
  sliceurl: Link2,
  slicebox: Box,
  littleslice: Scissors,
  other: MoreHorizontal,
};

const typeIcons: Record<string, React.ElementType> = {
  feature: Lightbulb,
  bug: Bug,
  feedback: MessageSquare,
  support: HelpCircle,
  improvement: Sparkles,
};

function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  let device = "desktop";
  if (/Mobi|Android/i.test(ua)) device = "mobile";
  else if (/Tablet|iPad/i.test(ua)) device = "tablet";
  
  let browser = "unknown";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  let os = "unknown";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  return { device, browser, os };
}

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("new");
  const [product, setProduct] = useState("");
  const [requestType, setRequestType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // My Submissions state
  const [submissions, setSubmissions] = useState<FeedbackRequest[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && activeTab === "submissions") {
      fetchSubmissions();
    }
  }, [user, activeTab]);

  const fetchSubmissions = async () => {
    if (!user) return;
    
    setIsLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from("feedback_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
    }
  };

  const resetForm = () => {
    setProduct("");
    setRequestType("");
    setTitle("");
    setDescription("");
    setPriority("medium");
    removeScreenshot();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to submit feedback");
      return;
    }

    if (!product || !requestType || !title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        const fileExt = screenshot.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("feedback-screenshots")
          .upload(fileName, screenshot);

        if (uploadError) {
          console.error("Screenshot upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("feedback-screenshots")
            .getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
        }
      }

      const deviceInfo = getDeviceInfo();

      const { error } = await supabase.from("feedback_requests").insert({
        user_id: user.id,
        user_email: user.email,
        product,
        request_type: requestType,
        title: title.trim(),
        description: description.trim(),
        priority,
        screenshot_url: screenshotUrl,
        page_url: window.location.href,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
      });

      if (error) throw error;

      toast.success("Thanks! Your request has been received.");
      resetForm();
      // Refresh submissions list
      fetchSubmissions();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8 pt-24">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Help us improve SliceURL</h1>
          <p className="text-muted-foreground">
            Share feedback, request features, or report issues across SliceURL products.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Request
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <History className="h-4 w-4" />
              My Submissions
              {submissions.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {submissions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* New Request Tab */}
          <TabsContent value="new" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Product</CardTitle>
                  <CardDescription>Which product is this about?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {products.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setProduct(p.value)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                            product === p.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="font-medium text-sm">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Request Type */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Request Type</CardTitle>
                  <CardDescription>What kind of feedback is this?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {requestTypes.map((rt) => {
                      const Icon = rt.icon;
                      return (
                        <button
                          key={rt.value}
                          type="button"
                          onClick={() => setRequestType(rt.value)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center",
                            requestType === rt.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium text-sm">{rt.label}</span>
                          <span className="text-xs text-muted-foreground">{rt.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Title & Description */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Details</CardTitle>
                  <CardDescription>Tell us more about your request</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                    <Input
                      id="title"
                      placeholder="Short summary of your request"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="description"
                      placeholder="Explain your feedback, issue, or idea in detail"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      maxLength={5000}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Priority & Screenshot */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Additional Info</CardTitle>
                  <CardDescription>Optional details to help us prioritize</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", p.color)}>
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Screenshot (optional)</Label>
                    {screenshotPreview ? (
                      <div className="relative inline-block">
                        <img
                          src={screenshotPreview}
                          alt="Screenshot preview"
                          className="max-h-40 rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={removeScreenshot}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <label className="cursor-pointer">
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleScreenshotChange}
                          />
                          <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted/50 transition-colors">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">Upload screenshot</span>
                          </div>
                        </label>
                        <span className="text-xs text-muted-foreground">Max 5MB, images only</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting || !product || !requestType || !title.trim() || !description.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </form>
          </TabsContent>

          {/* My Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Track the status of your feedback requests
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSubmissions}
                disabled={isLoadingSubmissions}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingSubmissions && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {isLoadingSubmissions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : submissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't submitted any feedback yet</p>
                  <Button onClick={() => setActiveTab("new")}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Submit Your First Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => {
                  const ProductIcon = productIcons[submission.product] || MoreHorizontal;
                  const TypeIcon = typeIcons[submission.request_type] || MessageSquare;
                  const statusInfo = statusConfig[submission.status] || statusConfig.received;
                  const StatusIcon = statusInfo.icon;
                  const priorityInfo = priorities.find(p => p.value === submission.priority) || priorities[1];
                  const isExpanded = expandedId === submission.id;

                  return (
                    <Card key={submission.id} className="overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : submission.id)}
                        className="w-full text-left"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <ProductIcon className="h-3 w-3" />
                                  {products.find(p => p.value === submission.product)?.label || submission.product}
                                </Badge>
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <TypeIcon className="h-3 w-3" />
                                  {requestTypes.find(r => r.value === submission.request_type)?.label || submission.request_type}
                                </Badge>
                                <Badge className={cn("gap-1 text-xs", statusInfo.color)}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              <CardTitle className="text-base truncate">{submission.title}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Submitted {format(new Date(submission.created_at), "PPp")}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={cn("text-xs", priorityInfo.color)}>
                                {priorityInfo.label}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </button>
                      
                      {isExpanded && (
                        <CardContent className="pt-0 border-t">
                          <div className="pt-4 space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Description</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {submission.description}
                              </p>
                            </div>
                            
                            {submission.screenshot_url && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Attached Screenshot</h4>
                                <a
                                  href={submission.screenshot_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <img
                                    src={submission.screenshot_url}
                                    alt="Attached screenshot"
                                    className="max-h-48 rounded-lg border hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                              <span>ID: {submission.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
