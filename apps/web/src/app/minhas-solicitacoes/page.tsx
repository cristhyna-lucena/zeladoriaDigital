'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, type AuthSession } from '../../lib/auth';
import { fetchCurrentUser } from '../../lib/auth-api';
import { fetchMyOccurrences, fetchOccurrenceByProtocol } from '../../lib/api';
import { formatOccurrenceStatus, formatPriority } from '../../lib/occurrence-map';
import { CitizenShell } from '../../components/citizen-shell';
import { OccurrenceAttachments } from '../../components/occurrence-attachments';
import type { OccurrenceRecord } from '../../lib/api-types';

type Movement = {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  note?: string | null;
  createdAt: string;
};

type CitizenOccurrence = {
  id: string;
  protocol: string;
  title?: string | null;
  description: string;
  status: string;
  priority: string;
  address: string;
  category?: { name?: string | null } | null;
  neighborhood?: { name?: string | null } | null;
  suggestedDepartment?: { name?: string | null } | null;
  serviceOrders?: { department?: { name?: string | null } | null }[];
  movements?: Movement[];
  attachments?: { id: string; fileUrl: string; fileType: string }[];
};

export default function MyRequestsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<CitizenOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [protocolQuery, setProtocolQuery] = useState('');
  const [foundProtocol, setFoundProtocol] = useState<CitizenOccurrence | null>(null);

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
        fetchMyOccurrences(currentSession.accessToken)
          .then((value) => setItems(value as unknown as CitizenOccurrence[]))
          .catch(() => setItems([]))
          .finally(() => setLoading(false));
      });
  }, [router]);

  async function handleProtocolSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentSession = getSession();
    if (!currentSession || !protocolQuery.trim()) return;
    const result = await fetchOccurrenceByProtocol(protocolQuery.trim(), currentSession.accessToken);
    setFoundProtocol(result as unknown as CitizenOccurrence);
  }

  if (loading) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Carregando</p>
          <h1>Minhas solicitações...</h1>
          <p className="login-copy">Consultando o histórico do cidadão.</p>
        </section>
      </main>
    );
  }

  return (
    <CitizenShell title="Minhas solicitações" subtitle="Acompanhe protocolos, secretaria responsável e histórico.">
      <section className="panel">
          <h3>Consultar por protocolo</h3>
          <form className="protocol-search" onSubmit={handleProtocolSearch}>
            <input
              value={protocolQuery}
              onChange={(event) => setProtocolQuery(event.target.value)}
              placeholder="Ex.: OC-0001"
            />
            <button type="submit">Buscar</button>
          </form>
          {foundProtocol ? (
            <article className="panel" style={{ marginTop: 16 }}>
              <p className="eyebrow">{foundProtocol.protocol}</p>
              <h3>{foundProtocol.title ?? foundProtocol.description}</h3>
              <p>Status: {formatOccurrenceStatus(foundProtocol.status)}</p>
              <p>Prioridade: {formatPriority(foundProtocol.priority)}</p>
              <p>{foundProtocol.address}</p>
            </article>
          ) : null}
        </section>

        <div className="cards">
          <article className="card">
            <span>Total de solicitações</span>
            <strong>{items.length}</strong>
          </article>
          <article className="card">
            <span>Em andamento</span>
            <strong>{items.filter((item) => !['CONCLUIDO', 'CANCELADO'].includes(item.status)).length}</strong>
          </article>
          <article className="card">
            <span>Concluídas</span>
            <strong>{items.filter((item) => item.status === 'CONCLUIDO').length}</strong>
          </article>
        </div>

        <div className="orders-grid">
          {items.length === 0 ? (
            <article className="panel">
              <h3>Nenhuma solicitação encontrada</h3>
              <p>Abra uma nova ocorrência para começar a acompanhar seu protocolo.</p>
            </article>
          ) : (
            items.map((item) => (
              <article key={item.id} className="panel order-card">
                <p className="eyebrow">{item.protocol}</p>
                <h3>{item.title ?? item.description}</h3>
                <div className="occurrence-status-row">
                  <span className={`pill pill-status pill-status--${item.status.toLowerCase()}`}>
                    {formatOccurrenceStatus(item.status)}
                  </span>
                  <span className="pill">{formatPriority(item.priority)}</span>
                </div>
                <p>Secretaria: {item.suggestedDepartment?.name ?? item.serviceOrders?.[0]?.department?.name ?? 'Em análise'}</p>
                <p>Bairro: {item.neighborhood?.name ?? 'Sem bairro'}</p>
                <p>Endereço: {item.address}</p>
                <OccurrenceAttachments attachments={item.attachments} />
                <div className="timeline">
                  {(item.movements ?? []).map((movement) => (
                    <article key={movement.id}>
                      <strong>{formatOccurrenceStatus(movement.toStatus)}</strong>
                      <p>{movement.note ?? 'Movimentação registrada.'}</p>
                    </article>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
    </CitizenShell>
  );
}
