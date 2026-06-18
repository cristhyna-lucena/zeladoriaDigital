'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, getSession, type AuthSession } from '../lib/auth';
import { fetchDashboardData } from '../lib/api';
import { fetchCurrentUser } from '../lib/auth-api';
import { InstallPWAButton } from '../components/install-pwa-button';
import { SidebarShell } from '../components/sidebar-shell';
import { OperationalMapPanel } from '../components/operational-map-panel';
import type { DashboardSnapshot } from '../lib/api-types';

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [data, setData] = useState<DashboardSnapshot>({ occurrences: [], citizens: [], users: [], categories: [] });

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      setLoadingSession(false);
      router.replace('/login');
      return;
    }
    fetchCurrentUser(currentSession.accessToken)
      .then((user) => {
        if (user.role === 'CIDADAO') {
          router.replace('/nova-ocorrencia');
          setLoadingSession(false);
          return;
        }
        setSession({ ...currentSession, user });
        return fetchDashboardData(currentSession.accessToken)
          .then((value) => setData(value))
          .catch(() => setData({ occurrences: [], citizens: [], users: [], categories: [] }));
      })
      .catch(() => {
        clearSession();
        router.replace('/login');
      })
      .finally(() => {
        setLoadingSession(false);
      });
  }, [router]);

  const openOccurrences = data.occurrences.filter((item) => item.status === 'ABERTO').length;
  const inProgressOccurrences = data.occurrences.filter((item) => ['EM_ANALISE', 'ENCAMINHADO', 'EM_EXECUCAO'].includes(item.status ?? '')).length;
  const completedOccurrences = data.occurrences.filter((item) => item.status === 'CONCLUIDO').length;
  const canceledOccurrences = data.occurrences.filter((item) => item.status === 'CANCELADO').length;
  const delayedOccurrences = data.occurrences.filter((item) => {
    const createdAt = new Date(item.createdAt ?? Date.now()).getTime();
    return item.status !== 'CONCLUIDO' && Date.now() - createdAt > 1000 * 60 * 60 * 24 * 3;
  }).length;
  const averagePriorityScore = data.occurrences.length
    ? Math.round(data.occurrences.reduce((sum, item) => sum + Number(item.priorityScore ?? 0), 0) / data.occurrences.length)
    : 0;

  const statusSummary = [
    { label: 'Aberto', value: openOccurrences, color: 'var(--primary)' },
    { label: 'Em andamento', value: inProgressOccurrences, color: 'var(--secondary)' },
    { label: 'Concluídas', value: completedOccurrences, color: '#16a34a' },
    { label: 'Canceladas', value: canceledOccurrences, color: '#dc2626' }
  ];

  const topCategories = [...data.occurrences]
    .filter((item) => item.category?.name)
    .reduce<Record<string, number>>((acc, item) => {
      const key = item.category?.name ?? 'Sem categoria';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  if (loadingSession) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Carregando</p>
          <h1>Validando sessão...</h1>
          <p className="login-copy">Aguarde um instante enquanto confirmamos seu acesso.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Sessão</p>
          <h1>Acesso não autenticado</h1>
          <p className="login-copy">Redirecionando para a página de login.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <SidebarShell />
      <section className="content">
        <header className="hero">
          <p className="eyebrow">i7AI Sistemas</p>
          <h2>Base executiva para operação, triagem e atendimento.</h2>
          <p>Visão executiva com indicadores de operação, mapa e status em tempo real a partir da base atual.</p>
          {session?.user.role === 'CIDADAO' ? <InstallPWAButton variant="card" /> : null}
        </header>
        <div className="cards">
          {[
            ['Total de ocorrências', data.occurrences.length],
            ['Em andamento', inProgressOccurrences],
            ['Concluídas', completedOccurrences],
            ['Abertas', openOccurrences],
            ['Em atraso', delayedOccurrences],
            ['Score médio', averagePriorityScore]
          ].map(([label, value]) => (
            <article key={label as string} className="card">
              <span>{label}</span>
              <strong>{value as number}</strong>
            </article>
          ))}
        </div>
        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-heading">
              <h3>Distribuição por status</h3>
              <span>{data.occurrences.length} registros</span>
            </div>
            <div className="status-chart">
              {statusSummary.map((item) => {
                const width = data.occurrences.length ? `${Math.max(8, (item.value / data.occurrences.length) * 100)}%` : '8%';
                return (
                  <div key={item.label} className="status-row">
                    <div className="status-row-label">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="status-bar">
                      <div className="status-bar-fill" style={{ width, background: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel panel-map-operational">
            <div className="panel-heading">
              <h3>Mapa operacional</h3>
              <span>Chamados abertos e em atendimento</span>
            </div>
            <OperationalMapPanel occurrences={data.occurrences} />
          </article>

          <article className="panel panel-span-2">
            <div className="panel-heading">
              <h3>Principais categorias</h3>
              <span>Demanda acumulada</span>
            </div>
            <div className="category-list">
              {Object.entries(topCategories).slice(0, 5).map(([name, value]) => (
                <div key={name} className="category-item">
                  <span>{name}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              {Object.keys(topCategories).length === 0 ? (
                <p className="muted-copy">Sem categorias suficientes para consolidar o gráfico ainda.</p>
              ) : null}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <h3>Leitura rápida</h3>
              <span>Operação</span>
            </div>
            <div className="panel-grid">
              <article>
                <span>Usuários ativos</span>
                <strong>{data.users.length}</strong>
              </article>
              <article>
                <span>Status da integração</span>
                <strong>{data.occurrences.length > 0 ? 'Online' : 'Fallback'}</strong>
              </article>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <h3>Resumo executivo</h3>
              <span>Últimos 3 dias</span>
            </div>
            <p className="summary-copy">
              A operação segue com {openOccurrences} ocorrências abertas, {inProgressOccurrences} em andamento e {completedOccurrences} concluídas.
              Há {delayedOccurrences} itens em atraso monitorado para ação da triagem.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}


