import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { LogOut, Plus, Receipt, Download } from "lucide-react";
import { getGastos as fetchGastosAPI, deletarGasto, editarGasto, marcarComoPago, pagarParcelaAPI, criarGasto, type Transaction } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ExpenseChart } from "@/components/dashboard/ExpenseChart";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { TelegramConnect } from "@/components/dashboard/TelegramConnect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import fluxxoIconGlow from "@/assets/fluxxo-icon-glow.png";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context, location }) => {
    if (context.auth.isReady && !context.auth.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Fluxxo — Dashboard Financeiro" },
      { name: "description", content: "Gerencie suas finanças com um dashboard moderno e intuitivo." },
    ],
  }),
});

function Dashboard() {
  const { user, isReady, signOut } = useAuth();
  console.log("USER ID:", user?.id);
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Outros");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [newParcelas, setNewParcelas] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PWA Install Logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // Fetch data only if user is logged in
  useEffect(() => {
    if (user?.id) {
      getGastos();
    }
  }, [user?.id, getGastos]);

  const getGastos = useCallback(async () => {
    if (!user?.id) {
      console.warn("Dashboard: getGastos called without user.id");
      return;
    }
    console.log("Dashboard: Fetching gastos for user:", user.id);
    try {
      const data = await fetchGastosAPI(user.id);
      console.log("Dashboard: Fetched", data.length, "gastos");
      setTransactions((prev) => {
        const completedMap = new Map(prev.filter((p) => p.completed).map((p) => [p.id, true]));
        return data.map((t) => ({ ...t, completed: t.completed !== undefined ? t.completed : (completedMap.get(t.id) || false) }));
      });
    } catch (err) {
      console.error("Dashboard: Error fetching gastos:", err);
      setError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleAddTransaction = async () => {
    if (!user) return;
    const valor = parseFloat(newAmount);
    if (!newDesc || isNaN(valor)) {
      toast.error("Preencha descrição e valor corretamente");
      return;
    }

    setIsSubmitting(true);
    try {
      await criarGasto({
        descricao: newDesc,
        valor: valor,
        categoria: newCategory,
        parcelas: parseInt(newParcelas) || 1
      }, user.id);
      
      toast.success("Transação registrada!");
      setIsAddOpen(false);
      setNewDesc("");
      setNewAmount("");
      setNewParcelas("1");
      getGastos();
    } catch (err) {
      toast.error("Erro ao criar transação");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (user?.id) {
        await getGastos();
      }
      timeoutId = setTimeout(poll, 10000); // Polling every 10s is safer than 5s
    };

    if (user?.id) {
      poll();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [getGastos, user?.id]);

  const handleDelete = useCallback(async (id: string, parcelId?: string) => {
    if (!user) return;
    if (parcelId) {
      setTransactions((prev) => prev.filter((t) => t.parcel_id !== parcelId));
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
    try {
      await deletarGasto(id, user.id, parcelId);
      toast.success(parcelId ? "Compra completa removida" : "Transação removida");
    } catch (err) {
      getGastos();
    }
  }, [user, getGastos]);

  const handleEdit = useCallback(async (id: string, data: { description: string; amount: number; category: string }) => {
    if (!user) return;
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
    try {
      await editarGasto(id, { descricao: data.description, valor: data.amount, categoria: data.category }, user.id);
    } catch (err) {
      getGastos();
    }
  }, [user, getGastos]);

  const handleToggleComplete = useCallback(async (id: string) => {
    if (!user) return;
    let isCompleted = false;
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          isCompleted = !t.completed;
          return { ...t, completed: isCompleted };
        }
        return t;
      })
    );
    try {
      await marcarComoPago(id, isCompleted, user.id);
    } catch (err) {
      getGastos();
    }
  }, [user, getGastos]);

  const pagarParcela = useCallback(async (id: string) => {
    if (!user) return;
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: true } : t))
    );
    try {
      await pagarParcelaAPI(id, user.id);
      toast.success("Parcela marcada como paga!");
      getGastos(); // Recarrega os dados
    } catch (err) {
      getGastos();
    }
  }, [user, getGastos]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  if (!isReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // FILTERING LOGIC: Current Month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const filteredTransactions = showAllMonths 
    ? transactions 
    : transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  // LOGIC: Filter installments (using the logic suggested: total_parcelas > 1)
  const totalInstallments = filteredTransactions
    .filter((t) => t.totalInstallments && t.totalInstallments > 1)
    .reduce((s, t) => s + t.amount, 0);

  const currentBalance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-header sticky top-0 z-50 border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <img src={fluxxoIconGlow} alt="Fluxxo" className="h-8 w-auto" />
            <div>
              <h1 className="text-gradient font-display text-xl font-bold tracking-tight">
                fluxxo
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Dashboard Financeiro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {deferredPrompt && (
              <>
                <button
                  onClick={handleInstallClick}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                  title="Instalar App"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar App
                </button>
                <button
                  onClick={handleInstallClick}
                  className="flex md:hidden h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary transition-colors hover:bg-primary/10"
                  title="Instalar App"
                >
                  <Download className="h-4 w-4" />
                </button>
              </>
            )}
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:border-red-500/30 hover:text-red-400"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-7 px-5 py-8">
        {error && (
          <div className="animate-fade-up rounded-2xl border border-expense/20 bg-expense/5 p-4 text-center">
            <p className="text-sm font-medium text-expense">⚠ {error}</p>
            <button
              onClick={getGastos}
              className="mt-2 text-xs font-semibold text-expense underline underline-offset-2 hover:text-expense/80"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Greeting & Headline */}
        <div className="animate-fade-up flex flex-col gap-2 pb-2">
          <div className="flex items-end justify-between text-left">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Olá, <span className="text-foreground">{user.user_metadata?.first_name || user.email?.split("@")[0] || "Trader"}</span>
              </h2>
              <p className="text-xs font-medium text-muted-foreground">Saldo Atual ({showAllMonths ? "Geral" : "Este Mês"})</p>
              <h1 className="text-gradient drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] text-5xl font-bold tracking-tight py-1">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(currentBalance)}
              </h1>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                className="mb-2 text-[10px] font-bold uppercase tracking-wider h-8"
                onClick={() => setShowAllMonths(!showAllMonths)}
            >
                {showAllMonths ? "Ver Este Mês" : "Ver Tudo"}
            </Button>
          </div>
        </div>

        <SummaryCards
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          totalInstallments={totalInstallments}
          loading={loading}
        />

        <div className="animate-fade-up-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center glass-header">
          <p className="text-sm font-medium text-primary">
            "A riqueza não consiste em ter grandes posses, mas em ter poucas necessidades." — Epicteto
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ExpenseChart transactions={filteredTransactions} loading={loading} />
          </div>
          <div className="lg:col-span-2">
            <CategoryBreakdown transactions={filteredTransactions} loading={loading} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TransactionList
              transactions={filteredTransactions}
              loading={loading}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onToggleComplete={handleToggleComplete}
              pagarParcela={pagarParcela}
            />
          </div>
          <div>
            <TelegramConnect />
          </div>
        </div>
      </main>

      {/* Floating Action Button with Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
            <button
                className="btn-gradient group fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
                title="Adicionar Transação"
            >
                <Plus className="h-8 w-8 transition-transform group-hover:rotate-90" />
            </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Nova Transação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="desc" className="text-xs uppercase font-bold text-muted-foreground">Descrição</Label>
              <Input
                id="desc"
                placeholder="Ex: Mercado, Aluguel..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-muted/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-xs uppercase font-bold text-muted-foreground">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0,00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="bg-muted/50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parcelas" className="text-xs uppercase font-bold text-muted-foreground">Parcelas</Label>
                <Input
                  id="parcelas"
                  type="number"
                  min="1"
                  max="48"
                  value={newParcelas}
                  onChange={(e) => setNewParcelas(e.target.value)}
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Tipo</Label>
                    <Select value={newType} onValueChange={(v: "expense" | "income") => setNewType(v)}>
                        <SelectTrigger className="bg-muted/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="expense">Despesa 💸</SelectItem>
                            <SelectItem value="income">Receita 💰</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Categoria</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="bg-muted/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Outros">Outros</SelectItem>
                            <SelectItem value="Alimentação">Alimentação</SelectItem>
                            <SelectItem value="Transporte">Transporte</SelectItem>
                            <SelectItem value="Lazer">Lazer</SelectItem>
                            <SelectItem value="Contas">Contas</SelectItem>
                            <SelectItem value="Renda">Salário/Renda</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
                className="w-full btn-gradient border-0 h-11 text-base font-bold" 
                onClick={handleAddTransaction}
                disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Registrar Transação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
