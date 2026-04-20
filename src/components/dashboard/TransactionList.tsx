import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDownRight, ArrowUpRight, Check, MoreHorizontal, Pencil, Trash2, CheckCircle2, Receipt } from "lucide-react";
import type { Transaction } from "@/lib/api";
import { toast } from "sonner";

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  onDelete?: (id: string, parcelId?: string) => void;
  onEdit?: (id: string, data: { description: string; amount: number; category: string }) => void;
  onToggleComplete?: (id: string) => void;
  pagarParcela?: (id: string) => void;
}

interface GroupedTransaction extends Partial<Transaction> {
  id: string;
  items: Transaction[];
  parcel_id?: string;
  description: string;
  type: "expense" | "income";
  category: string;
  date: string;
  isInstallment?: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function TransactionList({ transactions, loading, onDelete, onEdit, onToggleComplete, pagarParcela }: TransactionListProps) {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  function openEdit(t: Transaction) {
    setEditingTx(t);
    setEditDesc(t.description);
    setEditAmount(String(t.amount));
    setEditCategory(t.category);
  }

  function handleSaveEdit() {
    if (!editingTx) return;
    const amount = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    onEdit?.(editingTx.id, { description: editDesc.trim(), amount, category: editCategory.trim() });
    setEditingTx(null);
    toast.success("Transação editada");
  }

  function handleDelete(id: string, parcelId?: string) {
    onDelete?.(id, parcelId);
  }

  function handleToggle(id: string) {
    onToggleComplete?.(id);
  }

  function handlePagarParcela(id: string) {
    pagarParcela?.(id);
  }

  if (loading) {
    return (
      <Card className="card-premium border-0 bg-card">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <div className="flex-1">
                <Skeleton className="mb-1.5 h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Group transactions
  const groupedTransactions = transactions.reduce((acc, t) => {
    if (t.isInstallment && t.parcel_id) {
      const existing = acc.find((item) => item.parcel_id === t.parcel_id);
      if (existing) {
        existing.items.push(t);
        return acc;
      }
      acc.push({
        id: t.parcel_id,
        parcel_id: t.parcel_id,
        description: t.description,
        type: t.type,
        category: t.category,
        date: t.date,
        isInstallment: true,
        items: [t],
      });
      return acc;
    }
    acc.push({ ...t, items: [t] } as GroupedTransaction);
    return acc;
  }, [] as GroupedTransaction[]);

  return (
    <>
      <Card className="card-premium animate-fade-up animate-fade-up-5 border-0 bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Transações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupedTransactions.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">Nenhum gasto ainda</p>
          ) : (
            <div className="space-y-3">
              {groupedTransactions.map((group, index) => {
                const isGroup = group.items.length > 1 || (group.items[0]?.isInstallment);
                const first = group.items[0];

                if (isGroup && group.isInstallment) {
                  const totalCount = first.totalInstallments || group.items.length;
                  const completedItems = group.items.filter((i: Transaction) => i.completed);
                  const completedCount = completedItems.length;
                  const totalValue = first.amount * totalCount;
                  const remainingValue = totalValue - (completedCount * first.amount);
                  const progress = (completedCount / totalCount) * 100;

                  return (
                    <div
                      key={group.id}
                      className="animate-fade-up group flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-5 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
                      style={{ animationDelay: `${420 + index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div 
                          className="flex gap-4 cursor-pointer flex-1"
                          onClick={() => toggleGroup(group.id)}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                            <Receipt className="h-6 w-6 text-emerald-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-bold text-foreground">
                                {group.description}
                              </h3>
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                                {completedCount}/{totalCount} PARCELAS
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {group.category && <span className="capitalize">{group.category} · </span>}
                              Restante: <span className="font-semibold text-foreground">{formatCurrency(remainingValue)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <div className="text-right">
                            <p className="text-lg font-black tracking-tight text-foreground">
                              {formatCurrency(totalValue)}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Geral</p>
                          </div>

                          <div className="mt-1 flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar Compra"
                              className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={() => openEdit(first)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir Compra Completa"
                              className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(first.id, first.parcel_id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span className="flex items-center gap-1.5 cursor-pointer" onClick={() => toggleGroup(group.id)}>
                            <span className="h-1 w-1 rounded-full bg-emerald-500" />
                            {expandedGroups[group.id] ? "Ocultar Parcelas" : "Ver Parcelas"}
                          </span>
                          <span className="text-emerald-500">{Math.round(progress)}% Concluído</span>
                        </div>
                      </div>

                      {expandedGroups[group.id] && (
                        <div className="mt-2 space-y-2 border-t border-border/40 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          {group.items.sort((a: Transaction, b: Transaction) => a.currentInstallment! - b.currentInstallment!).map((item: Transaction) => (
                            <div key={item.id} className={`flex items-center justify-between rounded-xl p-3 transition-colors ${item.completed ? "bg-success/5 opacity-60" : "bg-muted/30 hover:bg-muted/50"}`}>
                              <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.completed ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                                  {item.completed ? <Check className="h-4 w-4" /> : <span className="text-[10px] font-bold">{item.currentInstallment}</span>}
                                </div>
                                <div>
                                  <p className={`text-sm font-semibold ${item.completed ? "line-through text-muted-foreground decoration-success/50" : "text-foreground"}`}>
                                    {item.label}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{formatDate(item.date)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold tabular-nums ${item.completed ? "text-muted-foreground line-through decoration-success/50" : "text-foreground"}`}>
                                  {formatCurrency(item.amount)}
                                </span>
                                {!item.completed && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 border-emerald-500/20 bg-emerald-500/5 px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                    onClick={() => handlePagarParcela(item.id)}
                                  >
                                    Marcar como pago
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular Transaction (non-installment)
                const t = group;
                return (
                  <div
                    key={t.id}
                    className={`transaction-row animate-fade-up flex items-center gap-4 rounded-xl p-3 hover:bg-muted ${t.completed ? "opacity-50" : ""}`}
                    style={{ animationDelay: `${420 + index * 50}ms` }}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${t.completed ? "bg-success/10" : t.type === "income" ? "bg-income/10" : "bg-expense/10"}`}>
                      {t.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : t.type === "income" ? (
                        <ArrowUpRight className="h-5 w-5 text-income" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-expense" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {t.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.category && <span className="capitalize">{t.category} · </span>}
                        {formatDate(t.date)}
                        {t.completed && <span className="ml-1 text-success"> · Concluído</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className={`mr-1 text-sm font-bold tabular-nums ${t.completed ? "text-muted-foreground line-through" : t.type === "income" ? "text-income" : "text-expense"}`}>
                        {t.type === "income" ? "+ " : "− "}{formatCurrency(t.amount)}
                      </p>

                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t.completed ? "Desmarcar" : "Marcar como pago"}
                          className={`h-6 w-6 shrink-0 rounded-full transition-colors ${t.completed ? "text-success bg-success/10" : "text-muted-foreground hover:text-success hover:bg-success/10"}`}
                          onClick={() => handleToggle(t.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Apagar"
                          className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Descrição</label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor (R$)</label>
              <Input type="number" step="0.01" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingTx(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
