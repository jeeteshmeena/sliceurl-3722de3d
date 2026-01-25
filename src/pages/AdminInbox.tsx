import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Inbox, Bug, Lightbulb, HelpCircle, MessageSquareHeart, Star, 
  ArrowLeft, RefreshCw, ChevronRight, Clock, Mail, MailOpen,
  Monitor, Smartphone, Tablet, Globe, ExternalLink, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface FeedbackRequest {
  id: string;
  product: string;
  request_type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  screenshot_url: string | null;
  page_url: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  user_email: string | null;
  user_id: string;
  is_read: boolean;
  is_important: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

type Category = "all" | "feature" | "bug" | "support" | "feedback" | "important";

const categories = [
  { id: "all" as Category, label: "All", icon: Inbox },
  { id: "feature" as Category, label: "Feature Requests", icon: Lightbulb },
  { id: "bug" as Category, label: "Bug Reports", icon: Bug },
  { id: "support" as Category, label: "Support", icon: HelpCircle },
  { id: "feedback" as Category, label: "Feedback", icon: MessageSquareHeart },
  { id: "important" as Category, label: "Important", icon: Star },
];

const statusOptions = [
  { value: "received", label: "Received", color: "bg-muted text-muted-foreground" },
  { value: "reviewing", label: "Reviewing", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
  { value: "rejected", label: "Rejected", color: "bg-destructive/20 text-destructive" },
];

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  high: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  critical: "bg-destructive/20 text-destructive",
};

const productIcons: Record<string, string> = {
  sliceurl: "🔗",
  slicebox: "📦",
  littleslice: "✂️",
};

const typeIcons: Record<string, typeof Bug> = {
  feature: Lightbulb,
  bug: Bug,
  support: HelpCircle,
  feedback: MessageSquareHeart,
  praise: Star,
};

const deviceIcons: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export default function AdminInbox() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);
      
      // Initialize admin notes
      const notes: Record<string, string> = {};
      data?.forEach(req => {
        notes[req.id] = req.admin_notes || "";
      });
      setAdminNotes(notes);
    } catch (err) {
      console.error("Error fetching requests:", err);
      toast.error("Failed to load inbox");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("admin-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback_requests" },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (selectedCategory === "all") return true;
      if (selectedCategory === "important") return req.priority === "high" || req.priority === "critical" || req.is_important;
      if (selectedCategory === "feature") return req.request_type === "feature";
      if (selectedCategory === "bug") return req.request_type === "bug";
      if (selectedCategory === "support") return req.request_type === "support";
      if (selectedCategory === "feedback") return req.request_type === "feedback" || req.request_type === "praise";
      return true;
    });
  }, [requests, selectedCategory]);

  const unreadCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      all: 0,
      feature: 0,
      bug: 0,
      support: 0,
      feedback: 0,
      important: 0,
    };
    
    requests.forEach(req => {
      if (!req.is_read) {
        counts.all++;
        if (req.priority === "high" || req.priority === "critical" || req.is_important) counts.important++;
        if (req.request_type === "feature") counts.feature++;
        if (req.request_type === "bug") counts.bug++;
        if (req.request_type === "support") counts.support++;
        if (req.request_type === "feedback" || req.request_type === "praise") counts.feedback++;
      }
    });
    
    return counts;
  }, [requests]);

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("feedback_requests")
        .update({ is_read: true })
        .eq("id", id);
      
      setRequests(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const handleSelectRequest = (request: FeedbackRequest) => {
    setSelectedRequest(request);
    if (!request.is_read) {
      markAsRead(request.id);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("feedback_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
      toast.success("Status updated");
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  };

  const saveNotes = async (id: string) => {
    try {
      const { error } = await supabase
        .from("feedback_requests")
        .update({ admin_notes: adminNotes[id], updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notes saved");
    } catch (err) {
      console.error("Error saving notes:", err);
      toast.error("Failed to save notes");
    }
  };

  const toggleImportant = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("feedback_requests")
        .update({ is_important: !current })
        .eq("id", id);

      if (error) throw error;
      
      setRequests(prev => prev.map(r => r.id === id ? { ...r, is_important: !current } : r));
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, is_important: !current } : null);
      }
    } catch (err) {
      console.error("Error toggling important:", err);
    }
  };

  const TypeIcon = selectedRequest ? typeIcons[selectedRequest.request_type] || MessageSquareHeart : MessageSquareHeart;
  const DeviceIcon = selectedRequest?.device ? deviceIcons[selectedRequest.device.toLowerCase()] || Globe : Globe;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-14">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="h-9 w-9 shrink-0 hover:bg-muted/50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Admin Inbox</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {requests.filter(r => !r.is_read).length} unread messages
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="self-start sm:self-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Mobile Category Selector - Relative positioned, not absolute */}
          <div className="md:hidden mb-4">
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as Category)}>
              <SelectTrigger className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4}>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="h-4 w-4 shrink-0" />
                      <span>{cat.label}</span>
                      {unreadCounts[cat.id] > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs shrink-0">
                          {unreadCounts[cat.id]}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Main Layout */}
          <div className="flex gap-4 h-[calc(100vh-240px)] sm:h-[calc(100vh-200px)] min-h-[400px] sm:min-h-[500px]">
            {/* Sidebar - Desktop only */}
            <div className="w-56 shrink-0 hidden md:block">
              <div className="bg-card border border-border rounded-xl p-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <cat.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </div>
                    {unreadCounts[cat.id] > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs shrink-0 ml-2">
                        {unreadCounts[cat.id]}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Message List */}
            <div className={`flex-1 bg-card border border-border rounded-xl overflow-hidden ${selectedRequest ? "hidden lg:block lg:w-1/2" : ""}`}>
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No messages in this category</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredRequests.map(request => {
                      const ReqTypeIcon = typeIcons[request.request_type] || MessageSquareHeart;
                      const statusInfo = statusOptions.find(s => s.value === request.status);
                      const isHighPriority = request.priority === "high" || request.priority === "critical" || request.is_important;
                      
                      return (
                        <button
                          key={request.id}
                          onClick={() => handleSelectRequest(request)}
                          className={`w-full text-left p-3 sm:p-4 hover:bg-muted/30 transition-colors ${
                            !request.is_read ? "bg-primary/5" : ""
                          } ${selectedRequest?.id === request.id ? "bg-muted/50" : ""}`}
                        >
                          {/* Clean vertical stack layout */}
                          <div className="flex gap-3">
                            {/* Left: Read indicator */}
                            <div className="shrink-0 pt-0.5">
                              {request.is_read ? (
                                <MailOpen className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Mail className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            
                            {/* Middle: Content stack */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              {/* Row 1: Icons + Tags (single line, truncated) */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-base shrink-0">{productIcons[request.product] || "📬"}</span>
                                <ReqTypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                  {request.request_type}
                                </Badge>
                                {isHighPriority && (
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                )}
                                <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ml-auto ${statusInfo?.color || "bg-muted"}`}>
                                  {statusInfo?.label || request.status}
                                </Badge>
                              </div>
                              
                              {/* Row 2: Title (truncated) */}
                              <h3 className={`text-sm leading-snug truncate ${!request.is_read ? "font-semibold" : "font-medium"}`}>
                                {request.title}
                              </h3>
                              
                              {/* Row 3: Email + Timestamp */}
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="truncate max-w-[140px] sm:max-w-[180px]">
                                  {request.user_email || "Anonymous"}
                                </span>
                                <span className="shrink-0">•</span>
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="truncate">{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                              </div>
                            </div>
                            
                            {/* Right: Chevron */}
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Detail Panel */}
            {selectedRequest && (
              <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden lg:w-1/2">
                <ScrollArea className="h-full">
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Back button for mobile */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRequest(null)}
                      className="lg:hidden -ml-2"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to list
                    </Button>
                    
                    {/* Header section with proper spacing */}
                    <div className="space-y-4">
                      {/* Top row: Icon, tags, and star button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <TypeIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-xl shrink-0">{productIcons[selectedRequest.product] || "📬"}</span>
                            <Badge variant="outline" className="shrink-0">{selectedRequest.request_type}</Badge>
                            <Badge className={`shrink-0 ${priorityColors[selectedRequest.priority] || "bg-muted"}`}>
                              {selectedRequest.priority}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleImportant(selectedRequest.id, selectedRequest.is_important)}
                          className={`shrink-0 h-9 w-9 ${selectedRequest.is_important ? "text-amber-500" : "text-muted-foreground"}`}
                        >
                          <Star className={`h-5 w-5 ${selectedRequest.is_important ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                      
                      {/* Title - separate row for clarity */}
                      <h2 className="text-lg sm:text-xl font-bold leading-tight break-words">
                        {selectedRequest.title}
                      </h2>
                    </div>
                    
                    {/* Status Selector - well spaced */}
                    <div className="pt-2">
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
                      <Select
                        value={selectedRequest.status}
                        onValueChange={(v) => updateStatus(selectedRequest.id, v)}
                      >
                        <SelectTrigger className="w-full sm:max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={4}>
                          {statusOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${opt.color.split(' ')[0]}`} />
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Separator />
                    
                    {/* Description */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Description</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedRequest.description}
                      </p>
                    </div>
                    
                    {/* Screenshot */}
                    {selectedRequest.screenshot_url && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Screenshot
                        </h3>
                        <a 
                          href={selectedRequest.screenshot_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src={selectedRequest.screenshot_url} 
                            alt="Screenshot" 
                            className="max-h-64 rounded-lg border border-border object-contain bg-muted/30"
                          />
                        </a>
                      </div>
                    )}
                    
                    <Separator />
                    
                    {/* Metadata - Responsive grid */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="text-xs text-muted-foreground mb-1">User</h4>
                          <p className="text-sm font-medium truncate">{selectedRequest.user_email || "Anonymous"}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <h4 className="text-xs text-muted-foreground mb-1">Submitted</h4>
                          <p className="text-sm font-medium">
                            {formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {selectedRequest.device && (
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <h4 className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                              <DeviceIcon className="h-3 w-3" />
                              Device
                            </h4>
                            <p className="text-sm font-medium">{selectedRequest.device}</p>
                          </div>
                        )}
                        {selectedRequest.browser && (
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <h4 className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                              <Globe className="h-3 w-3" />
                              Browser
                            </h4>
                            <p className="text-sm font-medium">{selectedRequest.browser}</p>
                          </div>
                        )}
                        {selectedRequest.os && (
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <h4 className="text-xs text-muted-foreground mb-1">OS</h4>
                            <p className="text-sm font-medium">{selectedRequest.os}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Page URL */}
                    {selectedRequest.page_url && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground">Page URL</h4>
                        <a 
                          href={selectedRequest.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 break-all"
                        >
                          <span className="truncate max-w-full">{selectedRequest.page_url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    )}
                    
                    <Separator />
                    
                    {/* Admin Notes */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Admin Notes</h3>
                      <textarea
                        value={adminNotes[selectedRequest.id] || ""}
                        onChange={(e) => setAdminNotes(prev => ({ ...prev, [selectedRequest.id]: e.target.value }))}
                        placeholder="Add internal notes..."
                        className="w-full min-h-[100px] p-3 text-sm rounded-lg bg-muted/30 border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveNotes(selectedRequest.id)}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
