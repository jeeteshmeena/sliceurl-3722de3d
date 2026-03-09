import { useState } from "react";
import { Filter, ChevronDown, X, Pin, Clock, Smartphone, Globe, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";

interface SearchFiltersProps {
  filters: {
    clicks: string | null;
    country: string | null;
    device: string | null;
    expiration: string | null;
    pinned: boolean | null;
  };
  onFiltersChange: (filters: SearchFiltersProps['filters']) => void;
  availableCountries: string[];
}

// These will be translated via t() in the render
const clickOptionKeys = [
  { value: '0', key: '0_clicks' },
  { value: '<10', key: 'less_than_10' },
  { value: '10+', key: '10_plus_clicks' },
  { value: '100+', key: '100_plus_clicks' },
];

const deviceOptionKeys = [
  { value: 'mobile', key: 'mobile_analytics' },
  { value: 'desktop', key: 'desktop_device' },
  { value: 'tablet', key: 'tablet' },
];

const expirationOptionKeys = [
  { value: 'active', key: 'filters_active' },
  { value: 'expired', key: 'filters_expired' },
  { value: 'expiring-soon', key: 'expiring_soon' },
];

export function SearchFilters({ filters, onFiltersChange, availableCountries }: SearchFiltersProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = Object.values(filters).filter(v => v !== null && v !== false).length;

  const updateFilter = (key: keyof typeof filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      clicks: null,
      country: null,
      device: null,
      expiration: null,
      pinned: null,
    });
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3 shrink-0">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4 bg-popover z-50" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter Links</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  Clear all
                </Button>
              )}
            </div>

            {/* Clicks Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MousePointerClick className="h-3 w-3" />
                Clicks
              </label>
              <div className="grid grid-cols-2 gap-1">
                {clickOptions.map(opt => (
                  <Button
                    key={opt.value}
                    variant={filters.clicks === opt.value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs justify-start"
                    onClick={() => updateFilter('clicks', filters.clicks === opt.value ? null : opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Country Filter */}
            {availableCountries.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Country
                </label>
                <select
                  value={filters.country || ''}
                  onChange={(e) => updateFilter('country', e.target.value || null)}
                  className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="">All countries</option>
                  {availableCountries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Device Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                Device
              </label>
              <div className="flex gap-1">
                {deviceOptions.map(opt => (
                  <Button
                    key={opt.value}
                    variant={filters.device === opt.value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => updateFilter('device', filters.device === opt.value ? null : opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Expiration Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expiration
              </label>
              <div className="flex gap-1 flex-wrap">
                {expirationOptions.map(opt => (
                  <Button
                    key={opt.value}
                    variant={filters.expiration === opt.value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateFilter('expiration', filters.expiration === opt.value ? null : opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Pinned Filter */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="pinned-filter"
                checked={filters.pinned === true}
                onCheckedChange={(checked) => updateFilter('pinned', checked ? true : null)}
              />
              <label htmlFor="pinned-filter" className="text-xs font-medium flex items-center gap-1 cursor-pointer">
                <Pin className="h-3 w-3" />
                Pinned only
              </label>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges - Responsive */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        {filters.clicks && (
          <Badge variant="secondary" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7">
            <span className="truncate max-w-[60px] sm:max-w-none">{clickOptions.find(o => o.value === filters.clicks)?.label}</span>
            <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => updateFilter('clicks', null)} />
          </Badge>
        )}
        {filters.country && (
          <Badge variant="secondary" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7">
            <span className="truncate max-w-[60px] sm:max-w-none">{filters.country}</span>
            <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => updateFilter('country', null)} />
          </Badge>
        )}
        {filters.device && (
          <Badge variant="secondary" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7">
            <span className="capitalize">{filters.device}</span>
            <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => updateFilter('device', null)} />
          </Badge>
        )}
        {filters.expiration && (
          <Badge variant="secondary" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7">
            <span className="truncate max-w-[60px] sm:max-w-none">{expirationOptions.find(o => o.value === filters.expiration)?.label}</span>
            <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => updateFilter('expiration', null)} />
          </Badge>
        )}
        {filters.pinned && (
          <Badge variant="secondary" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 h-6 sm:h-7">
            <Pin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span>Pinned</span>
            <X className="h-3 w-3 cursor-pointer shrink-0" onClick={() => updateFilter('pinned', null)} />
          </Badge>
        )}
      </div>
    </div>
  );
}
