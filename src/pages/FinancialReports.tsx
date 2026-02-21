import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subDays, parseISO, isWithinInterval, format, eachMonthOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export default function FinancialReports() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 90), to: new Date() });
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("date", { ascending: false });
      return data || [];
    },
  });

  const filterByRange = (txs: any[], range: DateRange) =>
    txs.filter((t) => isWithinInterval(parseISO(t.date), { start: range.from, end: range.to }));

  const filtered = useMemo(() => filterByRange(transactions, dateRange), [transactions, dateRange]);
  const compFiltered = useMemo(() => comparisonRange ? filterByRange(transactions, comparisonRange) : [], [transactions, comparisonRange]);

  const calcTotals = (txs: any[]) => {
    const revenue = txs.filter((t) => t.type === "revenue").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const profit = revenue - expenses;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";
    return { revenue, expenses, profit, margin };
  };

  const totals = useMemo(() => calcTotals(filtered), [filtered]);
  const compTotals = useMemo(() => comparisonRange ? calcTotals(compFiltered) : null, [compFiltered, comparisonRange]);

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

  const summaryCards = [
    { label: "Revenue", value: fmt(totals.revenue), color: "text-primary", trend: compTotals ? pctChange(totals.revenue, compTotals.revenue) : null },
    { label: "Expenses", value: fmt(totals.expenses), color: "text-destructive", trend: compTotals ? pctChange(totals.expenses, compTotals.expenses) : null },
    { label: "Net Profit", value: fmt(totals.profit), color: totals.profit >= 0 ? "text-success" : "text-destructive", trend: compTotals ? pctChange(totals.profit, compTotals.profit) : null },
    { label: "Margin", value: `${totals.margin}%`, color: "text-accent", trend: compTotals ? `was ${compTotals.margin}%` : null },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
        <p className="text-muted-foreground">Profit & loss analysis</p>
      </div>

      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        comparisonRange={comparisonRange}
        onComparisonRangeChange={setComparisonRange}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {summaryCards.map((m) => (
          <Card key={m.label} className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              {m.trend && <p className={`text-xs mt-1 ${m.trend.startsWith("+") ? "text-success" : m.trend.startsWith("-") ? "text-destructive" : "text-muted-foreground"}`}>{m.trend} vs prior</p>}
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
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="capitalize text-sm text-foreground">{cat}</span>
                  <span className="font-medium text-sm">{fmt(amount as number)}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
