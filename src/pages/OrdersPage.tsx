import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, DollarSign, Download, RefreshCw, TrendingUp } from "lucide-react";
import { format, parseISO, subDays, isWithinInterval } from "date-fns";
import { exportToCSV } from "@/lib/exportUtils";
import { toast } from "sonner";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);
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

  const filterOrders = (ordersArr: any[], range: DateRange) =>
    ordersArr.filter((o) => {
      const matchSearch =
        !search ||
        o.description?.toLowerCase().includes(search.toLowerCase()) ||
        o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
        o.sku?.toLowerCase().includes(search.toLowerCase()) ||
        (o as any).customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
        (o as any).customers?.email?.toLowerCase().includes(search.toLowerCase());
      const matchChannel = channelFilter === "all" || o.channel === channelFilter;
      const matchDate = isWithinInterval(parseISO(o.date), { start: range.from, end: range.to });
      return matchSearch && matchChannel && matchDate;
    });

  const filtered = useMemo(() => filterOrders(orders, dateRange), [orders, search, channelFilter, dateRange]);
  const compFiltered = useMemo(() => comparisonRange ? filterOrders(orders, comparisonRange) : [], [orders, search, channelFilter, comparisonRange]);

  const calcMetrics = (arr: any[]) => {
    const totalRevenue = arr.reduce((s, o) => s + (o.amount || 0), 0);
    const totalOrders = arr.length;
    const totalUnits = arr.reduce((s, o) => s + (o.quantity || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalOrders, totalUnits, avgOrderValue };
  };

  const metrics = useMemo(() => calcMetrics(filtered), [filtered]);
  const compMetrics = useMemo(() => comparisonRange ? calcMetrics(compFiltered) : null, [compFiltered, comparisonRange]);

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
        Date: o.date, Order_ID: o.order_id || "", SKU: o.sku || "",
        Description: o.description || "", Customer: (o as any).customers?.name || "",
        Channel: o.channel || "", Quantity: o.quantity || 0,
        Amount: o.amount, Shipping: o.shipping_cost || 0,
      })),
      "orders"
    );
    toast.success("Orders exported");
  };

  const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const metricCards = [
    { label: "Total Orders", value: metrics.totalOrders.toString(), icon: ShoppingCart, color: "text-primary", trend: compMetrics ? pctChange(metrics.totalOrders, compMetrics.totalOrders) : null },
    { label: "Revenue", value: fmt(metrics.totalRevenue), icon: DollarSign, color: "text-success", trend: compMetrics ? pctChange(metrics.totalRevenue, compMetrics.totalRevenue) : null },
    { label: "Avg Order Value", value: fmt(metrics.avgOrderValue), icon: TrendingUp, color: "text-accent", trend: compMetrics ? pctChange(metrics.avgOrderValue, compMetrics.avgOrderValue) : null },
    { label: "Units Sold", value: metrics.totalUnits.toLocaleString(), icon: ShoppingCart, color: "text-primary", trend: compMetrics ? pctChange(metrics.totalUnits, compMetrics.totalUnits) : null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Monitor sales in real-time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button onClick={handleSync} disabled={syncing}><RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> Sync ShipStation</Button>
        </div>
      </div>

      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparisonRange={comparisonRange}
        onComparisonRangeChange={setComparisonRange}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label} className="border-border/50">
            <CardContent className="pt-6 flex items-center gap-3">
              <m.icon className={`h-5 w-5 ${m.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
                {m.trend && <p className={`text-xs ${m.trend.startsWith("+") ? "text-success" : "text-destructive"}`}>{m.trend} vs prior</p>}
              </div>
            </CardContent>
          </Card>
        ))}
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
                    <td className="py-3 px-4"><Badge variant="secondary" className="capitalize">{o.channel || "—"}</Badge></td>
                    <td className="py-3 px-4 text-right">{o.quantity || "—"}</td>
                    <td className="py-3 px-4 text-right font-medium text-success">{fmt(o.amount)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{o.shipping_cost ? fmt(o.shipping_cost) : "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No orders found. Try syncing with ShipStation or adjusting filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
