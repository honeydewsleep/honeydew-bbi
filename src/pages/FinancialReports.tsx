import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subDays, parseISO, isWithinInterval, format, eachMonthOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function FinancialReports() {
  const [dateRange] = useState({ from: subDays(new Date(), 90), to: new Date() });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
    });
  }, [transactions, dateRange]);

  const revenue = filtered.filter((t) => t.type === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const profit = revenue - expenses;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    return months.map((month) => {
      const key = format(month, "yyyy-MM");
      const mtx = filtered.filter((t) => t.date.startsWith(key));
      const rev = mtx.filter((t) => t.type === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
      const exp = mtx.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      return { month: format(month, "MMM yy"), revenue: rev, expenses: exp, profit: rev - exp };
    });
  }, [filtered, dateRange]);

  const fmt = (v: number) => `$${v.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
        <p className="text-muted-foreground">Profit & loss analysis</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Revenue", value: fmt(revenue), color: "text-primary" },
          { label: "Expenses", value: fmt(expenses), color: "text-destructive" },
          { label: "Net Profit", value: fmt(profit), color: profit >= 0 ? "text-success" : "text-destructive" },
          { label: "Margin", value: `${margin}%`, color: "text-accent" },
        ].map((m) => (
          <Card key={m.label} className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">Monthly Revenue & Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">Profit Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Line type="monotone" dataKey="profit" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={{ fill: "hsl(262, 83%, 58%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expense breakdown */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(
              filtered.filter((t) => t.type === "expense").reduce((acc: Record<string, number>, t) => {
                const cat = t.category || "other";
                acc[cat] = (acc[cat] || 0) + (t.amount || 0);
                return acc;
              }, {})
            )
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="capitalize text-sm text-foreground">{cat}</span>
                  <span className="font-medium text-sm">{fmt(amount)}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
