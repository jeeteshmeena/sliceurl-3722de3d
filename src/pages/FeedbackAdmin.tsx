import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  RefreshCw,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Link2,
  Box,
  Scissors,
  MoreHorizontal,
  Lightbulb,
  Bug,
  MessageSquare,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Admin user IDs - add your admin user IDs here
const ADMIN_USER_IDS = [
  // Add admin user IDs here
];

interface FeedbackRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  product: string;
  request_type: string;
  title: string;
  description: string;
  priority: string;
  screenshot_url: string | null;
  page_url: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const statusOptions = [
  { value: "received", label: "Received", color: "bg-muted text-muted-foreground" },
  { value: "reviewing", label: "Reviewing", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { value: "in_progress", label: "In Progress", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { value: "completed", label: "Completed", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  { value: "rejected", label: "Rejected", color: "bg-destructive/10 text-destructive" },
];

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  critical: "bg-destructive/10 text-destructive",
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

const deviceIcons: Record<string, React.ElementType> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export default function FeedbackAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user && (ADMIN_USER_IDS.includes(user.id) || ADMIN_USER_IDS.length === 0);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    // If ADMIN_USER_IDS is empty, allow all logged-in users (for testing)
    // In production, populate ADMIN_USER_IDS array
    if (!isAdmin && ADMIN_USER_IDS.length > 0) {
      navigate("/dashboard");
      toast.error("Access denied");
      return;
    }
    
    fetchRequests();
  }, [user, navigate, isAdmin]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      // For admin view, we need to bypass RLS - this requires a service role
      // For now, we'll show only the current user's requests or use an edge function
      const { data, error } = await supabase
        .from("feedback_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      
      // Initialize admin notes
      const notes: Record<string, string> = {};
      data?.forEach((r) => {
        notes[r.id] = r.admin_notes || "";
      });
      setAdminNotes(notes);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load feedback requests");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("feedback_requests")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      toast.success("Status updated");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const saveNotes = async (id: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("feedback_requests")
        .update({ admin_notes: adminNotes[id] })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notes saved");
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to save notes");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterProduct !== "all" && r.product !== filterProduct) return false;
    if (filterType !== "all" && r.request_type !== filterType) return false;
    if (filterPriority !== "all" && r.priority !== filterPriority) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  if (!user || (!isAdmin && ADMIN_USER_IDS.length > 0)) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feedback Admin</h1>
            <p className="text-muted-foreground">
              Manage all feedback requests
            </p>
          </div>
          <Button onClick={fetchRequests} variant="outline" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product</label>
                <Select value={filterProduct} onValueChange={setFilterProduct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="sliceurl">SliceURL</SelectItem>
                    <SelectItem value="slicebox">SliceBox</SelectItem>
                    <SelectItem value="littleslice">LittleSlice</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="bug">Bug / UI Issue</SelectItem>
                    <SelectItem value="feedback">General Feedback</SelectItem>
                    <SelectItem value="support">Support / Help</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No feedback requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {requests.length} requests
            </p>
            
            {filteredRequests.map((request) => {
              const ProductIcon = productIcons[request.product] || MoreHorizontal;
              const TypeIcon = typeIcons[request.request_type] || MessageSquare;
              const DeviceIcon = deviceIcons[request.device || "desktop"] || Monitor;
              const isExpanded = expandedId === request.id;
              
              return (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant="outline" className="gap-1">
                            <ProductIcon className="h-3 w-3" />
                            {request.product}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {request.request_type}
                          </Badge>
                          <Badge className={priorityColors[request.priority]}>
                            {request.priority}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{request.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {request.user_email} • {format(new Date(request.created_at), "PPp")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={request.status}
                          onValueChange={(v) => updateStatus(request.id, v)}
                          disabled={updatingId === request.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className={cn("px-2 py-0.5 rounded text-xs font-medium", s.color)}>
                                  {s.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedId(isExpanded ? null : request.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {request.description}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DeviceIcon className="h-4 w-4" />
                          {request.device || "Unknown"}
                        </div>
                        <div className="text-muted-foreground">
                          {request.browser} / {request.os}
                        </div>
                        {request.page_url && (
                          <a
                            href={request.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Page
                          </a>
                        )}
                      </div>

                      {request.screenshot_url && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Image className="h-4 w-4" />
                            Screenshot
                          </h4>
                          <a
                            href={request.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={request.screenshot_url}
                              alt="Screenshot"
                              className="max-h-60 rounded-lg border hover:opacity-90 transition-opacity"
                            />
                          </a>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium mb-2">Admin Notes</h4>
                        <div className="flex gap-2">
                          <Textarea
                            value={adminNotes[request.id] || ""}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({
                                ...prev,
                                [request.id]: e.target.value,
                              }))
                            }
                            placeholder="Internal notes..."
                            rows={2}
                          />
                          <Button
                            onClick={() => saveNotes(request.id)}
                            disabled={updatingId === request.id}
                          >
                            {updatingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
