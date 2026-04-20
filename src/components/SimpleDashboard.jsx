import { useEffect, useState, useCallback } from "react";
import { getGastos, deleteGasto, formatarParcelas } from "../services/api";
import { useAuth } from "../hooks/useAuth";

export default function SimpleDashboard() {
  const { user, isReady } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await getGastos(user.id);
      setGastos(formatarParcelas(data));
      setErro(false);
    } catch (e) {
      console.error("Erro ao buscar:", e);
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isReady) {
      carregar();
    }
  }, [isReady, carregar]);

  async function handleDelete(id) {
    if (!user?.id) return;
    try {
      await deleteGasto(id, null, user.id);
      carregar();
    } catch (e) {
      alert("Erro ao remover gasto");
    }
  }

  // Cálculos de Resumo
  const receitas = gastos
    .filter(g => g.tipo === 'entrada' || g.tipo === 'income')
    .reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);

  const despesas = gastos
    .filter(g => g.tipo !== 'entrada' && g.tipo !== 'income')
    .reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);

  const parcelas = gastos.filter(g => g.total_parcelas > 1);
  const totalParcelas = parcelas.reduce((acc, g) => acc + (parseFloat(g.valor) || 0), 0);

  const saldo = receitas - despesas;

  const formatCurrency = (val) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  if (!isReady || (loading && gastos.length === 0)) return <p style={{ textAlign: 'center', padding: '20px' }}>Carregando dados do servidor...</p>;
  if (!user) return <p style={{ textAlign: 'center', padding: '20px' }}>Por favor, faça login para ver seus gastos.</p>;
  if (erro) return <p style={{ textAlign: 'center', padding: '20px', color: 'red' }}>Erro ao conectar com o backend em localhost:3000 ou produção.</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '5px' }}>fluxxo</h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginBottom: '20px' }}>Conectado como: {user.email}</p>

      {/* Cartões de Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', borderRadius: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', textAlign: 'center' }}>
          <div style={{ fontSize: '20px' }}>💰</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#0369a1' }}>SALDO</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(saldo)}</div>
        </div>
        <div style={{ padding: '15px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
          <div style={{ fontSize: '20px' }}>📈</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#15803d' }}>RECEITAS</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(receitas)}</div>
        </div>
        <div style={{ padding: '15px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center' }}>
          <div style={{ fontSize: '20px' }}>📉</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#b91c1c' }}>DESPESAS</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(despesas)}</div>
        </div>
        <div style={{ padding: '15px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #d1fae5', textAlign: 'center' }}>
          <div style={{ fontSize: '20px' }}>🗓️</div>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669' }}>PARCELAS</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(totalParcelas)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Transações</h2>
        <button onClick={carregar} style={{ fontSize: '12px', cursor: 'pointer' }}>Atualizar 🔄</button>
      </div>

      {/* Parcelamentos Agrupados */}
      {agruparParcelas(gastos).length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', color: '#059669', borderBottom: '1px solid #d1fae5', paddingBottom: '5px' }}>📦 Parcelamentos Ativos</h3>
          {agruparParcelas(gastos).map(grupo => {
            const pagos = grupo.parcelas.filter(p => p.pago || p.completed).length;
            const progresso = (pagos / grupo.total) * 100;
            return (
              <div key={grupo.id} style={{ padding: '15px', background: '#f0fdfa', borderRadius: '12px', border: '1px solid #ccfbf1', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ display: 'block' }}>{grupo.descricao}</strong>
                    <span style={{ fontSize: '11px', color: '#0d9488' }}>{grupo.categoria} · {pagos}/{grupo.total} parcelas pagas</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f766e' }}>{formatCurrency(grupo.valor_total)}</div>
                    <div style={{ fontSize: '10px', color: '#5fb3a1' }}>TOTAL GERAL</div>
                  </div>
                </div>
                {/* Barra de Progresso Simples */}
                <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progresso}%`, background: '#10b981', transition: 'width 0.3s' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {gastos.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>Nenhuma transação encontrada para este usuário.</p>
      ) : (
        gastos
          .filter(g => !g.parcel_id) // Mostra apenas gastos avulsos na lista principal para não duplicar
          .map((g) => (
            <div key={g.id} style={{ 
              border: '1px solid #eee', 
              margin: '10px 0', 
              padding: '12px', 
              borderRadius: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'white'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: '500' }}>{g.label || g.descricao}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{g.categoria}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: (g.tipo === 'entrada' || g.tipo === 'income') ? '#15803d' : '#b91c1c' 
                }}>
                  {formatCurrency(g.valor)}
                </span>
                <button 
                  onClick={() => handleDelete(g.id)}
                  style={{ 
                    padding: '5px 8px', 
                    backgroundColor: '#fee2e2', 
                    color: '#991b1b', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))
      )}
    </div>
  );
}
