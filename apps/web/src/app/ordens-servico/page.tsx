'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, type AuthSession } from '../../lib/auth';
import {
  fetchServiceOrders,
  startServiceOrder,
  registerServiceOrderExecution,
  finishServiceOrder
} from '../../lib/api';
import { fetchCurrentUser } from '../../lib/auth-api';
import { SidebarShell } from '../../components/sidebar-shell';
import type { ServiceOrderRecord } from '../../lib/api-types';

type ServiceOrderCard = {
  id: string;
  priority?: string;
  slaHours?: number | null;
  plannedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  teamNote?: string | null;
  department?: { name: string | null } | null;
  fieldTeam?: { name: string | null } | null;
  occurrenceProtocol: string;
  occurrenceTitle: string;
  occurrenceStatus: string;
};

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [orders, setOrders] = useState<ServiceOrderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.replace('/login');
      return;
    }
    fetchCurrentUser(currentSession.accessToken)
      .then((user) => setSession({ ...currentSession, user }))
      .catch(() => {
        clearSession();
        router.replace('/login');
      })
      .finally(() => {
        fetchServiceOrders(currentSession.accessToken)
          .then((value) => setOrders(value as ServiceOrderCard[]))
          .catch(() => setOrders([]))
          .finally(() => setLoading(false));
      });
  }, [router]);

  async function refreshOrders() {
    const currentSession = getSession();
    if (!currentSession) return;
    const updated = await fetchServiceOrders(currentSession.accessToken);
    setOrders(updated as ServiceOrderCard[]);
  }

  async function handleStart(orderId: string) {
    const currentSession = getSession();
    if (!currentSession) return;
    await startServiceOrder(orderId, currentSession.accessToken);
    setActionMessage('OS iniciada com sucesso.');
    await refreshOrders();
  }

  async function handleExecution(orderId: string) {
    const currentSession = getSession();
    if (!currentSession) return;
    await registerServiceOrderExecution(
      orderId,
      {
        teamNote: draftNote || 'Execucao registrada pela equipe.'
      },
      currentSession.accessToken
    );
    setActionMessage('Execucao registrada.');
    setDraftNote('');
    await refreshOrders();
  }

  async function handleFinish(orderId: string) {
    const currentSession = getSession();
    if (!currentSession) return;
    await finishServiceOrder(
      orderId,
      {
        teamNote: draftNote || 'OS finalizada pela equipe.'
      },
      currentSession.accessToken
    );
    setActionMessage('OS finalizada e ocorrencia concluida.');
    setDraftNote('');
    await refreshOrders();
  }

  if (loading) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Carregando</p>
          <h1>Ordens de servico...</h1>
          <p className="login-copy">Buscando os registros vinculados as ocorrencias.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <SidebarShell />
      <section className="content">
        <header className="hero">
          <p className="eyebrow">Operacao</p>
          <h2>Ordens de servico geradas a partir das ocorrencias</h2>
          <p>As OS sao criadas automaticamente quando a ocorrencia entra no fluxo operacional.</p>
        </header>

        <div className="panel">
          <h3>Total de OS</h3>
          <strong style={{ fontSize: '40px' }}>{orders.length}</strong>
        </div>

        {actionMessage ? <p className="success-message">{actionMessage}</p> : null}

        <div className="orders-grid">
          {orders.length === 0 ? (
            <article className="panel">
              <h3>Nenhuma OS encontrada</h3>
              <p>Atualize o status de uma ocorrencia para EM_ANALISE, ENCAMINHADO ou EM_EXECUCAO para criar uma OS.</p>
            </article>
          ) : (
            orders.map((order) => (
              <article key={order.id} className="panel order-card">
                <p className="eyebrow">{order.occurrenceProtocol}</p>
                <h3>{order.occurrenceTitle}</h3>
                <p>Status da ocorrencia: {order.occurrenceStatus}</p>
                <p>Prioridade: {order.priority}</p>
                <p>SLA: {order.slaHours ?? '-'} horas</p>
                <p>Secretaria: {order.department?.name ?? 'Nao definida'}</p>
                <p>Equipe: {order.fieldTeam?.name ?? 'Nao definida'}</p>
                <p>{order.teamNote ?? 'Sem observacoes adicionais.'}</p>
                <label style={{ display: 'grid', gap: 8, marginTop: 16 }}>
                  Observacao operacional
                  <textarea
                    rows={3}
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    style={{ border: '1px solid rgba(15,23,42,.15)', borderRadius: 14, padding: 12, font: 'inherit' }}
                  />
                </label>
                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button type="button" onClick={() => handleStart(order.id)}>
                    Iniciar OS
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleExecution(order.id)}>
                    Registrar execucao
                  </button>
                  <button type="button" onClick={() => handleFinish(order.id)}>
                    Finalizar OS
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
