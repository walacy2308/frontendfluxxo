export const API_URL = import.meta.env.VITE_API_URL || "https://fluxxo-production-d9d7.up.railway.app/api/v1";

function getUserId() {
  return localStorage.getItem("user_id");
}

export function formatarParcelas(gastos) {
  return gastos.map(g => {
    if (g.total_parcelas) {
      return {
        ...g,
        label: `${g.descricao} (${g.parcela_atual}/${g.total_parcelas})`
      };
    }
    return {
      ...g,
      label: g.descricao
    };
  });
}

export function agruparParcelas(gastos) {
  const grupos = {};

  gastos.forEach(g => {
    if (!g.parcel_id) return;

    if (!grupos[g.parcel_id]) {
      grupos[g.parcel_id] = {
        id: g.parcel_id,
        parcel_id: g.parcel_id,
        descricao: g.descricao,
        categoria: g.categoria,
        total: g.total_parcelas,
        valor_total: g.valor * g.total_parcelas,
        parcelas: []
      };
    }

    grupos[g.parcel_id].parcelas.push(g);
  });

  return Object.values(grupos);
}

function getHeaders(userId) {
  const finalId = userId || localStorage.getItem("user_id");
  return {
    "Content-Type": "application/json",
    "user-id": finalId,
  };
}

// ─── Gastos ───────────────────────────────────────────────────────────────────

export async function getGastos(userId) {
  const res = await fetch(`${API_URL}/gastos`, {
    headers: getHeaders(userId),
  });

  if (!res.ok) throw new Error(`Erro ao buscar gastos: ${res.status}`);
  return res.json();
}

export async function criarGasto({ descricao, valor, categoria, parcelas = 1 }, userId) {
  const res = await fetch(`${API_URL}/gastos`, {
    method: "POST",
    headers: getHeaders(userId),
    body: JSON.stringify({ descricao, valor, categoria, parcelas, user_id: userId }),
  });

  if (!res.ok) throw new Error(`Erro ao criar gasto: ${res.status}`);
  return res.json();
}

export async function editarGasto(id, { descricao, valor, categoria }, userId) {
  const res = await fetch(`${API_URL}/gastos/${id}`, {
    method: "PUT",
    headers: getHeaders(userId),
    body: JSON.stringify({ descricao, valor, categoria }),
  });

  if (!res.ok) throw new Error(`Erro ao editar gasto: ${res.status}`);
  return res.json();
}

export async function deleteGasto(id, parcelId, userId) {
  let url = `${API_URL}/gastos/${id}`;
  if (parcelId) url += `?parcel_id=${parcelId}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(userId),
  });

  if (!res.ok) throw new Error(`Erro ao deletar gasto: ${res.status}`);
}

export async function marcarComoPago(id, pago, userId) {
  const res = await fetch(`${API_URL}/gastos/${id}`, {
    method: "PATCH",
    headers: getHeaders(userId),
    body: JSON.stringify({ pago }),
  });

  if (!res.ok) throw new Error(`Erro ao marcar como pago: ${res.status}`);
}

export async function pagarParcela(id, userId) {
  const res = await fetch(`${API_URL}/gastos/${id}/pagar`, {
    method: "PATCH",
    headers: getHeaders(userId),
  });

  if (!res.ok) throw new Error(`Erro ao pagar parcela: ${res.status}`);
}
