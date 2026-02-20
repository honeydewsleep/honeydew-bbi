import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, DollarSign, Download, RefreshCw, TrendingUp } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";
import { toast } from "sonner";

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const [syncing, setSyncing] = useState(false);

  const { data: orders = [], refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, customers(name, email, company)")
        .eq("type", "revenue")
        .order("date", { ascending: false });
      return data || [];
    },
  });

  const channels = useMemo(() => {
    const set = new Set(orders.map((o) => o.channel).filter(Boolean));
    return Array.from(set) as string[];
  }, [orders]);

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(dateFilter));
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.description?.toLowerCase().includes(search.toLowerCase()) ||
        o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
        o.sku?.toLowerCase().includes(search.toLowerCase()) ||
        (o as any).customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (o as any).customers?.email?.toLowerCase().includes(search.toLowerCase());
      const matchChannel = channelFilter === "all" || o.channel === channelFilter;
      const matchDate = parseISO(o.date) >= cutoff;
      return matchSearch && matchChannel && matchDate;
    });
  }, [orders, search, channelFilter, dateFilter]);

  const metrics = useMemo(() => {
    const totalRevenue = filtered.reduce((s, o) => s + (o.amount || 0), 0);
    const totalOrders = filtered.length;
    const totalUnits = filtered.reduce((s, o) => s + (o.quantity || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalOrders, totalUnits, avgOrderValue };
  }, [filtered]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("shipstation-sync");
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} new orders`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map((o) => ({
        Date: o.date,
        Order_ID: o.order_id || "",
        SKU: o.sku || "",
        Description: o.description || "",
        Customer: (o as any).customers?.name || "",
        Channel: o.channel || "",
        Quantity: o.quantity || 0,
        Amount: o.amount,
        Shipping: o.shipping_cost || 0,
      })),
      "orders"
    );
    toast.success("Orders exported");
  };

  const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Monitor sales in real-time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> Sync ShipStation
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{metrics.totalOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">{fmt(metrics.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">{fmt(metrics.avgOrderValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Units Sold</p>
              <p className="text-2xl font-bold">{metrics.totalUnits.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders, SKUs, customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {channels.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Date Range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Channel</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Shipping</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4">{format(parseISO(o.date), "MMM d, yyyy")}</td>
                    <td className="py-3 px-4 font-mono text-xs">{o.order_id || "—"}</td>
                    <td className="py-3 px-4">{(o as any).customers?.name || "—"}</td>
                    <td className="py-3 px-4 font-mono text-xs">{o.sku || "—"}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{o.description || "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="capitalize">{o.channel || "—"}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">{o.quantity || "—"}</td>
                    <td className="py-3 px-4 text-right font-medium text-success">{fmt(o.amount)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{o.shipping_cost ? fmt(o.shipping_cost) : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No orders found. Try syncing with ShipStation or adjusting filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
