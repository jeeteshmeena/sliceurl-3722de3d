import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { CreateMenuSheet } from "./CreateMenuSheet";

interface SliceAppsHeaderProps {
  showCreateButton?: boolean;
  onNewLink?: () => void;
}

/**
 * SliceAPPs Header - Clean, compact, consistent across all SliceAPPs pages
 * Text-only branding with custom typography, no back arrow, no breadcrumbs
 */
export function SliceAppsHeader({ showCreateButton = false, onNewLink }: SliceAppsHeaderProps) {
  const navigate = useNavigate();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white dark:bg-black border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4">
          {/* Left: Brand Text Only */}
          <Link to="/" className="flex items-center">
            <span 
              className="text-xl font-bold tracking-tight"
              style={{ 
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              <span className="text-gray-900 dark:text-white">Slice</span>
              <span className="text-green-500">APPs</span>
            </span>
          </Link>
          
          {/* Right: Create button */}
          {showCreateButton && (
            <button
              onClick={() => setShowCreateMenu(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              aria-label="Create"
            >
              <PlusCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </button>
          )}
        </div>
      </header>

      {/* Create Menu Sheet */}
      <CreateMenuSheet 
        open={showCreateMenu} 
        onOpenChange={setShowCreateMenu}
        onNewLink={onNewLink}
      />
    </>
  );
}

export default SliceAppsHeader;
