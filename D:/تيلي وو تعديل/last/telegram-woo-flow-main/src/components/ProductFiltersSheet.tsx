import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductFilters } from "@/hooks/useProductFilters";

interface ProductFiltersSheetProps {
  filters: ProductFilters;
  onUpdateFilter: <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  type: "local" | "woo";
}

const LOCAL_STATUSES = [
  { value: "inbox", label: "صندوق الوارد" },
  { value: "draft", label: "مسودة" },
  { value: "ai_processing", label: "معالجة AI" },
  { value: "ai_processed", label: "تمت المعالجة" },
  { value: "review_ready", label: "جاهز للمراجعة" },
  { value: "publishing", label: "جاري النشر" },
  { value: "published", label: "منشور" },
  { value: "failed", label: "فشل" },
];

const WOO_STATUSES = [
  { value: "publish", label: "منشور" },
  { value: "draft", label: "مسودة" },
  { value: "pending", label: "معلق" },
  { value: "private", label: "خاص" },
];

export function ProductFiltersSheet({
  filters,
  onUpdateFilter,
  onReset,
  hasActiveFilters,
  type,
}: ProductFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const statuses = type === "local" ? LOCAL_STATUSES : WOO_STATUSES;

  const toggleStatus = (status: string) => {
    const current = filters.status || [];
    if (current.includes(status)) {
      onUpdateFilter("status", current.filter(s => s !== status));
    } else {
      onUpdateFilter("status", [...current, status]);
    }
  };

  const activeCount = [
    filters.status.length > 0,
    filters.priceMin !== "",
    filters.priceMax !== "",
    filters.dateFrom !== "",
    filters.dateTo !== "",
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <SlidersHorizontal className="h-4 w-4" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            فلترة المنتجات
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw className="h-4 w-4 ml-1" />
                مسح الكل
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">الحالة</Label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <Badge
                  key={status.value}
                  variant={filters.status.includes(status.value) ? "default" : "outline"}
                  className="cursor-pointer transition-all"
                  onClick={() => toggleStatus(status.value)}
                >
                  {filters.status.includes(status.value) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                  {status.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Price Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">السعر</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">من</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.priceMin}
                  onChange={(e) => onUpdateFilter("priceMin", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">إلى</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.priceMax}
                  onChange={(e) => onUpdateFilter("priceMax", e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">تاريخ الإنشاء</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">من</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onUpdateFilter("dateFrom", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">إلى</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onUpdateFilter("dateTo", e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button onClick={() => setOpen(false)} className="w-full">
            تطبيق الفلاتر
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
