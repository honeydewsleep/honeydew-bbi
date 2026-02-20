import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, AlertTriangle, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function WarehouseInventory() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase.from("inventory_locations").select("*").order("name");
      return data || [];
    },
  });

  const { data: locationStocks = [] } = useQuery({
    queryKey: ["location-stocks"],
    queryFn: async () => {
      const { data } = await supabase.from("product_location_stocks").select("*");
      return data || [];
    },
  });

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((p) => p.is_active);
    if (search) {
      result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (stockFilter === "low") {
      result = result.filter((p) => (p.current_stock || 0) <= (p.reorder_point || 10));
    } else if (stockFilter === "out") {
      result = result.filter((p) => (p.current_stock || 0) === 0);
    }
    return result;
  }, [products, search, categoryFilter, stockFilter]);

  const totalStock = filtered.reduce((s, p) => s + (p.current_stock || 0), 0);
  const lowStockCount = filtered.filter((p) => (p.current_stock || 0) <= (p.reorder_point || 10) && (p.current_stock || 0) > 0).length;
  const outOfStock = filtered.filter((p) => (p.current_stock || 0) === 0).length;

  const getStockLevel = (p: any) => {
    const stock = p.current_stock || 0;
    const reorder = p.reorder_point || 10;
    if (stock === 0) return { color: "destructive" as const, label: "Out of Stock" };
    if (stock <= reorder) return { color: "secondary" as const, label: "Low Stock" };
    return { color: "default" as const, label: "In Stock" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Warehouse Inventory</h1>
        <p className="text-muted-foreground">Real-time stock levels and location tracking</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold">{outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stock Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const level = getStockLevel(p);
          const stockPct = Math.min(100, ((p.current_stock || 0) / Math.max(p.reorder_quantity || 100, 1)) * 100);
          const productLocations = locationStocks.filter((ls) => ls.product_id === p.id && (ls.quantity || 0) > 0);

          return (
            <Card key={p.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {p.sku}</p>
                  </div>
                  <Badge variant={level.color}>{level.label}</Badge>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Stock Level</span>
                    <span className="font-medium">{p.current_stock || 0} / {p.reorder_quantity || 100}</span>
                  </div>
                  <Progress value={stockPct} className="h-2" />
                </div>

                {productLocations.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Locations</p>
                    {productLocations.map((ls) => {
                      const loc = locations.find((l) => l.id === ls.location_id);
                      return (
                        <div key={ls.id} className="flex justify-between text-sm">
                          <span>{loc?.name || "Unknown"}</span>
                          <span className="font-medium">{ls.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Cost: ${p.cost?.toFixed(2) || "0.00"}</span>
                  <span>Reorder: {p.reorder_point}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
