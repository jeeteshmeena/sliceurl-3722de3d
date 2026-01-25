import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, FolderInput, Download, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Link } from "@/hooks/useLinks";
import type { Folder } from "@/hooks/useLinks";

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedLinks: Link[];
  folders: Folder[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkMoveToFolder: (folderId: string | null) => Promise<void>;
  totalLinks: number;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedLinks,
  folders,
  onClearSelection,
  onSelectAll,
  onBulkDelete,
  onBulkMoveToFolder,
  totalLinks,
}: BulkActionsToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onBulkDelete();
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    setIsMoving(true);
    await onBulkMoveToFolder(folderId);
    setIsMoving(false);
  };

  const exportAsCSV = () => {
    const headers = ["Title", "Short URL", "Original URL", "Clicks", "Created At", "Expires At"];
    const rows = selectedLinks.map((link) => [
      link.title || "",
      `${window.location.origin}/s/${link.short_code}`,
      link.original_url,
      String(link.click_count || 0),
      new Date(link.created_at).toISOString(),
      link.expires_at ? new Date(link.expires_at).toISOString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    downloadFile(csvContent, "sliceurl-links.csv", "text/csv");
  };

  const exportAsJSON = () => {
    const data = selectedLinks.map((link) => ({
      title: link.title,
      shortUrl: `${window.location.origin}/s/${link.short_code}`,
      originalUrl: link.original_url,
      clicks: link.click_count || 0,
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      isFavorite: link.is_favorite,
      isPasswordProtected: link.is_password_protected,
    }));

    downloadFile(JSON.stringify(data, null, 2), "sliceurl-links.json", "application/json");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed z-50 bottom-0 left-0 right-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:px-0 md:pb-0"
          >
            <div className="flex items-center gap-2 p-3 bg-card/95 border border-border backdrop-blur-md w-full md:w-auto flex-wrap justify-center md:flex-nowrap rounded-lg md:rounded-xl md:shadow-lg">
              {/* Selection count */}
              <div className="flex items-center gap-2 px-3 border-r border-border">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium whitespace-nowrap">{selectedCount} selected</span>
              </div>

              {/* Select All / Clear */}
              <div className="flex items-center gap-1">
                {selectedCount < totalLinks && (
                  <Button variant="ghost" size="sm" onClick={onSelectAll}>
                    Select All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>

              <div className="hidden md:block h-6 w-px bg-border" />

              {/* Bulk Actions */}
              <div className="flex items-center gap-1">
                {/* Move to Folder */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={isMoving}>
                      <FolderInput className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Move</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="bg-popover">
                    <DropdownMenuItem onClick={() => handleMoveToFolder(null)}>
                      No Folder
                    </DropdownMenuItem>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => handleMoveToFolder(folder.id)}
                      >
                        <span
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: folder.color }}
                        />
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Export */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="bg-popover">
                    <DropdownMenuItem onClick={exportAsCSV}>
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportAsJSON}>
                      Export as JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} links?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected links and all their analytics data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
