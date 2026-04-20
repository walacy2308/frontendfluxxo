const BASE_URL = import.meta.env.VITE_API_URL || "https://fluxxo-production-d9d7.up.railway.app/api/v1";

export interface GastoAPI {
  id?: string | number;
  descricao: string;
  valor: number;
  categoria: string;
  created_at: string;
  pago?: boolean;
  completed?: boolean;
  tipo?: string;
  parcelas?: number;
  parcela_atual?: number;
  total_parcelas?: number;
  parcel_id?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  date: string;
  completed?: boolean;
  parcel_id?: string;
  currentInstallment?: number;
  totalInstallments?: number;
  isInstallment?: boolean;
  label: string;
}

function mapGastoToTransaction(gasto: GastoAPI, index: number): Transaction {
  const isCompleted = gasto.completed === true || gasto.pago === true;
  const isInstallment = !!gasto.parcel_id;
  const totalInstallments = gasto.total_parcelas || gasto.parcelas;

  let label = gasto.descricao;
  if (isInstallment && gasto.parcela_atual && totalInstallments) {
    label = `${gasto.descricao} (${gasto.parcela_atual}/${totalInstallments})`;
  }

  return {
    id: gasto.id ? String(gasto.id) : String(index),
    description: gasto.descricao,
    amount: gasto.valor,
    type: gasto.tipo === "entrada" || gasto.tipo === "income" ? "income" : "expense",
    category: gasto.category || gasto.categoria,
    date: gasto.created_at,
    completed: isCompleted,
    parcel_id: gasto.parcel_id,
    currentInstallment: gasto.parcela_atual,
    totalInstallments: totalInstallments,
    isInstallment: isInstallment,
    label: label,
  };
}

function getHeaders(userId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["user-id"] = userId;
  }
  return headers;
}

export async function getGastos(userId?: string): Promise<Transaction[]> {
  if (!userId) {
    console.warn("getGastos: userId is missing");
    return [];
  }

  const res = await fetch(`${BASE_URL}/gastos`, {
    headers: getHeaders(userId),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Erro ao buscar gastos (${res.status}):`, errorText);
    throw new Error(`Erro ao buscar gastos: ${res.status}`);
  }

  const data: GastoAPI[] = await res.json();
  console.log("Gastos recebidos:", data);
  return data.map(mapGastoToTransaction);
}

export interface CriarGastoData {
  descricao: string;
  valor: number;
  categoria: string;
  parcelas?: number;
}

export async function criarGasto(data: CriarGastoData, userId?: string): Promise<Transaction> {
  if (!userId) {
    console.error("criarGasto: userId is missing");
    throw new Error("userId is required to create an expense");
  }
  const res = await fetch(`${BASE_URL}/gastos`, {
    method: "POST",
    headers: getHeaders(userId),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Erro ao criar gasto: ${res.status}`);
  const gasto: GastoAPI = await res.json();
  return mapGastoToTransaction(gasto, 0);
}

export async function deletarGasto(id: string, userId: string, parcelId?: string): Promise<void> {
  if (!userId) {
    console.error("deletarGasto: userId is missing");
    throw new Error("userId is required to delete an expense");
  }

  let url = `${BASE_URL}/gastos/${id}`;
  if (parcelId) {
    url += `?parcel_id=${parcelId}`;
  }

  const res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(userId),
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro ao deletar:", erro);
    throw new Error(`Erro ao deletar gasto: ${res.status}`);
  }
}

export interface EditarGastoData {
  descricao?: string;
  valor?: number;
  categoria?: string;
  pago?: boolean;
}

export async function editarGasto(id: string, data: EditarGastoData, userId: string): Promise<Transaction> {
  if (!userId) {
    console.error("editarGasto: userId is missing");
    throw new Error("userId is required to edit an expense");
  }
  const res = await fetch(`${BASE_URL}/gastos/${id}`, {
    method: "PUT",
    headers: getHeaders(userId),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro ao editar:", erro);
    throw new Error(`Erro ao editar gasto: ${res.status}`);
  }

  const gasto: GastoAPI = await res.json();
  return mapGastoToTransaction(gasto, 0);
}

export async function marcarComoPago(id: string, pago: boolean, userId: string): Promise<void> {
  if (!userId) {
    console.error("marcarComoPago: userId is missing");
    throw new Error("userId is required to mark as paid");
  }
  const res = await fetch(`${BASE_URL}/gastos/${id}`, {
    method: "PATCH",
    headers: getHeaders(userId),
    body: JSON.stringify({ pago }),
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro ao marcar como pago:", erro);
    throw new Error(`Erro ao marcar como pago: ${res.status}`);
  }
}

export async function pagarParcelaAPI(id: string, userId: string): Promise<void> {
  if (!userId) {
    console.error("pagarParcelaAPI: userId is missing");
    throw new Error("userId is required to pay a parcel");
  }
  const res = await fetch(`${BASE_URL}/gastos/${id}/pagar`, {
    method: "PATCH",
    headers: getHeaders(userId)
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro ao pagar parcela:", erro);
    throw new Error(`Erro ao pagar parcela: ${res.status}`);
  }
}
