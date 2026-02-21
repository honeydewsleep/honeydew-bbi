import { useState, useMemo } from "react";
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, startOfQuarter, endOfQuarter } from "date-fns";
import { CalendarIcon, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  comparisonRange?: DateRange | null;
  onComparisonRangeChange?: (range: DateRange | null) => void;
  showComparison?: boolean;
}

type PresetKey = "7d" | "30d" | "90d" | "ytd" | "last_month" | "last_quarter" | "last_year" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "last_month", label: "Last month" },
  { key: "last_quarter", label: "Last quarter" },
  { key: "ytd", label: "Year to date" },
  { key: "last_year", label: "Last year" },
  { key: "custom", label: "Custom" },
];

type ComparisonKey = "none" | "previous_period" | "previous_year" | "custom";

const COMPARISON_PRESETS: { key: ComparisonKey; label: string }[] = [
  { key: "none", label: "No comparison" },
  { key: "previous_period", label: "Previous period" },
  { key: "previous_year", label: "Same period last year" },
  { key: "custom", label: "Custom comparison" },
];

function getPresetRange(key: PresetKey): DateRange | null {
  const now = new Date();
  switch (key) {
    case "7d": return { from: subDays(now, 7), to: now };
    case "30d": return { from: subDays(now, 30), to: now };
    case "90d": return { from: subDays(now, 90), to: now };
    case "last_month": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "last_quarter": {
      const prev = subMonths(now, 3);
      return { from: startOfQuarter(prev), to: endOfQuarter(prev) };
    }
    case "ytd": return { from: startOfYear(now), to: now };
    case "last_year": return { from: startOfYear(subYears(now, 1)), to: new Date(now.getFullYear() - 1, 11, 31) };
    default: return null;
  }
}

function getComparisonRange(key: ComparisonKey, primary: DateRange): DateRange | null {
  if (key === "none") return null;
  const durationMs = primary.to.getTime() - primary.from.getTime();
  if (key === "previous_period") {
    return { from: new Date(primary.from.getTime() - durationMs), to: new Date(primary.from.getTime() - 1) };
  }
  if (key === "previous_year") {
    return { from: subYears(primary.from, 1), to: subYears(primary.to, 1) };
  }
  return null;
}

export default function DateRangePicker({
  dateRange,
  onDateRangeChange,
  comparisonRange = null,
  onComparisonRangeChange,
  showComparison = true,
}: DateRangePickerProps) {
  const [preset, setPreset] = useState<PresetKey>("30d");
  const [comparisonPreset, setComparisonPreset] = useState<ComparisonKey>("none");
  const [customOpen, setCustomOpen] = useState(false);
  const [compCustomOpen, setCompCustomOpen] = useState(false);

  const handlePreset = (key: PresetKey) => {
    setPreset(key);
    if (key === "custom") {
      setCustomOpen(true);
      return;
    }
    const range = getPresetRange(key);
    if (range) {
      onDateRangeChange(range);
      // Recompute comparison if active
      if (comparisonPreset !== "none" && comparisonPreset !== "custom" && onComparisonRangeChange) {
        onComparisonRangeChange(getComparisonRange(comparisonPreset, range));
      }
    }
  };

  const handleComparisonPreset = (key: ComparisonKey) => {
    setComparisonPreset(key);
    if (!onComparisonRangeChange) return;
    if (key === "custom") {
      setCompCustomOpen(true);
      return;
    }
    onComparisonRangeChange(getComparisonRange(key, dateRange));
  };

  const formatRange = (range: DateRange) =>
    `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Period preset selector */}
      <Select value={preset} onValueChange={(v) => handlePreset(v as PresetKey)}>
        <SelectTrigger className="w-[170px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom date range popover */}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-9 gap-2 text-sm font-normal", preset !== "custom" && "hidden")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {formatRange(dateRange)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange({ from: range.from, to: range.to });
                if (comparisonPreset !== "none" && comparisonPreset !== "custom" && onComparisonRangeChange) {
                  onComparisonRangeChange(getComparisonRange(comparisonPreset, { from: range.from, to: range.to }));
                }
              }
            }}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Always show current range as a badge when not custom */}
      {preset !== "custom" && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {formatRange(dateRange)}
        </span>
      )}

      {/* Comparison selector */}
      {showComparison && onComparisonRangeChange && (
        <>
          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={comparisonPreset} onValueChange={(v) => handleComparisonPreset(v as ComparisonKey)}>
            <SelectTrigger className="w-[190px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPARISON_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom comparison calendar */}
          <Popover open={compCustomOpen} onOpenChange={setCompCustomOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-2 text-sm font-normal", comparisonPreset !== "custom" && "hidden")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {comparisonRange ? formatRange(comparisonRange) : "Pick range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={comparisonRange ? { from: comparisonRange.from, to: comparisonRange.to } : undefined}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onComparisonRangeChange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {comparisonRange && comparisonPreset !== "none" && comparisonPreset !== "custom" && (
            <Badge variant="secondary" className="text-xs font-normal">
              vs {formatRange(comparisonRange)}
            </Badge>
          )}
        </>
      )}
    </div>
  );
}
