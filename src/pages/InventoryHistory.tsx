import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Package } from "lucide-react";
import { format } from "date-fns";

export default function InventoryHistory() {
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["inventory-snapshots", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      const { data } = await supabase.from("inventory_snapshots").select("*").eq("snapshot_date", selectedDate);
      return data || [];
    },
    enabled: !!selectedDate,
  });

  const { data: availableDates = [] } = useQuery({
    queryKey: ["snapshot-dates"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_snapshots").select("snapshot_date").order("snapshot_date", { ascending: false }).limit(1000);
      const unique = [...new Set((data || []).map((s) => s.snapshot_date))];
      return unique.sort((a, b) => b.localeCompare(a));
    },
  });

  const filtered = snapshots.filter(
    (s) => !search || s.sku?.toLowerCase().includes(search.toLowerCase()) || s.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filtered.reduce((s, snap) => s + ((snap.total_stock || 0) * (snap.cost || 0)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory History</h1>
        <p className="text-muted-foreground">Daily inventory snapshots and historical data</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Select Date</label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[200px]" />
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-sm text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by SKU or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
      </div>

      {selectedDate && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Products Tracked</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold">{filtered.reduce((s, snap) => s + (snap.total_stock || 0), 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Stock</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Reorder Point</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm">{s.sku}</td>
                      <td className="py-3 px-4">{s.product_name}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={(s.total_stock || 0) <= (s.reorder_point || 0) ? "destructive" : "secondary"}>
                          {s.total_stock}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">{s.reorder_point}</td>
                      <td className="py-3 px-4 text-right font-medium">${((s.total_stock || 0) * (s.cost || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedDate && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a date to view the inventory snapshot</p>
            {availableDates.length > 0 && (
              <p className="text-sm mt-2">Available dates: {availableDates.slice(0, 5).join(", ")}{availableDates.length > 5 ? "..." : ""}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
