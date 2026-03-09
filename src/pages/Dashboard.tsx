import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Copy, Pin, Trash2, QrCode, Lock, Edit, CheckSquare, BarChart3, Palette, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLinks } from "@/hooks/useLinks";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { getShortUrl } from "@/lib/domain";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateLinkDialog } from "@/components/CreateLinkDialog";
import { EditLinkDialog } from "@/components/EditLinkDialog";
import { ShareMenu } from "@/components/ShareMenu";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { LinkCardSkeleton } from "@/components/Skeleton";
import { SliceBuddy } from "@/components/SliceBuddy";
import { SliceQR } from "@/components/SliceQR";
import { BulkActionsToolbar } from "@/components/BulkActionsToolbar";
import { SearchFilters } from "@/components/SearchFilters";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { UtmBadge } from "@/components/utm/UtmBadge";
import { BulkUploadModal } from "@/features/bulk";
import type { Link as LinkType } from "@/hooks/useLinks";

const Dashboard = () => {
  const { t } = useLanguage();
  const { links, folders, loading, createLink, updateLink, deleteLink, togglePin, bulkDeleteLinks, bulkMoveToFolder, bulkTogglePin } = useLinks();
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [filters, setFilters] = useState({
    clicks: null as string | null,
    country: null as string | null,
    device: null as string | null,
    expiration: null as string | null,
    pinned: null as boolean | null,
  });

  // Get available countries from links
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    // This would need click data - for now return empty
    return Array.from(countries);
  }, []);

  // Filter links based on search and filters
  const filteredLinks = useMemo(() => {
    let result = links.filter(
      (l) =>
        l.original_url.toLowerCase().includes(search.toLowerCase()) ||
        l.short_code.toLowerCase().includes(search.toLowerCase()) ||
        l.title?.toLowerCase().includes(search.toLowerCase())
    );

    // Apply filters
    if (filters.clicks) {
      result = result.filter(l => {
        const clicks = l.click_count || 0;
        switch (filters.clicks) {
          case '0': return clicks === 0;
          case '<10': return clicks < 10;
          case '10+': return clicks >= 10;
          case '100+': return clicks >= 100;
          default: return true;
        }
      });
    }

    if (filters.expiration) {
      const now = new Date();
      result = result.filter(l => {
        if (!l.expires_at) return filters.expiration === 'active';
        const expiresAt = new Date(l.expires_at);
        const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        switch (filters.expiration) {
          case 'expired': return expiresAt < now;
          case 'expiring-soon': return daysUntil > 0 && daysUntil <= 7;
          case 'active': return expiresAt > now;
          default: return true;
        }
      });
    }

    if (filters.pinned) {
      result = result.filter(l => l.is_pinned);
    }

    // Sort: pinned first, then by created_at
    result.sort((a, b) => {
      const aPinned = a.is_pinned ? 1 : 0;
      const bPinned = b.is_pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [links, search, filters]);

  const selectedLinks = useMemo(
    () => links.filter((l) => selectedIds.has(l.id)),
    [links, selectedIds]
  );

  const toggleSelection = (id: string) => {
    triggerHaptic('light');
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      if (newSet.size === 0) {
        setSelectionMode(false);
      } else {
        setSelectionMode(true);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredLinks.map((l) => l.id)));
    setSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteLinks(Array.from(selectedIds));
    clearSelection();
  };

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    await bulkMoveToFolder(Array.from(selectedIds), folderId);
    clearSelection();
  };

  const handleBulkTogglePin = async (pin: boolean) => {
    await bulkTogglePin(Array.from(selectedIds), pin);
    clearSelection();
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${code}`);
    toast.success(t("copied"), { description: t("link_copied_clipboard") });
  };

  const handleTogglePin = async (linkId: string) => {
    const link = links.find(l => l.id === linkId);
    const isPinned = (link as any)?.is_pinned;
    await togglePin(linkId);
    toast.success(isPinned ? t("unpinned") : t("pinned_successfully"));
  };

  const handleDeleteLink = async (linkId: string) => {
    await deleteLink(linkId);
  };

  // Get display name from profile or user metadata
  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Main */}
      <main className="flex-1 pt-20 sm:pt-24 pb-20 container px-4 sm:px-6">
        {/* Announcement Bar */}
        <AnnouncementBar />

        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            {displayName ? t("welcome_back_name").replace("{{name}}", displayName) : t("welcome_back_default")}
          </h2>
        </motion.div>

        {/* Empty State - Show when no links at all */}
        {!loading && links.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-16 sm:py-24"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <SliceBuddy size="lg" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center max-w-sm mx-auto"
            >
               <h3 className="text-xl font-semibold text-foreground mb-2">
                 {t("no_links_title")}
               </h3>
               <p className="text-muted-foreground text-sm mb-8">
                 {t("no_links_desc")}
               </p>
               
               <Button 
                 size="lg" 
                 onClick={() => setShowCreate(true)}
                 className="gap-2 bg-foreground text-background hover:bg-foreground/90"
               >
                 <Plus className="h-4 w-4" />
                 {t("create_link")}
               </Button>
            </motion.div>
          </motion.div>
        ) : (
          <>
            {/* Your Links Header */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-5">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold">{t("your_links")}</h1>
                <p className="text-muted-foreground text-xs sm:text-sm">{links.length} {t("total_links")}</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">
                {filteredLinks.length > 0 && (
                  <Button
                    variant={selectionMode ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectionMode) {
                        clearSelection();
                      } else {
                        setSelectionMode(true);
                      }
                    }}
                    className="gap-1.5 h-9 text-xs sm:text-sm px-2.5 sm:px-3"
                  >
                     <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                     <span className="hidden xs:inline">{selectionMode ? t("cancel") : t("select")}</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    triggerHaptic('light');
                    setShowBulk(true);
                  }} 
                  className="gap-1.5 h-9 text-xs sm:text-sm px-2.5 sm:px-3 border-dashed border-2 hover:border-solid hover:bg-secondary/50 active:scale-95 transition-all duration-150"
                >
                   <Scissors className="h-3.5 w-3.5 shrink-0" />
                   <span>{t("bulk")}</span>
                </Button>
                <Button onClick={() => setShowCreate(true)} className="gap-1.5 h-9 text-xs sm:text-sm flex-1 sm:flex-initial px-3">
                  <Plus className="h-3.5 w-3.5 shrink-0" /> 
                  <span className="truncate">{t("new_link")}</span>
                </Button>
              </div>
            </div>

            {/* Bulk Upload Modal */}
            <BulkUploadModal 
              open={showBulk} 
              onOpenChange={setShowBulk}
              onComplete={() => {
                // Refresh links after bulk create
              }}
            />

            {/* Search and Filters */}
            <div className="space-y-3 mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("search_links")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11"
                />
              </div>
              <SearchFilters 
                filters={filters} 
                onFiltersChange={setFilters}
                availableCountries={availableCountries}
              />
            </div>

            {/* Links List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <LinkCardSkeleton key={i} />)}
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-20">
                <div className="flex justify-center mb-4">
                  <SliceBuddy size="md" />
                </div>
                <p className="text-muted-foreground">{t("no_links")}</p>
              </div>
            ) : (
              <div className="space-y-3">
            {filteredLinks.map((link, i) => {
              const isSelected = selectedIds.has(link.id);
              const isPinned = (link as any).is_pinned;
              const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`p-4 rounded-2xl border bg-card hover:shadow-premium-md transition-all ${
                    isSelected ? "border-primary ring-1 ring-primary/20" : isPinned ? "border-primary/30" : "border-border"
                  } ${isExpired && !isPinned ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Selection Checkbox + Link Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {selectionMode && (
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(link.id)}
                            aria-label={`Select ${link.title || link.short_code}`}
                          />
                        </div>
                      )}
                      <div
                        className="flex-1 min-w-0 space-y-1 cursor-pointer"
                        onClick={() => {
                          if (selectionMode) {
                            toggleSelection(link.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate max-w-[200px] sm:max-w-none">
                            {window.location.origin}/s/{link.short_code}
                          </span>
                          {link.is_password_protected && (
                            <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                              <Lock className="h-3 w-3" /> {t("protected")}
                            </Badge>
                          )}
                          {link.expires_at && new Date(link.expires_at) < new Date() && (
                            <Badge variant="destructive" className="text-xs shrink-0">{t("expired")}</Badge>
                          )}
                          {(link as any).utm_enabled && (
                            <UtmBadge
                              utm_source={(link as any).utm_source}
                              utm_medium={(link as any).utm_medium}
                              utm_campaign={(link as any).utm_campaign}
                              utm_term={(link as any).utm_term}
                              utm_content={(link as any).utm_content}
                            />
                          )}
                        </div>
                        {link.title && (
                          <p className="text-sm font-medium text-foreground/80 truncate">{link.title}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{link.original_url}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{link.click_count || 0} {t("clicks")}</span>
                          <span>{new Date(link.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions - Responsive grid to prevent overlap */}
                    {!selectionMode && (
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        {/* Primary actions - always visible */}
                        <Button variant="ghost" size="icon-sm" onClick={() => copyLink(link.short_code)} className="h-8 w-8">
                          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        
                        {/* Share Buttons */}
                        <ShareMenu 
                          shortUrl={getShortUrl(link.short_code)} 
                          title={link.title || undefined} 
                        />
                        
                        
                        {/* QR Code */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm" title={t("view_qr")} className="h-8 w-8">
                              <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("qr_code")}</DialogTitle>
                            </DialogHeader>
                            <SliceQR url={`${window.location.origin}/s/${link.short_code}`} filename={`sliceurl-${link.short_code}`} />
                            <Button 
                              onClick={() => navigate(`/qr/${link.id}/customize`)} 
                              className="w-full mt-4 gap-2"
                            >
                               <Palette className="h-4 w-4" />
                               {t("customize_qr_design")}
                            </Button>
                          </DialogContent>
                        </Dialog>
                        
                        {/* Pin Button */}
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => handleTogglePin(link.id)}
                           title={isPinned ? t("unpin") : t("pin_to_top")}
                           className="h-8 w-8"
                        >
                          <Pin className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isPinned ? 'fill-primary text-primary' : ''}`} />
                        </Button>
                        
                        {/* Edit Button */}
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={() => setEditingLink(link)}
                          title={t("edit")}
                          className="h-8 w-8"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        
                        {/* Delete Button with Confirmation */}
                        <AlertDialog>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon-sm" 
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("delete_link")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                               <AlertDialogTitle>{t("delete_this_link")}</AlertDialogTitle>
                               <AlertDialogDescription>
                                 {t("cannot_be_undone")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteLink(link.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                 {t("delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        {/* Analytics Button */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/analytics/${link.id}`)}
                          className="gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2 sm:px-2.5"
                        >
                          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="text-[10px] sm:text-xs">{t("analysis")}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
              })}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        selectedLinks={selectedLinks}
        onClearSelection={clearSelection}
        onSelectAll={selectAll}
        onBulkDelete={handleBulkDelete}
        onBulkTogglePin={handleBulkTogglePin}
        totalLinks={filteredLinks.length}
      />

      {/* Create Modal */}
      <CreateLinkDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreateLink={createLink}
      />

      {/* Edit Modal */}
      <EditLinkDialog
        open={!!editingLink}
        onOpenChange={(open) => !open && setEditingLink(null)}
        link={editingLink}
        onUpdateLink={updateLink}
      />

      {/* Mobile FAB - Only show when user has links */}
      {!selectionMode && links.length > 0 && (
        <Button
          onClick={() => setShowCreate(true)}
          size="icon-lg"
          className="fixed bottom-20 right-6 shadow-premium-lg md:hidden z-40"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default Dashboard;