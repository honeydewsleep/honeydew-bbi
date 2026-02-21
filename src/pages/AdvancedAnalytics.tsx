import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { subDays, parseISO, isWithinInterval } from "date-fns";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";

const COLORS = ["hsl(221, 83%, 53%)", "hsl(262, 83%, 58%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function AdvancedAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 90), to: new Date() });
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("date", { ascending: false }).limit(1000);
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

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*");
      return data || [];
    },
  });

  const filterByRange = (txs: any[], range: DateRange) =>
    txs.filter((t) => isWithinInterval(parseISO(t.date), { start: range.from, end: range.to }));

  const filtered = useMemo(() => filterByRange(transactions, dateRange), [transactions, dateRange]);

  // Channel breakdown
  const channelData = useMemo(() => {
    const channels: Record<string, number> = {};
    filtered.filter((t) => t.type === "revenue").forEach((t) => {
      channels[t.channel || "unknown"] = (channels[t.channel || "unknown"] || 0) + (t.amount || 0);
    });
    return Object.entries(channels).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Top products by revenue
  const topProducts = useMemo(() => {
    const skuRevenue: Record<string, number> = {};
    filtered.filter((t) => t.type === "revenue" && t.sku).forEach((t) => {
      skuRevenue[t.sku!] = (skuRevenue[t.sku!] || 0) + (t.amount || 0);
    });
    return Object.entries(skuRevenue)
      .map(([sku, revenue]) => {
        const product = products.find((p) => p.sku === sku);
        return { name: product?.name || sku, revenue };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filtered, products]);

  // Customer segments
  const customerSegments = useMemo(() => {
    const segments = { high: 0, medium: 0, low: 0, inactive: 0 };
    customers.forEach((c) => {
      const ltv = c.lifetime_value || 0;
      if (c.status !== "active") segments.inactive++;
      else if (ltv > 5000) segments.high++;
      else if (ltv > 1000) segments.medium++;
      else segments.low++;
    });
    return Object.entries(segments).map(([name, value]) => ({ name, value }));
  }, [customers]);

  const fmt = (v: number) => `$${v.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Advanced Analytics</h1>
        <p className="text-muted-foreground">Deep insights into your business performance</p>
      </div>

      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparisonRange={comparisonRange}
        onComparisonRangeChange={setComparisonRange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">Revenue by Channel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">Customer Segments</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerSegments}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
