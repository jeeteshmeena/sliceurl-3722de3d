import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { SliceAppsLogo } from "./SliceAppsLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SLICEAPPS_COLORS = {
  bg: "#000000",
  border: "#333333",
  card: "#1a1a1a",
  text: "#ffffff",
  textSecondary: "#888888",
};

interface SliceAppsHeaderProps {
  showCreateButton?: boolean;
}

/**
 * SliceAPPs Header - Clean, compact, consistent across all SliceAPPs pages
 * No back arrow, no breadcrumbs
 */
export function SliceAppsHeader({ showCreateButton = false }: SliceAppsHeaderProps) {
  return (
    <header 
      className="sticky top-0 z-50 border-b"
      style={{ 
        backgroundColor: SLICEAPPS_COLORS.bg,
        borderColor: SLICEAPPS_COLORS.border,
      }}
    >
      <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center">
          <SliceAppsLogo size="sm" showText />
        </Link>
        
        {/* Right: Create button (optional) */}
        {showCreateButton && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ 
                  backgroundColor: SLICEAPPS_COLORS.card,
                  color: SLICEAPPS_COLORS.text,
                }}
              >
                <Plus className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52"
              style={{
                backgroundColor: SLICEAPPS_COLORS.card,
                borderColor: SLICEAPPS_COLORS.border,
              }}
            >
              <div 
                className="px-3 py-2 text-xs font-medium"
                style={{ color: SLICEAPPS_COLORS.textSecondary }}
              >
                Create your own page
              </div>
              <DropdownMenuItem asChild>
                <Link 
                  to="/slicebox"
                  className="flex items-center gap-3 cursor-pointer"
                  style={{ color: SLICEAPPS_COLORS.text }}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#FF3B30" }}
                  >
                    <span className="text-white text-xs font-bold">SB</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">SliceBox</p>
                    <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                      Permanent hosting
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link 
                  to="/littleslice"
                  className="flex items-center gap-3 cursor-pointer"
                  style={{ color: SLICEAPPS_COLORS.text }}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#FF4D6D" }}
                  >
                    <span className="text-white text-xs font-bold">LS</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">LittleSlice</p>
                    <p className="text-xs" style={{ color: SLICEAPPS_COLORS.textSecondary }}>
                      Temporary sharing
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

export default SliceAppsHeader;
