import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCountryFlag } from "@/lib/countryFlags";
import type { Click } from "@/hooks/useAnalytics";

interface ClickLogTableProps {
  clicks: Click[];
  itemsPerPage?: number;
}

type SortField = "clicked_at" | "country" | "device_type" | "browser" | "referrer";
type SortDirection = "asc" | "desc";

export function ClickLogTable({ clicks, itemsPerPage = 10 }: ClickLogTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("clicked_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  // Filter and sort clicks
  const filteredClicks = useMemo(() => {
    let filtered = clicks;

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((click) => {
        return (
          click.country?.toLowerCase().includes(searchLower) ||
          click.city?.toLowerCase().includes(searchLower) ||
          click.browser?.toLowerCase().includes(searchLower) ||
          click.device_type?.toLowerCase().includes(searchLower) ||
          click.referrer?.toLowerCase().includes(searchLower) ||
          click.os?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [clicks, search, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredClicks.length / itemsPerPage);
  const paginatedClicks = filteredClicks.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  if (clicks.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No click data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by country, city, browser..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9 h-9 bg-muted/50 border-border rounded-xl"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th
                className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("clicked_at")}
              >
                <span className="inline-flex items-center gap-1">
                  Time <SortIcon field="clicked_at" />
                </span>
              </th>
              <th
                className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("country")}
              >
                <span className="inline-flex items-center gap-1">
                  Location <SortIcon field="country" />
                </span>
              </th>
              <th
                className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("device_type")}
              >
                <span className="inline-flex items-center gap-1">
                  Device <SortIcon field="device_type" />
                </span>
              </th>
              <th
                className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("browser")}
              >
                <span className="inline-flex items-center gap-1">
                  Browser <SortIcon field="browser" />
                </span>
              </th>
              <th
                className="text-left py-3 px-4 font-medium cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("referrer")}
              >
                <span className="inline-flex items-center gap-1">
                  Source <SortIcon field="referrer" />
                </span>
              </th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClicks.map((click, idx) => (
              <motion.tr
                key={click.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="py-2.5 px-4 text-muted-foreground">
                  {new Date(click.clicked_at).toLocaleString()}
                </td>
                <td className="py-2.5 px-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span>{getCountryFlag(click.country || "Unknown")}</span>
                    <span className="truncate max-w-[120px]">
                      {click.city || click.country || "Unknown"}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 px-4 capitalize">{click.device_type || "Unknown"}</td>
                <td className="py-2.5 px-4">{click.browser || "Unknown"}</td>
                <td className="py-2.5 px-4">{click.referrer || "Direct"}</td>
                <td className="py-2.5 px-4">
                  {click.is_unique ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-foreground text-background">
                      Unique
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Return
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, filteredClicks.length)} of {filteredClicks.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="h-7 px-2 rounded-lg"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="h-7 px-2 rounded-lg"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
