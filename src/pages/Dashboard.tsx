import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Users, Package, Wallet } from "lucide-react";
import { subDays, parseISO, isWithinInterval, format, eachMonthOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["hsl(221, 83%, 53%)", "hsl(262, 83%, 58%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function Dashboard() {
  const [dateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });

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

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
    });
  }, [transactions, dateRange]);

  const metrics = useMemo(() => {
    const revenue = filtered.filter((t) => t.type === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const activeCustomers = customers.filter((c) => c.status === "active").length;
    const lowStock = products.filter((p) => p.is_active && (p.current_stock || 0) <= (p.reorder_point || 10)).length;
    return { revenue, expenses, profit: revenue - expenses, activeCustomers, lowStock };
  }, [filtered, customers, products]);

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

  const metricCards = [
    { title: "Revenue", value: formatCurrency(metrics.revenue), icon: DollarSign, trend: "+12%", color: "text-primary" },
    { title: "Expenses", value: formatCurrency(metrics.expenses), icon: TrendingDown, trend: "-3%", color: "text-destructive" },
    { title: "Profit", value: formatCurrency(metrics.profit), icon: Wallet, trend: "+8%", color: "text-success" },
    { title: "Active Customers", value: metrics.activeCustomers.toString(), icon: Users, color: "text-accent" },
    { title: "Low Stock Items", value: metrics.lowStock.toString(), icon: Package, color: metrics.lowStock > 0 ? "text-warning" : "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business performance</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((m) => (
          <Card key={m.title} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{m.title}</span>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              {m.trend && <p className={`text-xs mt-1 ${m.trend.startsWith("+") ? "text-success" : "text-destructive"}`}>{m.trend} from last period</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
          </CardHeader>
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
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
