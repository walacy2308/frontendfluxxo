import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, Wallet, Receipt } from "lucide-react";

interface SummaryCardsProps {
  totalIncome?: number;
  totalExpenses: number;
  totalInstallments?: number;
  loading: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SummaryCards({ totalIncome = 0, totalExpenses, totalInstallments = 0, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="card-premium border-0 bg-card">
            <CardContent className="p-4 sm:p-6">
              <Skeleton className="mb-3 h-3 w-16 sm:h-4 sm:w-24" />
              <Skeleton className="h-7 w-24 sm:h-9 sm:w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const balance = totalIncome - totalExpenses;

  const cards = [
    {
      label: "Receitas",
      value: formatCurrency(totalIncome),
      icon: TrendingDown,
      iconClass: "rotate-180", // Arrow up for income
      colorClass: "text-income",
      iconBg: "bg-income/10",
      delay: "animate-fade-up-1",
      glow: false,
    },
    {
      label: "Despesas",
      value: formatCurrency(totalExpenses),
      icon: Receipt,
      iconClass: "",
      colorClass: "text-expense",
      iconBg: "bg-expense/10",
      delay: "animate-fade-up-2",
      glow: false,
    },
    {
      label: "Parcelamentos",
      value: formatCurrency(totalInstallments),
      icon: Receipt,
      iconClass: "opacity-70",
      colorClass: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      delay: "animate-fade-up-3",
      glow: false,
    },
    {
      label: "Saldo Total",
      value: formatCurrency(balance),
      icon: Wallet,
      iconClass: "",
      colorClass: "text-primary",
      iconBg: "bg-primary/10",
      delay: "animate-fade-up-4",
      glow: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={`card-premium animate-fade-up border-0 bg-card ${card.delay} ${card.glow ? "card-glow" : ""}`}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="order-2 sm:order-1">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {card.label}
                </p>
                <p className={`animate-count-up mt-1 sm:mt-2 text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight ${card.colorClass}`}>
                  {card.value}
                </p>
              </div>
              <div className={`order-1 sm:order-2 self-start sm:self-center rounded-xl sm:rounded-2xl p-2 sm:p-3 ${card.iconBg}`}>
                <card.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${card.iconClass || ""}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
