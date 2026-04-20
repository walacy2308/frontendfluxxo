import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { Transaction } from "@/lib/api";

interface CategoryBreakdownProps {
  transactions: Transaction[];
  loading: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORY_COLORS: Record<string, string> = {
  alimentação: "#D4AF37", // Dourado
  transporte: "#16A34A", // Verde
  lazer: "#60A5FA",      // Azul claro
  saúde: "#EF4444",      // Vermelho
  educação: "#9333EA",     // Roxo
  moradia: "#F59E0B",      // Amber
  outros: "#94A3B8",       // Cinza
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category.toLowerCase()] || "#D4AF37";
}

export function CategoryBreakdown({ transactions, loading }: CategoryBreakdownProps) {
  if (loading) {
    return (
      <Card className="card-premium border-0 bg-card">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const categoryTotals = transactions
    .filter(t => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      const cat = t.category || "Outros";
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});

  const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="card-premium animate-fade-up animate-fade-up-5 border-0 bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Gastos por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">Sem dados</p>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sorted.map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {sorted.map(([name], index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(name)} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="animate-scale-fade rounded-xl border border-border bg-card p-3 shadow-2xl">
                          <p className="text-xs font-bold capitalize" style={{ color: getCategoryColor(data.name) }}>
                            {data.name}
                          </p>
                          <p className="text-sm font-medium">{formatCurrency(data.value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex w-full flex-wrap justify-center gap-4">
              {sorted.map(([category, amount]) => (
                <div key={category} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                  <span className="text-xs font-medium capitalize text-muted-foreground">
                    {category} <span className="text-foreground">({((amount / total) * 100).toFixed(0)}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
