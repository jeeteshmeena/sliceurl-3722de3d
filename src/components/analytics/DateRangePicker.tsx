import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DateRange = "7d" | "30d" | "90d" | "all";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const rangeLabels: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "all": "All time",
};

// Short labels for mobile view
const shortLabels: Record<DateRange, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  "all": "All",
};

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 sm:gap-2 rounded-xl text-xs font-medium border-border px-2 sm:px-3 min-w-fit"
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="sm:hidden">{shortLabels[value]}</span>
          <span className="hidden sm:inline">{rangeLabels[value]}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-popover z-50">
        {(Object.keys(rangeLabels) as DateRange[]).map((range) => (
          <DropdownMenuItem
            key={range}
            onClick={() => {
              onChange(range);
              setOpen(false);
            }}
            className={value === range ? "bg-muted" : ""}
          >
            {rangeLabels[range]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to get date from range
export function getDateFromRange(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
  }
}
