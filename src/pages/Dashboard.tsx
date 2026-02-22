import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, TrendingDown, TrendingUp, Users, Package, Wallet, Plus } from "lucide-react";
import { subDays, parseISO, isWithinInterval, format, eachMonthOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";

const CHART_COLORS = ["hsl(221, 83%, 53%)", "hsl(262, 83%, 58%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);
  const [showTxForm, setShowTxForm] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
      return data || [];
    },
  });

  const upsertTx = useMutation({
    mutationFn: async (data: any) => {
      if (editingTx) {
        const { error } = await supabase.from("transactions").update(data).eq("id", editingTx.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setShowTxForm(false);
      setEditingTx(null);
      toast.success(editingTx ? "Transaction updated" : "Transaction created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTx = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaction deleted");
    },
  });

  const handleTxSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsertTx.mutate({
      type: fd.get("type") as string,
      amount: parseFloat(fd.get("amount") as string) || 0,
      description: fd.get("description") as string || null,
      category: fd.get("category") as string || null,
      channel: fd.get("channel") as string || null,
      order_id: fd.get("order_id") as string || null,
      sku: fd.get("sku") as string || null,
      quantity: parseInt(fd.get("quantity") as string) || null,
      customer_id: fd.get("customer_id") as string || null,
      shipping_cost: parseFloat(fd.get("shipping_cost") as string) || null,
      unit_shipping_cost: parseFloat(fd.get("unit_shipping_cost") as string) || null,
      date: fd.get("date") as string || new Date().toISOString().split("T")[0],
    });
  };

  const filterByRange = (txs: any[], range: DateRange) =>
    txs.filter((t) => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: range.from, end: range.to });
    });

  const filtered = useMemo(() => filterByRange(transactions, dateRange), [transactions, dateRange]);
  const compFiltered = useMemo(() => comparisonRange ? filterByRange(transactions, comparisonRange) : [], [transactions, comparisonRange]);

  const productCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => { if (p.sku && p.cost != null) map[p.sku] = p.cost; });
    return map;
  }, [products]);

  const calcMetrics = (txs: any[]) => {
    const revenue = txs.filter((t) => t.type === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const cogs = txs.filter((t) => t.type === "revenue" && t.sku && t.quantity).reduce((s, t) => {
      const unitCost = productCostMap[t.sku] || 0;
      return s + unitCost * (t.quantity || 0);
    }, 0);
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    return { revenue, expenses, cogs, grossProfit, grossMargin, netProfit: revenue - cogs - expenses };
  };

  const metrics = useMemo(() => {
    const m = calcMetrics(filtered);
    const activeCustomers = customers.filter((c) => c.status === "active").length;
    const lowStock = products.filter((p) => p.is_active && (p.current_stock || 0) <= (p.reorder_point || 10)).length;
    return { ...m, activeCustomers, lowStock };
  }, [filtered, customers, products]);

  const compMetrics = useMemo(() => comparisonRange ? calcMetrics(compFiltered) : null, [compFiltered, comparisonRange]);

  const revenueByMonth = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map((month) => {
      const monthStr = format(month, "yyyy-MM");
      const monthTx = filtered.filter((t) => t.date.startsWith(monthStr));
      return {
        month: format(month, "MMM"),
        revenue: monthTx.filter((t) => t.type === "revenue").reduce((s, t) => s + (t.amount || 0), 0),
        expenses: monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0),
      };
    });
  }, [filtered, dateRange]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    filtered.filter((t) => t.type === "revenue").forEach((t) => {
      const cat = t.category || "other";
      cats[cat] = (cats[cat] || 0) + (t.amount || 0);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const formatCurrency = (val: number) => `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const revTrend = compMetrics ? pctChange(metrics.revenue, compMetrics.revenue) : null;
  const cogsTrend = compMetrics ? pctChange(metrics.cogs, compMetrics.cogs) : null;
  const gpTrend = compMetrics ? pctChange(metrics.grossProfit, compMetrics.grossProfit) : null;
  const gmTrend = compMetrics ? pctChange(metrics.grossMargin, compMetrics.grossMargin) : null;

  const metricCards = [
    { title: "Revenue", value: formatCurrency(metrics.revenue), icon: DollarSign, trend: revTrend, color: "text-primary" },
    { title: "COGS", value: formatCurrency(metrics.cogs), icon: TrendingDown, trend: cogsTrend, color: "text-destructive" },
    { title: "Gross Profit", value: formatCurrency(metrics.grossProfit), icon: Wallet, trend: gpTrend, color: "text-success" },
    { title: "Gross Margin", value: `${metrics.grossMargin.toFixed(1)}%`, icon: TrendingUp, trend: gmTrend, color: "text-primary" },
    { title: "Active Customers", value: metrics.activeCustomers.toString(), icon: Users, color: "text-accent" },
    { title: "Low Stock Items", value: metrics.lowStock.toString(), icon: Package, color: metrics.lowStock > 0 ? "text-warning" : "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business performance</p>
        </div>
        <Button onClick={() => { setEditingTx(null); setShowTxForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Transaction
        </Button>
      </div>

      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparisonRange={comparisonRange}
        onComparisonRangeChange={setComparisonRange}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((m) => (
          <Card key={m.title} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{m.title}</span>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              {m.trend && <p className={`text-xs mt-1 ${m.trend.startsWith("+") ? "text-success" : "text-destructive"}`}>{m.trend} vs prior period</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {categoryData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Category</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2">{format(parseISO(t.date), "MMM d, yyyy")}</td>
                    <td className="py-3 px-2">{t.description || "—"}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.type === "revenue" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 capitalize">{t.category || "—"}</td>
                    <td className={`py-3 px-2 text-right font-medium ${t.type === "revenue" ? "text-success" : "text-destructive"}`}>
                      {t.type === "revenue" ? "+" : "-"}{formatCurrency(t.amount)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingTx(t); setShowTxForm(true); }}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTx.mutate(t.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Form Dialog */}
      <Dialog open={showTxForm} onOpenChange={setShowTxForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTx ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTxSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={editingTx?.type || "revenue"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={editingTx?.date || new Date().toISOString().split("T")[0]} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" defaultValue={editingTx?.amount || ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" defaultValue={editingTx?.category || ""} placeholder="e.g. product_sales" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={editingTx?.description || ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channel">Channel</Label>
                <Input id="channel" name="channel" defaultValue={editingTx?.channel || ""} placeholder="e.g. d2c, wholesale" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_id">Order ID</Label>
                <Input id="order_id" name="order_id" defaultValue={editingTx?.order_id || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" defaultValue={editingTx?.sku || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" name="quantity" type="number" defaultValue={editingTx?.quantity || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipping_cost">Shipping Cost</Label>
                <Input id="shipping_cost" name="shipping_cost" type="number" step="0.01" defaultValue={editingTx?.shipping_cost || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_shipping_cost">Unit Shipping Cost</Label>
                <Input id="unit_shipping_cost" name="unit_shipping_cost" type="number" step="0.01" defaultValue={editingTx?.unit_shipping_cost || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <Select name="customer_id" defaultValue={editingTx?.customer_id || ""}>
                <SelectTrigger><SelectValue placeholder="Select customer (optional)" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={upsertTx.isPending}>
              {editingTx ? "Update Transaction" : "Create Transaction"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
