import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, type TooltipProps,
} from "recharts";
import type { Transaction } from "@/lib/api";

interface ExpenseChartProps {
  transactions: Transaction[];
  loading: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="animate-scale-fade rounded-xl border border-border bg-card p-4 shadow-2xl">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value as number)}
        </p>
      ))}
    </div>
  );
}

export function ExpenseChart({ transactions, loading }: ExpenseChartProps) {
  if (loading) {
    return (
      <Card className="card-premium border-0 bg-card">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const dailyData = transactions
    .filter(t => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      const day = t.date.slice(0, 10);
      acc[day] = (acc[day] || 0) + t.amount;
      return acc;
    }, {});

  const chartData = Object.entries(dailyData)
    .map(([day, expense]) => ({
      day: day.slice(5), // MM-DD
      expense,
    }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return (
    <Card className="card-premium animate-fade-up animate-fade-up-4 border-0 bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Evolução Financeira
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">Sem dados para exibir</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseGradLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                stroke="transparent"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94A3B8" }}
                stroke="transparent"
                width={55}
                tickFormatter={(v) => `R$${v}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(212, 175, 55, 0.2)", strokeWidth: 2 }} />
              <Line
                type="monotone"
                dataKey="expense"
                name="Evolução"
                stroke="#D4AF37"
                strokeWidth={3}
                dot={{ r: 4, fill: "#0B0F19", stroke: "#D4AF37", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#D4AF37", stroke: "#fff" }}
                animationBegin={100}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
